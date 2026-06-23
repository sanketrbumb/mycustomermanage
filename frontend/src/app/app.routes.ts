import { Routes } from "@angular/router";
import { authGuard, permissionGuard, superAdminGuard } from "./core/guards/permission.guard";

export const routes: Routes = [
  { path: "login",  loadComponent: () => import("./features/auth/login.component").then(m => m.LoginComponent) },
  { path: "signup", loadComponent: () => import("./features/signup/signup.component").then(m => m.SignupComponent) },
  {
    path: "",
    loadComponent: () => import("./layout/shell.component").then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: "", redirectTo: "schedule", pathMatch: "full" },
      { path: "schedule",              canActivate: [permissionGuard("SCHEDULE_VIEW")],       loadComponent: () => import("./features/schedule/schedule.component").then(m => m.ScheduleComponent) },
      { path: "admin/staff",           canActivate: [permissionGuard("USER_VIEW")],           loadComponent: () => import("./features/admin/staff/staff-list.component").then(m => m.StaffListComponent) },
      { path: "admin/resources",       canActivate: [permissionGuard("RESOURCE_MANAGE")],     loadComponent: () => import("./features/admin/resources/resource-list.component").then(m => m.ResourceListComponent) },
      { path: "admin/visit-types",     canActivate: [permissionGuard("VISIT_TYPE_MANAGE")],   loadComponent: () => import("./features/admin/visit-types/visit-type-list.component").then(m => m.VisitTypeListComponent) },
      { path: "admin/visit-statuses",  canActivate: [permissionGuard("VISIT_TYPE_MANAGE")],   loadComponent: () => import("./features/admin/visit-statuses/visit-status-list.component").then(m => m.VisitStatusListComponent) },
      { path: "admin/locations",       canActivate: [permissionGuard("LOCATION_MANAGE")],     loadComponent: () => import("./features/admin/locations/location-list.component").then(m => m.LocationListComponent) },
      { path: "admin/customers",       canActivate: [permissionGuard("CUSTOMER_VIEW")],       loadComponent: () => import("./features/admin/customers/customer-list.component").then(m => m.CustomerListComponent) },
      { path: "admin/resource-hours",  canActivate: [permissionGuard("RESOURCE_MANAGE")],     loadComponent: () => import("./features/admin/resource-hours/resource-hours.component").then(m => m.ResourceHoursComponent) },
      { path: "admin/settings",        canActivate: [permissionGuard("SETTINGS_VIEW")],       loadComponent: () => import("./features/admin/settings/settings.component").then(m => m.SettingsComponent) },
      { path: "admin/roles",           canActivate: [permissionGuard("SUBSCRIPTION_MANAGE")], loadComponent: () => import("./features/admin/roles/roles.component").then(m => m.RolesComponent) },
      { path: "billing/invoices",      canActivate: [permissionGuard("BILLING_VIEW")],        loadComponent: () => import("./features/billing/invoice-list.component").then(m => m.InvoiceListComponent) },
      { path: "billing/payments",      canActivate: [permissionGuard("BILLING_VIEW")],        loadComponent: () => import("./features/billing/payment-form.component").then(m => m.PaymentFormComponent) },
      { path: "billing/refunds",       canActivate: [permissionGuard("BILLING_VIEW")],        loadComponent: () => import("./features/billing/refund-list.component").then(m => m.RefundListComponent) },
      { path: "reports",               canActivate: [permissionGuard("REPORT_VIEW")],         loadComponent: () => import("./features/reports/reports.component").then(m => m.ReportsComponent) },
      { path: "settings/billing",      canActivate: [permissionGuard("SUBSCRIPTION_MANAGE")], loadComponent: () => import("./features/settings/subscription.component").then(m => m.SubscriptionComponent) },
    ]
  },
  { path: "**", redirectTo: "login" }
];