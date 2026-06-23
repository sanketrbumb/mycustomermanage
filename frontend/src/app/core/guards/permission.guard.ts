import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Auth guard — redirects to /login if not authenticated.
 * Used on the root shell route.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(["/login"]);
};

/**
 * Permission guard factory — blocks a route unless the user has
 * at least one of the specified permissions.
 *
 * Usage in routes:
 *   canActivate: [permissionGuard("BILLING_VIEW")]
 *   canActivate: [permissionGuard("INVOICE_CREATE", "INVOICE_VOID")]
 *
 * Redirects to /schedule (home) with a 403 flag so the shell can show
 * a "you don't have access" snackbar.
 */
export function permissionGuard(...permissions: string[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(["/login"]);
    }
    if (auth.canAny(...permissions)) {
      return true;
    }
    // Redirect home with a query param so the shell can show a toast
    return router.createUrlTree(["/schedule"], { queryParams: { denied: 1 } });
  };
}

/**
 * Super-admin-only guard.
 * Use for subscription management and other SUPER_ADMIN-exclusive routes.
 */
export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(["/login"]);
  if (auth.isSuperAdmin()) return true;
  return router.createUrlTree(["/schedule"], { queryParams: { denied: 1 } });
};
