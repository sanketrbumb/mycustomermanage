package com.yourowncrm.security;

import com.yourowncrm.model.User;
import com.yourowncrm.model.enums.UserRole;
import com.yourowncrm.repository.RoleRepository;
import com.yourowncrm.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PermissionService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;

    @Autowired
    public PermissionService(UserRepository userRepo, RoleRepository roleRepo) {
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
    }

    public Set<String> permissionNamesFor(UUID tenantId, Long userId) {
        User user = userRepo.findById(userId)
            .filter(u -> u.getTenantId().equals(tenantId) && u.isActive())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "User not found or inactive"));

        String roleName = user.getRoleName() != null ? user.getRoleName() : user.getRole().name();

        return roleRepo.findByTenantIdAndName(tenantId, roleName)
            .map(role -> role.getPermissions())
            .orElseGet(() -> {
                try {
                    UserRole ur = UserRole.valueOf(roleName);
                    return RolePermissionMap.of(ur).stream().map(Permission::name).collect(Collectors.toSet());
                } catch (IllegalArgumentException e) {
                    return Set.of();
                }
            });
    }

    public Set<Permission> permissionsFor(UUID tenantId, Long userId) {
        return permissionNamesFor(tenantId, userId).stream()
            .map(name -> { try { return Permission.valueOf(name); } catch (Exception e) { return null; } })
            .filter(p -> p != null)
            .collect(Collectors.toSet());
    }

    public void require(UUID tenantId, Long userId, Permission permission) {
        if (!permissionsFor(tenantId, userId).contains(permission))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied: " + permission.name());
    }

    public void requireAny(UUID tenantId, Long userId, Permission... permissions) {
        Set<Permission> perms = permissionsFor(tenantId, userId);
        for (Permission p : permissions) if (perms.contains(p)) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
            "Permission denied — requires one of: " + Arrays.toString(permissions));
    }

    public void requireOwnership(UUID tenantId, Long userId, Long ownerId,
                                  Permission anyPerm, Permission ownPerm) {
        Set<Permission> perms = permissionsFor(tenantId, userId);
        if (perms.contains(anyPerm)) return;
        if (perms.contains(ownPerm) && userId.equals(ownerId)) return;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Permission denied: own records only");
    }

    public boolean has(UUID tenantId, Long userId, Permission permission) {
        return permissionsFor(tenantId, userId).contains(permission);
    }

    public boolean canBook(UUID tenantId, Long userId) {
        User user = userRepo.findById(userId).filter(u -> u.getTenantId().equals(tenantId) && u.isActive()).orElse(null);
        if (user == null || !user.isCanBookAppts()) return false;
        return permissionNamesFor(tenantId, userId).contains(Permission.APPOINTMENT_CREATE.name());
    }
}
