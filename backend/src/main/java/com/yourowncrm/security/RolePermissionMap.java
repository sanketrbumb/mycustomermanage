package com.yourowncrm.security;

import com.yourowncrm.model.enums.UserRole;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * The single source of truth for which roles get which permissions.
 *
 * Both backend (@PreAuthorize / PermissionService) and the /api/auth/me
 * endpoint (which returns the user's permission set to Angular) read from here.
 * Angular never hard-codes role names — it checks the permissions array returned
 * at login and stores them in AuthService.
 *
 * To add a new permission to a role: add it here. Nothing else changes.
 */
public final class RolePermissionMap {

    private static final Map<UserRole, Set<Permission>> MAP = new EnumMap<>(UserRole.class);

    static {
        // ── SUPER_ADMIN — everything ──────────────────────────────────────────
        MAP.put(UserRole.SUPER_ADMIN, EnumSet.allOf(Permission.class));

        // ── MANAGER — operations but not staff mgmt, settings, or subscription
        MAP.put(UserRole.MANAGER, EnumSet.of(
            Permission.SCHEDULE_VIEW,
            Permission.APPOINTMENT_VIEW_ANY,
            Permission.APPOINTMENT_CREATE,
            Permission.APPOINTMENT_EDIT_ANY,
            Permission.APPOINTMENT_CANCEL,
            Permission.BILLING_VIEW,
            Permission.INVOICE_CREATE,
            Permission.INVOICE_VOID,
            Permission.PAYMENT_COLLECT,
            Permission.REFUND_ISSUE,
            Permission.CUSTOMER_VIEW,
            Permission.CUSTOMER_CREATE,
            Permission.CUSTOMER_EDIT,
            Permission.USER_VIEW,            // can see staff list, not manage it
            Permission.REPORT_VIEW,
            Permission.SETTINGS_VIEW         // can view, not edit
        ));

        // ── STAFF — own appointments, own collections, customer lookup only ──
        MAP.put(UserRole.STAFF, EnumSet.of(
            Permission.SCHEDULE_VIEW,
            Permission.APPOINTMENT_VIEW_OWN,
            Permission.APPOINTMENT_CREATE,   // can book (subject to canBookAppts flag)
            Permission.APPOINTMENT_EDIT_OWN,
            Permission.PAYMENT_COLLECT_OWN,
            Permission.CUSTOMER_VIEW,
            Permission.CUSTOMER_CREATE       // can add patients during booking
        ));
    }

    private RolePermissionMap() {}

    /** Returns the permissions for a given role. Never null — returns empty set for unknown roles. */
    public static Set<Permission> of(UserRole role) {
        return MAP.getOrDefault(role, EnumSet.noneOf(Permission.class));
    }

    /** Returns true if the role has the given permission. */
    public static boolean has(UserRole role, Permission permission) {
        return of(role).contains(permission);
    }
}
