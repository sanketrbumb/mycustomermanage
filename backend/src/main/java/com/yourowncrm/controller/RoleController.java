package com.yourowncrm.controller;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.Role;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.RoleRepository;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.security.Permission;
import com.yourowncrm.security.RolePermissionMap;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Role management API.
 *
 * GET    /api/roles                    — list all roles for this tenant
 * GET    /api/roles/{id}               — get role + permissions
 * POST   /api/roles                    — create new role
 * PUT    /api/roles/{id}               — update role name/description
 * PUT    /api/roles/{id}/permissions   — replace full permission set
 * DELETE /api/roles/{id}               — delete (blocked if users assigned)
 * GET    /api/roles/permissions        — list all available Permission names
 */
@RestController
@RequestMapping("/api/roles")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class RoleController {

    private final RoleRepository   roleRepo;
    private final JwtTokenProvider jwt;

    @Autowired
    public RoleController(RoleRepository roleRepo, JwtTokenProvider jwt) {
        this.roleRepo = roleRepo;
        this.jwt      = jwt;
    }

    /** All available permission names, grouped by category */
    @GetMapping("/permissions")
    public Map<String, List<String>> availablePermissions() {
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        grouped.put("Schedule",     List.of("SCHEDULE_VIEW"));
        grouped.put("Appointments", List.of(
            "APPOINTMENT_VIEW_ANY", "APPOINTMENT_VIEW_OWN",
            "APPOINTMENT_CREATE",   "APPOINTMENT_EDIT_ANY",
            "APPOINTMENT_EDIT_OWN", "APPOINTMENT_CANCEL"));
        grouped.put("Billing", List.of(
            "BILLING_VIEW", "INVOICE_CREATE", "INVOICE_VOID",
            "PAYMENT_COLLECT", "PAYMENT_COLLECT_OWN", "REFUND_ISSUE"));
        grouped.put("Customers", List.of(
            "CUSTOMER_VIEW", "CUSTOMER_CREATE", "CUSTOMER_EDIT"));
        grouped.put("Staff & Users", List.of(
            "USER_VIEW", "USER_CREATE", "USER_EDIT", "USER_DEACTIVATE"));
        grouped.put("Admin Config", List.of(
            "RESOURCE_MANAGE", "LOCATION_MANAGE", "VISIT_TYPE_MANAGE",
            "SETTINGS_VIEW", "SETTINGS_EDIT"));
        grouped.put("Reports", List.of("REPORT_VIEW"));
        grouped.put("Subscription", List.of("SUBSCRIPTION_MANAGE"));
        return grouped;
    }

    /** List all roles for the current tenant */
    @GetMapping
    public List<RoleResponse> list(@RequestHeader("Authorization") String token) {
        UUID tenantId = tenantId(token);
        return roleRepo.findByTenantIdOrderBySystemRoleDescNameAsc(tenantId)
            .stream().map(this::toResponse).toList();
    }

    /** Get a single role */
    @GetMapping("/{id}")
    public RoleResponse get(@RequestHeader("Authorization") String token,
                            @PathVariable Long id) {
        return toResponse(findOwned(tenantId(token), id));
    }

    /** Create a new custom role */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RoleResponse create(@RequestHeader("Authorization") String token,
                               @Valid @RequestBody RoleRequest req) {
        UUID tenantId = tenantId(token);
        if (roleRepo.existsByTenantIdAndName(tenantId, req.getName())) {
            throw new BusinessException("A role named '" + req.getName() + "' already exists.");
        }
        Role role = new Role();
        role.setTenantId(tenantId);
        role.setName(req.getName().trim());
        role.setDescription(req.getDescription());
        role.setSystemRole(false);
        role.setPermissions(validatedPermissions(req.getPermissions()));
        return toResponse(roleRepo.save(role));
    }

    /** Update role name and description (not permissions) */
    @PutMapping("/{id}")
    public RoleResponse update(@RequestHeader("Authorization") String token,
                               @PathVariable Long id,
                               @Valid @RequestBody RoleRequest req) {
        UUID tenantId = tenantId(token);
        Role role = findOwned(tenantId, id);
        if (!role.isSystemRole()) {
            // Only allow renaming custom roles
            String newName = req.getName().trim();
            if (!newName.equals(role.getName())
                    && roleRepo.existsByTenantIdAndName(tenantId, newName)) {
                throw new BusinessException("A role named '" + newName + "' already exists.");
            }
            role.setName(newName);
        }
        role.setDescription(req.getDescription());
        return toResponse(roleRepo.save(role));
    }

    /** Replace the full permission set for a role */
    @PutMapping("/{id}/permissions")
    public RoleResponse updatePermissions(@RequestHeader("Authorization") String token,
                                          @PathVariable Long id,
                                          @RequestBody Set<String> permissions) {
        Role role = findOwned(tenantId(token), id);
        role.setPermissions(validatedPermissions(permissions));
        return toResponse(roleRepo.save(role));
    }

    /** Delete a custom role — blocked if any users are assigned */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader("Authorization") String token,
                       @PathVariable Long id) {
        UUID tenantId = tenantId(token);
        Role role = findOwned(tenantId, id);
        if (role.isSystemRole()) {
            throw new BusinessException(
                "Built-in role '" + role.getName() + "' cannot be deleted. " +
                "You can adjust its permissions but not remove it.");
        }
        long userCount = roleRepo.countUsersWithRole(tenantId, role.getName());
        if (userCount > 0) {
            throw new BusinessException(
                "Cannot delete role '" + role.getName() + "' — " + userCount +
                " user(s) are still assigned to it. " +
                "Move them to a different role first.");
        }
        roleRepo.delete(role);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Role findOwned(UUID tenantId, Long id) {
        return roleRepo.findById(id)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new BusinessException("Role not found: " + id));
    }

    private Set<String> validatedPermissions(Set<String> raw) {
        if (raw == null) return new HashSet<>();
        Set<String> valid = Arrays.stream(Permission.values())
            .map(Permission::name)
            .collect(Collectors.toSet());
        return raw.stream()
            .filter(valid::contains)
            .collect(Collectors.toSet());
    }

    private UUID tenantId(String token) {
        return jwt.getTenantId(token.substring(7));
    }

    private RoleResponse toResponse(Role r) {
        RoleResponse res = new RoleResponse();
        res.id          = r.getId();
        res.name        = r.getName();
        res.description = r.getDescription();
        res.systemRole  = r.isSystemRole();
        res.permissions = new HashSet<>(r.getPermissions());
        res.userCount   = roleRepo.countUsersWithRole(r.getTenantId(), r.getName());
        return res;
    }

    public static class RoleResponse {
        public Long        id;
        public String      name;
        public String      description;
        public boolean     systemRole;
        public Set<String> permissions;
        public long        userCount;
    }

    public static class RoleRequest {
        @NotBlank @Size(min = 2, max = 60)
        private String name;
        @Size(max = 200)
        private String description;
        private Set<String> permissions = new HashSet<>();

        public String      getName()        { return name; }
        public void        setName(String v){ this.name = v; }
        public String      getDescription() { return description; }
        public void        setDescription(String v){ this.description = v; }
        public Set<String> getPermissions() { return permissions; }
        public void        setPermissions(Set<String> v){ this.permissions = v; }
    }
}
