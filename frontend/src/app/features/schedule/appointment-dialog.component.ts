import { Component, OnInit, Inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { debounceTime, distinctUntilChanged, switchMap, of, forkJoin } from "rxjs";
import { catchError } from "rxjs/operators";
import { AppointmentService } from "../../core/services/appointment.service";
import { AdminService } from "../../core/services/admin.service";
import { Resource, User, VisitType, VisitStatus, Customer, Location } from "../../shared/models/admin.model";
import { Appointment } from "../../shared/models/appointment.model";
import { environment } from "../../../environments/environment";

// ═══════════════════════════════════════════════════════════════
// MAIN APPOINTMENT DIALOG
// ═══════════════════════════════════════════════════════════════
@Component({
  selector: "app-appointment-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>{{ data.appointment ? "Edit Appointment" : "New Appointment" }}</h3>
        <button class="close-btn" (click)="cancel()">✕</button>
      </div>
      <div class="modal-body">
        <form [formGroup]="form">
          <div class="g2">

            <!-- Date — now first in the grid, swapped with Resource/Staff -->
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input type="date" class="form-control" formControlName="apptDate" (change)="onDateOrResourceChange()"/>
            </div>

            <!-- Location — search box -->
            <div class="form-group">
              <label class="form-label">Location *</label>
              <div style="position:relative;">
                <input class="form-control" [formControl]="locationSearch"
                       placeholder="Search location…" autocomplete="off"
                       (focus)="onLocFocus()"
                       (blur)="onLocBlur()"/>
                @if (showLocDrop() && locationResults().length) {
                  <div class="ac-dropdown">
                    @for (loc of locationResults(); track loc.id) {
                      <div class="ac-item" (mousedown)="selectLocation(loc)">{{ loc.name }}</div>
                    }
                  </div>
                }
              </div>
              @if (selectedLocationName()) {
                <div style="font-size:11px;color:var(--jade);margin-top:3px;">
                  📍 {{ selectedLocationName() }}
                  <span style="cursor:pointer;margin-left:4px;color:var(--ink-light);"
                        (click)="clearLocation()">✕</span>
                </div>
              }
            </div>

            <!-- Customer autocomplete -->
            <div class="form-group gfull">
              <label class="form-label">Customer *</label>
              <div style="position:relative;">
                <input class="form-control" [formControl]="customerSearch"
                       placeholder="Type last name, first name or phone…"
                       autocomplete="off"
                       (focus)="showCustomerDrop.set(true)"
                       (blur)="onCustomerBlur()"/>
                @if (showCustomerDrop() && customerResults().length) {
                  <div class="ac-dropdown">
                    @for (c of customerResults(); track c.id) {
                      <div class="ac-item" (mousedown)="selectCustomer(c)">
                        <strong>{{ c.lastName }}, {{ c.firstName }}</strong>
                        <span class="ac-sub">{{ c.phone }} {{ c.email }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
              @if (selectedCustomer()?.allergies) {
                <div class="allergy-alert">⚠ Allergies/Notes: {{ selectedCustomer()!.allergies }}</div>
              }
            </div>

            <!-- Assigned Staff -->
            <div class="form-group">
              <label class="form-label">Assigned Staff</label>
              <select class="form-control" formControlName="staffId">
                <option [ngValue]="null">— No specific staff —</option>
                @for (s of (data.allStaff || data.activeStaff || []); track s.id) {
                  <option [ngValue]="s.id" [disabled]="!s.active"
                          [style.color]="s.active ? '' : 'var(--ink-light)'"
                          [style.fontStyle]="s.active ? '' : 'italic'">
                    {{ s.firstName }} {{ s.lastName }}{{ s.active ? "" : " (Inactive)" }}
                  </option>
                }
              </select>
            </div>

            <!-- Resource / Staff -->
            <div class="form-group">
              <label class="form-label">Resource / Staff *
                @if (resourceTypeTag()) {
                  <span style="display:inline-block;margin-left:6px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:var(--jade-mist);color:var(--jade);">{{ resourceTypeTag() }}</span>
                }
              </label>
              <select class="form-control" formControlName="resourceKey" (change)="onResourceChange(); onDateOrResourceChange()">
                <option value="">— Select resource or staff —</option>
                <optgroup label="🏠 Resources">
                  @for (r of data.activeResources || []; track r.id) {
                    <option [value]="'RES_' + r.id">{{ r.name }}</option>
                  }
                </optgroup>
                <optgroup label="👤 Staff">
                  @for (s of data.activeStaff || []; track s.id) {
                    <option [value]="'STAFF_' + s.id">{{ s.firstName }} {{ s.lastName }}</option>
                  }
                </optgroup>
              </select>
            </div>

            <!-- Start time -->
            <div class="form-group">
              <label class="form-label">Start Time *</label>
              <input type="time" class="form-control" formControlName="startTime" (change)="syncEndTime()"/>
            </div>

            <!-- End time -->
            <div class="form-group">
              <label class="form-label">End Time</label>
              <input type="time" class="form-control" formControlName="endTime"/>
            </div>

            <!-- Visit Type — search box -->
            <div class="form-group">
              <label class="form-label">Visit Type *</label>
              <div style="position:relative;">
                <input class="form-control" [formControl]="visitTypeSearch"
                       placeholder="Search visit type…" autocomplete="off"
                       (focus)="showVtDrop.set(true)"
                       (blur)="onVtBlur()"/>
                @if (showVtDrop() && visitTypeResults().length) {
                  <div class="ac-dropdown">
                    @for (vt of visitTypeResults(); track vt.id) {
                      <div class="ac-item" (mousedown)="selectVisitType(vt)">
                        {{ vt.name }} <span class="ac-sub">{{ vt.durationMin }}min · {{ vt.defaultPrice | currency }}</span>
                      </div>
                    }
                  </div>
                }
                @if (selectedVisitTypeName()) {
                  <div style="font-size:11px;color:var(--jade);margin-top:3px;">
                    ✓ {{ selectedVisitTypeName() }}
                    <span style="cursor:pointer;margin-left:4px;color:var(--ink-light);" (click)="clearVisitType()">✕</span>
                  </div>
                }
              </div>
            </div>

            <!-- Visit Status — search box -->
            <div class="form-group">
              <label class="form-label">Visit Status *</label>
              <div style="position:relative;">
                <input class="form-control" [formControl]="visitStatusSearch"
                       placeholder="Search status…" autocomplete="off"
                       (focus)="showVsDrop.set(true)"
                       (blur)="onVsBlur()"/>
                @if (showVsDrop() && visitStatusResults().length) {
                  <div class="ac-dropdown">
                    @for (vs of visitStatusResults(); track vs.id) {
                      <div class="ac-item" (mousedown)="selectVisitStatus(vs)">
                        <span [style.color]="vs.colorHex">● </span>{{ vs.name }}
                      </div>
                    }
                  </div>
                }
                @if (selectedStatusName()) {
                  <div style="font-size:11px;color:var(--jade);margin-top:3px;">
                    ✓ {{ selectedStatusName() }}
                    <span style="cursor:pointer;margin-left:4px;color:var(--ink-light);" (click)="clearStatus()">✕</span>
                  </div>
                }
              </div>
            </div>

            <!-- Charge amount + Collect Payment (replaces the old Duration field slot) -->
            <div class="form-group">
              <label class="form-label">Charge Amount ($)</label>
              <input type="number" class="form-control" formControlName="chargeAmount" step="0.01" min="0"/>
            </div>

            <div class="form-group">
              <label class="form-label">&nbsp;</label>
              <button class="btn btn-sm" type="button" (click)="collectPayment()"
                      [disabled]="saving()"
                      [class.btn-gold]="!paidAmount()"
                      [class.btn-success-solid]="!!paidAmount()"
                      style="width:100%;justify-content:center;">
                @if (paidAmount()) {
                  ✓ Paid {{ paidAmount() | currency }}
                } @else {
                  💳 Collect Payment
                }
              </button>
            </div>

            <!-- Notes -->
            <div class="form-group gfull">
              <label class="form-label">Appointment Notes</label>
              <textarea class="form-control" formControlName="notes" rows="2"></textarea>
            </div>
          </div>

          <!-- Conflict / warning alerts -->
          @if (conflictMsg()) {
            <div class="conflict-alert">
              <span>⚠</span> {{ conflictMsg() }}
              @if (conflictIsWarning()) {
                <button class="btn btn-sm btn-outline" style="margin-left:auto;"
                        (click)="proceedAnyway()">Book Anyway</button>
              }
            </div>
          }

        </form>
      </div>

      <div class="modal-footer">
        <div style="flex:1;"></div>
        @if (data.appointment) {
          <button class="btn btn-outline btn-sm" type="button" (click)="openLogs()">📋 Logs</button>
          <button class="btn btn-outline btn-sm" type="button" (click)="openVisitNotes()">📝 Visit Notes</button>
          <button class="btn btn-outline btn-sm" type="button" (click)="openAllVisits()">👁 All Visits</button>
        }
        <button class="btn btn-primary" type="button" (click)="save()"
                [disabled]="saving() || checking()">
          {{ saving() ? "Saving…" : checking() ? "Checking…" : "Save Appointment" }}
        </button>
        <button class="btn btn-ghost" type="button" (click)="cancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .appt-modal { display:flex;flex-direction:column;max-height:90vh; }
    .modal-header { padding:18px 24px 14px;border-bottom:1px solid var(--stone-mid);display:flex;align-items:center;justify-content:space-between;flex-shrink:0; }
    .modal-header h3 { font-family:var(--font-display);font-size:22px;color:var(--jade); }
    .modal-body { padding:20px 24px;overflow-y:auto;flex:1; }
    .modal-footer { padding:14px 24px;border-top:1px solid var(--stone-mid);display:flex;align-items:center;gap:8px;flex-shrink:0; }
    .allergy-alert { display:flex;align-items:center;gap:8px;background:#fef0d8;border:1px solid #f5c87a;border-radius:var(--radius);padding:7px 12px;font-size:12px;color:#7a4800;margin-top:6px; }
    .conflict-alert { display:flex;align-items:center;gap:8px;border-radius:var(--radius);padding:10px 14px;font-size:13px;margin-top:12px; }
    .conflict-alert.is-warning { background:#fef0d8;border:1px solid #f5c87a;color:#7a4800; }
    .conflict-alert.is-error   { background:#fde8e6;border:1px solid #f5c8c8;color:var(--danger); }
    .btn-success-solid { background:var(--success);color:#fff;border-color:var(--success); }
    .btn-success-solid:hover { opacity:.9; }
    .ac-dropdown { position:absolute;top:100%;left:0;right:0;background:var(--white);border:1.5px solid var(--jade-light);border-radius:var(--radius);box-shadow:var(--shadow-md);z-index:200;max-height:220px;overflow-y:auto; }
    .ac-item { padding:9px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--stone-mid); }
    .ac-item:hover { background:var(--jade-mist); }
    .ac-item:last-child { border-bottom:none; }
    .ac-sub { font-size:11px;color:var(--ink-light);margin-left:8px; }
  `]
})
export class AppointmentDialogComponent implements OnInit {
  form = this.fb.group({
    resourceKey:   [""],
    staffId:       [null as number | null],
    customerId:    [null as number | null, Validators.required],
    apptDate:      ["", Validators.required],
    startTime:     ["09:00", Validators.required],
    endTime:       ["10:00", Validators.required],
    visitTypeId:   [null as number | null, Validators.required],
    visitStatusId: [null as number | null, Validators.required],
    durationMin:   [60],
    chargeAmount:  [0],
    notes:         [""],
  });

  // Customer autocomplete — uses debounce for speed
  customerSearch   = new FormControl("");
  customerResults  = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  showCustomerDrop = signal(false);

  // Location search
  locationSearch = new FormControl("");
  locationResults = signal<Location[]>([]);
  showLocDrop    = signal(false);
  selectedLocationId: number | null = null;
  locationManuallySet = false; // becomes true once user manually picks/clears a location
  selectedLocationName = signal("");

  // Visit Type search
  visitTypeSearch = new FormControl("");
  visitTypeResults = signal<VisitType[]>([]);
  showVtDrop = signal(false);
  selectedVisitTypeName = signal("");
  _allLocations: Location[] = [];
  allVisitTypes: VisitType[] = [];

  // Visit Status search
  visitStatusSearch = new FormControl("");
  visitStatusResults = signal<VisitStatus[]>([]);
  showVsDrop = signal(false);
  selectedStatusName = signal("");
  allVisitStatuses: VisitStatus[] = [];

  saving    = signal(false);
  checking  = signal(false);
  paidAmount = signal<number | null>(null); // tracks whether payment was collected this session
  conflictMsg = signal("");
  conflictIsWarning = signal(false);
  private pendingPayload: any = null;  // stored when user sees warning and hits "Book Anyway"

  resourceTypeTag = signal("");

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<AppointmentDialogComponent>,
    private apptSvc: AppointmentService,
    private adminSvc: AdminService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadLookups();
    this.setupSearches();
  }

  private loadLookups() {
    forkJoin({
      locations: this.adminSvc.getLocations(),
      visitTypes: this.adminSvc.getVisitTypes(),
      statuses: this.adminSvc.getVisitStatuses(),
    }).subscribe(({ locations, visitTypes, statuses }) => {
      this._allLocations = locations;
      this.locationResults.set(locations);
      this.allVisitTypes   = visitTypes;
      this.allVisitStatuses = statuses;
      this.visitTypeResults.set(visitTypes);
      this.visitStatusResults.set(statuses);

      if (this.data.appointment) this.patchFromAppointment();
      else this.patchDefaults(statuses, locations);
    });
  }

  private setupSearches() {
    // Customer search with 250ms debounce — much faster UX
    this.customerSearch.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q && q.length > 1
        ? this.http.get<Customer[]>(`${environment.apiUrl}/customers?q=${encodeURIComponent(q)}`)
        : of([]))
    ).subscribe(r => { this.customerResults.set(r); if (r.length) this.showCustomerDrop.set(true); });

    // Location filter — instant from loaded list
    this.locationSearch.valueChanges.subscribe(q => {
      const locs = this._allLocations;
      if (!q) {
        this.locationResults.set(locs);
        return;
      }
      this.locationResults.set(
        locs.filter((l: Location) => l.name.toLowerCase().includes((q||"").toLowerCase()))
      );
      this.showLocDrop.set(true);
    });

    // Visit type filter — instant from loaded list
    this.visitTypeSearch.valueChanges.subscribe(q => {
      this.visitTypeResults.set(
        !q ? this.allVisitTypes
           : this.allVisitTypes.filter(v => v.name.toLowerCase().includes((q||"").toLowerCase()))
      );
    });

    // Visit status filter — instant
    this.visitStatusSearch.valueChanges.subscribe(q => {
      this.visitStatusResults.set(
        !q ? this.allVisitStatuses
           : this.allVisitStatuses.filter(s => s.name.toLowerCase().includes((q||"").toLowerCase()))
      );
    });
  }

  private patchDefaults(statuses: VisitStatus[], locations: Location[]) {
    const date  = this.data.defaultDate ?? new Date().toISOString().slice(0,10);
    const time  = this.data.defaultTime ?? "09:00";
    const end   = this.addMinutes(time, 60);
    const first = statuses.length ? statuses[0] : null;

    this.form.patchValue({ apptDate: date, startTime: time, endTime: end,
      visitStatusId: first?.id ?? null });
    if (first) { this.visitStatusSearch.setValue(first.name, { emitEvent: false }); this.selectedStatusName.set(first.name); }

    if (this.data.resourceId) {
      this.form.patchValue({ resourceKey: "RES_" + this.data.resourceId });
      this.resourceTypeTag.set("Room");
    } else if (this.data.staffId) {
      this.form.patchValue({ resourceKey: "STAFF_" + this.data.staffId, staffId: this.data.staffId });
      this.resourceTypeTag.set("Staff");
    }

    // Auto-populate Location based on the resource's working-hours config
    // for this date, falling back to the resource/staff's profile location
    if (this.data.resourceId || this.data.staffId) {
      this.onDateOrResourceChange();
    }
  }

  private patchFromAppointment() {
    const a = this.data.appointment as Appointment;
    if (a.resourceId) { this.form.patchValue({ resourceKey: "RES_" + a.resourceId }); this.resourceTypeTag.set("Room"); }
    else if (a.staffResourceId) { this.form.patchValue({ resourceKey: "STAFF_" + a.staffResourceId }); this.resourceTypeTag.set("Staff"); }

    this.form.patchValue({
      staffId: a.staffId ?? null,
      customerId: a.customerId,
      apptDate: a.apptDate ?? "",
      startTime: (a.startTime ?? "09:00").substring(0,5),
      endTime: (a.endTime ?? "10:00").substring(0,5),
      visitTypeId: a.visitTypeId ?? null,
      visitStatusId: a.visitStatusId ?? null,
      durationMin: a.durationMin ?? 60,
      chargeAmount: a.chargeAmount ?? 0,
      notes: a.notes ?? "",
    });

    if (a.customerFullName) {
      this.customerSearch.setValue(a.customerFullName, { emitEvent: false });
      this.selectedCustomer.set({ id: a.customerId } as any);
    }

    // Set search display values
    if (a.visitTypeName) { this.visitTypeSearch.setValue(a.visitTypeName, { emitEvent: false }); this.selectedVisitTypeName.set(a.visitTypeName); }
    if (a.visitStatusName) { this.visitStatusSearch.setValue(a.visitStatusName, { emitEvent: false }); this.selectedStatusName.set(a.visitStatusName); }

    // Set location display — lookup from loaded locations
    if (a.locationId) {
      this.selectedLocationId = a.locationId;
      // Use loaded locations from forkJoin — more reliable than data.locations
      const loc = this._allLocations.find((l: Location) => l.id === a.locationId);
      if (loc) { this.locationSearch.setValue(loc.name, { emitEvent: false }); this.selectedLocationName.set(loc.name); }
    }
  }

  // ── Location search ───────────────────────────────────────────
  onLocFocus()  { this.locationResults.set(this._allLocations); this.showLocDrop.set(true); }
  onLocBlur()   { setTimeout(() => this.showLocDrop.set(false), 200); }
  selectLocation(loc: Location) {
    this.selectedLocationId = loc.id;
    this.selectedLocationName.set(loc.name);
    this.locationSearch.setValue(loc.name, { emitEvent: false });
    this.showLocDrop.set(false);
    this.locationManuallySet = true; // user has taken control — stop auto-populating
  }
  clearLocation() {
    this.selectedLocationId = null;
    this.selectedLocationName.set("");
    this.locationSearch.setValue("", { emitEvent: false });
    this.locationManuallySet = true;
  }

  // ── Visit type search ─────────────────────────────────────────
  onVtBlur() { setTimeout(() => this.showVtDrop.set(false), 200); }
  selectVisitType(vt: VisitType) {
    this.form.patchValue({ visitTypeId: vt.id, durationMin: vt.durationMin, chargeAmount: vt.defaultPrice });
    this.visitTypeSearch.setValue(vt.name, { emitEvent: false });
    this.selectedVisitTypeName.set(vt.name);
    this.showVtDrop.set(false);
    this.syncEndFromDuration();
  }
  clearVisitType() {
    this.form.patchValue({ visitTypeId: null });
    this.visitTypeSearch.setValue("", { emitEvent: false });
    this.selectedVisitTypeName.set("");
    this.visitTypeResults.set(this.allVisitTypes);
  }

  // ── Visit status search ───────────────────────────────────────
  onVsBlur() { setTimeout(() => this.showVsDrop.set(false), 200); }
  selectVisitStatus(vs: VisitStatus) {
    this.form.patchValue({ visitStatusId: vs.id });
    this.visitStatusSearch.setValue(vs.name, { emitEvent: false });
    this.selectedStatusName.set(vs.name);
    this.showVsDrop.set(false);
  }
  clearStatus() {
    this.form.patchValue({ visitStatusId: null });
    this.visitStatusSearch.setValue("", { emitEvent: false });
    this.selectedStatusName.set("");
    this.visitStatusResults.set(this.allVisitStatuses);
  }

  // ── Resource / staff ─────────────────────────────────────────
  onResourceChange() {
    const key = this.form.value.resourceKey ?? "";
    if (!key) { this.resourceTypeTag.set(""); return; }
    const idx = key.indexOf("_"), type = key.substring(0, idx), id = Number(key.substring(idx+1));
    if (type === "STAFF") { this.resourceTypeTag.set("Staff"); this.form.patchValue({ staffId: id }); }
    else { this.resourceTypeTag.set("Room"); }
  }

  /**
   * Auto-populates the Location field based on the selected Resource/Staff's
   * working-hours configuration for the chosen appointment date:
   *   1. Fetch /api/resource-schedules for the selected entity
   *   2. Find the row matching the date's day-of-week AND within the row's
   *      effective date range (startDate/endDate)
   *   3. If found and it has a location, use that
   *   4. Otherwise, fall back to the Resource/Staff's profile locationId
   * Only runs automatically when the user hasn't manually picked a
   * location themselves (locationManuallySet) — once they touch the
   * Location field directly, auto-population stops overriding their choice.
   */
  onDateOrResourceChange() {
    if (this.locationManuallySet) return;

    const key = this.form.value.resourceKey ?? "";
    const date = this.form.value.apptDate;
    if (!key || !date) return;

    const idx = key.indexOf("_");
    const type = key.substring(0, idx);
    const id = Number(key.substring(idx + 1));
    const entityType = type === "STAFF" ? "STAFF" : "RESOURCE";

    this.http.get<any[]>(`${environment.apiUrl}/resource-schedules?entityType=${entityType}&entityId=${id}`)
      .pipe(catchError(() => of([] as any[])))
      .subscribe(schedules => {
        const d = new Date(date + "T00:00:00");
        const dayName = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][d.getDay()];

        const match = (schedules ?? []).find((s: any) => {
          if (!s.open || s.dayOfWeek?.toUpperCase() !== dayName) return false;
          if (s.startDate && date < s.startDate) return false;
          if (s.endDate   && date > s.endDate)   return false;
          return true;
        });

        if (match?.locationId) {
          this.applyAutoLocation(match.locationId, match.locationName);
        } else {
          // No schedule entry (or no location on it) for this day —
          // fall back to the Resource/Staff's profile default location
          const profileLocId = type === "STAFF"
            ? (this.data.allStaff ?? this.data.activeStaff ?? []).find((s: any) => s.id === id)?.locationId
            : (this.data.activeResources ?? []).find((r: any) => r.id === id)?.locationId;

          if (profileLocId) {
            const loc = this._allLocations.find(l => l.id === profileLocId);
            if (loc) this.applyAutoLocation(loc.id, loc.name);
          }
        }
      });
  }

  private applyAutoLocation(locationId: number, locationName: string) {
    this.selectedLocationId = locationId;
    this.selectedLocationName.set(locationName);
    this.locationSearch.setValue(locationName, { emitEvent: false });
  }

  // ── Customer ──────────────────────────────────────────────────
  onCustomerBlur() { setTimeout(() => this.showCustomerDrop.set(false), 200); }
  selectCustomer(c: Customer) {
    this.selectedCustomer.set(c);
    this.customerSearch.setValue(c.lastName + ", " + c.firstName, { emitEvent: false });
    this.form.patchValue({ customerId: c.id });
    this.showCustomerDrop.set(false);
    this.customerResults.set([]);
  }

  // ── Time helpers ──────────────────────────────────────────────
  syncEndTime() {
    this.form.patchValue({ endTime: this.addMinutes(this.form.value.startTime ?? "09:00", this.form.value.durationMin ?? 60) }, { emitEvent: false });
  }
  syncEndFromDuration() {
    this.form.patchValue({ endTime: this.addMinutes(this.form.value.startTime ?? "09:00", Number(this.form.value.durationMin ?? 60)) }, { emitEvent: false });
  }
  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.substring(0,5).split(":").map(Number);
    const total = h*60+m+mins;
    return String(Math.floor(total/60)%24).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
  }

  cancel() { this.dialogRef.close(false); }

  // ── Unified pattern for all sub-screens (Visit Notes, All Visits, Logs, Collect Payment) ──
  // 1. Validate + save the appointment (create or update) — same as the Save button
  // 2. Show "Appointment saved. Opening <X>…" message
  // 3. Close THIS dialog
  // 4. After a short delay (lets the CDK overlay tear down cleanly — fixes the
  //    "renders at bottom of page" bug), open the target dialog CENTERED
  //
  // This guarantees: (a) no data loss — every popup saves first,
  // (b) consistent centered positioning for every popup.

  /**
   * Collect Payment now lives inline (replacing the old Charge Amount input
   * slot) instead of in the footer. It saves the appointment first (so the
   * charge amount and other in-progress edits aren't lost), but — unlike
   * Visit Notes/Logs — does NOT close this dialog, since Collect Payment is
   * a quick action the user expects to return from immediately.
   */
  collectPayment() {
    if (!this.validateRequiredFields()) {
      this.snack.open("Please complete required fields before collecting payment.", "×", { duration: 3500 });
      return;
    }
    const payload = this.buildPayload();
    payload.allowDoubleBook = true;
    payload.allowOutsideHours = true;
    this.saving.set(true);

    const req = this.data.appointment
      ? this.apptSvc.update(this.data.appointment.id, payload)
      : this.apptSvc.create(payload);

    req.subscribe({
      next: (appt: Appointment) => {
        this.saving.set(false);
        this.data.appointment = appt; // keep dialog's reference fresh
        (document.activeElement as HTMLElement)?.blur();
        const ref = this.dialog.open(QuickPayDialogComponent, {
          width: "480px",
          data: { appointment: appt },
          disableClose: false,
        });
        ref.afterClosed().subscribe(result => {
          if (result?.paid) {
            this.paidAmount.set(result.amount);
          }
        });
      },
      error: e => {
        this.saving.set(false);
        this.conflictMsg.set(e.error?.message ?? "Could not save appointment.");
      }
    });
  }

  openAllVisits() {
    if (!this.data.appointment?.customerId && !this.selectedCustomer()?.id) {
      this.snack.open("Select a customer first.", "×", { duration: 3000 });
      return;
    }
    this.saveThenOpen("All Visits", appt => {
      this.dialog.open(AllVisitsDialogComponent, {
        width: "860px",
        maxHeight: "90vh",
        data: {
          customerId:       appt.customerId,
          customerFullName: appt.customerFullName,
          currentApptId:    appt.id,
        }
      });
    });
  }

  openVisitNotes() {
    this.saveThenOpen("Visit Notes", appt => {
      this.dialog.open(VisitNotesDialogComponent, {
        width: "820px",
        maxHeight: "90vh",
        data: {
          appointmentId:    appt.id,
          customerFullName: appt.customerFullName,
          apptDate:         appt.apptDate,
        },
        disableClose: true,
      });
    });
  }

  openLogs() {
    this.saveThenOpen("Audit Logs", appt => {
      this.dialog.open(AuditLogsDialogComponent, {
        width: "620px",
        maxHeight: "80vh",
        data: { appointment: appt },
      });
    });
  }

  /**
   * Validates and saves the appointment (create or update), then closes this
   * dialog and opens the target dialog centered after a short delay.
   * If the form is invalid or save fails, the target dialog is NOT opened
   * and the appointment dialog stays open so the user can fix the issue.
   */
  /**
   * Validates both the Angular reactive form AND the standalone Location
   * field (selectedLocationId isn't part of the form group since it's
   * driven by a custom search box, not a plain formControl).
   * Returns true if everything required is filled in.
   */
  private validateRequiredFields(): boolean {
    let ok = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      ok = false;
    }
    if (!this.selectedLocationId) {
      this.conflictIsWarning.set(false);
      this.conflictMsg.set("Location is required.");
      ok = false;
    }
    return ok;
  }

  private saveThenOpen(targetName: string, openFn: (appt: Appointment) => void) {
    if (!this.validateRequiredFields()) {
      this.snack.open(`Please complete required fields before opening ${targetName}.`, "×", { duration: 3500 });
      return;
    }

    const payload = this.buildPayload();
    this.saving.set(true);
    this.conflictMsg.set("");

    // Skip availability re-check here — if the user already passed it via Save,
    // or hasn't changed anything that affects scheduling, just persist current values.
    // Use allowDoubleBook/allowOutsideHours = true to avoid blocking navigation
    // to sub-screens on pre-existing (already-saved) conflicts.
    payload.allowDoubleBook   = true;
    payload.allowOutsideHours = true;

    const req = this.data.appointment
      ? this.apptSvc.update(this.data.appointment.id, payload)
      : this.apptSvc.create(payload);

    req.subscribe({
      next: (appt: Appointment) => {
        this.saving.set(false);
        this.snack.open(`Appointment saved. Opening ${targetName}…`, "×", { duration: 2000 });
        (document.activeElement as HTMLElement)?.blur();
        this.dialogRef.close(true); // true = schedule should refresh
        setTimeout(() => openFn(appt), 200);
      },
      error: e => {
        this.saving.set(false);
        this.conflictMsg.set(e.error?.message ?? "Could not save appointment.");
      }
    });
  }

  /** Extracts the current form values into an AppointmentRequest payload. */
  private buildPayload(): any {
    const val = this.form.getRawValue();
    const key = val.resourceKey ?? "";
    const idx = key.indexOf("_"), type = key.substring(0, idx), id = Number(key.substring(idx+1));

    const payload: any = {
      customerId:           val.customerId,
      locationId:           this.selectedLocationId,
      staffId:              val.staffId,
      visitTypeId:          val.visitTypeId,
      visitStatusId:        val.visitStatusId,
      apptDate:             val.apptDate,
      startTime:            val.startTime,
      endTime:              val.endTime,
      durationMin:          val.durationMin,
      chargeAmount:         val.chargeAmount,
      notes:                val.notes,
      excludeAppointmentId: this.data.appointment?.id ?? null,
      allowDoubleBook:      false,
      allowOutsideHours:    false,
    };
    if (type==="RES")   payload.resourceId      = id;
    if (type==="STAFF") payload.staffResourceId = id;
    return payload;
  }

  // ── Save with double-booking + outside-hours warnings ─────────
  save() {
    if (!this.validateRequiredFields()) return;
    const payload = this.buildPayload();
    this.pendingPayload = payload;
    this.checking.set(true);
    this.conflictMsg.set("");
    this.conflictIsWarning.set(false);

    this.apptSvc.checkAvailability(payload).subscribe({
      next: conflict => {
        this.checking.set(false);
        if (!conflict.available) {
          const icons: Record<string,string> = {
            DOUBLE_BOOK: "⚠ Double Booking",
            OUTSIDE_HOURS: "⚠ Outside Working Hours",
            SAME_PATIENT_SAME_DAY: "⚠ Existing Appointment Today",
          };
          const label = icons[conflict.conflictType ?? ""] ?? "⚠ Warning";

          if (conflict.overridable) {
            this.conflictIsWarning.set(true);
            this.conflictMsg.set(
              `${label}: ${conflict.reason}` +
              (conflict.conflictingCustomerName
                ? ` (${conflict.conflictingCustomerName} at ${conflict.startTime ?? ""})`
                : "") +
              `. Click "Book Anyway" to proceed.`
            );
          } else {
            this.conflictIsWarning.set(false);
            this.conflictMsg.set(conflict.reason ?? "This slot is not available.");
          }
          return;
        }
        this.doSave(payload);
      },
      error: e => {
        this.checking.set(false);
        // Surface the error instead of leaving the dialog silently open
        this.conflictIsWarning.set(false);
        this.conflictMsg.set(
          e.error?.message ?? "Could not check availability. Please try again."
        );
      }
    });
  }

  proceedAnyway() {
    if (!this.pendingPayload) return;
    this.pendingPayload.allowDoubleBook   = true;
    this.pendingPayload.allowOutsideHours = true;
    this.conflictMsg.set("");
    this.conflictIsWarning.set(false);
    this.doSave(this.pendingPayload);
  }

  private doSave(payload: any) {
    this.saving.set(true);
    const req = this.data.appointment
      ? this.apptSvc.update(this.data.appointment.id, payload)
      : this.apptSvc.create(payload);
    req.subscribe({
      next: () => { this.saving.set(false); this.snack.open("Appointment saved.", "×", { duration: 2500 }); this.dialogRef.close(true); },
      error: e  => { this.saving.set(false); this.conflictMsg.set(e.error?.message ?? "Could not save."); }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ALL VISITS DIALOG
// ═══════════════════════════════════════════════════════════════
@Component({
  selector: "app-all-visits-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>All Visits — {{ data.customerFullName }}</h3>
        <button class="close-btn" (click)="dialogRef.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
          <select class="form-control" [(ngModel)]="filter" (change)="applyFilter()" style="width:170px;">
            <option value="">All Visits</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="billable">Billable Only</option>
          </select>
          <input type="date" class="form-control" [(ngModel)]="fromDate" (change)="applyFilter()" style="width:150px;"/>
          <input type="date" class="form-control" [(ngModel)]="toDate" (change)="applyFilter()" style="width:150px;"/>
          <span style="margin-left:auto;font-size:12px;color:var(--ink-light);">{{ filtered().length }} visit(s)</span>
        </div>
        @if (loading()) {
          <div style="padding:32px;text-align:center;color:var(--ink-light);">Loading visits…</div>
        } @else {
          <div style="overflow-x:auto;">
            <table class="crm-table">
              <thead>
                <tr><th>Date</th><th>Time</th><th>Resource</th><th>Staff</th><th>Visit Type</th><th>Status</th><th>Charge</th><th>Invoice</th></tr>
              </thead>
              <tbody>
                @for (v of filtered(); track v.id) {
                  <tr [style.background]="v.id === data.currentApptId ? 'rgba(201,168,76,.1)' : ''">
                    <td>{{ v.apptDate | date:"mediumDate" }}</td>
                    <td>{{ v.startTime ? v.startTime.substring(0,5) : '' }} – {{ v.endTime ? v.endTime.substring(0,5) : '' }}</td>
                    <td>{{ v.resourceName || "—" }}</td>
                    <td>{{ v.staffName || "—" }}</td>
                    <td>{{ v.visitTypeName || "—" }}</td>
                    <td><span class="badge badge-info" style="font-size:11px;">{{ v.visitStatusName }}</span></td>
                    <td>{{ v.chargeAmount | currency }}</td>
                    <td>
                      @if (v.invoiceId) { <span class="badge badge-success">Invoiced</span> }
                      @else { <span class="badge badge-neutral">Unpaid</span> }
                    </td>
                  </tr>
                }
                @if (!filtered().length) {
                  <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--ink-light);">No visits found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
      <div class="modal-footer" style="justify-content:flex-end;padding:14px 24px;border-top:1px solid var(--stone-mid);">
        <button class="btn btn-ghost" (click)="dialogRef.close()">Close</button>
      </div>
    </div>
  `,
  styles: [`.appt-modal{display:flex;flex-direction:column;max-height:90vh;} .modal-header{padding:18px 24px 14px;border-bottom:1px solid var(--stone-mid);display:flex;align-items:center;justify-content:space-between;} .modal-header h3{font-family:var(--font-display);font-size:20px;color:var(--jade);} .modal-body{padding:20px 24px;overflow-y:auto;flex:1;}`]
})
export class AllVisitsDialogComponent implements OnInit {
  visits   = signal<Appointment[]>([]);
  loading  = signal(true);
  filter   = ""; fromDate = ""; toDate = "";
  today    = new Date().toISOString().slice(0,10);
  filtered = signal<Appointment[]>([]);
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<AllVisitsDialogComponent>, private http: HttpClient) {}
  ngOnInit() {
    this.http.get<Appointment[]>(`${environment.apiUrl}/appointments/customer/${this.data.customerId}`)
      .subscribe({ next: v => { this.visits.set(v); this.loading.set(false); this.applyFilter(); }, error: () => this.loading.set(false) });
  }
  applyFilter() {
    let list = [...this.visits()];
    if (this.filter === "upcoming") list = list.filter(v => (v.apptDate ?? "") >= this.today);
    if (this.filter === "past")     list = list.filter(v => (v.apptDate ?? "") < this.today);
    if (this.filter === "billable") list = list.filter(v => v.chargeAmount > 0);
    if (this.fromDate) list = list.filter(v => (v.apptDate ?? "") >= this.fromDate);
    if (this.toDate)   list = list.filter(v => (v.apptDate ?? "") <= this.toDate);
    list.sort((a,b) => (b.apptDate ?? "").localeCompare(a.apptDate ?? ""));
    this.filtered.set(list);
  }
}

// ═══════════════════════════════════════════════════════════════
// VISIT NOTES DIALOG
// ═══════════════════════════════════════════════════════════════
@Component({
  selector: "app-visit-notes-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>Visit Notes</h3>
        <div style="font-size:12px;color:var(--ink-light);margin-left:12px;">{{ data.customerFullName }} — {{ data.apptDate | date:"mediumDate" }}</div>
        <button class="close-btn" (click)="dialogRef.close(false)">✕</button>
      </div>
      <div class="modal-body">
        <div class="notes-tabs">
          <div class="ntab" [class.active]="tab === 'soap'" (click)="tab = 'soap'">SOAP Notes</div>
          <div class="ntab" [class.active]="tab === 'treat'" (click)="tab = 'treat'">Treatment</div>
          <div class="ntab" [class.active]="tab === 'charges'" (click)="tab = 'charges'">Add'l Charges</div>
        </div>
        @if (tab === 'soap') {
          <div class="g2">
            <div class="form-group"><label class="form-label">S — Subjective</label><textarea class="form-control" [(ngModel)]="notes.subjective" rows="3" placeholder="What the patient reports…"></textarea></div>
            <div class="form-group"><label class="form-label">O — Objective</label><textarea class="form-control" [(ngModel)]="notes.objective" rows="3" placeholder="Therapist observations…"></textarea></div>
            <div class="form-group"><label class="form-label">A — Assessment</label><textarea class="form-control" [(ngModel)]="notes.assessment" rows="3"></textarea></div>
            <div class="form-group"><label class="form-label">P — Plan</label><textarea class="form-control" [(ngModel)]="notes.plan" rows="3"></textarea></div>
            <div class="form-group gfull"><label class="form-label">Chief Complaint</label><input class="form-control" [(ngModel)]="notes.chiefComplaint"/></div>
            <div class="form-group gfull"><label class="form-label">Follow-up</label><textarea class="form-control" [(ngModel)]="notes.followup" rows="2"></textarea></div>
          </div>
        }
        @if (tab === 'treat') {
          <div class="g2">
            <div class="form-group gfull"><label class="form-label">Treatment Provided</label><textarea class="form-control" [(ngModel)]="notes.treatment" rows="4"></textarea></div>
            <div class="form-group gfull"><label class="form-label">Products Used</label><textarea class="form-control" [(ngModel)]="notes.products" rows="3" placeholder="Oils, creams, equipment…"></textarea></div>
            <div class="form-group"><label class="form-label">Therapist Initials</label><input class="form-control" [(ngModel)]="notes.therapistInitials" placeholder="e.g. MJ"/></div>
          </div>
        }
        @if (tab === 'charges') {
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr>
              <th style="padding:7px 10px;text-align:left;background:var(--stone);border-bottom:1px solid var(--stone-mid);">Description</th>
              <th style="padding:7px 10px;text-align:left;background:var(--stone);border-bottom:1px solid var(--stone-mid);">Code</th>
              <th style="padding:7px 10px;text-align:left;background:var(--stone);border-bottom:1px solid var(--stone-mid);width:60px;">Qty</th>
              <th style="padding:7px 10px;text-align:left;background:var(--stone);border-bottom:1px solid var(--stone-mid);width:90px;">Unit $</th>
              <th style="padding:7px 10px;text-align:left;background:var(--stone);border-bottom:1px solid var(--stone-mid);">Total</th>
              <th style="padding:7px 10px;background:var(--stone);border-bottom:1px solid var(--stone-mid);"></th>
            </tr></thead>
            <tbody>
              @for (row of charges; track $index; let i = $index) {
                <tr>
                  <td style="padding:6px 8px;"><input class="form-control" [(ngModel)]="row.description"/></td>
                  <td style="padding:6px 8px;"><input class="form-control" [(ngModel)]="row.code" style="max-width:80px;"/></td>
                  <td style="padding:6px 8px;"><input type="number" class="form-control" [(ngModel)]="row.qty" min="1" style="max-width:55px;"/></td>
                  <td style="padding:6px 8px;"><input type="number" class="form-control" [(ngModel)]="row.unitPrice" step="0.01" style="max-width:80px;"/></td>
                  <td style="padding:6px 8px;font-weight:600;">{{ (row.qty * row.unitPrice) | currency }}</td>
                  <td style="padding:6px 8px;"><button class="btn btn-ghost btn-sm btn-icon" (click)="charges.splice(i,1)" style="color:var(--danger);">✕</button></td>
                </tr>
              }
            </tbody>
          </table>
          <button class="btn btn-outline btn-sm" style="margin-top:10px;" (click)="charges.push({description:'',code:'',qty:1,unitPrice:0})">+ Add Row</button>
          <div style="text-align:right;font-size:13px;margin-top:12px;color:var(--jade);">Total: <strong>{{ chargesTotal() | currency }}</strong></div>
        }
        @if (saveError()) { <div class="error-alert" style="margin-top:12px;">{{ saveError() }}</div> }
      </div>
      <div class="modal-footer" style="padding:14px 24px;border-top:1px solid var(--stone-mid);display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn btn-ghost" (click)="dialogRef.close(false)">Cancel</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">{{ saving() ? "Saving…" : "Save Notes" }}</button>
      </div>
    </div>
  `,
  styles: [`.appt-modal{display:flex;flex-direction:column;max-height:90vh;} .modal-header{padding:18px 24px 14px;border-bottom:1px solid var(--stone-mid);display:flex;align-items:center;gap:0;justify-content:space-between;} .modal-header h3{font-family:var(--font-display);font-size:22px;color:var(--jade);} .modal-body{padding:20px 24px;overflow-y:auto;flex:1;} .notes-tabs{display:flex;gap:2px;background:var(--stone-mid);padding:3px;border-radius:8px;margin-bottom:16px;} .ntab{padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--ink-mid);font-weight:500;transition:all .12s;} .ntab.active{background:var(--white);color:var(--jade);box-shadow:var(--shadow-sm);} .error-alert{padding:10px 16px;border-radius:var(--radius);font-size:13px;background:#fde8e6;border:1px solid #f5c6c3;color:#9a1f17;}`]
})
export class VisitNotesDialogComponent implements OnInit {
  tab = "soap"; saving = signal(false); saveError = signal("");
  notes = { subjective:"",objective:"",assessment:"",plan:"",chiefComplaint:"",followup:"",treatment:"",products:"",therapistInitials:"" };
  charges: {description:string;code:string;qty:number;unitPrice:number;}[] = [];
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<VisitNotesDialogComponent>, private http: HttpClient, private snack: MatSnackBar) {}
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/appointments/${this.data.appointmentId}/notes`)
      .subscribe({ next: n => { if (n) { Object.assign(this.notes, { subjective:n.subjective??"",objective:n.objective??"",assessment:n.assessment??"",plan:n.plan??"",chiefComplaint:n.chiefComplaint??"",followup:n.followup??"",treatment:n.treatment??"",products:n.products??"",therapistInitials:n.therapistInitials??"" }); this.charges = n.additionalCharges ?? []; } }, error: () => {} });
  }
  chargesTotal(): number { return this.charges.reduce((s, r) => s + r.qty * r.unitPrice, 0); }
  save() {
    this.saving.set(true); this.saveError.set("");
    this.http.post(`${environment.apiUrl}/appointments/${this.data.appointmentId}/notes`, { ...this.notes, additionalCharges: this.charges })
      .subscribe({ next:()=>{this.saving.set(false);this.snack.open("Notes saved.","×",{duration:2500});this.dialogRef.close(true);}, error:e=>{this.saving.set(false);this.saveError.set(e.error?.message??"Could not save.");} });
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOGS DIALOG — new
// ═══════════════════════════════════════════════════════════════
@Component({
  selector: "app-audit-logs-dialog",
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>Audit Log</h3>
        <button class="close-btn" (click)="dialogRef.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="audit-card">
          <div class="audit-row">
            <div class="audit-label">Created By</div>
            <div class="audit-value">{{ data.appointment.createdByName || data.appointment.createdByUsername || "—" }}</div>
            <div class="audit-ts">{{ data.appointment.createdAt | date:"medium" }}</div>
          </div>
          @if (data.appointment.updatedBy) {
            <div class="audit-row">
              <div class="audit-label">Last Updated By</div>
              <div class="audit-value">{{ data.appointment.updatedByName || ("User #" + data.appointment.updatedBy) }}</div>
              <div class="audit-ts">{{ data.appointment.updatedAt | date:"medium" }}</div>
            </div>
          }
          @if (data.appointment.deletedBy) {
            <div class="audit-row deleted">
              <div class="audit-label">Deleted By</div>
              <div class="audit-value">{{ data.appointment.deletedByName || ("User #" + data.appointment.deletedBy) }}</div>
              <div class="audit-ts">{{ data.appointment.deletedAt | date:"medium" }}</div>
            </div>
          }
        </div>
        <div style="margin-top:16px;padding:12px;background:var(--stone);border-radius:var(--radius);font-size:12px;color:var(--ink-light);">
          ℹ️ Full audit trail available in the Admin → Audit Logs screen (coming soon).
        </div>
      </div>
      <div class="modal-footer" style="padding:14px 24px;border-top:1px solid var(--stone-mid);display:flex;justify-content:flex-end;">
        <button class="btn btn-ghost" (click)="dialogRef.close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .appt-modal{display:flex;flex-direction:column;max-height:80vh;}
    .modal-header{padding:18px 24px 14px;border-bottom:1px solid var(--stone-mid);display:flex;align-items:center;justify-content:space-between;}
    .modal-header h3{font-family:var(--font-display);font-size:22px;color:var(--jade);}
    .modal-body{padding:20px 24px;overflow-y:auto;flex:1;}
    .audit-card{border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--stone-mid);}
    .audit-row{display:flex;align-items:center;gap:16px;padding:14px 18px;border-bottom:1px solid var(--stone-mid);}
    .audit-row:last-child{border-bottom:none;}
    .audit-row.deleted{background:#fde8e6;}
    .audit-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-light);width:120px;flex-shrink:0;}
    .audit-value{font-size:14px;font-weight:600;color:var(--ink);flex:1;}
    .audit-ts{font-size:12px;color:var(--ink-light);white-space:nowrap;}
  `]
})
export class AuditLogsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<AuditLogsDialogComponent>) {}
}

// ═══════════════════════════════════════════════════════════════
// QUICK PAY DIALOG — opens on top of appointment dialog
// ═══════════════════════════════════════════════════════════════
@Component({
  selector: "app-quick-pay-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>💳 Collect Payment</h3>
        <button class="close-btn" (click)="dialogRef.close()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:var(--jade-mist);border-radius:var(--radius);padding:16px;text-align:center;margin-bottom:20px;">
          <div style="font-size:12px;color:var(--jade);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">
            {{ data.appointment.customerFullName }}
          </div>
          <div style="font-size:11px;color:var(--ink-light);margin-bottom:8px;">
            {{ data.appointment.apptDate | date:"mediumDate" }} · {{ data.appointment.visitTypeName || "Visit" }}
          </div>
          <div style="font-family:var(--font-display);font-size:28px;color:var(--jade);font-weight:600;">
            {{ data.appointment.chargeAmount | currency }}
          </div>
          <div style="font-size:11px;color:var(--ink-light);">Charge Amount</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-group">
            <label class="form-label">Amount ($) *</label>
            <input type="number" class="form-control" [(ngModel)]="amount"
                   step="0.01" min="0"/>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select class="form-control" [(ngModel)]="method">
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="TRANSFER">Online / ACH</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Reference / Last 4</label>
            <input class="form-control" [(ngModel)]="reference"
                   placeholder="e.g. 4242, Check #101, Txn ID"/>
          </div>
          <div class="form-group">
            <label class="form-label">Payment Date</label>
            <input type="date" class="form-control" [(ngModel)]="payDate"/>
          </div>
        </div>

        @if (error()) {
          <div style="margin-top:12px;padding:10px 16px;border-radius:var(--radius);
                      background:#fde8e6;border:1px solid #f5c6c3;color:#9a1f17;font-size:13px;">
            {{ error() }}
          </div>
        }
      </div>
      <div class="modal-footer">
        <div style="flex:1;"></div>
        <button class="btn btn-ghost" (click)="dialogRef.close()">Cancel</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? "Posting…" : "Post Payment" }}
        </button>
      </div>
    </div>
  `,
  styles: [`.appt-modal{display:flex;flex-direction:column;max-height:80vh;} .modal-header{padding:18px 24px 14px;border-bottom:1px solid var(--stone-mid);display:flex;align-items:center;justify-content:space-between;} .modal-header h3{font-family:var(--font-display);font-size:22px;color:var(--jade);} .modal-body{padding:20px 24px;overflow-y:auto;flex:1;} .modal-footer{padding:14px 24px;border-top:1px solid var(--stone-mid);display:flex;align-items:center;gap:8px;}`]
})
export class QuickPayDialogComponent {
  amount    = 0;
  method    = "CARD";
  reference = "";
  payDate   = new Date().toISOString().slice(0, 10);
  saving    = signal(false);
  error     = signal("");

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<QuickPayDialogComponent>,
    private http: HttpClient,
    private snack: MatSnackBar
  ) {
    this.amount = data.appointment?.chargeAmount ?? 0;
  }

  save() {
    if (!this.amount || this.amount <= 0) { this.error.set("Enter a valid amount."); return; }
    this.saving.set(true);
    this.error.set("");
    this.http.post(`${environment.apiUrl}/payments`, {
      customerId:  this.data.appointment.customerId,
      invoiceIds:  [],           // outstanding payment — no invoice linked
      amount:      this.amount,
      method:      this.method,
      reference:   this.reference,
      paymentDate: this.payDate,
      notes:       `Payment for appointment on ${this.data.appointment.apptDate}`,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open("Payment posted successfully.", "×", { duration: 3000 });
        this.dialogRef.close({ paid: true, amount: this.amount });
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e.error?.message ?? "Could not post payment.");
      }
    });
  }
}