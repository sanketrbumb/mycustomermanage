package com.yourowncrm.security;

/**
 * Reusable Spring Security SpEL expressions for @PreAuthorize.
 *
 * Usage:
 *   @PreAuthorize(RbacConstants.BILLING_VIEW)
 *   @PreAuthorize(RbacConstants.ADMIN_ONLY)
 *
 * These role names must match the UserRole enum exactly.
 * Spring Security prefixes roles with "ROLE_" internally when you use
 * hasRole() — so SUPER_ADMIN in the DB becomes ROLE_SUPER_ADMIN in Spring.
 * hasAnyRole() handles this automatically; we use it consistently here.
 */
public final class RbacConstants {

    private RbacConstants() {}

    // Shorthand aliases
    private static final String SA  = "'SUPER_ADMIN'";
    private static final String MGR = "'MANAGER'";
    private static final String STF = "'STAFF'";

    // ── Controller-level guards ────────────────────────────────────────────────

    /** All authenticated users (any active role) */
    public static final String ANY_ROLE =
        "hasAnyRole(" + SA + "," + MGR + "," + STF + ")";

    /** SUPER_ADMIN only */
    public static final String ADMIN_ONLY =
        "hasRole(" + SA + ")";

    /** SUPER_ADMIN or MANAGER */
    public static final String MANAGER_UP =
        "hasAnyRole(" + SA + "," + MGR + ")";

    /** All roles (same as ANY_ROLE — explicit alias for clarity) */
    public static final String STAFF_UP =
        "hasAnyRole(" + SA + "," + MGR + "," + STF + ")";

    // ── Feature-specific guards ───────────────────────────────────────────────

    public static final String SCHEDULE_VIEW    = ANY_ROLE;
    public static final String APPOINTMENT_WRITE = STAFF_UP;   // service enforces ownership
    public static final String APPOINTMENT_CANCEL = MANAGER_UP;

    public static final String BILLING_VIEW     = MANAGER_UP;
    public static final String BILLING_WRITE    = MANAGER_UP;
    public static final String REFUND_ISSUE     = MANAGER_UP;

    public static final String CUSTOMER_VIEW    = ANY_ROLE;
    public static final String CUSTOMER_WRITE   = STAFF_UP;    // staff can add during booking

    public static final String USER_VIEW        = MANAGER_UP;
    public static final String USER_MANAGE      = ADMIN_ONLY;

    public static final String LOCATION_MANAGE  = ADMIN_ONLY;
    public static final String RESOURCE_MANAGE  = ADMIN_ONLY;
    public static final String VISIT_TYPE_MANAGE = ADMIN_ONLY;

    public static final String REPORT_VIEW      = MANAGER_UP;
    public static final String SETTINGS_EDIT    = ADMIN_ONLY;
    public static final String SUBSCRIPTION_MANAGE = ADMIN_ONLY;
}
