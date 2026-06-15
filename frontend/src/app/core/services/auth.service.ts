import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { tap } from "rxjs/operators";
import { environment } from "../../../environments/environment";

export interface AuthUser {
  userId: number; username: string; fullName: string;
  role: string; tenantId: string; tenantName: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly TOKEN_KEY = "crm_token";
  currentUser = signal<AuthUser | null>(this.decodeToken(this.getToken()));

  constructor(private http: HttpClient, private router: Router) {}

  login(tenantSlug: string, username: string, password: string) {
    return this.http.post<any>(`${environment.apiUrl}/auth/login`,
        { tenantSlug, username, password }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.accessToken);
        this.currentUser.set(this.decodeToken(res.accessToken));
      })
    );
  }

  logout() {
    // Fire-and-forget audit log entry on the server before clearing the token.
    // Don't block navigation on this — use the token that's about to be removed.
    const token = this.getToken();
    if (token) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
        next: () => {},
        error: () => {} // logout proceeds regardless of audit call outcome
      });
    }
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUser.set(null);
    this.router.navigate(["/login"]);
  }

  getToken(): string | null { return localStorage.getItem(this.TOKEN_KEY); }
  isLoggedIn(): boolean     { return !!this.getToken(); }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.currentUser()?.role ?? "");
  }

  private decodeToken(token: string | null): AuthUser | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        userId: +payload.sub, username: payload.username,
        fullName: payload.fullName, role: payload.role,
        tenantId: payload.tenantId, tenantName: payload.tenantName
      };
    } catch { return null; }
  }
}
