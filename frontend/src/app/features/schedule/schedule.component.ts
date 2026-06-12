import { Component, OnInit, OnDestroy, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { AppointmentService } from "../../core/services/appointment.service";
import { AdminService } from "../../core/services/admin.service";
import { ScheduleStateService } from "../../core/services/schedule-state.service";
import { Resource, Location, User } from "../../shared/models/admin.model";
import { Appointment } from "../../shared/models/appointment.model";
import { AppointmentDialogComponent } from "./appointment-dialog.component";
import { Inject } from "@angular/core";

const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const HOURS      = Array.from({ length: 15 }, (_, i) => i + 7);
const STAFF_COLORS = ["#5b6abf","#b06abf","#bf6a6a","#6abfb0","#8c6abf","#bf936a","#6a8cbf","#bf6a93"];

// ─── Inline test dialog — simplest possible ───────────────────────────────────
@Component({
  selector: "app-test-dialog",
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div style="padding:32px;min-width:300px;font-family:sans-serif;">
      <h2 style="margin:0 0 16px;color:#1a4a3a;">✅ Dialog is working!</h2>
      <p style="color:#555;margin-bottom:24px;">
        Angular Material dialogs are functioning correctly.<br>
        The appointment form will load here.
      </p>
      <button mat-dialog-close
              style="background:#1a4a3a;color:#fff;border:none;padding:8px 20px;
                     border-radius:6px;cursor:pointer;font-size:14px;">
        Close
      </button>
    </div>
  `
})
export class TestDialogComponent {}

// ─── Schedule ─────────────────────────────────────────────────────────────────
@Component({
  selector: "app-schedule",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div style="display:flex;height:100%;width:100%;background:var(--stone);">

      <!-- LEFT SIDEBAR -->
      <div style="width:220px;flex-shrink:0;background:#fff;border-right:1px solid var(--stone-mid);display:flex;flex-direction:column;overflow-y:auto;">

        <!-- Mini cal -->
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
              <div [style.background]="cell.isToday ? 'var(--jade)' : cell.isSelected ? 'var(--jade-mist)' : ''"
                   [style.color]="cell.isToday ? '#fff' : cell.otherMonth ? 'var(--stone-dark)' : 'var(--ink-mid)'"
                   [style.fontWeight]="cell.isSelected ? '700' : '400'"
                   [style.borderRadius]="'5px'"
                   style="font-size:11px;text-align:center;padding:4px 2px;cursor:pointer;position:relative;"
                   (click)="cell.day && selectDay(cell.year, cell.month, cell.day)">
                {{ cell.label }}
                @if (cell.hasAppt) {
                  <div style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--gold);"></div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Resources -->
        <div style="padding:10px 12px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;color:var(--ink-light);text-transform:uppercase;letter-spacing:.1em;">Resources</span>
            <div style="display:flex;gap:6px;">
              <button class="res-all-btn" (click)="selectAllRes(true)">All</button>
              <span style="color:var(--stone-dark);font-size:10px;">|</span>
              <button class="res-all-btn" (click)="selectAllRes(false)">None</button>
            </div>
          </div>
          @for (r of filteredResources(); track r.id) {
            <label style="display:flex;align-items:center;gap:7px;padding:5px 4px;cursor:pointer;font-size:12px;border-radius:6px;user-select:none;">
              <input type="checkbox" [checked]="state.visibleResources()[r.id]"
                     (change)="toggleResource(r.id, $any($event.target).checked)"
                     style="display:none;"/>
              <div [style.background]="r.colorHex" style="width:10px;height:10px;border-radius:3px;flex-shrink:0;"></div>
              <span style="width:14px;height:14px;border:1.5px solid var(--stone-dark);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--jade);">
                {{ state.visibleResources()[r.id] ? "✓" : "" }}
              </span>
              <span style="flex:1;line-height:1.3;color:var(--ink);font-size:12px;">{{ r.name }}</span>
            </label>
          }
        </div>

        <!-- Staff -->
        <div style="padding:10px 12px 14px;border-top:1px solid var(--stone-mid);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:10px;font-weight:700;color:var(--ink-light);text-transform:uppercase;letter-spacing:.1em;">Staff</span>
            <div style="display:flex;gap:6px;">
              <button class="res-all-btn" (click)="selectAllStaff(true)">All</button>
              <span style="color:var(--stone-dark);font-size:10px;">|</span>
              <button class="res-all-btn" (click)="selectAllStaff(false)">None</button>
            </div>
          </div>
          @for (s of activeStaff(); track s.id) {
            <label style="display:flex;align-items:center;gap:7px;padding:5px 4px;cursor:pointer;font-size:12px;border-radius:6px;user-select:none;">
              <input type="checkbox" [checked]="state.visibleStaff()[s.id]"
                     (change)="toggleStaff(s.id, $any($event.target).checked)"
                     style="display:none;"/>
              <div [style.background]="staffColor(s.id)"
                   style="width:12px;height:12px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#fff;">
                {{ initials(s) }}
              </div>
              <span style="width:14px;height:14px;border:1.5px solid var(--stone-dark);border-radius:3px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--jade);">
                {{ state.visibleStaff()[s.id] ? "✓" : "" }}
              </span>
              <span style="flex:1;line-height:1.3;color:var(--ink);font-size:12px;">{{ s.firstName }} {{ s.lastName }}</span>
            </label>
          }
        </div>
      </div>

      <!-- MAIN -->
      <div style="flex:1;display:flex;flex-direction:column;min-width:0;">

        <!-- Toolbar -->
        <div style="background:#fff;border-bottom:1px solid var(--stone-mid);padding:8px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;">
          <div style="font-family:var(--font-display);font-size:19px;color:var(--jade);">{{ formattedDate() }}</div>
          <button class="tb-btn" (click)="goToday()">Today</button>
          <div style="flex:1;"></div>
          <select style="font-size:12px;padding:4px 8px;height:30px;border:1.5px solid var(--stone-dark);border-radius:6px;background:#fff;min-width:140px;"
                  [(ngModel)]="state.selectedLocationId" (change)="onLocationChange()">
            <option [ngValue]="null">All Locations</option>
            @for (loc of state.locations(); track loc.id) {
              <option [ngValue]="loc.id">{{ loc.name }}</option>
            }
          </select>
          <div style="width:1px;height:22px;background:var(--stone-mid);"></div>
          <button class="tb-btn" [class.active]="state.view==='day'" (click)="setView('day')">Day</button>
          <button class="tb-btn" [class.active]="state.view==='week'" (click)="setView('week')">Week</button>

          <!-- NEW APPOINTMENT BUTTON — direct test -->
          <button class="btn btn-primary" type="button"
                  (mousedown)="$event.preventDefault()"
                  (click)="openApptModal()">
            + New Appointment
          </button>
        </div>

        @if (loading()) {
          <div style="height:3px;background:var(--stone-mid);flex-shrink:0;overflow:hidden;">
            <div style="height:100%;width:40%;background:var(--jade);animation:cal-slide 1s ease-in-out infinite alternate;"></div>
          </div>
        }

        <!-- DAY VIEW -->
        @if (state.view === 'day') {
          <div style="flex:1;overflow:auto;background:var(--stone);">
            <div style="display:flex;min-height:100%;width:100%;">
              <div style="width:52px;flex-shrink:0;background:#fff;">
                <div style="height:36px;border-bottom:2px solid var(--stone-mid);background:var(--stone);"></div>
                @for (h of HOURS; track h) {
                  <div style="height:80px;display:flex;align-items:flex-start;justify-content:flex-end;padding:3px 6px 0 0;font-size:10px;color:var(--ink-light);font-weight:600;border-right:1px solid var(--stone-mid);border-bottom:1px solid var(--stone-mid);">
                    {{ formatHour(h) }}
                  </div>
                }
              </div>
              <div style="flex:1;display:flex;min-width:0;">
                @for (r of visibleResourceList(); track r.id) {
                  <div style="flex:1;min-width:130px;border-right:1px solid var(--stone-mid);">
                    <div [style.background]="r.colorHex"
                         style="height:36px;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:600;padding:0 8px;position:sticky;top:0;z-index:10;border-bottom:2px solid rgba(0,0,0,.15);">
                      {{ r.name }}
                    </div>
                    <div style="position:relative;">
                      @for (h of HOURS; track h) {
                        <div style="height:80px;border-bottom:1px solid var(--stone-mid);position:relative;cursor:pointer;background:#fff;"
                             (click)="openApptModal(r.id, null, h)">
                        </div>
                      }
                      @for (a of apptsByResource(r.id); track a.id) {
                        <div [style.background]="r.colorHex"
                             [style.top.px]="apptTop(a)"
                             [style.height.px]="apptHeight(a)"
                             style="position:absolute;left:2px;right:2px;border-radius:5px;padding:3px 6px;cursor:pointer;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.18);z-index:5;"
                             (click)="openApptModal(r.id, null, null, a)">
                          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ a.customerFullName }}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,.85);">{{ a.visitTypeName }}</div>
                        </div>
                      }
                    </div>
                  </div>
                }
                @for (s of visibleStaffList(); track s.id) {
                  <div style="flex:1;min-width:130px;border-right:1px solid var(--stone-mid);">
                    <div [style.background]="staffColor(s.id)"
                         style="height:36px;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:600;padding:0 8px;position:sticky;top:0;z-index:10;border-bottom:2px solid rgba(0,0,0,.15);">
                      {{ s.firstName }} {{ s.lastName }}
                    </div>
                    <div style="position:relative;">
                      @for (h of HOURS; track h) {
                        <div style="height:80px;border-bottom:1px solid var(--stone-mid);position:relative;cursor:pointer;background:#fff;"
                             (click)="openApptModal(null, s.id, h)">
                        </div>
                      }
                      @for (a of apptsByStaff(s.id); track a.id) {
                        <div [style.background]="staffColor(s.id)"
                             [style.top.px]="apptTop(a)"
                             [style.height.px]="apptHeight(a)"
                             style="position:absolute;left:2px;right:2px;border-radius:5px;padding:3px 6px;cursor:pointer;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.18);z-index:5;"
                             (click)="openApptModal(null, s.id, null, a)">
                          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ a.customerFullName }}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,.85);">{{ a.visitTypeName }}</div>
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

        <!-- WEEK VIEW placeholder -->
        @if (state.view === 'week') {
          <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--ink-light);">
            <div style="text-align:center;">
              <div style="font-size:36px;margin-bottom:12px;">📅</div>
              <div style="font-family:var(--font-display);font-size:20px;color:var(--jade);margin-bottom:8px;">
                @if (totalColumns() !== 1) { Select exactly one column for Week view }
                @else { Week view — coming shortly }
              </div>
            </div>
          </div>
        }

      </div>

      <!-- Context menu -->
      @if (ctxMenu().visible) {
        <div style="position:fixed;background:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18);border:1px solid var(--stone-mid);z-index:9999;min-width:195px;padding:6px 0;"
             [style.top.px]="ctxMenu().y"
             [style.left.px]="ctxMenu().x"
             (click)="$event.stopPropagation()">
          <div style="padding:9px 16px;cursor:pointer;font-size:13px;color:var(--ink-mid);" (click)="ctxEdit()">✏️ Edit</div>
          <div style="height:1px;background:var(--stone-mid);margin:4px 0;"></div>
          <div style="padding:9px 16px;cursor:pointer;font-size:13px;color:var(--danger);" (click)="ctxCancel()">🚫 Cancel Appointment</div>
        </div>
      }

    </div>
  `,
  styles: [`
    .mini-cal-nav { width:24px;height:24px;border:none;background:none;cursor:pointer;color:var(--jade-light);font-size:14px;border-radius:4px; }
    .mini-cal-nav:hover { background:var(--jade-mist);color:var(--jade); }
    .res-all-btn { font-size:10px;color:var(--jade-light);cursor:pointer;background:none;border:none;font-family:var(--font-body);padding:0; }
    .res-all-btn:hover { color:var(--jade); }
    .tb-btn { padding:5px 11px;border:1.5px solid var(--stone-dark);background:#fff;border-radius:6px;cursor:pointer;font-family:var(--font-body);font-size:12px;font-weight:500;transition:all .15s;white-space:nowrap; }
    .tb-btn:hover  { background:var(--jade-mist);border-color:var(--jade-light);color:var(--jade); }
    .tb-btn.active { background:var(--jade);color:#fff;border-color:var(--jade); }
    @keyframes cal-slide { from { margin-left:-40%; } to { margin-left:100%; } }
  `]
})
export class ScheduleComponent implements OnInit, OnDestroy {
  HOURS      = HOURS;
  DAYS_SHORT = DAYS_SHORT;

  appointments     = signal<Appointment[]>([]);
  weekAppointments = signal<Appointment[]>([]);
  loading          = signal(false);
  private refreshTimer: any;
  miniCalMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  ctxMenu = signal<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  ctxApptId: number | null = null;

  filteredResources = computed(() => {
    const lId = this.state.selectedLocationId;
    return this.state.resources().filter(r => r.active && (!lId || r.locationId === lId));
  });
  activeStaff = computed(() => this.state.allUsers().filter(u => u.active && u.canBookAppts));
  visibleResourceList = computed(() => this.filteredResources().filter(r => this.state.visibleResources()[r.id]));
  visibleStaffList    = computed(() => this.activeStaff().filter(s => this.state.visibleStaff()[s.id]));
  totalColumns = computed(() => this.visibleResourceList().length + this.visibleStaffList().length);

  formattedDate = computed(() => {
    const d = this.state.currentDate;
    return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  miniCalLabel = computed(() => `${MONTHS[this.miniCalMonth().getMonth()]} ${this.miniCalMonth().getFullYear()}`);

  miniCalCells = computed(() => {
    const m = this.miniCalMonth().getMonth(), y = this.miniCalMonth().getFullYear();
    const today = new Date(), cur = this.state.currentDate;
    const firstDay = new Date(y, m, 1).getDay(), daysInMonth = new Date(y, m + 1, 0).getDate(), daysInPrev = new Date(y, m, 0).getDate();
    const apptDays = new Set(this.appointments().filter(a => { if (!a.apptDate) return false; const d = new Date(a.apptDate); return d.getMonth() === m && d.getFullYear() === y; }).map(a => new Date(a.apptDate).getDate()));
    const cells: any[] = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ key:`p${i}`, label: daysInPrev-i, day:null, month:m-1, year:y, otherMonth:true, isToday:false, isSelected:false, hasAppt:false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ key:`c${d}`, label:d, day:d, month:m, year:y, otherMonth:false, isToday: d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear(), isSelected: d===cur.getDate()&&m===cur.getMonth()&&y===cur.getFullYear(), hasAppt: apptDays.has(d) });
    const rem = cells.length%7===0 ? 0 : 7-(cells.length%7);
    for (let d = 1; d <= rem; d++) cells.push({ key:`n${d}`, label:d, day:null, month:m+1, year:y, otherMonth:true, isToday:false, isSelected:false, hasAppt:false });
    return cells;
  });

  private closeCtxBound = () => this.closeCtx();

  constructor(
    private apptSvc: AppointmentService,
    private adminSvc: AdminService,
    public  state: ScheduleStateService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    document.addEventListener("click", this.closeCtxBound);
    this.loadLookups();
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
    });
    this.adminSvc.getUsers().subscribe(users => {
      this.state.allUsers.set(users);
      if (!this.state.initialized) {
        const sv: Record<number,boolean> = {};
        users.filter(u => u.active && u.canBookAppts).forEach(u => { sv[u.id] = false; });
        this.state.visibleStaff.set(sv);
        this.state.initialized = true;
      }
      this.loadSchedule();
    });
  }

  loadSchedule() {
    this.loading.set(true);
    const date = this.state.currentDate.toISOString().slice(0,10);
    this.apptSvc.getDailySchedule(date, this.state.selectedLocationId ?? undefined).subscribe({
      next: a  => { this.appointments.set(a); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  goToday() { this.state.currentDate = new Date(); this.miniCalMonth.set(new Date(this.state.currentDate.getFullYear(), this.state.currentDate.getMonth(), 1)); this.loadSchedule(); }
  selectDay(y: number, m: number, d: number) { this.state.currentDate = new Date(y,m,d); this.state.view="day"; this.loadSchedule(); }
  miniCalNav(dir: number) { const m = this.miniCalMonth(); this.miniCalMonth.set(new Date(m.getFullYear(), m.getMonth()+dir, 1)); }
  setView(v: string) { this.state.view = v; }
  onLocationChange() { const lId = this.state.selectedLocationId; const v: Record<number,boolean> = {}; this.state.resources().filter(r=>r.active).forEach(r=>{v[r.id]=!lId||r.locationId===lId;}); this.state.visibleResources.set(v); this.loadSchedule(); }

  toggleResource(id: number, on: boolean) { this.state.visibleResources.set({...this.state.visibleResources(),[id]:on}); }
  toggleStaff(id: number, on: boolean)    { this.state.visibleStaff.set({...this.state.visibleStaff(),[id]:on}); }
  selectAllRes(on: boolean)   { const v={...this.state.visibleResources()}; this.filteredResources().forEach(r=>{v[r.id]=on;}); this.state.visibleResources.set(v); }
  selectAllStaff(on: boolean) { const v={...this.state.visibleStaff()};    this.activeStaff().forEach(s=>{v[s.id]=on;});          this.state.visibleStaff.set(v); }

  apptsByResource(resId: number) { return this.appointments().filter(a => a.resourceId === resId); }
  apptsByStaff(staffId: number)  { return this.appointments().filter(a => a.staffResourceId===staffId||a.staffId===staffId); }

  apptTop(a: Appointment): number { if (!a.startTime) return 0; const [h,m] = a.startTime.split(":").map(Number); return (h-7)*80+Math.round(m*80/60); }
  apptHeight(a: Appointment): number { return Math.max(20, Math.round((a.durationMin??60)*80/60)); }
  formatHour(h: number): string { return h<12?`${h} AM`:h===12?"12 PM":`${h-12} PM`; }
  staffColor(id: number): string { return STAFF_COLORS[Math.abs(id*7)%STAFF_COLORS.length]; }
  initials(u: User): string { return ((u.firstName?.[0]??'')+(u.lastName?.[0]??'')).toUpperCase(); }

  openApptModal(resourceId?: number | null, staffId?: number | null, hour?: number | null, appt?: Appointment) {
    (document.activeElement as HTMLElement)?.blur();
    const ref = this.dialog.open(AppointmentDialogComponent, {
      width: "720px",
      data: {
        appointment: appt,
        resourceId: resourceId ?? null,
        staffId: staffId ?? null,
        defaultDate: this.state.currentDate.toISOString().slice(0,10),
        defaultTime: hour != null ? String(hour).padStart(2,"0")+":00" : undefined,
        activeResources: this.filteredResources(),
        activeStaff:     this.activeStaff(),
        allStaff:        this.state.allUsers(),
      },
      disableClose: true,
    });
    ref.afterClosed().subscribe(saved => { if (saved) this.loadSchedule(); });
  }

  closeCtx() { this.ctxMenu.set({ visible:false, x:0, y:0 }); }
  onCtxMenu(e: MouseEvent, a: Appointment) { e.preventDefault(); e.stopPropagation(); this.ctxApptId=a.id; this.ctxMenu.set({visible:true,x:e.clientX,y:e.clientY}); }
  ctxEdit() { const a=this.appointments().find(x=>x.id===this.ctxApptId); if(a) this.openApptModal(null,null,null,a); this.closeCtx(); }
  ctxCancel() {
    if (!this.ctxApptId) return;
    if (!confirm("Cancel this appointment?")) { this.closeCtx(); return; }
    this.apptSvc.cancel(this.ctxApptId).subscribe({ next:()=>{this.snack.open("Cancelled.","×",{duration:2500});this.loadSchedule();}, error:e=>this.snack.open(e.error?.message??"Error","×",{duration:3000}) });
    this.closeCtx();
  }
}