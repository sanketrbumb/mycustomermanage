// Drop this into shell.component.ts — replace the existing navSections array
// and add AuthService injection. The shell uses auth.can() to filter nav items
// so hidden menu items are never rendered, not just visually concealed.

/*
  INSTRUCTIONS:
  1. Add to imports: import { AuthService } from '../core/services/auth.service';
  2. Inject in constructor: constructor(public auth: AuthService, ...) {}
  3. Replace your navSections / navItems array with the one below.
  4. In the template, add: *ngIf="!item.permission || auth.canAny(...item.permissions)"
     on each nav item element.

  Example template guard:
    @for (item of navItems; track item.route) {
      @if (!item.permissions || auth.canAny(...item.permissions)) {
        <a class="nav-link" [routerLink]="item.route" routerLinkActive="active">
          <span>{{ item.icon }}</span> {{ item.label }}
        </a>
      }
    }
*/

export const NAV_ITEMS = [
  // ── Schedule (all roles) ──────────────────────────────────────────────────
  { icon: "📅", label: "Schedule",     route: "/schedule",             permissions: ["SCHEDULE_VIEW"] },

  // ── Billing (MANAGER+) ────────────────────────────────────────────────────
  { icon: "🧾", label: "Invoices",     route: "/billing/invoices",     permissions: ["BILLING_VIEW"] },
  { icon: "💳", label: "Payments",     route: "/billing/payments",     permissions: ["BILLING_VIEW"] },
  { icon: "↩",  label: "Refunds",      route: "/billing/refunds",      permissions: ["BILLING_VIEW"] },

  // ── Reports (MANAGER+) ────────────────────────────────────────────────────
  { icon: "📊", label: "Reports",      route: "/reports",              permissions: ["REPORT_VIEW"] },

  // ── Admin — customers (all roles, staff can look up patients) ─────────────
  { icon: "👤", label: "Customers",    route: "/admin/customers",      permissions: ["CUSTOMER_VIEW"] },

  // ── Admin — staff (MANAGER+) ──────────────────────────────────────────────
  { icon: "👥", label: "Staff",        route: "/admin/staff",          permissions: ["USER_VIEW"] },

  // ── Admin — config (SUPER_ADMIN only) ────────────────────────────────────
  { icon: "🏢", label: "Locations",    route: "/admin/locations",      permissions: ["LOCATION_MANAGE"] },
  { icon: "🛋",  label: "Resources",   route: "/admin/resources",      permissions: ["RESOURCE_MANAGE"] },
  { icon: "⏰", label: "Resource Hours", route: "/admin/resource-hours", permissions: ["RESOURCE_MANAGE"] },
  { icon: "💆", label: "Appt Types",  route: "/admin/visit-types",    permissions: ["VISIT_TYPE_MANAGE"] },
  { icon: "🔖", label: "Appt Statuses", route: "/admin/visit-statuses", permissions: ["VISIT_TYPE_MANAGE"] },
  { icon: "⚙️", label: "Settings",    route: "/admin/settings",       permissions: ["SETTINGS_VIEW"] },
  { icon: "💰", label: "Subscription", route: "/settings/billing",     permissions: ["SUBSCRIPTION_MANAGE"] },
  { icon: "🔐", label: "Roles", route: "/admin/roles", permissions: ["SUBSCRIPTION_MANAGE"] },
];
