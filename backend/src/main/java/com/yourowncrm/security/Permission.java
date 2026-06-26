package com.yourowncrm.security;

/**
 * Every discrete action in the system.
 *
 * Rules:
 * - Roles are coarse (SUPER_ADMIN, MANAGER, STAFF).
 * - Permissions are fine-grained (what you can actually do).
 * - Code checks permissions, not roles directly.
 * - RolePermissionMap is the single place that maps roles → permissions.
 *
 * Naming convention: NOUN_VERB (what you're acting on, then what you're doing).
 */
public enum Permission {

    // ── Schedule ──────────────────────────────────────────────────────────────
    SCHEDULE_VIEW,          // see the schedule page

    // ── Appointments ─────────────────────────────────────────────────────────
    APPOINTMENT_VIEW_ANY,   // view any patient's appointments
    APPOINTMENT_VIEW_OWN,   // view only appointments where you are the staff member
    APPOINTMENT_CREATE,     // book new appointments
    APPOINTMENT_EDIT_ANY,   // edit any appointment
    APPOINTMENT_EDIT_OWN,   // edit only appointments where you are the staff member
    APPOINTMENT_CANCEL,     // cancel (delete) appointments

    // ── Billing ───────────────────────────────────────────────────────────────
    BILLING_VIEW,           // see invoices, payments, refunds
    INVOICE_CREATE,         // create/edit invoices
    INVOICE_VOID,           // void an invoice
    PAYMENT_COLLECT,        // record a payment
    PAYMENT_COLLECT_OWN,    // record payment for own appointments only
    REFUND_ISSUE,           // issue refunds

    // ── Customers ─────────────────────────────────────────────────────────────
    CUSTOMER_VIEW,          // search and view customer records
    CUSTOMER_CREATE,        // add new customers
    CUSTOMER_EDIT,          // edit customer details

    // ── Staff / User management ───────────────────────────────────────────────
    USER_VIEW,              // see staff list
    USER_CREATE,            // add new staff accounts
    USER_EDIT,              // edit staff details, reset passwords
    USER_DEACTIVATE,        // deactivate/reactivate accounts

    // ── Resources, Locations, Visit types ────────────────────────────────────
    RESOURCE_MANAGE,        // create/edit/delete resources
    LOCATION_MANAGE,        // create/edit/delete locations
    VISIT_TYPE_MANAGE,      // create/edit/delete visit types and statuses

    // ── Reports ───────────────────────────────────────────────────────────────
    REPORT_VIEW,            // access the reports section

    // ── Admin settings ────────────────────────────────────────────────────────
    SETTINGS_VIEW,          // view settings page
    SETTINGS_EDIT,          // change org-level settings

    // ── Subscription / billing (SaaS) ─────────────────────────────────────────
    SUBSCRIPTION_MANAGE,    // change plan, cancel, access billing portal

    // ── Menu customisation ────────────────────────────────────────────────────
    MODIFY_MENUS,           // customise sidebar menu labels and icons
}
