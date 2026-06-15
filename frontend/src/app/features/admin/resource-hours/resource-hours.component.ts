import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { AdminService } from "../../../core/services/admin.service";
import { Resource, User, Location } from "../../../shared/models/admin.model";
import { environment } from "../../../../environments/environment";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Maps display day name to backend DayOfWeek enum value
const DAY_TO_ENUM: Record<string, string> = {
  Monday: "MONDAY", Tuesday: "TUESDAY", Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY", Friday: "FRIDAY", Saturday: "SATURDAY", Sunday: "SUNDAY"
};

interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
  locationId: number | null;  // null = All Locations
}
interface HoursConfig {
  priority: number;
  startDate: string;          // required — yyyy-MM-dd
  endDate: string | null;      // optional — null = always active
  days: Record<string, DayHours>;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: "app-resource-hours",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Resource / Staff Hours</div>
          <div class="page-subtitle">Configure working hours per resource or staff member</div>
        </div>
        @if (selectedKey && configs().length > 0) {
          <button class="btn btn-primary" (click)="saveHours()" [disabled]="saving()">
            {{ saving() ? "Saving…" : "💾 Save Hours" }}
          </button>
        }
      </div>

      <!-- Selector -->
      <div class="card" style="padding:16px 20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="margin:0;flex:1;min-width:240px;">
            <label class="form-label">Select Resource or Staff Member</label>
            <select class="form-control" [(ngModel)]="selectedKey" (change)="onSelect()">
              <option value="">— Select —</option>
              <optgroup label="🏠 Resources">
                @for (r of resources(); track r.id) {
                  <option [value]="'RESOURCE_' + r.id">{{ r.name }}</option>
                }
              </optgroup>
              <optgroup label="👤 Staff">
                @for (s of staff(); track s.id) {
                  <option [value]="'STAFF_' + s.id">
                    {{ s.firstName }} {{ s.lastName }}
                  </option>
                }
              </optgroup>
            </select>
          </div>
          @if (selectedKey) {
            <div style="display:flex;gap:6px;align-self:flex-end;padding-bottom:1px;">
              <button class="btn btn-ghost btn-sm" (click)="navigate(-1)">‹ Prev</button>
              <button class="btn btn-ghost btn-sm" (click)="navigate(1)">Next ›</button>
            </div>
          }
        </div>
      </div>

      <!-- Empty state -->
      @if (!selectedKey) {
        <div class="card" style="padding:40px;text-align:center;color:var(--ink-light);">
          <div style="font-size:36px;margin-bottom:12px;">🕐</div>
          <div style="font-family:var(--font-display);font-size:20px;color:var(--jade);margin-bottom:6px;">
            Select a Resource or Staff Member
          </div>
          <div style="font-size:13px;">Use the dropdown above to configure working hours.</div>
        </div>
      }

      <!-- No configs yet -->
      @if (selectedKey && configs().length === 0) {
        <div class="card" style="padding:32px;text-align:center;">
          <div style="font-size:13px;color:var(--ink-light);margin-bottom:14px;">
            No schedule configured yet for this resource.
          </div>
          <button class="btn btn-primary" (click)="addConfig()">
            + Add Working Hours
          </button>
        </div>
      }

      <!-- Config cards -->
      @for (cfg of configs(); track cfg.priority; let ci = $index) {
        <div class="card" style="margin-bottom:16px;overflow:hidden;">

          <!-- Card header -->
          <div style="display:flex;align-items:center;gap:10px;padding:12px 18px;flex-wrap:wrap;
                      background:var(--stone);border-bottom:1px solid var(--stone-mid);">
            <span class="badge badge-info">
              Config #{{ ci + 1 }}{{ ci === 0 ? " — Primary" : "" }}
            </span>

            <!-- Date range -->
            <div style="display:flex;align-items:center;gap:6px;">
              <label class="form-label" style="margin:0;font-size:11px;">Start Date *</label>
              <input type="date" class="form-control" style="font-size:12px;padding:5px 8px;width:140px;"
                     [(ngModel)]="cfg.startDate"/>
              <label class="form-label" style="margin:0 0 0 6px;font-size:11px;">End Date</label>
              <input type="date" class="form-control" style="font-size:12px;padding:5px 8px;width:140px;"
                     [(ngModel)]="cfg.endDate" placeholder="Always active"/>
              @if (!cfg.endDate) {
                <span class="badge badge-success" style="font-size:10px;">Always Active</span>
              }
            </div>

            <div style="margin-left:auto;display:flex;gap:4px;">
              @if (ci > 0) {
                <button class="btn btn-ghost btn-sm btn-icon"
                        (click)="moveConfig(ci, -1)" title="Increase priority">↑</button>
              }
              @if (ci < configs().length - 1) {
                <button class="btn btn-ghost btn-sm btn-icon"
                        (click)="moveConfig(ci, 1)" title="Decrease priority">↓</button>
              }
              <button class="btn btn-ghost btn-sm btn-icon"
                      (click)="deleteConfig(ci)"
                      style="color:var(--danger);" title="Delete">🗑</button>
            </div>
          </div>

          <!-- Quick actions -->
          <div style="padding:8px 18px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;
                      background:var(--stone);border-bottom:1px solid var(--stone-mid);">
            <span style="font-size:11px;font-weight:700;color:var(--ink-light);
                         text-transform:uppercase;margin-right:4px;">Quick set:</span>
            <button class="btn btn-ghost btn-sm" (click)="setAllDays(ci, true)">✅ All Open</button>
            <button class="btn btn-ghost btn-sm" (click)="setAllDays(ci, false)">🚫 All Closed</button>
            <button class="btn btn-ghost btn-sm" (click)="setWeekdays(ci)">📅 Mon–Fri</button>
            <button class="btn btn-ghost btn-sm" (click)="copyDown(ci)">⬇ Copy Monday</button>
          </div>

          <!-- Days table -->
          <div style="padding:4px 0 8px;overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;min-width:680px;">
              <thead>
                <tr>
                  <th class="day-th" style="width:44px;text-align:center;">On</th>
                  <th class="day-th">Day</th>
                  <th class="day-th">Opens</th>
                  <th class="day-th">Closes</th>
                  <th class="day-th">Location</th>
                  <th class="day-th">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (day of days; track day) {
                  <tr [style.background]="cfg.days[day].enabled ? 'var(--white)' : '#fafafa'"
                      [style.opacity]="cfg.days[day].enabled ? '1' : '0.5'">
                    <td class="day-td" style="text-align:center;">
                      <input type="checkbox"
                             [checked]="cfg.days[day].enabled"
                             (change)="cfg.days[day].enabled = $any($event.target).checked"
                             style="width:16px;height:16px;accent-color:var(--jade);cursor:pointer;"/>
                    </td>
                    <td class="day-td" style="font-weight:600;">{{ day }}</td>
                    <td class="day-td">
                      <input type="time" class="form-control"
                             style="width:120px;padding:5px 8px;"
                             [(ngModel)]="cfg.days[day].start"
                             [disabled]="!cfg.days[day].enabled"/>
                    </td>
                    <td class="day-td">
                      <input type="time" class="form-control"
                             style="width:120px;padding:5px 8px;"
                             [(ngModel)]="cfg.days[day].end"
                             [disabled]="!cfg.days[day].enabled"/>
                    </td>
                    <td class="day-td">
                      <select class="form-control" style="font-size:12px;padding:5px 8px;min-width:150px;"
                              [(ngModel)]="cfg.days[day].locationId"
                              [disabled]="!cfg.days[day].enabled">
                        <option [ngValue]="null">All Locations</option>
                        @for (loc of locations(); track loc.id) {
                          <option [ngValue]="loc.id">{{ loc.name }}</option>
                        }
                      </select>
                    </td>
                    <td class="day-td">
                      @if (cfg.days[day].enabled) {
                        <span class="badge badge-success">
                          {{ cfg.days[day].start }} – {{ cfg.days[day].end }}
                        </span>
                        @if (cfg.days[day].locationId) {
                          <span class="badge badge-info" style="margin-left:4px;">
                            {{ locationName(cfg.days[day].locationId) }}
                          </span>
                        }
                      } @else {
                        <span class="badge badge-neutral">Closed</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (selectedKey && configs().length > 0) {
        <button class="btn btn-outline btn-sm" (click)="addConfig()">
          + Add Another Configuration
        </button>
      }
    </div>
  `,
  styles: [`
    .day-th {
      padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700;
      color: var(--jade); background: var(--jade-mist);
      border-bottom: 1px solid var(--stone-mid);
    }
    .day-td {
      padding: 8px 12px; font-size: 13px;
      border-bottom: 1px solid var(--stone-mid);
      vertical-align: middle;
    }
  `]
})
export class ResourceHoursComponent implements OnInit {
  resources   = signal<Resource[]>([]);
  staff       = signal<User[]>([]);
  locations   = signal<Location[]>([]);
  configs     = signal<HoursConfig[]>([]);
  selectedKey = "";
  saving      = signal(false);
  days        = DAYS;

  constructor(
    private adminSvc: AdminService,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.adminSvc.getResources().subscribe(r => this.resources.set(r));
    this.adminSvc.getUsers().subscribe(u => this.staff.set(u.filter(s => s.active)));
    this.adminSvc.getLocations().subscribe(l => this.locations.set(l));
  }

  locationName(id: number | null): string {
    if (!id) return "";
    return this.locations().find(l => l.id === id)?.name ?? "";
  }

  // Parse "RESOURCE_1" → { entityType: "RESOURCE", entityId: 1 }
  private parseKey(key: string): { entityType: string; entityId: number } {
    const idx  = key.indexOf("_");
    const type = key.substring(0, idx);          // "RESOURCE" or "STAFF"
    const id   = Number(key.substring(idx + 1)); // 1
    return { entityType: type, entityId: id };
  }

  private allKeys(): string[] {
    return [
      ...this.resources().map(r => "RESOURCE_" + r.id),
      ...this.staff().map(s => "STAFF_" + s.id),
    ];
  }

  navigate(dir: number) {
    const all = this.allKeys();
    if (!all.length) return;
    let next = all.indexOf(this.selectedKey) + dir;
    if (next < 0) next = all.length - 1;
    if (next >= all.length) next = 0;
    this.selectedKey = all[next];
    this.onSelect();
  }

  onSelect() {
    if (!this.selectedKey) { this.configs.set([]); return; }
    const { entityType, entityId } = this.parseKey(this.selectedKey);
    this.http.get<any[]>(
      `${environment.apiUrl}/resource-schedules?entityType=${entityType}&entityId=${entityId}`
    ).pipe(catchError(() => of([])))
     .subscribe(schedules => {
       this.configs.set(schedules?.length ? this.parseSchedules(schedules) : []);
     });
  }

  /**
   * Groups rows by priority into config cards. Each row carries its own
   * locationId, startDate, and endDate now — the date range is read from
   * the FIRST row in each priority group (all rows in a group should share
   * the same date range, since they're saved together as one config).
   */
  private parseSchedules(schedules: any[]): HoursConfig[] {
    const byPriority = new Map<number, any[]>();
    schedules.forEach(s => {
      const p = s.priority ?? 0;
      if (!byPriority.has(p)) byPriority.set(p, []);
      byPriority.get(p)!.push(s);
    });
    return Array.from(byPriority.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([priority, items]) => ({
        priority,
        startDate: items[0]?.startDate ?? todayStr(),
        endDate:   items[0]?.endDate   ?? null,
        days:      this.buildDaysFromRows(items),
      }));
  }

  private buildDaysFromRows(rows: any[]): Record<string, DayHours> {
    const d: Record<string, DayHours> = {};
    DAYS.forEach(day => {
      const row = rows.find(r =>
        r.dayOfWeek?.toUpperCase() === DAY_TO_ENUM[day]
      );
      d[day] = {
        enabled:    row?.open ?? false,
        start:      row?.openTime  ?? "09:00",
        end:        row?.closeTime ?? "18:00",
        locationId: row?.locationId ?? null,
      };
    });
    return d;
  }

  private defaultDays(): Record<string, DayHours> {
    const d: Record<string, DayHours> = {};
    DAYS.forEach((day, i) => {
      d[day] = { enabled: i < 5, start: "09:00", end: "18:00", locationId: null };
    });
    return d;
  }

  addConfig() {
    const cfgs = [...this.configs()];
    cfgs.push({
      priority: cfgs.length,
      startDate: todayStr(),
      endDate: null,
      days: this.defaultDays(),
    });
    this.configs.set(cfgs);
  }

  deleteConfig(ci: number) {
    if (!confirm("Delete this configuration?")) return;
    const cfgs = [...this.configs()];
    cfgs.splice(ci, 1);
    cfgs.forEach((c, i) => { c.priority = i; });
    this.configs.set(cfgs);
  }

  moveConfig(ci: number, dir: number) {
    const cfgs = [...this.configs()];
    const ni = ci + dir;
    if (ni < 0 || ni >= cfgs.length) return;
    [cfgs[ci], cfgs[ni]] = [cfgs[ni], cfgs[ci]];
    cfgs.forEach((c, i) => { c.priority = i; });
    this.configs.set(cfgs);
  }

  setAllDays(ci: number, enabled: boolean) {
    const cfgs = [...this.configs()];
    DAYS.forEach(d => { cfgs[ci].days[d].enabled = enabled; });
    this.configs.set(cfgs);
  }

  setWeekdays(ci: number) {
    const cfgs = [...this.configs()];
    DAYS.forEach((d, i) => { cfgs[ci].days[d].enabled = i < 5; });
    this.configs.set(cfgs);
  }

  copyDown(ci: number) {
    const cfgs = [...this.configs()];
    const mon  = { ...cfgs[ci].days["Monday"] };
    DAYS.slice(1).forEach(d => { cfgs[ci].days[d] = { ...mon }; });
    this.configs.set(cfgs);
    this.snack.open("Monday hours (including location) copied to all days.", "×", { duration: 2000 });
  }

  /**
   * Saves the ENTIRE schedule for the selected entity in a SINGLE bulk
   * PUT request — replaces the previous "14 parallel POST requests" approach
   * which had a race condition (each request independently read existing
   * rows before others committed, so only the last-committing request's
   * data would actually persist — this is why only the second
   * configuration appeared to save).
   */
  saveHours() {
    if (!this.selectedKey) return;

    // Validate start dates are present
    for (const cfg of this.configs()) {
      if (!cfg.startDate) {
        this.snack.open("Start Date is required for every configuration.", "×", { duration: 3500 });
        return;
      }
      if (cfg.endDate && cfg.endDate < cfg.startDate) {
        this.snack.open("End Date cannot be before Start Date.", "×", { duration: 3500 });
        return;
      }
    }

    this.saving.set(true);
    const { entityType, entityId } = this.parseKey(this.selectedKey);

    // Build one row per day per config — each row carries its own
    // locationId, startDate, endDate
    const rows: any[] = [];
    this.configs().forEach(cfg => {
      DAYS.forEach(day => {
        const dh = cfg.days[day];
        rows.push({
          dayOfWeek:   DAY_TO_ENUM[day],
          priority:    cfg.priority,
          open:        dh.enabled,
          openTime:    dh.start,
          closeTime:   dh.end,
          locationId:  dh.locationId,
          startDate:   cfg.startDate,
          endDate:     cfg.endDate,
        });
      });
    });

    this.http.put<any[]>(
      `${environment.apiUrl}/resource-schedules?entityType=${entityType}&entityId=${entityId}`,
      { rows }
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open("Hours saved successfully.", "×", { duration: 3000 });
        this.onSelect(); // Reload to show saved state
      },
      error: e => {
        this.saving.set(false);
        this.snack.open(e.error?.message ?? "Save failed. Check server logs.", "×", { duration: 4000 });
      }
    });
  }
}
