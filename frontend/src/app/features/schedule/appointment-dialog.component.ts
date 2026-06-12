import { Component, OnInit, Inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { debounceTime, distinctUntilChanged, switchMap, of, forkJoin } from "rxjs";
import { AppointmentService } from "../../core/services/appointment.service";
import { AdminService } from "../../core/services/admin.service";
import { Resource, User, VisitType, VisitStatus, Customer, Location } from "../../shared/models/admin.model";
import { Appointment } from "../../shared/models/appointment.model";
import { environment } from "../../../environments/environment";

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

            <!-- Resource / Staff -->
            <div class="form-group">
              <label class="form-label">
                Resource / Staff *
                @if (resourceTypeTag()) {
                  <span class="res-type-tag">{{ resourceTypeTag() }}</span>
                }
              </label>
              <select class="form-control" formControlName="resourceKey"
                      (change)="onResourceChange()">
                <option value="">— Select resource or staff —</option>
                <optgroup label="🏠 Resources">
                  @for (r of data.activeResources || []; track r.id) {
                    <option [value]="'RES_' + r.id">{{ r.name }}</option>
                  }
                </optgroup>
                <optgroup label="👤 Staff">
                  @for (s of data.activeStaff || []; track s.id) {
                    <option [value]="'STAFF_' + s.id">
                      {{ s.firstName }} {{ s.lastName }}
                    </option>
                  }
                </optgroup>
              </select>
              @if (staffAsResourceNote()) {
                <div class="staff-res-note">
                  👤 Staff selected as resource — Assigned Staff auto-filled below.
                </div>
              }
            </div>

            <!-- Location -->
            <div class="form-group">
              <label class="form-label">Location</label>
              <select class="form-control" formControlName="locationId">
                <option [ngValue]="null">— Select location —</option>
                @for (loc of locations(); track loc.id) {
                  <option [ngValue]="loc.id">{{ loc.name }}</option>
                }
              </select>
            </div>

            <!-- Customer autocomplete -->
            <div class="form-group gfull">
              <label class="form-label">Customer *</label>
              <div class="autocomplete-wrap">
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
                <div class="allergy-alert">
                  <span>⚠</span>
                  Allergies/Notes: {{ selectedCustomer()!.allergies }}
                </div>
              }
            </div>

            <!-- Assigned Staff -->
            <div class="form-group">
              <label class="form-label">Assigned Staff</label>
              <select class="form-control" formControlName="staffId">
                <option [ngValue]="null">— No specific staff —</option>
                @for (s of (data.allStaff || data.activeStaff || []); track s.id) {
                  <option [ngValue]="s.id"
                          [disabled]="!s.active"
                          [style.color]="s.active ? '' : 'var(--ink-light)'"
                          [style.fontStyle]="s.active ? '' : 'italic'">
                    {{ s.firstName }} {{ s.lastName }}
                    {{ s.active ? "" : "(Inactive)" }}
                  </option>
                }
              </select>
            </div>

            <!-- Date -->
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input type="date" class="form-control" formControlName="apptDate"/>
            </div>

            <!-- Start time -->
            <div class="form-group">
              <label class="form-label">Start Time *</label>
              <input type="time" class="form-control" formControlName="startTime"
                     (change)="syncEndTime()"/>
            </div>

            <!-- End time -->
            <div class="form-group">
              <label class="form-label">End Time</label>
              <input type="time" class="form-control" formControlName="endTime"/>
            </div>

            <!-- Visit Type -->
            <div class="form-group">
              <label class="form-label">Visit Type</label>
              <select class="form-control" formControlName="visitTypeId"
                      (change)="onVisitTypeChange()">
                <option [ngValue]="null">— Select type —</option>
                @for (vt of visitTypes(); track vt.id) {
                  <option [ngValue]="vt.id">
                    {{ vt.name }} ({{ vt.durationMin }}min)
                  </option>
                }
              </select>
            </div>

            <!-- Visit Status — FIX: use id comparison not object comparison -->
            <div class="form-group">
              <label class="form-label">Visit Status *</label>
              <select class="form-control" formControlName="visitStatusId">
                <option [ngValue]="null">— Select status —</option>
                @for (vs of visitStatuses(); track vs.id) {
                  <option [ngValue]="vs.id">{{ vs.name }}</option>
                }
              </select>
            </div>

            <!-- Duration -->
            <div class="form-group">
              <label class="form-label">Duration (min)</label>
              <select class="form-control" formControlName="durationMin"
                      (change)="syncEndFromDuration()">
                <option [ngValue]="15">15</option>
                <option [ngValue]="30">30</option>
                <option [ngValue]="45">45</option>
                <option [ngValue]="60">60</option>
                <option [ngValue]="75">75</option>
                <option [ngValue]="90">90</option>
                <option [ngValue]="120">120</option>
              </select>
            </div>

            <!-- Charge amount -->
            <div class="form-group">
              <label class="form-label">Charge Amount ($)</label>
              <input type="number" class="form-control" formControlName="chargeAmount"
                     placeholder="0.00" step="0.01" min="0"/>
            </div>

            <!-- Notes -->
            <div class="form-group gfull">
              <label class="form-label">Appointment Notes</label>
              <textarea class="form-control" formControlName="notes"
                        rows="2"
                        placeholder="Notes about this visit…"></textarea>
            </div>

          </div>

          @if (conflictMsg()) {
            <div class="conflict-alert">
              <span>⚠</span> {{ conflictMsg() }}
            </div>
          }

          <!-- Payment status bar -->
          <div class="pay-status-bar">
            <span class="pay-label">Payment:</span>
            <span class="badge" [ngClass]="data.appointment?.invoiceId ? 'badge-success' : 'badge-neutral'">
              {{ data.appointment?.invoiceId ? "Invoiced" : "Unpaid" }}
            </span>
            <span style="flex:1"></span>
            <button class="btn btn-gold btn-sm" type="button"
                    (click)="collectPayment()">
              💳 Collect Payment
            </button>
          </div>

        </form>
      </div>

      <div class="modal-footer">
        <div style="flex:1;"></div>
        @if (data.appointment) {
          <button class="btn btn-outline btn-sm" type="button"
                  (click)="openVisitNotes()">📝 Visit Notes</button>
          <button class="btn btn-outline btn-sm" type="button"
                  (click)="openAllVisits()">📋 All Visits</button>
        }
        <button class="btn btn-primary" type="button"
                (click)="save()"
                [disabled]="saving() || checking()">
          {{ saving() ? "Saving…" : checking() ? "Checking…" : "Save Appointment" }}
        </button>
        <button class="btn btn-ghost" type="button" (click)="cancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .appt-modal { display: flex; flex-direction: column; max-height: 90vh; }
    .modal-header {
      padding: 18px 24px 14px; border-bottom: 1px solid var(--stone-mid);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .modal-header h3 { font-family: var(--font-display); font-size: 22px; color: var(--jade); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer {
      padding: 14px 24px; border-top: 1px solid var(--stone-mid);
      display: flex; align-items: center; justify-content: flex-end;
      gap: 8px; flex-shrink: 0;
    }
    .res-type-tag {
      display: inline-block; margin-left: 6px; font-size: 10px; font-weight: 700;
      padding: 2px 7px; border-radius: 10px;
      background: var(--jade-mist); color: var(--jade);
      text-transform: uppercase; letter-spacing: .04em; vertical-align: middle;
    }
    .staff-res-note {
      margin-top: 5px; font-size: 11px; color: var(--jade);
      background: var(--jade-mist); padding: 5px 10px; border-radius: 6px;
    }
    .allergy-alert {
      display: flex; align-items: center; gap: 8px;
      background: #fef0d8; border: 1px solid #f5c87a;
      border-radius: var(--radius); padding: 7px 12px;
      font-size: 12px; color: #7a4800; margin-top: 6px;
    }
    .conflict-alert {
      display: flex; align-items: center; gap: 8px;
      background: #fde8e6; border: 1px solid #f5c8c8;
      border-radius: var(--radius); padding: 10px 14px;
      color: var(--danger); font-size: 13px; margin-top: 12px;
    }
    .pay-status-bar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; background: var(--stone);
      border-radius: var(--radius); margin-top: 14px; font-size: 12px;
    }
    .pay-label { font-weight: 600; color: var(--ink-mid); text-transform: uppercase; }
    .autocomplete-wrap { position: relative; }
    .ac-dropdown {
      position: absolute; top: 100%; left: 0; right: 0;
      background: var(--white); border: 1.5px solid var(--jade-light);
      border-radius: var(--radius); box-shadow: var(--shadow-md);
      z-index: 100; max-height: 220px; overflow-y: auto;
    }
    .ac-item {
      padding: 9px 14px; cursor: pointer; font-size: 13px;
      border-bottom: 1px solid var(--stone-mid);
    }
    .ac-item:hover { background: var(--jade-mist); }
    .ac-item:last-child { border-bottom: none; }
    .ac-sub { font-size: 11px; color: var(--ink-light); margin-left: 8px; }
  `]
})
export class AppointmentDialogComponent implements OnInit {

  form = this.fb.group({
    resourceKey:   [""],
    staffId:       [null as number | null],
    locationId:    [null as number | null],
    customerId:    [null as number | null, Validators.required],
    apptDate:      ["", Validators.required],
    startTime:     ["09:00", Validators.required],
    endTime:       ["10:00", Validators.required],
    visitTypeId:   [null as number | null],
    visitStatusId: [null as number | null, Validators.required],
    durationMin:   [60],
    chargeAmount:  [0],
    notes:         [""],
  });

  customerSearch   = new FormControl("");
  customerResults  = signal<Customer[]>([]);
  selectedCustomer = signal<Customer | null>(null);
  showCustomerDrop = signal(false);

  visitTypes    = signal<VisitType[]>([]);
  visitStatuses = signal<VisitStatus[]>([]);
  locations     = signal<Location[]>([]);

  saving      = signal(false);
  checking    = signal(false);
  conflictMsg = signal("");

  resourceTypeTag     = signal("");
  staffAsResourceNote = signal(false);

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
    this.setupCustomerSearch();
  }

  private loadLookups() {
    // Load all lookups in parallel with forkJoin for speed
    forkJoin({
      locations: this.adminSvc.getLocations(),
      visitTypes: this.adminSvc.getVisitTypes(),
      statuses: this.adminSvc.getVisitStatuses(),
    }).subscribe(({ locations, visitTypes, statuses }) => {
      this.locations.set(locations);
      this.visitTypes.set(visitTypes);
      this.visitStatuses.set(statuses);
      // Patch form AFTER all data loaded
      if (this.data.appointment) {
        this.patchFromAppointment();
      } else {
        this.patchDefaults(statuses);
      }
    });
  }

  private setupCustomerSearch() {
    this.customerSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => q && q.length > 1
        ? this.http.get<Customer[]>(`${environment.apiUrl}/customers?q=${encodeURIComponent(q)}`)
        : of([]))
    ).subscribe(r => this.customerResults.set(r));
  }

  private patchDefaults(statuses: VisitStatus[]) {
    const date   = this.data.defaultDate ?? new Date().toISOString().slice(0, 10);
    const time   = this.data.defaultTime ?? "09:00";
    const end    = this.addMinutes(time, 60);
    const firstS = statuses.length ? statuses[0].id : null;

    this.form.patchValue({
      apptDate:      date,
      startTime:     time,
      endTime:       end,
      visitStatusId: firstS,
    });

    if (this.data.resourceId) {
      this.form.patchValue({ resourceKey: "RES_" + this.data.resourceId });
      this.resourceTypeTag.set("Room");
    } else if (this.data.staffId) {
      this.form.patchValue({
        resourceKey: "STAFF_" + this.data.staffId,
        staffId:     this.data.staffId
      });
      this.resourceTypeTag.set("Staff");
      this.staffAsResourceNote.set(true);
    }
  }

  private patchFromAppointment() {
    const a = this.data.appointment as Appointment;

    // Set resource key
    if (a.resourceId) {
      this.form.patchValue({ resourceKey: "RES_" + a.resourceId });
      this.resourceTypeTag.set("Room");
    } else if (a.staffResourceId) {
      this.form.patchValue({ resourceKey: "STAFF_" + a.staffResourceId });
      this.resourceTypeTag.set("Staff");
      this.staffAsResourceNote.set(true);
    }

    // Patch all scalar fields — visitStatusId is a number, select matches by [ngValue]="vs.id"
    this.form.patchValue({
      staffId:       a.staffId        ?? null,
      locationId:    a.locationId     ?? null,
      customerId:    a.customerId,
      apptDate:      a.apptDate       ?? "",
      startTime:     (a.startTime     ?? "09:00").substring(0, 5),
      endTime:       (a.endTime       ?? "10:00").substring(0, 5),
      visitTypeId:   a.visitTypeId    ?? null,
      visitStatusId: a.visitStatusId  ?? null,   // ← plain number, matches option [ngValue]
      durationMin:   a.durationMin    ?? 60,
      chargeAmount:  a.chargeAmount   ?? 0,
      notes:         a.notes          ?? "",
    });

    // Set customer display
    if (a.customerFullName) {
      this.customerSearch.setValue(a.customerFullName, { emitEvent: false });
      this.selectedCustomer.set({ id: a.customerId, allergies: null } as any);
    }
  }

  onResourceChange() {
    const key = this.form.value.resourceKey ?? "";
    if (!key) { this.resourceTypeTag.set(""); this.staffAsResourceNote.set(false); return; }
    const idx  = key.indexOf("_");
    const type = key.substring(0, idx);
    const id   = Number(key.substring(idx + 1));
    if (type === "STAFF") {
      this.resourceTypeTag.set("Staff");
      this.staffAsResourceNote.set(true);
      this.form.patchValue({ staffId: id });
    } else {
      this.resourceTypeTag.set("Room");
      this.staffAsResourceNote.set(false);
    }
  }

  onVisitTypeChange() {
    const vtId = this.form.value.visitTypeId;
    const vt   = this.visitTypes().find(v => v.id === vtId);
    if (vt) {
      this.form.patchValue({ durationMin: vt.durationMin, chargeAmount: vt.defaultPrice });
      this.syncEndFromDuration();
    }
  }

  syncEndTime() {
    const end = this.addMinutes(
      this.form.value.startTime ?? "09:00",
      this.form.value.durationMin ?? 60
    );
    this.form.patchValue({ endTime: end }, { emitEvent: false });
  }

  syncEndFromDuration() {
    const end = this.addMinutes(
      this.form.value.startTime ?? "09:00",
      Number(this.form.value.durationMin ?? 60)
    );
    this.form.patchValue({ endTime: end }, { emitEvent: false });
  }

  private addMinutes(time: string, mins: number): string {
    const [h, m] = time.substring(0, 5).split(":").map(Number);
    const total  = h * 60 + m + mins;
    return String(Math.floor(total / 60) % 24).padStart(2, "0") + ":" +
           String(total % 60).padStart(2, "0");
  }

  selectCustomer(c: Customer) {
    this.selectedCustomer.set(c);
    this.customerSearch.setValue(c.lastName + ", " + c.firstName, { emitEvent: false });
    this.form.patchValue({ customerId: c.id });
    this.showCustomerDrop.set(false);
    this.customerResults.set([]);
  }

  onCustomerBlur() {
    setTimeout(() => this.showCustomerDrop.set(false), 200);
  }

  collectPayment() {
    this.snack.open("Payment module — coming in next build.", "×", { duration: 3000 });
  }

  openAllVisits() {
    if (!this.data.appointment?.customerId) return;
    this.dialog.open(AllVisitsDialogComponent, {
      width: "860px",
      maxHeight: "90vh",
      position: { top: "40px" },
      data: {
        customerId:       this.data.appointment.customerId,
        customerFullName: this.data.appointment.customerFullName,
        currentApptId:    this.data.appointment.id,
      }
    });
  }

  openVisitNotes() {
    if (!this.data.appointment?.id) return;
    this.dialog.open(VisitNotesDialogComponent, {
      width: "820px",
      maxHeight: "90vh",
      position: { top: "40px" },
      data: {
        appointmentId:    this.data.appointment.id,
        customerFullName: this.data.appointment.customerFullName,
        apptDate:         this.data.appointment.apptDate,
      },
      disableClose: true
    });
  }

  cancel() { this.dialogRef.close(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const val  = this.form.getRawValue();
    const key  = val.resourceKey ?? "";
    const idx  = key.indexOf("_");
    const type = key.substring(0, idx);
    const id   = Number(key.substring(idx + 1));

    const payload: any = {
      customerId:           val.customerId,
      locationId:           val.locationId,
      staffId:              val.staffId,
      visitTypeId:          val.visitTypeId,
      visitStatusId:        val.visitStatusId,
      apptDate:             val.apptDate,
      startTime:            val.startTime,
      endTime:              val.endTime,
      chargeAmount:         val.chargeAmount,
      notes:                val.notes,
      excludeAppointmentId: this.data.appointment?.id ?? null,
    };
    if (type === "RES")   payload.resourceId      = id;
    if (type === "STAFF") payload.staffResourceId = id;

    this.checking.set(true);
    this.conflictMsg.set("");

    this.apptSvc.checkAvailability(payload).subscribe({
      next: conflict => {
        this.checking.set(false);
        if (!conflict.available) {
          this.conflictMsg.set(conflict.reason +
            (conflict.conflictingCustomerName
              ? ` — ${conflict.conflictingCustomerName} at ${conflict.startTime}` : ""));
          return;
        }
        this.doSave(payload);
      },
      error: () => { this.checking.set(false); this.doSave(payload); }
    });
  }

  private doSave(payload: any) {
    this.saving.set(true);
    const req = this.data.appointment
      ? this.apptSvc.update(this.data.appointment.id, payload)
      : this.apptSvc.create(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open("Appointment saved.", "×", { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.saving.set(false);
        this.conflictMsg.set(e.error?.message ?? "Could not save appointment.");
      }
    });
  }
}

// ══════════════════════════════════════════════════════════════
// ALL VISITS DIALOG — patient's full history
// ══════════════════════════════════════════════════════════════
@Component({
  selector: "app-all-visits-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>All Visits — {{ data.customerFullName }}</h3>
        <button class="close-btn" (click)="close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="visits-filters">
          <select class="form-control" [(ngModel)]="filter" (change)="applyFilter()"
                  style="width:180px;">
            <option value="">All Visits</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="billable">Billable Only</option>
          </select>
          <input type="date" class="form-control" [(ngModel)]="fromDate"
                 (change)="applyFilter()" style="width:150px;" placeholder="From"/>
          <input type="date" class="form-control" [(ngModel)]="toDate"
                 (change)="applyFilter()" style="width:150px;" placeholder="To"/>
          <span class="visits-count">{{ filtered().length }} visit(s)</span>
        </div>

        @if (loading()) {
          <div style="padding:32px;text-align:center;color:var(--ink-light);">
            Loading visits…
          </div>
        } @else if (filtered().length === 0) {
          <div style="padding:32px;text-align:center;color:var(--ink-light);">
            No visits found.
          </div>
        } @else {
          <div style="overflow-x:auto;">
            <table class="visits-table">
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Resource</th><th>Staff</th>
                  <th>Visit Type</th><th>Status</th><th>Charge</th><th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                @for (v of filtered(); track v.id) {
                  <tr [class.current-row]="v.id === data.currentApptId">
                    <td>{{ v.apptDate | date:"mediumDate" }}</td>
                    <td>{{ v.startTime ? v.startTime.substring(0,5) : '' }} – {{ v.endTime ? v.endTime.substring(0,5) : '' }}</td>
                    <td>{{ v.resourceName || "—" }}</td>
                    <td>{{ v.staffName || "—" }}</td>
                    <td>{{ v.visitTypeName || "—" }}</td>
                    <td>
                      <span class="badge badge-info" style="font-size:11px;">
                        {{ v.visitStatusName }}
                      </span>
                    </td>
                    <td>{{ v.chargeAmount | currency }}</td>
                    <td>
                      @if (v.invoiceId) {
                        <span class="badge badge-success">Invoiced</span>
                      } @else {
                        <span class="badge badge-neutral">Unpaid</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .appt-modal { display: flex; flex-direction: column; max-height: 90vh; }
    .modal-header {
      padding: 18px 24px 14px; border-bottom: 1px solid var(--stone-mid);
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-header h3 { font-family: var(--font-display); font-size: 20px; color: var(--jade); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer {
      padding: 14px 24px; border-top: 1px solid var(--stone-mid);
      display: flex; justify-content: flex-end;
    }
    .visits-filters {
      display: flex; gap: 10px; align-items: center;
      flex-wrap: wrap; margin-bottom: 16px;
    }
    .visits-count { font-size: 12px; color: var(--ink-light); margin-left: auto; }
    .visits-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .visits-table th {
      background: var(--jade); color: #fff; font-size: 11px;
      font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
      padding: 8px 12px; text-align: left;
    }
    .visits-table td {
      padding: 9px 12px; border-bottom: 1px solid var(--stone-mid);
    }
    .visits-table tr:hover td { background: var(--jade-mist); }
    .visits-table tr.current-row td { background: rgba(201,168,76,.12); }
    .visits-table tr:last-child td { border-bottom: none; }
  `]
})
export class AllVisitsDialogComponent implements OnInit {
  visits   = signal<Appointment[]>([]);
  loading  = signal(true);
  filter   = "";
  fromDate = "";
  toDate   = "";
  today    = new Date().toISOString().slice(0, 10);

  filtered = signal<Appointment[]>([]);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<AllVisitsDialogComponent>,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.http.get<Appointment[]>(
      `${environment.apiUrl}/appointments/customer/${this.data.customerId}`
    ).subscribe({
      next: v => {
        this.visits.set(v);
        this.loading.set(false);
        this.applyFilter();
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter() {
    let list = [...this.visits()];
    if (this.filter === "upcoming") list = list.filter(v => (v.apptDate ?? "") >= this.today);
    if (this.filter === "past")     list = list.filter(v => (v.apptDate ?? "") <  this.today);
    if (this.filter === "billable") list = list.filter(v => v.chargeAmount > 0);
    if (this.fromDate) list = list.filter(v => (v.apptDate ?? "") >= this.fromDate);
    if (this.toDate)   list = list.filter(v => (v.apptDate ?? "") <= this.toDate);
    list.sort((a, b) => (b.apptDate ?? "").localeCompare(a.apptDate ?? ""));
    this.filtered.set(list);
  }

  close() { this.dialogRef.close(); }
}

// ══════════════════════════════════════════════════════════════
// VISIT NOTES DIALOG — SOAP notes matching HTML prototype exactly
// ══════════════════════════════════════════════════════════════
@Component({
  selector: "app-visit-notes-dialog",
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="appt-modal">
      <div class="modal-header">
        <h3>Visit Notes</h3>
        <div style="font-size:12px;color:var(--ink-light);margin-left:12px;">
          {{ data.customerFullName }} — {{ data.apptDate | date:"mediumDate" }}
        </div>
        <button class="close-btn" (click)="cancel()">✕</button>
      </div>
      <div class="modal-body">

        <!-- Tabs — matching HTML prototype exactly -->
        <div class="notes-tabs">
          <div class="ntab" [class.active]="tab === 'soap'"
               (click)="tab = 'soap'">SOAP Notes</div>
          <div class="ntab" [class.active]="tab === 'treat'"
               (click)="tab = 'treat'">Treatment</div>
          <div class="ntab" [class.active]="tab === 'charges'"
               (click)="tab = 'charges'">Add'l Charges</div>
        </div>

        <!-- SOAP tab -->
        @if (tab === 'soap') {
          <div class="g2">
            <div class="form-group">
              <label class="form-label">S — Subjective</label>
              <textarea class="form-control" [(ngModel)]="notes.subjective"
                        rows="3" placeholder="What the patient reports…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">O — Objective</label>
              <textarea class="form-control" [(ngModel)]="notes.objective"
                        rows="3" placeholder="Therapist observations…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">A — Assessment</label>
              <textarea class="form-control" [(ngModel)]="notes.assessment"
                        rows="3" placeholder="Therapist assessment…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">P — Plan</label>
              <textarea class="form-control" [(ngModel)]="notes.plan"
                        rows="3" placeholder="Treatment plan, follow-up…"></textarea>
            </div>
            <div class="form-group gfull">
              <label class="form-label">Chief Complaint</label>
              <input class="form-control" [(ngModel)]="notes.chiefComplaint"
                     placeholder="Primary reason for today's visit"/>
            </div>
            <div class="form-group gfull">
              <label class="form-label">Follow-up Recommendations</label>
              <textarea class="form-control" [(ngModel)]="notes.followup"
                        rows="2"></textarea>
            </div>
          </div>
        }

        <!-- Treatment tab -->
        @if (tab === 'treat') {
          <div class="g2">
            <div class="form-group gfull">
              <label class="form-label">Treatment Provided</label>
              <textarea class="form-control" [(ngModel)]="notes.treatment"
                        rows="4"></textarea>
            </div>
            <div class="form-group gfull">
              <label class="form-label">Products Used</label>
              <textarea class="form-control" [(ngModel)]="notes.products"
                        rows="3"
                        placeholder="Oils, creams, equipment…"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Therapist Initials</label>
              <input class="form-control" [(ngModel)]="notes.therapistInitials"
                     placeholder="e.g. MJ"/>
            </div>
          </div>
        }

        <!-- Additional Charges tab -->
        @if (tab === 'charges') {
          <table class="charges-table">
            <thead>
              <tr>
                <th>Description</th><th>Charge Code</th>
                <th>Qty</th><th>Unit Price</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (row of charges; track $index; let i = $index) {
                <tr>
                  <td><input class="form-control" [(ngModel)]="row.description"/></td>
                  <td><input class="form-control" [(ngModel)]="row.code" style="width:90px;"/></td>
                  <td><input type="number" class="form-control" [(ngModel)]="row.qty"
                             (input)="calcRow(i)" style="width:60px;" min="1"/></td>
                  <td><input type="number" class="form-control" [(ngModel)]="row.unitPrice"
                             (input)="calcRow(i)" step="0.01" style="width:90px;"/></td>
                  <td style="font-weight:600;">{{ (row.qty * row.unitPrice) | currency }}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm btn-icon"
                            (click)="removeCharge(i)"
                            style="color:var(--danger);">🗑</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <button class="btn btn-outline btn-sm" style="margin-top:10px;"
                  (click)="addCharge()">+ Add Row</button>
          <div class="charges-total">
            Total: <strong>{{ chargesTotal() | currency }}</strong>
          </div>
        }

        @if (saveError()) {
          <div class="conflict-alert" style="margin-top:12px;">
            <span>⚠</span> {{ saveError() }}
          </div>
        }

      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" (click)="cancel()">Cancel</button>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
          {{ saving() ? "Saving…" : "Save Notes" }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .appt-modal { display: flex; flex-direction: column; max-height: 90vh; }
    .modal-header {
      padding: 18px 24px 14px; border-bottom: 1px solid var(--stone-mid);
      display: flex; align-items: center; gap: 0; justify-content: space-between;
    }
    .modal-header h3 { font-family: var(--font-display); font-size: 22px; color: var(--jade); }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-footer {
      padding: 14px 24px; border-top: 1px solid var(--stone-mid);
      display: flex; justify-content: flex-end; gap: 8px;
    }
    .notes-tabs {
      display: flex; gap: 2px; background: var(--stone-mid);
      padding: 3px; border-radius: 8px; margin-bottom: 16px;
    }
    .ntab {
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-size: 12px; color: var(--ink-mid); font-weight: 500;
      transition: all .12s;
    }
    .ntab.active { background: var(--white); color: var(--jade); box-shadow: var(--shadow-sm); }
    .charges-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .charges-table th {
      background: var(--stone); color: var(--ink-mid); font-size: 11px;
      text-transform: uppercase; letter-spacing: .05em;
      padding: 7px 10px; text-align: left;
      border-bottom: 1px solid var(--stone-mid);
    }
    .charges-table td { padding: 7px 10px; border-bottom: 1px solid var(--stone-mid); }
    .charges-table input {
      border: 1px solid var(--stone-dark); border-radius: 4px;
      padding: 4px 7px; font-size: 12px; width: 100%;
    }
    .charges-total {
      text-align: right; font-size: 13px; margin-top: 12px; color: var(--jade);
    }
    .conflict-alert {
      display: flex; align-items: center; gap: 8px;
      background: #fde8e6; border: 1px solid #f5c8c8;
      border-radius: var(--radius); padding: 10px 14px;
      color: var(--danger); font-size: 13px;
    }
  `]
})
export class VisitNotesDialogComponent implements OnInit {
  tab     = "soap";
  saving  = signal(false);
  saveError = signal("");

  notes = {
    subjective: "", objective: "", assessment: "", plan: "",
    chiefComplaint: "", followup: "",
    treatment: "", products: "", therapistInitials: ""
  };

  charges: { description: string; code: string; qty: number; unitPrice: number; }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<VisitNotesDialogComponent>,
    private http: HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    // Load existing notes
    this.http.get<any>(
      `${environment.apiUrl}/appointments/${this.data.appointmentId}/notes`
    ).subscribe({
      next: n => {
        if (n) {
          this.notes.subjective        = n.subjective        ?? "";
          this.notes.objective         = n.objective         ?? "";
          this.notes.assessment        = n.assessment        ?? "";
          this.notes.plan              = n.plan              ?? "";
          this.notes.chiefComplaint    = n.chiefComplaint    ?? "";
          this.notes.followup          = n.followup          ?? "";
          this.notes.treatment         = n.treatment         ?? "";
          this.notes.products          = n.products          ?? "";
          this.notes.therapistInitials = n.therapistInitials ?? "";
          this.charges = n.additionalCharges ?? [];
        }
      },
      error: () => {} // 404 = no notes yet, that's fine
    });
  }

  addCharge() {
    this.charges.push({ description: "", code: "", qty: 1, unitPrice: 0 });
  }

  removeCharge(i: number) { this.charges.splice(i, 1); }

  calcRow(_i: number) { /* totals computed in template */ }

  chargesTotal(): number {
    return this.charges.reduce((s, r) => s + r.qty * r.unitPrice, 0);
  }

  save() {
    this.saving.set(true);
    this.saveError.set("");
    this.http.post(
      `${environment.apiUrl}/appointments/${this.data.appointmentId}/notes`,
      { ...this.notes, additionalCharges: this.charges }
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open("Notes saved.", "×", { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: e => {
        this.saving.set(false);
        this.saveError.set(e.error?.message ?? "Could not save notes.");
      }
    });
  }

  cancel() { this.dialogRef.close(false); }
}
