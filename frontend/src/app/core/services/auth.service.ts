import { Injectable, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { tap, map, switchMap } from "rxjs/operators";
import { IdleService }     from "./idle.service";
import { NavLabelService }  from "./nav-label.service";

export interface CurrentUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "STAFF";
  canBookAppts: boolean;
  permissions: string[];  // Permission enum names from backend
  practiceName?: string;
  idleTimeoutMinutes?: number;
}

/**
 * Central auth service — single source of truth for:
 *   - JWT token storage
 *   - Current user profile
 *   - Permission checks (all code reads permissions, never role names directly)
 *
 * Angular components NEVER check the role string directly.
 * They call can('BILLING_VIEW') or canAny('INVOICE_CREATE','INVOICE_VOID').
 * This means adding a permission to a role in the backend automatically
 * unlocks the UI without any frontend changes.
 */
@Injectable({ providedIn: "root" })
export class AuthService {

  private _user = signal<CurrentUser | null>(null);
  private _token = signal<string | null>(localStorage.getItem("jwt_token"));

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token() && !!this._user());

  constructor(private http: HttpClient, private router: Router,
              private idle: IdleService, private navLabels: NavLabelService) {
    // Restore user from storage on page reload
    this.idle.setLogoutCallback(() => this.logout());
    const stored = localStorage.getItem("current_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && !parsed.fullName) {
          parsed.fullName = `${parsed.firstName} ${parsed.lastName}`.trim();
        }
        this._user.set(parsed);
        this.idle.start(parsed.idleTimeoutMinutes ?? 60);
      } catch {
        this.logout();
      }
    }
  }

  // ── Login flow ────────────────────────────────────────────────────────────

  login(tenantSlug: string, username: string, password: string) {
    return this.http.post<{ accessToken: string }>(
      `${environment.apiUrl}/auth/login`, { tenantSlug, username, password }
    ).pipe(
      tap(res => {
        this._token.set(res.accessToken);
        localStorage.setItem("jwt_token", res.accessToken);
      }),
      switchMap(() => this.loadMe())
    );
  }

  /** Call after login to load the user's profile + permissions */
  loadMe() {
    return this.http.get<CurrentUser>(`${environment.apiUrl}/auth/me`).pipe(
      map(user => {
        const enriched = { ...user, fullName: `${user.firstName} ${user.lastName}`.trim() };
        this._user.set(enriched);
        localStorage.setItem("current_user", JSON.stringify(enriched));
        this.idle.start(enriched.idleTimeoutMinutes ?? 60);
        this.navLabels.load().subscribe();
        return enriched;
      })
    );
  }

  logout() {
    this.idle.stop();
    this._token.set(null);
    this._user.set(null);
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("current_user");
    this.router.navigate(["/login"]);
  }

  getToken(): string | null { return this._token(); }

  // ── Permission checks — use these everywhere, never check role directly ───

  /** True if the current user has ALL of the given permissions */
  can(...permissions: string[]): boolean {
    const user = this._user();
    if (!user) return false;
    return permissions.every(p => user.permissions.includes(p));
  }

  /** True if the current user has ANY of the given permissions */
  canAny(...permissions: string[]): boolean {
    const user = this._user();
    if (!user) return false;
    return permissions.some(p => user.permissions.includes(p));
  }

  /** True if the user can book appointments (has permission AND flag set) */
  canBook(): boolean {
    return this.can("APPOINTMENT_CREATE") && (this._user()?.canBookAppts ?? false);
  }

  /** True if user is SUPER_ADMIN (for truly admin-only UI, e.g. subscription page) */
  isSuperAdmin(): boolean {
    return this._user()?.role === "SUPER_ADMIN";
  }
}
