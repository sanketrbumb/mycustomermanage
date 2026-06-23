package com.yourowncrm.controller;

import com.yourowncrm.model.User;
import com.yourowncrm.repository.UserRepository;
import com.yourowncrm.security.Permission;
import com.yourowncrm.security.RolePermissionMap;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.security.PermissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * GET /api/auth/me
 *
 * Returns the current user's profile + their full permission set.
 * Angular calls this once at login and stores the result in AuthService.
 * All UI guards and menu visibility checks read from this — never from
 * hard-coded role names in the frontend.
 *
 * Response shape:
 * {
 *   "id": 1,
 *   "username": "jane",
 *   "firstName": "Jane",
 *   "lastName": "Smith",
 *   "email": "jane@spa.com",
 *   "role": "MANAGER",
 *   "canBookAppts": true,
 *   "permissions": ["SCHEDULE_VIEW", "APPOINTMENT_VIEW_ANY", "BILLING_VIEW", ...]
 * }
 */
@RestController
@RequestMapping("/api/auth")
public class AuthMeController {

    private final UserRepository    userRepo;
    private final JwtTokenProvider  jwt;
    private final PermissionService permissionService;

    @Autowired
    public AuthMeController(UserRepository userRepo, JwtTokenProvider jwt, PermissionService permissionService) {
        this.userRepo = userRepo;
        this.jwt      = jwt;
        this.permissionService = permissionService;
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        Long userId   = jwt.getUserId(token.substring(7));

        User user = userRepo.findById(userId)
            .filter(u -> u.getTenantId().equals(tenantId))
            .orElseThrow(() -> new RuntimeException("User not found"));

        Set<String> permissions = permissionService.permissionNamesFor(tenantId, userId);

        return Map.of(
            "id",           user.getId(),
            "username",     user.getUsername(),
            "firstName",    user.getFirstName(),
            "lastName",     user.getLastName(),
            "email",        user.getEmail() != null ? user.getEmail() : "",
            "role",         user.getRole().name(),
            "canBookAppts", user.isCanBookAppts(),
            "permissions",  permissions
        );
    }
}
