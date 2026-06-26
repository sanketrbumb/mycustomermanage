import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { NavLabelService } from "../../../core/services/nav-label.service";

/** All customisable routes with their built-in defaults */
const DEFAULTS: { group: string; route: string; label: string; icon: string }[] = [
  { group: "Operations",  route: "/schedule",               label: "Schedule",       icon: "📅" },
  { group: "Operations",  route: "/admin/customers",        label: "Customers",      icon: "👥" },
  { group: "Billing",     route: "/billing/invoices",       label: "Invoices",       icon: "🧾" },
  { group: "Billing",     route: "/billing/payments",       label: "Payments",       icon: "💳" },
  { group: "Billing",     route: "/billing/refunds",        label: "Refunds",        icon: "↩"  },
  { group: "Billing",     route: "/reports",                label: "Reports",        icon: "📊" },
  { group: "Admin",       route: "/admin/staff",            label: "Staff",          icon: "👤" },
  { group: "Admin",       route: "/admin/resources",        label: "Resources",      icon: "🏠" },
  { group: "Admin",       route: "/admin/visit-types",      label: "Appt Types",     icon: "🏷️" },
  { group: "Admin",       route: "/admin/visit-statuses",   label: "Appt Status",    icon: "🔄" },
  { group: "Admin",       route: "/admin/locations",        label: "Locations",      icon: "📍" },
  { group: "Admin",       route: "/admin/resource-hours",   label: "Resource Hours", icon: "🕐" },
  { group: "Admin",       route: "/admin/settings",         label: "Settings",       icon: "⚙️" },
];

@Component({
  selector: "app-nav-labels-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="sect-head" style="margin-bottom:16px;">Menu Labels</div>
      <p style="font-size:13px;color:var(--ink-light);margin-bottom:20px;">
        Customise the sidebar menu names for your practice.
        Changes take effect immediately after saving.
        <strong>Reset</strong> restores the built-in default.
      </p>

      @for (group of groups(); track group) {
        <div style="margin-bottom:24px;">
          <div class="group-title">{{ group }}</div>
          <div class="label-grid">
            @for (item of byGroup(group); track item.route) {
              <div class="label-row">
                <div class="label-default">
                  <span class="def-icon">{{ item.icon }}</span>
                  <span class="def-label">{{ item.label }}</span>
                  <span class="def-hint">(default)</span>
                </div>
                <div class="label-inputs">
                  <input class="form-control input-sm"
                         [value]="currentLabel(item.route, item.label)"
                         (input)="setDraft(item.route, 'label', $any($event.target).value)"
                         placeholder="{{ item.label }}"
                         style="width:160px;"/>
                  <input class="form-control input-sm"
                         [value]="currentIcon(item.route, item.icon)"
                         (input)="setDraft(item.route, 'icon', $any($event.target).value)"
                         placeholder="{{ item.icon }}"
                         style="width:54px;text-align:center;font-size:16px;"/>
                  <button class="btn btn-primary btn-sm"
                          (click)="save(item.route, item.label, item.icon)"
                          [disabled]="saving() === item.route">
                    {{ saving() === item.route ? "…" : "Save" }}
                  </button>
                  @if (isCustomised(item.route)) {
                    <button class="btn btn-ghost btn-sm reset-btn"
                            (click)="reset(item.route)">
                      Reset
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .group-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: var(--jade);
      padding-bottom: 6px; margin-bottom: 10px;
      border-bottom: 1.5px solid var(--jade-mist);
    }
    .label-grid { display: flex; flex-direction: column; gap: 6px; }
    .label-row {
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--stone);
      border-radius: var(--radius);
      gap: 16px;
      flex-wrap: wrap;
    }
    .label-default { display: flex; align-items: center; gap: 8px; min-width: 160px; }
    .def-icon  { font-size: 16px; }
    .def-label { font-size: 13px; font-weight: 600; color: var(--ink); }
    .def-hint  { font-size: 11px; color: var(--ink-light); }
    .label-inputs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .input-sm  { padding: 5px 8px; font-size: 13px; height: 32px; }
    .reset-btn { color: var(--ink-light); font-size: 12px; }
    .reset-btn:hover { color: var(--danger); }
  `]
})
export class NavLabelsSettingsComponent implements OnInit {

  saving = signal<string | null>(null);

  // Draft edits before saving — keyed by route
  private drafts: Record<string, { label?: string; icon?: string }> = {};

  groups = computed(() =>
    [...new Set(DEFAULTS.map(d => d.group))]
  );

  constructor(public navLabels: NavLabelService, private snack: MatSnackBar) {}

  ngOnInit() { this.navLabels.load().subscribe(); }

  byGroup(group: string) { return DEFAULTS.filter(d => d.group === group); }

  currentLabel(route: string, def: string): string {
    return this.drafts[route]?.label ?? this.navLabels.label(route, def);
  }

  currentIcon(route: string, def: string): string {
    return this.drafts[route]?.icon ?? this.navLabels.icon(route, def);
  }

  isCustomised(route: string): boolean {
    return this.navLabels.all().some(o => o.route === route);
  }

  setDraft(route: string, field: "label" | "icon", value: string) {
    if (!this.drafts[route]) this.drafts[route] = {};
    this.drafts[route][field] = value;
  }

  save(route: string, defLabel: string, defIcon: string) {
    const label = this.currentLabel(route, defLabel).trim();
    const icon  = this.currentIcon(route, defIcon).trim();
    if (!label) return;
    this.saving.set(route);
    this.navLabels.save(route, label, icon || undefined).subscribe({
      next: () => {
        this.saving.set(null);
        delete this.drafts[route];
        this.snack.open("Label saved.", "×", { duration: 2000 });
      },
      error: () => {
        this.saving.set(null);
        this.snack.open("Could not save label.", "×", { duration: 3000 });
      }
    });
  }

  reset(route: string) {
    this.navLabels.reset(route).subscribe({
      next: () => {
        delete this.drafts[route];
        this.snack.open("Reset to default.", "×", { duration: 2000 });
      }
    });
  }
}
