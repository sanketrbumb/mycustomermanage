import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  // ── Public routes — no auth required ────────────────────────────────────
  {
    path: "login",
    loadComponent: () => import("./features/auth/login.component").then(m => m.LoginComponent)
  },
  {
    path: "signup",
    loadComponent: () => import("./features/signup/signup.component").then(m => m.SignupComponent)
  },

  // ── Authenticated routes — wrapped in shell ──────────────────────────────
  {
    path: "",
    loadComponent: () => import("./layout/shell.component").then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: "", redirectTo: "schedule", pathMatch: "full" },
      {
        path: "schedule",
        loadComponent: () => import("./features/schedule/schedule.component").then(m => m.ScheduleComponent)
      },

      // Admin
      {
        path: "admin/staff",
        loadComponent: () => import("./features/admin/staff/staff-list.component").then(m => m.StaffListComponent)
      },
      {
        path: "admin/resources",
        loadComponent: () => import("./features/admin/resources/resource-list.component").then(m => m.ResourceListComponent)
      },
      {
        path: "admin/visit-types",
        loadComponent: () => import("./features/admin/visit-types/visit-type-list.component").then(m => m.VisitTypeListComponent)
      },
      {
        path: "admin/visit-statuses",
        loadComponent: () => import("./features/admin/visit-statuses/visit-status-list.component").then(m => m.VisitStatusListComponent)
      },
      {
        path: "admin/locations",
        loadComponent: () => import("./features/admin/locations/location-list.component").then(m => m.LocationListComponent)
      },
      {
        path: "admin/customers",
        loadComponent: () => import("./features/admin/customers/customer-list.component").then(m => m.CustomerListComponent)
      },
      {
        path: "admin/resource-hours",
        loadComponent: () => import("./features/admin/resource-hours/resource-hours.component").then(m => m.ResourceHoursComponent)
      },
      {
        path: "admin/settings",
        loadComponent: () => import("./features/admin/settings/settings.component").then(m => m.SettingsComponent)
      },

      // Billing
      {
        path: "billing/invoices",
        loadComponent: () => import("./features/billing/invoice-list.component").then(m => m.InvoiceListComponent)
      },
      {
        path: "billing/payments",
        loadComponent: () => import("./features/billing/payment-form.component").then(m => m.PaymentFormComponent)
      },
      {
        path: "billing/refunds",
        loadComponent: () => import("./features/billing/refund-list.component").then(m => m.RefundListComponent)
      },

      // Reports
      {
        path: "reports",
        loadComponent: () => import("./features/reports/reports.component").then(m => m.ReportsComponent)
      },
    ]
  },

  // Fallback
  { path: "**", redirectTo: "login" }
];
