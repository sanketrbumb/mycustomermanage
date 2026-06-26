import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth.service";
import { NavLabelService } from "../../../core/services/nav-label.service";

/** All customisable nav routes with built-in defaults */
const NAV_DEFAULTS = [
  { group: "Operations",  route: "/schedule",             label: "Schedule",       icon: "📅" },
  { group: "Operations",  route: "/admin/customers",      label: "Customers",      icon: "👥" },
  { group: "Billing",     route: "/billing/invoices",     label: "Invoices",       icon: "🧾" },
  { group: "Billing",     route: "/billing/payments",     label: "Payments",       icon: "💳" },
  { group: "Billing",     route: "/billing/refunds",      label: "Refunds",        icon: "↩"  },
  { group: "Billing",     route: "/reports",              label: "Reports",        icon: "📊" },
  { group: "Admin",       route: "/admin/staff",          label: "Staff",          icon: "👤" },
  { group: "Admin",       route: "/admin/resources",      label: "Resources",      icon: "🏠" },
  { group: "Admin",       route: "/admin/visit-types",    label: "Appt Types",     icon: "🏷️" },
  { group: "Admin",       route: "/admin/visit-statuses", label: "Appt Status",    icon: "🔄" },
  { group: "Admin",       route: "/admin/locations",      label: "Locations",      icon: "📍" },
  { group: "Admin",       route: "/admin/resource-hours", label: "Resource Hours", icon: "🕐" },
  { group: "Admin",       route: "/admin/settings",       label: "Settings",       icon: "⚙️" },
];

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">IAM & Settings</div>
          <div class="page-subtitle">Security policy, permissions and system configuration</div>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="tab() === 'general'"  (click)="tab.set('general')">
          ⚙️ General
        </button>
        <button class="tab-btn" [class.active]="tab() === 'security'" (click)="tab.set('security')">
          🔒 Security Policy
        </button>
        @if (auth.can('MODIFY_MENUS')) {
          <button class="tab-btn" [class.active]="tab() === 'menus'"  (click)="openMenuTab()">
            🏷️ Menu Labels
          </button>
        }
      </div>

      <!-- ── Tab: General ─────────────────────────────────────────────── -->
      @if (tab() === 'general') {
        <div class="card" style="padding:24px;margin-top:16px;">
          @if (loading()) {
            <div style="text-align:center;padding:40px;color:var(--ink-light);">Loading…</div>
          } @else {
            <h4 class="sect">Practice Branding</h4>
            <div class="g2">
              <div class="form-group">
                <label class="form-label">Practice Name</label>
                <input class="form-control" [(ngModel)]="practiceName"/>
              </div>
            </div>

            <h4 class="sect" style="margin-top:24px;">Session</h4>
            <div class="g2">
              <div class="form-group">
                <label class="form-label">Auto-logout after inactivity</label>
                <div style="display:flex;align-items:center;gap:10px;">
                  <input type="number" class="form-control" [(ngModel)]="idleTimeoutMinutes"
                         min="1" max="1440" step="5" style="width:110px;"/>
                  <span style="font-size:13px;color:var(--ink-light);">minutes</span>
                </div>
                <div style="font-size:11px;color:var(--ink-light);margin-top:4px;">
                  Users are signed out after this many minutes with no activity.
                  A warning appears 60 seconds before. Default: 60 min.
                </div>
              </div>
            </div>

            <div style="margin-top:20px;padding:16px;background:var(--jade-mist);border-radius:var(--radius);font-size:13px;color:var(--jade);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
              <span>ℹ️ Manage role permissions and access levels in the Roles panel.</span>
              <a class="btn btn-outline btn-sm" routerLink="/admin/roles">Configure Roles →</a>
            </div>

            <div style="margin-top:20px;display:flex;justify-content:flex-end;">
              <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? "Saving…" : "Save General Settings" }}
              </button>
            </div>
          }
        </div>
      }

      <!-- ── Tab: Security Policy ─────────────────────────────────────── -->
      @if (tab() === 'security') {
        <div class="card" style="padding:24px;margin-top:16px;">
          <h4 class="sect">Password Policy</h4>
          <div class="g2">
            <div class="form-group">
              <label class="form-label">Minimum Password Length</label>
              <input type="number" class="form-control" [(ngModel)]="minPassword" min="4" max="32"/>
            </div>
            <div class="form-group">
              <label class="form-label">Lock Account After (failed attempts)</label>
              <input type="number" class="form-control" [(ngModel)]="maxFails" min="1" max="20"/>
            </div>
          </div>
          <div style="margin-top:20px;display:flex;justify-content:flex-end;">
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Security Policy" }}
            </button>
          </div>
        </div>
      }

      <!-- ── Tab: Menu Labels ──────────────────────────────────────────── -->
      @if (tab() === 'menus') {
        <div class="card" style="padding:24px;margin-top:16px;">
          <p style="font-size:13px;color:var(--ink-light);margin-bottom:20px;">
            Customise the sidebar menu names for your practice.
            Leave the field blank to keep the built-in default.
            Changes are visible immediately after saving.
          </p>

          @for (group of navGroups(); track group) {
            <div style="margin-bottom:24px;">
              <div class="group-title">{{ group }}</div>
              @for (item of navByGroup(group); track item.route) {
                <div class="label-row">
                  <div class="label-default">
                    <span style="font-size:16px;">{{ item.icon }}</span>
                    <span style="font-size:13px;font-weight:600;">{{ item.label }}</span>
                    <span style="font-size:11px;color:var(--ink-light);">(default)</span>
                  </div>
                  <div class="label-inputs">
                    <input class="form-control" style="width:160px;font-size:13px;padding:5px 8px;"
                           [placeholder]="item.label"
                           [(ngModel)]="menuDrafts[item.route].label"
                           (ngModelChange)="menuDirty[item.route] = true"/>
                    <input class="form-control" style="width:50px;font-size:16px;padding:5px 6px;text-align:center;"
                           [placeholder]="item.icon"
                           [(ngModel)]="menuDrafts[item.route].icon"
                           (ngModelChange)="menuDirty[item.route] = true"/>
                    <button class="btn btn-primary btn-sm"
                            [disabled]="!menuDirty[item.route] || menuSaving() === item.route"
                            (click)="saveMenuLabel(item)">
                      {{ menuSaving() === item.route ? "…" : "Save" }}
                    </button>
                    @if (isMenuCustomised(item.route)) {
                      <button class="btn btn-ghost btn-sm"
                              style="color:var(--ink-light);"
                              (click)="resetMenuLabel(item)">
                        Reset
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .tab-bar { display:flex; gap:4px; border-bottom:2px solid var(--stone-mid); margin-top:4px; }
    .tab-btn  { padding:9px 18px; border:none; background:none; font-size:13px; font-weight:600;
                color:var(--ink-light); cursor:pointer; border-bottom:2px solid transparent;
                margin-bottom:-2px; transition:all .15s; border-radius:var(--radius) var(--radius) 0 0; }
    .tab-btn:hover  { color:var(--jade); background:var(--jade-mist); }
    .tab-btn.active { color:var(--jade); border-bottom-color:var(--jade); background:var(--jade-mist); }

    .sect { color:var(--jade); margin-bottom:14px; font-size:14px; }
    .g2   { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

    .group-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;
                   color:var(--jade); padding-bottom:6px; margin-bottom:10px;
                   border-bottom:1.5px solid var(--jade-mist); }
    .label-row   { display:flex; align-items:center; justify-content:space-between;
                   padding:8px 12px; background:var(--stone); border-radius:var(--radius);
                   margin-bottom:6px; gap:16px; flex-wrap:wrap; }
    .label-default { display:flex; align-items:center; gap:8px; min-width:160px; }
    .label-inputs  { display:flex; align-items:center; gap:6px; }
  `]
})
export class SettingsComponent implements OnInit {
  tab = signal<'general' | 'security' | 'menus'>('general');

  // General
  practiceName       = "Your Own CRM";
  idleTimeoutMinutes = 60;
  // Security
  minPassword = 6;
  maxFails    = 5;

  saving    = signal(false);
  loading   = signal(false);

  // Menu labels tab
  menuSaving = signal<string | null>(null);
  menuDrafts: Record<string, { label: string; icon: string }> = {};
  menuDirty:  Record<string, boolean> = {};

  navGroups = computed(() => [...new Set(NAV_DEFAULTS.map(d => d.group))]);
  navByGroup(group: string) { return NAV_DEFAULTS.filter(d => d.group === group); }

  constructor(
    private http:      HttpClient,
    private snack:     MatSnackBar,
    public  auth:      AuthService,
    public  navLabels: NavLabelService
  ) {
    // Initialise drafts from current overrides
    NAV_DEFAULTS.forEach(d => {
      this.menuDrafts[d.route] = {
        label: navLabels.label(d.route, ''),
        icon:  navLabels.icon(d.route, ''),
      };
      this.menuDirty[d.route] = false;
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/settings`).subscribe({
      next: res => {
        this.loading.set(false);
        this.practiceName       = res.practiceName;
        this.minPassword        = res.minPasswordLength;
        this.maxFails           = res.maxFailedLogins;
        this.idleTimeoutMinutes = res.idleTimeoutMinutes ?? 60;
      },
      error: () => {
        this.loading.set(false);
        this.snack.open("Failed to load settings.", "×", { duration: 3000 });
      }
    });
  }

  save() {
    this.saving.set(true);
    this.http.put<any>(`${environment.apiUrl}/settings`, {
      practiceName:      this.practiceName,
      minPasswordLength: this.minPassword,
      maxFailedLogins:   this.maxFails,
      idleTimeoutMinutes: this.idleTimeoutMinutes,
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.practiceName       = res.practiceName;
        this.minPassword        = res.minPasswordLength;
        this.maxFails           = res.maxFailedLogins;
        this.idleTimeoutMinutes = res.idleTimeoutMinutes ?? 60;
        this.snack.open("Settings saved.", "×", { duration: 3000 });
        this.auth.loadMe().subscribe();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.message ?? "Failed to save.", "×", { duration: 3000 });
      }
    });
  }

  openMenuTab() {
    this.tab.set('menus');
    this.navLabels.load().subscribe(() => {
      NAV_DEFAULTS.forEach(d => {
        const customLabel = this.navLabels.label(d.route, '');
        const customIcon  = this.navLabels.icon(d.route, '');
        if (!this.menuDirty[d.route]) {
          this.menuDrafts[d.route] = { label: customLabel === d.label ? '' : customLabel, icon: customIcon === d.icon ? '' : customIcon };
        }
      });
    });
  }

  isMenuCustomised(route: string): boolean {
    return this.navLabels.all().some(o => o.route === route);
  }

  saveMenuLabel(item: typeof NAV_DEFAULTS[0]) {
    const draft = this.menuDrafts[item.route];
    const label = draft.label.trim() || item.label;   // blank → use default
    const icon  = draft.icon.trim()  || item.icon;
    this.menuSaving.set(item.route);
    this.navLabels.save(item.route, label, icon).subscribe({
      next: () => {
        this.menuSaving.set(null);
        this.menuDirty[item.route] = false;
        this.snack.open(`"${label}" saved.`, "×", { duration: 2000 });
      },
      error: () => {
        this.menuSaving.set(null);
        this.snack.open("Could not save label.", "×", { duration: 3000 });
      }
    });
  }

  resetMenuLabel(item: typeof NAV_DEFAULTS[0]) {
    this.navLabels.reset(item.route).subscribe(() => {
      this.menuDrafts[item.route] = { label: '', icon: '' };
      this.menuDirty[item.route]  = false;
      this.snack.open("Reset to default.", "×", { duration: 2000 });
    });
  }
}
