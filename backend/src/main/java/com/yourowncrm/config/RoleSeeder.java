package com.yourowncrm.config;

import com.yourowncrm.model.Role;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.RoleRepository;
import com.yourowncrm.security.Permission;
import com.yourowncrm.security.RolePermissionMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Seeds the 3 built-in roles (SUPER_ADMIN, MANAGER, STAFF) for a new tenant.
 *
 * Called from:
 * - DataSeeder.run() — seeds for the demo tenant on first startup
 * - PublicController.signup() — seeds for every new self-serve tenant
 *
 * If a role already exists (e.g. idempotent re-run), it is skipped.
 * System roles cannot be deleted by tenants, but their permissions CAN be
 * adjusted — this seeder only runs once per role per tenant.
 */
@Component
public class RoleSeeder {

    private final RoleRepository roleRepo;

    @Autowired
    public RoleSeeder(RoleRepository roleRepo) {
        this.roleRepo = roleRepo;
    }

    public void seedDefaultRolesFor(UUID tenantId) {
        seedRole(tenantId, UserRole.SUPER_ADMIN,
            "Full access to all features, settings, and billing.",
            true);
        seedRole(tenantId, UserRole.MANAGER,
            "Day-to-day operations: scheduling, billing, customers. Cannot manage staff or settings.",
            true);
        seedRole(tenantId, UserRole.STAFF,
            "Appointment booking and patient lookup. Read-only access.",
            true);
    }

    private void seedRole(UUID tenantId, UserRole userRole,
                          String description, boolean systemRole) {
        String name = userRole.name();
        if (roleRepo.existsByTenantIdAndName(tenantId, name)) return;

        Set<String> perms = RolePermissionMap.of(userRole)
            .stream()
            .map(Permission::name)
            .collect(Collectors.toSet());

        Role role = new Role();
        role.setTenantId(tenantId);
        role.setName(name);
        role.setDescription(description);
        role.setSystemRole(systemRole);
        role.setPermissions(perms);
        roleRepo.save(role);
    }
}
