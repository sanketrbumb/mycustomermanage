import { Injectable, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { catchError, of, tap } from "rxjs";

interface NavOverride { route: string; label: string; icon?: string; }

/**
 * Loads per-tenant nav label overrides from the backend and exposes
 * a resolve(route, defaultLabel, defaultIcon) helper used by the shell.
 *
 * Call load() once after login. The shell's computed navGroups reads
 * resolved() which reactively updates when overrides are saved.
 */
@Injectable({ providedIn: "root" })
export class NavLabelService {

  private overrides = signal<NavOverride[]>([]);

  constructor(private http: HttpClient) {}

  load() {
    return this.http.get<NavOverride[]>(`${environment.apiUrl}/nav-labels`).pipe(
      tap(data => this.overrides.set(data)),
      catchError(() => of([]))
    );
  }

  /** Returns the custom label for a route, falling back to the default */
  label(route: string, defaultLabel: string): string {
    return this.overrides().find(o => o.route === route)?.label ?? defaultLabel;
  }

  /** Returns the custom icon for a route, falling back to the default */
  icon(route: string, defaultIcon: string): string {
    return this.overrides().find(o => o.route === route)?.icon ?? defaultIcon;
  }

  /** All current overrides — used by the settings UI */
  all() { return this.overrides(); }

  /** Upsert a label override and refresh the local signal */
  save(route: string, label: string, icon?: string) {
    return this.http.put<{route: string; label: string}>(
      `${environment.apiUrl}/nav-labels`, { route, label, icon }
    ).pipe(
      tap(() => {
        const current = this.overrides().filter(o => o.route !== route);
        this.overrides.set([...current, { route, label, icon }]);
      })
    );
  }

  /** Reset a route to its built-in default */
  reset(route: string) {
    return this.http.delete(
      `${environment.apiUrl}/nav-labels?route=${encodeURIComponent(route)}`
    ).pipe(
      tap(() => this.overrides.set(this.overrides().filter(o => o.route !== route)))
    );
  }
}
