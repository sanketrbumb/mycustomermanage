package com.yourowncrm.controller;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.NavLabel;
import com.yourowncrm.repository.NavLabelRepository;
import com.yourowncrm.security.JwtTokenProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Per-tenant navigation label customisation.
 *
 * GET  /api/nav-labels          — returns all custom labels for this tenant
 *                                 (called by Angular shell on startup)
 * PUT  /api/nav-labels          — upsert a single label (SUPER_ADMIN only)
 * DELETE /api/nav-labels/{route} — reset a route back to its default label
 */
@RestController
@RequestMapping("/api/nav-labels")
public class NavLabelController {

    private final NavLabelRepository repo;
    private final JwtTokenProvider   jwt;

    @Autowired
    public NavLabelController(NavLabelRepository repo, JwtTokenProvider jwt) {
        this.repo = repo;
        this.jwt  = jwt;
    }

    /** All custom labels for this tenant — used by the shell at startup */
    @GetMapping
    public List<Map<String, String>> list(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        return repo.findByTenantId(tenantId).stream()
            .map(n -> {
                var m = new java.util.HashMap<String, String>();
                m.put("route", n.getRoute());
                m.put("label", n.getLabel());
                if (n.getIcon() != null) m.put("icon", n.getIcon());
                return (Map<String, String>) m;
            })
            .toList();
    }

    /** Upsert a label — creates if not exists, updates if already set */
    @PutMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public Map<String, String> upsert(
            @RequestHeader("Authorization") String token,
            @RequestBody LabelRequest req) {

        UUID tenantId = jwt.getTenantId(token.substring(7));

        NavLabel nav = repo.findByTenantIdAndRoute(tenantId, req.getRoute())
            .orElseGet(() -> {
                NavLabel n = new NavLabel();
                n.setTenantId(tenantId);
                n.setRoute(req.getRoute());
                return n;
            });

        nav.setLabel(req.getLabel().trim());
        nav.setIcon(req.getIcon() != null ? req.getIcon().trim() : null);
        repo.save(nav);

        return Map.of("route", nav.getRoute(), "label", nav.getLabel());
    }

    /** Reset a route to its built-in default by deleting the custom record */
    @DeleteMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(
            @RequestHeader("Authorization") String token,
            @RequestParam String route) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        repo.findByTenantIdAndRoute(tenantId, route).ifPresent(repo::delete);
    }

    public static class LabelRequest {
        @NotBlank @Size(max = 120) private String route;
        @NotBlank @Size(max = 80)  private String label;
        @Size(max = 20)            private String icon;

        public String getRoute() { return route; }
        public void   setRoute(String v) { this.route = v; }
        public String getLabel() { return label; }
        public void   setLabel(String v) { this.label = v; }
        public String getIcon()  { return icon; }
        public void   setIcon(String v)  { this.icon = v; }
    }
}
