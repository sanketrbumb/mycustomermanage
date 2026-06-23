package com.yourowncrm.controller;

import com.yourowncrm.model.Tenant;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final TenantRepository tenantRepo;
    private final JwtTokenProvider jwtProvider;

    @Autowired
    public SettingsController(TenantRepository tenantRepo, JwtTokenProvider jwtProvider) {
        this.tenantRepo = tenantRepo;
        this.jwtProvider = jwtProvider;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public Map<String, Object> getSettings(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        return Map.of(
                "practiceName", tenant.getName(),
                "minPasswordLength", tenant.getMinPasswordLength(),
                "maxFailedLogins", tenant.getMaxFailedLogins()
        );
    }

    @PutMapping
    @PreAuthorize("hasAuthority('SETTINGS_EDIT')")
    public Map<String, Object> updateSettings(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> req) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        if (req.containsKey("practiceName")) {
            tenant.setName((String) req.get("practiceName"));
        }
        if (req.containsKey("minPasswordLength")) {
            tenant.setMinPasswordLength(((Number) req.get("minPasswordLength")).intValue());
        }
        if (req.containsKey("maxFailedLogins")) {
            tenant.setMaxFailedLogins(((Number) req.get("maxFailedLogins")).intValue());
        }

        tenantRepo.save(tenant);

        return Map.of(
                "practiceName", tenant.getName(),
                "minPasswordLength", tenant.getMinPasswordLength(),
                "maxFailedLogins", tenant.getMaxFailedLogins()
        );
    }
}
