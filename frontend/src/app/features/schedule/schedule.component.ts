import {
  Component, OnInit, OnDestroy, signal, computed, NgZone
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { AppointmentService } from "../../core/services/appointment.service";
import { AdminService } from "../../core/services/admin.service";
import { ScheduleStateService } from "../../core/services/schedule-state.service";
import { Resource, Location, User } from "../../shared/models/admin.model";
import { Appointment } from "../../shared/models/appointment.model";
import { AppointmentDialogComponent } from "./appointment-dialog.component";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { forkJoin, of } from "rxjs";
import { catchError } from "rxjs/operators";

const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const ALL_HOURS  = Array.from({ length: 24 }, (_, i) => i); // 0-23
const STAFF_COLORS = ["#5b6abf","#b06abf","#bf6a6a","#6abfb0","#8c6abf","#bf936a","#6a8cbf","#bf6a93"];
const PX_PER_HR  = 80;   // pixels per hour (compact)
const PX_PER_MIN = PX_PER_HR / 60;

@Component({
  selector: "app-schedule",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div style="display:flex;height:100%;width:100%;background:var(--stone);">

      <!-- ══ LEFT SIDEBAR ══ -->
      <div style="width:220px;flex-shrink:0;background:#fff;border-right:1px solid var(--stone-mid);display:flex;flex-direction:column;overflow-y:auto;">

        <!-- Mini calendar -->
        <div style="padding:14px 12px 10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <button class="mini-cal-nav" (click)="miniCalNav(-1)">‹</button>
            <div style="font-family:var(--font-display);font-size:15px;color:var(--jade);font-weight:500;">
              {{ miniCalLabel() }}
            </div>
            <button class="mini-cal-nav" (click)="miniCalNav(1)">›</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;">
            @for (d of DAYS_SHORT; track d) {
              <div style="font-size:9px;font-weight:700;color:var(--ink-light);text-align:center;padding:3px 0;text-transform:uppercase;">{{ d }}</div>
            }
            @for (cell of miniCalCells(); track cell.key) {
              <div [ngClass]="miniCalDayClass(cell)"
                   style="font-size:11px;text-align:center;padding:4px 2px;cursor:pointer;position:relative;border-radius:50%;transition:all .12s;"
                   (click)="cell.day && selectDay(cell.year, cell.month, cell.day)">
                {{ cell.label }}
                @if (cell.hasAppt && !cell.isSelected && !cell.isToday) {
                  <div style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--gold);"></div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Resources -->
        <div style="padding:10px 12px 6px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;color:var(--ink-light);text-transform:uppercase;letter-spacing:.1em;">Resources</span>
            <div style="display:flex;gap:4px;">
              <button class="res-all-btn" (click)="selectAllRes(true)">All</button>
              <span style="color:var(--stone-dark);font-size:10px;">|</span>
              <button class="res-all-btn" (click)="selectAllRes(false)">None</button>
            </div>
          </div>
          @for (r of filteredResources(); track r.id) {
            <label style="display:flex;align-items:center;gap:7px;padding:4px;cursor:pointer;font-size:12px;border-radius:6px;user-select:none;">
              <input type="checkbox" [checked]="state.visibleResources()[r.id]"
                     (change)="toggleResource(r.id, $any($event.target).checked)" style="display:none;"/>
              <div [style.background]="r.colorHex" style="width:10px;height:10px;border-radius:3px;flex-shrink:0;"></div>
              <span style="width:14px;height:14px;border:1.5px solid var(--stone-dark);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--jade);">{{ state.visibleResources()[r.id] ? "✓" : "" }}</span>
              <span style="flex:1;color:var(--ink);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ r.name }}</span>
            </label>
          }
          @if (!filteredResources().length) {
            <div style="font-size:11px;color:var(--ink-light);padding:4px;">No resources.</div>
          }
        </div>

        <!-- Staff -->
        <div style="padding:6px 12px 14px;border-top:1px solid var(--stone-mid);margin-top:6px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;color:var(--ink-light);text-transform:uppercase;letter-spacing:.1em;">Staff</span>
            <div style="display:flex;gap:4px;">
              <button class="res-all-btn" (click)="selectAllStaff(true)">All</button>
              <span style="color:var(--stone-dark);font-size:10px;">|</span>
              <button class="res-all-btn" (click)="selectAllStaff(false)">None</button>
            </div>
          </div>
          @for (s of activeStaff(); track s.id) {
            <label style="display:flex;align-items:center;gap:7px;padding:4px;cursor:pointer;font-size:12px;border-radius:6px;user-select:none;">
              <input type="checkbox" [checked]="state.visibleStaff()[s.id]"
                     (change)="toggleStaff(s.id, $any($event.target).checked)" style="display:none;"/>
              <div [style.background]="staffColor(s.id)" style="width:12px;height:12px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;">{{ initials(s) }}</div>
              <span style="width:14px;height:14px;border:1.5px solid var(--stone-dark);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--jade);">{{ state.visibleStaff()[s.id] ? "✓" : "" }}</span>
              <span style="flex:1;color:var(--ink);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ s.firstName }} {{ s.lastName }}</span>
            </label>
          }
        </div>
      </div>

      <!-- ══ MAIN ══ -->
      <div style="flex:1;display:flex;flex-direction:column;min-width:0;">

        <!-- Toolbar -->
        <div style="background:#fff;border-bottom:1px solid var(--stone-mid);padding:8px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;">
          <div style="font-family:var(--font-display);font-size:18px;color:var(--jade);white-space:nowrap;">
            {{ formattedDate() }}
          </div>
          <button class="tb-btn" (click)="goToday()">Today</button>
          <div style="flex:1;"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px;font-weight:700;color:var(--ink-light);text-transform:uppercase;">📍</span>
            <select style="font-size:12px;padding:4px 8px;height:30px;border:1.5px solid var(--stone-dark);border-radius:6px;background:#fff;min-width:140px;"
                    [ngModel]="state.selectedLocationId"
                    (ngModelChange)="onLocationChange($event)">
              <option [ngValue]="null">All Locations</option>
              @for (loc of state.locations(); track loc.id) {
                <option [ngValue]="loc.id">{{ loc.name }}</option>
              }
            </select>
          </div>
          <div style="width:1px;height:22px;background:var(--stone-mid);"></div>
          <button class="tb-btn" [class.active]="state.view==='day'" (click)="setView('day')">Day</button>
          <button class="tb-btn" [class.active]="state.view==='week'" (click)="setView('week')">Week</button>
          <button class="btn btn-primary" type="button"
                  (mousedown)="$event.preventDefault()"
                  (click)="openApptModal()">+ New Appointment</button>
        </div>

        @if (loading()) {
          <div style="height:3px;background:var(--stone-mid);flex-shrink:0;overflow:hidden;">
            <div style="height:100%;width:40%;background:var(--jade);animation:cal-slide 1s ease-in-out infinite alternate;"></div>
          </div>
        }

        <!-- ══ DAY VIEW ══ -->
        @if (state.view === 'day') {
          <div style="flex:1;overflow:auto;background:var(--stone);">
            <div style="display:flex;min-height:100%;width:100%;">

              <!-- Time gutter — shows full visible hour range -->
              <div style="width:52px;flex-shrink:0;background:#fff;border-right:1px solid var(--stone-mid);">
                <div style="height:36px;border-bottom:2px solid var(--stone-mid);background:var(--stone);"></div>
                @for (h of visibleHours(); track h) {
                  <div style="height:80px;display:flex;align-items:flex-start;justify-content:flex-end;padding:3px 6px 0 0;font-size:10px;color:var(--ink-light);font-weight:600;border-bottom:1px solid var(--stone-mid);">
                    {{ formatHour(h) }}
                  </div>
                }
              </div>

              <!-- Resource + Staff columns -->
              <div style="flex:1;display:flex;min-width:0;">
                @for (r of visibleResourceList(); track r.id) {
                  <div style="flex:1;min-width:130px;border-right:1px solid var(--stone-mid);">
                    <div [style.background]="r.colorHex"
                         style="height:36px;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:600;padding:0 8px;position:sticky;top:0;z-index:10;border-bottom:2px solid rgba(0,0,0,.15);">
                      {{ r.name }}
                    </div>
                    <div style="position:relative;background:#fff;">
                      <!-- Location color bands — painted first, z-index:0 -->
                      @for (band of getBands('RES_' + r.id); track band.start) {
                        <div [style.top.px]="bandTop(band.start)"
                             [style.height.px]="bandHeight(band.start, band.end)"
                             [style.background]="band.color"
                             [style.borderLeftColor]="band.solidColor"
                             [title]="band.locationName + ' (' + formatHour(band.start) + ' - ' + formatHour(band.end) + ')'"
                             style="position:absolute;left:0;right:0;pointer-events:none;z-index:0;border-left:4px solid;">
                        </div>
                      }
                      <!-- Hour rows — transparent background so bands show through -->
                      @for (h of visibleHours(); track h) {
                        <div style="height:80px;border-bottom:1px solid var(--stone-mid);position:relative;cursor:pointer;background:transparent;z-index:2;"
                             (dblclick)="openApptModal(r.id, null, h)">
                          <div style="position:absolute;left:0;right:0;top:20px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:40px;border-top:1px dashed rgba(0,0,0,.15);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:60px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                        </div>
                      }
                      <!-- Appointments — always on top -->
                      @for (a of apptsByResource(r.id); track a.id) {
                        <div [style.background]="r.colorHex"
                             [style.top.px]="apptTop(a)"
                             [style.height.px]="apptHeight(a)"
                             style="position:absolute;left:2px;right:2px;border-radius:5px;padding:3px 6px;cursor:pointer;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.18);z-index:5;"
                             (dblclick)="openApptModal(r.id, null, null, a)"
                             (contextmenu)="onCtxMenu($event, a)">
                          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ a.customerFullName }}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,.85);">{{ a.visitTypeName }}</div>
                          <div style="font-size:9px;background:rgba(255,255,255,.25);padding:1px 4px;border-radius:8px;color:#fff;display:inline-block;margin-top:1px;">{{ a.visitStatusName }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }
                @for (s of visibleStaffList(); track s.id) {
                  <div style="flex:1;min-width:130px;border-right:1px solid var(--stone-mid);">
                    <div [style.background]="staffColor(s.id)"
                         style="height:36px;color:#fff;display:flex;align-items:center;gap:6px;padding:0 8px;position:sticky;top:0;z-index:10;border-bottom:2px solid rgba(0,0,0,.15);">
                      <div style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;">{{ initials(s) }}</div>
                      <span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ s.firstName }} {{ s.lastName }}</span>
                    </div>
                    <div style="position:relative;background:#fff;">
                      <!-- Location color bands — painted first, z-index:0 -->
                      @for (band of getBands('STAFF_' + s.id); track band.start) {
                        <div [style.top.px]="bandTop(band.start)"
                             [style.height.px]="bandHeight(band.start, band.end)"
                             [style.background]="band.color"
                             [style.borderLeftColor]="band.solidColor"
                             [title]="band.locationName + ' (' + formatHour(band.start) + ' - ' + formatHour(band.end) + ')'"
                             style="position:absolute;left:0;right:0;pointer-events:none;z-index:0;border-left:4px solid;">
                        </div>
                      }
                      @for (h of visibleHours(); track h) {
                        <div style="height:80px;border-bottom:1px solid var(--stone-mid);position:relative;cursor:pointer;background:transparent;z-index:2;"
                             (dblclick)="openApptModal(null, s.id, h)">
                          <div style="position:absolute;left:0;right:0;top:20px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:40px;border-top:1px dashed rgba(0,0,0,.15);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:60px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                        </div>
                      }
                      @for (a of apptsByStaff(s.id); track a.id) {
                        <div [style.background]="staffColor(s.id)"
                             [style.top.px]="apptTop(a)"
                             [style.height.px]="apptHeight(a)"
                             style="position:absolute;left:2px;right:2px;border-radius:5px;padding:3px 6px;cursor:pointer;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.18);z-index:5;"
                             (dblclick)="openApptModal(null, s.id, null, a)"
                             (contextmenu)="onCtxMenu($event, a)">
                          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ a.customerFullName }}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,.85);">{{ a.visitTypeName }}</div>
                          <div style="font-size:9px;background:rgba(255,255,255,.25);padding:1px 4px;border-radius:8px;color:#fff;display:inline-block;margin-top:1px;">{{ a.visitStatusName }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }
                @if (!visibleResourceList().length && !visibleStaffList().length) {
                  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;color:var(--ink-light);text-align:center;flex:1;">
                    <div style="font-size:42px;margin-bottom:12px;">📅</div>
                    <div style="font-family:var(--font-display);font-size:20px;color:var(--jade);margin-bottom:8px;">No columns visible</div>
                    <div style="font-size:13px;">Check a Resource or Staff member in the left sidebar.</div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- ══ WEEK VIEW ══ -->
        @if (state.view === 'week') {
          <div style="flex:1;overflow:auto;background:var(--stone);">
            @if (weekEntity()) {
              <div style="display:flex;min-height:100%;width:100%;">
                <!-- Time gutter -->
                <div style="width:52px;flex-shrink:0;background:#fff;border-right:1px solid var(--stone-mid);">
                  <div style="height:36px;border-bottom:2px solid var(--stone-mid);background:var(--stone);"></div>
                  @for (h of visibleHours(); track h) {
                    <div style="height:80px;display:flex;align-items:flex-start;justify-content:flex-end;padding:3px 6px 0 0;font-size:10px;color:var(--ink-light);font-weight:600;border-bottom:1px solid var(--stone-mid);">
                      {{ formatHour(h) }}
                    </div>
                  }
                </div>
                <!-- 7 day columns -->
                @for (day of weekDays(); track day.dateStr) {
                  <div style="flex:1;min-width:100px;border-right:1px solid var(--stone-mid);">
                    <div [style.background]="weekEntity()!.color"
                         [style.filter]="day.isToday ? 'brightness(1.15)' : 'none'"
                         style="height:36px;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;position:sticky;top:0;z-index:10;border-bottom:2px solid rgba(0,0,0,.15);cursor:pointer;"
                         (click)="jumpToDay(day.date)">
                      <div style="font-size:9px;font-weight:700;opacity:.8;text-transform:uppercase;letter-spacing:.06em;">{{ day.dow }}</div>
                      <div style="font-family:var(--font-display);font-size:17px;font-weight:600;line-height:1;">{{ day.date.getDate() }}</div>
                    </div>
                    <div style="position:relative;">
                      @for (h of visibleHours(); track h) {
                        <div style="height:80px;border-bottom:1px solid var(--stone-mid);position:relative;cursor:pointer;background:#fff;"
                             (dblclick)="openApptModalWeek(day.dateStr, h)">
                          <div style="position:absolute;left:0;right:0;top:20px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:40px;border-top:1px dashed rgba(0,0,0,.15);pointer-events:none;"></div>
                          <div style="position:absolute;left:0;right:0;top:60px;border-top:1px dashed rgba(0,0,0,.08);pointer-events:none;"></div>
                        </div>
                      }
                      @for (a of weekApptsByDay(day.dateStr); track a.id) {
                        <div [style.background]="weekEntity()!.color"
                             [style.top.px]="apptTop(a)"
                             [style.height.px]="apptHeight(a)"
                             style="position:absolute;left:2px;right:2px;border-radius:5px;padding:3px 6px;cursor:pointer;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.18);z-index:5;"
                             (dblclick)="openApptModalWeek(day.dateStr, null, a)"
                             (contextmenu)="onCtxMenu($event, a)">
                          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ a.customerFullName }}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,.85);">{{ a.visitTypeName }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--ink-light);text-align:center;padding:40px;">
                <div style="font-size:36px;margin-bottom:12px;">📅</div>
                <div style="font-family:var(--font-display);font-size:20px;color:var(--jade);margin-bottom:8px;">
                  Select exactly one Resource or Staff column for Week view
                </div>
                <div style="font-size:13px;">In the sidebar, deselect all but one, then click Week.</div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Context menu -->
      @if (ctxMenu().visible) {
        <div style="position:fixed;background:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18);border:1px solid var(--stone-mid);z-index:9999;min-width:195px;padding:6px 0;"
             [style.top.px]="ctxMenu().y"
             [style.left.px]="ctxMenu().x"
             (click)="$event.stopPropagation()">
          <div style="padding:9px 16px;cursor:pointer;font-size:13px;color:var(--ink-mid);"
               (click)="ctxEdit()">✏️ Edit</div>
          <div style="height:1px;background:var(--stone-mid);margin:4px 0;"></div>
          <div style="padding:9px 16px;cursor:pointer;font-size:13px;color:var(--danger);"
               (click)="ctxCancel()">🚫 Cancel Appointment</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .mini-cal-nav { width:24px;height:24px;border:none;background:none;cursor:pointer;color:var(--jade-light);font-size:14px;border-radius:4px; }
    .mini-cal-nav:hover { background:var(--jade-mist);color:var(--jade); }
    .res-all-btn { font-size:10px;color:var(--jade-light);cursor:pointer;background:none;border:none;font-family:var(--font-body);padding:0; }
    .res-all-btn:hover { color:var(--jade); }
    .tb-btn { padding:5px 11px;border:1.5px solid var(--stone-dark);background:#fff;border-radius:6px;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:500;transition:all .15s; }
    .tb-btn:hover  { background:var(--jade-mist);border-color:var(--jade-light);color:var(--jade); }
    .tb-btn.active { background:var(--jade);color:#fff;border-color:var(--jade); }
    .day-today     { background:var(--jade) !important;color:#fff !important;font-weight:700 !important; }
    .day-selected  { background:var(--jade-mist) !important;color:var(--jade) !important;font-weight:700 !important;outline:1.5px solid var(--jade-light); }
    .day-today-selected { background:var(--jade) !important;color:#fff !important;font-weight:700 !important; }
    .day-other     { color:var(--stone-dark) !important; }
    .day-normal    { color:var(--ink-mid); }
    .day-normal:hover { background:var(--jade-mist);color:var(--jade); }
    @keyframes cal-slide { from { margin-left:-40%; } to { margin-left:100%; } }
  `]
})
export class ScheduleComponent implements OnInit, OnDestroy {
  DAYS_SHORT = DAYS_SHORT;

  // appointments backed by state so they survive component destroy/recreate
  get appointments() { return this.state.appointments; }
  weekAppointments = signal<Appointment[]>([]);
  loading          = signal(false);
  private refreshTimer: any;

  // Track current date as signal so template updates reactively
  currentDateSig = signal(new Date());
  miniCalMonth   = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  ctxMenu = signal<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  ctxApptId: number | null = null;

  filteredResources = computed(() => {
    const lId = this.state.selectedLocationId;
    return this.state.resources().filter(r =>
      r.active && (!lId || r.locationId === lId || lId === null)
    );
  });
  activeStaff = computed(() => this.state.allUsers().filter(u => u.active && u.canBookAppts));
  visibleResourceList = computed(() => this.filteredResources().filter(r => this.state.visibleResources()[r.id]));
  visibleStaffList    = computed(() => this.activeStaff().filter(s => this.state.visibleStaff()[s.id]));
  totalColumns = computed(() => this.visibleResourceList().length + this.visibleStaffList().length);

  // Dynamic hour range — based on working hours of visible resources/staff
  // Falls back to 7-22 if no schedule data
  visibleHours = computed(() => {
    const scheds = this.workingHoursMap();
    const keys = [
      ...this.visibleResourceList().map(r => 'RES_' + r.id),
      ...this.visibleStaffList().map(s => 'STAFF_' + s.id),
    ];
    if (!keys.length || !scheds.size) return Array.from({ length: 15 }, (_, i) => i + 7);

    let minH = 23, maxH = 8;
    keys.forEach(k => {
      const h = scheds.get(k);
      if (h) { if (h.start < minH) minH = h.start; if (h.end > maxH) maxH = h.end; }
    });
    // Extend 1 hr before and after, clamp to 0-23
    minH = Math.max(0, minH - 1);
    maxH = Math.min(23, maxH + 1);
    if (minH >= maxH) return Array.from({ length: 15 }, (_, i) => i + 7);
    return Array.from({ length: maxH - minH + 1 }, (_, i) => i + minH);
  });

  workingHoursMap = signal<Map<string, { start: number; end: number }>>(new Map());

  // Location color bands: key = 'RES_id' or 'STAFF_id', value = array of {start, end, color, locationName}
  locationBands = signal<Map<string, Array<{start:number;end:number;color:string;solidColor:string;locationName:string}>>>(new Map());

  formattedDate = computed(() => {
    const d = this.currentDateSig();
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  miniCalLabel = computed(() => {
    const m = this.miniCalMonth();
    return `${MONTHS[m.getMonth()]} ${m.getFullYear()}`;
  });

  miniCalCells = computed(() => {
    const m = this.miniCalMonth().getMonth(), y = this.miniCalMonth().getFullYear();
    const today = new Date(), cur = this.currentDateSig();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev  = new Date(y, m, 0).getDate();
    const apptDays = new Set(
      this.appointments().filter(a => {
        if (!a.apptDate) return false;
        const d = new Date(a.apptDate);
        return d.getMonth() === m && d.getFullYear() === y;
      }).map(a => new Date(a.apptDate).getDate())
    );
    const cells: any[] = [];
    for (let i = firstDay - 1; i >= 0; i--)
      cells.push({ key:`p${i}`, label: daysInPrev-i, day:null, month:m-1, year:y, otherMonth:true, isToday:false, isSelected:false, hasAppt:false });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        key:`c${d}`, label:d, day:d, month:m, year:y, otherMonth:false,
        isToday:    d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear(),
        isSelected: d===cur.getDate()&&m===cur.getMonth()&&y===cur.getFullYear(),
        hasAppt:    apptDays.has(d)
      });
    }
    const rem = cells.length%7===0?0:7-(cells.length%7);
    for (let d = 1; d <= rem; d++)
      cells.push({ key:`n${d}`, label:d, day:null, month:m+1, year:y, otherMonth:true, isToday:false, isSelected:false, hasAppt:false });
    return cells;
  });

  miniCalDayClass(cell: any): string {
    if (cell.otherMonth)             return 'day-other';
    if (cell.isToday && cell.isSelected) return 'day-today-selected';
    if (cell.isToday)                return 'day-today';
    if (cell.isSelected)             return 'day-selected';
    return 'day-normal';
  }

  weekDays = computed(() => {
    const today = new Date(), base = new Date(this.currentDateSig());
    const dow = base.getDay(), monday = new Date(base);
    monday.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      return { date:d, dateStr:d.toISOString().slice(0,10), dow:DAYS_SHORT[d.getDay()], isToday:d.toDateString()===today.toDateString() };
    });
  });

  weekEntity = computed((): { id:number; type:string; color:string }|null => {
    const rl = this.visibleResourceList(), sl = this.visibleStaffList();
    if (rl.length+sl.length !== 1) return null;
    if (rl.length===1) return { id:rl[0].id, type:"resource", color:rl[0].colorHex };
    return { id:sl[0].id, type:"staff", color:this.staffColor(sl[0].id) };
  });

  private closeCtxBound = () => this.closeCtx();

  constructor(
    private apptSvc: AppointmentService,
    private adminSvc: AdminService,
    public  state: ScheduleStateService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private http: HttpClient,
    private zone: NgZone
  ) {}

  ngOnInit() {
    // Restore previously selected date/month from persistent state service
    const saved = this.state.currentDate;
    this.currentDateSig.set(new Date(saved));
    this.miniCalMonth.set(new Date(saved.getFullYear(), saved.getMonth(), 1));
    document.addEventListener("click", this.closeCtxBound);
    this.loadLookups();
    // Always load schedule immediately on init — don't wait for lookups
    this.loadSchedule();
    this.refreshTimer = setInterval(() => this.loadSchedule(), 120_000);
  }

  ngOnDestroy() {
    document.removeEventListener("click", this.closeCtxBound);
    clearInterval(this.refreshTimer);
  }

  private loadLookups() {
    this.adminSvc.getLocations().subscribe(l => this.state.locations.set(l));
    this.adminSvc.getResources().subscribe(res => {
      this.state.resources.set(res);
      if (!this.state.initialized) {
        const rv: Record<number,boolean> = {};
        res.filter(r => r.active).forEach(r => { rv[r.id] = true; });
        this.state.visibleResources.set(rv);
      }
      this.loadWorkingHours();
    });
    this.adminSvc.getUsers().subscribe(users => {
      this.state.allUsers.set(users);
      if (!this.state.initialized) {
        const sv: Record<number,boolean> = {};
        users.filter(u => u.active && u.canBookAppts).forEach(u => { sv[u.id] = false; });
        this.state.visibleStaff.set(sv);
        this.state.initialized = true;
      }
      this.loadWorkingHours();
      this.loadSchedule();
    });
  }

  private loadWorkingHours() {
    const resources = this.state.resources();
    const staff     = this.activeStaff();
    if (!resources.length && !staff.length) return;

    type Entry = { key: string; entityType: string; entityId: number };
    const entries: Entry[] = [
      ...resources.slice(0, 20).map(r => ({ key: 'RES_'   + r.id, entityType: 'RESOURCE', entityId: r.id })),
      ...staff.slice(0, 20).map(s     => ({ key: 'STAFF_' + s.id, entityType: 'STAFF',    entityId: s.id })),
    ];

    const calls = entries.map(e =>
      this.http.get<any[]>(`${environment.apiUrl}/resource-schedules?entityType=${e.entityType}&entityId=${e.entityId}`)
        .pipe(catchError(() => of([])))
    );

    forkJoin(calls).subscribe(results => {
      const hoursMap = new Map<string, { start: number; end: number }>();
      const bandsMap = new Map<string, Array<{start:number;end:number;color:string;solidColor:string;locationName:string}>>();

      // Use the date currently shown on the schedule grid, not literally
      // "today" — so navigating to a different date shows that date's bands.
      const viewDate    = this.state.currentDate;
      const viewDateStr = viewDate.toISOString().slice(0, 10);
      const dayName = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][viewDate.getDay()];

      results.forEach((schedules, i) => {
        if (!schedules || !schedules.length) return;
        const key = entries[i].key;

        // Filter to the viewed day AND within the row's effective date range
        // (startDate required, endDate optional — null endDate = always active)
        const todayScheds = schedules.filter((s: any) => {
          if (!s.open || s.dayOfWeek?.toUpperCase() !== dayName) return false;
          if (s.startDate && viewDateStr < s.startDate) return false;
          if (s.endDate   && viewDateStr > s.endDate)   return false;
          return true;
        });

        // Same effective-date-range filter, but across ALL days (for the
        // dynamic hour range calc, which considers the whole week's hours)
        const allOpen = schedules.filter((s: any) => {
          if (!s.open) return false;
          if (s.startDate && viewDateStr < s.startDate) return false;
          if (s.endDate   && viewDateStr > s.endDate)   return false;
          return true;
        });

        // Working hours range across all days (for dynamic grid range)
        if (allOpen.length) {
          const starts = allOpen.map((s: any) => parseInt((s.openTime  ?? "07:00").split(":")[0]));
          const ends   = allOpen.map((s: any) => parseInt((s.closeTime ?? "19:00").split(":")[0]));
          hoursMap.set(key, { start: Math.min(...starts), end: Math.max(...ends) });
        }

        // Location color bands for TODAY only — locationColor now comes
        // directly from the backend DTO (no client-side lookup needed)
        const bands: Array<{start:number;end:number;color:string;solidColor:string;locationName:string}> = [];
        todayScheds.forEach((s: any) => {
          if (s.locationColor) {
            bands.push({
              start: parseInt((s.openTime  ?? "07:00").split(":")[0]),
              end:   parseInt((s.closeTime ?? "19:00").split(":")[0]),
              color: s.locationColor + '2a',  // ~16% opacity background fill
              solidColor: s.locationColor,     // full color for left border
              locationName: s.locationName ?? "Location"
            });
          }
        });
        if (bands.length) bandsMap.set(key, bands);
      });

      this.workingHoursMap.set(hoursMap);
      this.locationBands.set(bandsMap);
    });
  }

  loadSchedule() {
    this.loading.set(true);
    const date = this.state.currentDate.toISOString().slice(0,10);
    this.apptSvc.getDailySchedule(date, undefined).subscribe({
      next: a  => { this.appointments.set(a); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    // Recompute location color bands for the NEWLY VIEWED date — previously
    // this only ran once at component init (always against "today"), so
    // every other date showed the same bands as whatever day the page first
    // loaded on. Now it recalculates per date navigation.
    this.loadWorkingHours();
  }

  loadWeekSchedule() {
    if (!this.weekEntity()) return;
    this.loading.set(true);
    const days = this.weekDays();
    const results: Appointment[] = [];
    let loaded = 0;
    days.forEach(day => {
      this.apptSvc.getDailySchedule(day.dateStr, undefined).subscribe({
        next: a  => { results.push(...a); loaded++; if (loaded===7) { this.weekAppointments.set(results); this.loading.set(false); } },
        error: () => { loaded++; if (loaded===7) this.loading.set(false); }
      });
    });
  }

  // ── Navigation ────────────────────────────────────────────────
  goToday() {
    this.state.currentDate = new Date();
    this.currentDateSig.set(new Date(this.state.currentDate));
    this.miniCalMonth.set(new Date(this.state.currentDate.getFullYear(), this.state.currentDate.getMonth(), 1));
    this.loadSchedule();
  }

  selectDay(y: number, m: number, d: number) {
    this.state.currentDate = new Date(y, m, d);
    this.currentDateSig.set(new Date(this.state.currentDate));
    this.state.view = "day";
    this.loadSchedule();
  }

  jumpToDay(date: Date) {
    this.state.currentDate = new Date(date);
    this.currentDateSig.set(new Date(this.state.currentDate));
    this.state.view = "day";
    this.loadSchedule();
  }

  miniCalNav(dir: number) {
    const m = this.miniCalMonth();
    this.miniCalMonth.set(new Date(m.getFullYear(), m.getMonth()+dir, 1));
  }

  setView(v: string) {
    if (v === "week" && this.totalColumns() > 1) {
      this.snack.open("ℹ️ Week view shows one column. Deselect all but one Resource or Staff first.", "×", { duration: 4000 });
      return;
    }
    if (v === "week" && this.totalColumns() === 0) {
      this.snack.open("Select at least one Resource or Staff for Week view.", "×", { duration: 3000 });
      return;
    }
    this.state.view = v;
    if (v === "week") this.loadWeekSchedule();
    else this.loadSchedule();
  }

  onLocationChange(lId: number | null) {
    this.state.selectedLocationId = lId;
    // Keep ALL resources visible — location filter only narrows sidebar list
    // but does NOT remove appointments that are already on the grid
    const v: Record<number,boolean> = { ...this.state.visibleResources() };
    if (lId !== null) {
      // For resources not at this location, uncheck but keep in map
      this.state.resources().forEach(r => {
        if (r.active && r.locationId !== lId) v[r.id] = false;
        if (r.active && r.locationId === lId)  v[r.id] = true;
      });
    } else {
      // All locations — restore all active resources as visible
      this.state.resources().filter(r => r.active).forEach(r => { v[r.id] = true; });
    }
    this.state.visibleResources.set(v);
    this.loadSchedule();
  }

  // ── Sidebar ───────────────────────────────────────────────────
  toggleResource(id: number, on: boolean) { this.state.visibleResources.set({ ...this.state.visibleResources(), [id]: on }); }
  toggleStaff(id: number, on: boolean)    { this.state.visibleStaff.set({ ...this.state.visibleStaff(), [id]: on }); }
  selectAllRes(on: boolean)   { const v={...this.state.visibleResources()}; this.filteredResources().forEach(r=>{v[r.id]=on;}); this.state.visibleResources.set(v); }
  selectAllStaff(on: boolean) { const v={...this.state.visibleStaff()};    this.activeStaff().forEach(s=>{v[s.id]=on;});          this.state.visibleStaff.set(v); }

  // ── Appointment filters ───────────────────────────────────────
  apptsByResource(resId: number) { return this.appointments().filter(a => a.resourceId === resId); }
  apptsByStaff(staffId: number)  { return this.appointments().filter(a => a.staffResourceId===staffId||a.staffId===staffId); }
  weekApptsByDay(dateStr: string) {
    const entity = this.weekEntity(); if (!entity) return [];
    return this.weekAppointments().filter(a => {
      if (a.apptDate !== dateStr) return false;
      return entity.type==="resource" ? a.resourceId===entity.id : (a.staffResourceId===entity.id||a.staffId===entity.id);
    });
  }

  // ── Pixel math — relative to visibleHours start ──────────────
  apptTop(a: Appointment): number {
    if (!a.startTime) return 0;
    const [h,m] = a.startTime.split(":").map(Number);
    const startHour = this.visibleHours()[0] ?? 7;
    return (h - startHour) * PX_PER_HR + Math.round(m * PX_PER_MIN);
  }
  apptHeight(a: Appointment): number { return Math.max(20, Math.round((a.durationMin??60)*PX_PER_MIN)); }
  formatHour(h: number): string { return h===0?"12 AM":h<12?`${h} AM`:h===12?"12 PM":`${h-12} PM`; }
  staffColor(id: number): string { return STAFF_COLORS[Math.abs(id*7)%STAFF_COLORS.length]; }
  initials(u: User): string { return ((u.firstName?.[0]??'')+(u.lastName?.[0]??'')).toUpperCase(); }

  // ── Modal ─────────────────────────────────────────────────────
  openApptModal(resourceId?: number|null, staffId?: number|null, hour?: number|null, appt?: Appointment) {
    (document.activeElement as HTMLElement)?.blur();
    this.dialog.open(AppointmentDialogComponent, {
      width: "720px",
      data: {
        appointment:     appt,
        resourceId:      resourceId ?? null,
        staffId:         staffId    ?? null,
        defaultDate:     this.state.currentDate.toISOString().slice(0,10),
        defaultTime:     hour != null ? String(hour).padStart(2,"0")+":00" : undefined,
        activeResources: this.filteredResources(),
        activeStaff:     this.activeStaff(),
        allStaff:        this.state.allUsers(),
        locations:       this.state.locations(),
      },
      disableClose: true,
    }).afterClosed().subscribe(saved => { if (saved) this.loadSchedule(); });
  }

  openApptModalWeek(dateStr: string, hour?: number|null, appt?: Appointment) {
    const entity = this.weekEntity();
    if (!entity && !appt) return;
    (document.activeElement as HTMLElement)?.blur();
    this.dialog.open(AppointmentDialogComponent, {
      width: "720px",
      data: {
        appointment:     appt,
        resourceId:      entity?.type==="resource" ? entity.id : null,
        staffId:         entity?.type==="staff"    ? entity.id : null,
        defaultDate:     dateStr,
        defaultTime:     hour != null ? String(hour).padStart(2,"0")+":00" : undefined,
        activeResources: this.filteredResources(),
        activeStaff:     this.activeStaff(),
        allStaff:        this.state.allUsers(),
        locations:       this.state.locations(),
      },
      disableClose: true,
    }).afterClosed().subscribe(saved => { if (saved) this.loadWeekSchedule(); });
  }

  // ── Context menu ──────────────────────────────────────────────
  onCtxMenu(e: MouseEvent, a: Appointment) { e.preventDefault(); e.stopPropagation(); this.ctxApptId=a.id; this.ctxMenu.set({visible:true,x:e.clientX,y:e.clientY}); }
  getBands(key: string): Array<{start:number;end:number;color:string;solidColor:string;locationName:string}> {
    return this.locationBands().get(key) ?? [];
  }

  bandTop(startHour: number): number {
    const base = this.visibleHours()[0] ?? 7;
    return (startHour - base) * PX_PER_HR;
  }

  bandHeight(startHour: number, endHour: number): number {
    return (endHour - startHour) * PX_PER_HR;
  }

  closeCtx() { this.ctxMenu.set({visible:false,x:0,y:0}); }
  ctxEdit() {
    const a = [...this.appointments(), ...this.weekAppointments()].find(x=>x.id===this.ctxApptId);
    if (a) this.openApptModal(null,null,null,a);
    this.closeCtx();
  }
  ctxCancel() {
    if (!this.ctxApptId) return;
    if (!confirm("Cancel this appointment?")) { this.closeCtx(); return; }
    this.apptSvc.cancel(this.ctxApptId).subscribe({
      next:()=>{this.snack.open("Cancelled.","×",{duration:2500});this.loadSchedule();},
      error:e=>this.snack.open(e.error?.message??"Error","×",{duration:3000})
    });
    this.closeCtx();
  }
}
