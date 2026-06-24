import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

/**
 * Handles 401 Unauthorized responses globally.
 *
 * Token attachment is already handled by jwtInterceptor.
 * This interceptor's only job is to catch 401s — which happen when:
 *   - The server restarted (token's "srv" claim no longer matches)
 *   - The JWT expired
 * In both cases, silently log the user out and redirect to /login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // 401 on anything other than the login attempt itself = token invalid
      if (err.status === 401 && !req.url.includes("/auth/login")) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};