import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { HttpClient } from "@angular/common/http";
import { AdminService } from "../../../core/services/admin.service";
import { Customer, Location } from "../../../shared/models/admin.model";
import { AllVisitsDialogComponent } from "../../schedule/appointment-dialog.component";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-customer-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule, MatDialogModule],
  template: `
    <!-- ── List view ─────────────────────────────────────────────────────── -->
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Customers</div>
          <div class="page-subtitle">Client profiles and history</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Customer</button>
      </div>

      <div class="filters">
        <input class="form-control" [(ngModel)]="search"
               (ngModelChange)="doSearch()"
               placeholder="🔍 Search name, phone, email, DOB…"
               style="width:260px;"/>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Name</th><th>DOB</th><th>Phone</th>
              <th>Email</th><th>Membership</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of customers(); track c.id) {
              <tr [class.inactive-row]="!c.active">
                <td><strong>{{ c.lastName }}, {{ c.firstName }}</strong></td>
                <td>{{ c.dob ? (c.dob | date:"mediumDate") : "—" }}</td>
                <td>{{ c.phone || "—" }}</td>
                <td>{{ c.email || "—" }}</td>
                <td>{{ c.membershipType || "None" }}</td>
                <td>
                  <span class="badge" [ngClass]="c.active ? 'badge-success' : 'badge-danger'">
                    {{ c.active ? "Active" : "Inactive" }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(c)">✏️</button>
                </td>
              </tr>
            }
            @if (!customers().length) {
              <tr>
                <td colspan="7" style="text-align:center;padding:32px;color:var(--ink-light);">
                  No customers found.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Patient detail modal ──────────────────────────────────────────── -->
    @if (showModal()) {
      <div class="crm-overlay">
        <div class="patient-modal" (click)="$event.stopPropagation()">

          <!-- ── Left sidebar ──────────────────────────────────────────── -->
          <aside class="patient-sidebar">
            <!-- Avatar -->
            <div class="sidebar-avatar-wrap">
              <div class="sidebar-avatar">
                {{ avatarInitials() }}
              </div>
            </div>

            <!-- Patient ID + Name -->
            <div class="sidebar-id-block">
              <div class="sidebar-patient-name">
                {{ form.get("lastName")?.value || "—" }}, {{ form.get("firstName")?.value || "—" }}
              </div>
              @if (selected?.id) {
                <div class="sidebar-patient-id">ID: {{ selected!.id }}</div>
              }
              @if (form.get("dob")?.value) {
                <div class="sidebar-dob">DOB: {{ form.get("dob")?.value | date:"MM/dd/yyyy" }}</div>
              }
            </div>

            <div class="sidebar-divider"></div>

            <!-- Status cards -->
            <div class="sidebar-status-section">
              <div class="sidebar-section-label">Status</div>
              <div class="status-card status-active">
                <span class="status-icon">✓</span>
                <span>{{ form.get("active")?.value ? "Active Patient" : "Inactive Patient" }}</span>
              </div>
              @if (form.get("consentOnFile")?.value) {
                <div class="status-card status-info">
                  <span class="status-icon">📋</span>
                  <span>Consent Signed</span>
                </div>
              }
              @if (form.get("membershipType")?.value && form.get("membershipType")?.value !== "None") {
                <div class="status-card status-gold">
                  <span class="status-icon">⭐</span>
                  <span>{{ form.get("membershipType")?.value }} Member</span>
                </div>
              }
              @if (form.get("allergies")?.value) {
                <div class="status-card status-warn">
                  <span class="status-icon">⚠</span>
                  <span>Medical Notes on File</span>
                </div>
              }
            </div>

            <div class="sidebar-divider"></div>

            <!-- Quick info -->
            <div class="sidebar-section-label">Quick Info</div>
            @if (form.get("phone")?.value) {
              <div class="sidebar-quick-row">
                <span class="sidebar-quick-icon">📞</span>
                <span>{{ form.get("phone")?.value }}</span>
              </div>
            }
            @if (form.get("email")?.value) {
              <div class="sidebar-quick-row">
                <span class="sidebar-quick-icon">✉️</span>
                <span style="font-size:11px;word-break:break-all;">{{ form.get("email")?.value }}</span>
              </div>
            }
            @if (form.get("city")?.value) {
              <div class="sidebar-quick-row">
                <span class="sidebar-quick-icon">📍</span>
                <span>{{ form.get("city")?.value }}{{ form.get("state")?.value ? ", " + form.get("state")?.value : "" }}</span>
              </div>
            }

            <!-- All Visits button in sidebar -->
            @if (editing()) {
              <div class="sidebar-divider"></div>
              <button type="button" class="btn btn-outline btn-sm sidebar-all-visits"
                      (click)="openAllVisits()">
                👁 All Visits
              </button>
            }
          </aside>

          <!-- ── Main form area ────────────────────────────────────────── -->
          <div class="patient-main">

            <!-- Header -->
            <div class="patient-header">
              <div>
                <div class="patient-header-title">
                  {{ editing() ? "Edit Patient Record" : "New Patient" }}
                </div>
                <div class="patient-header-sub">Record Edit Mode</div>
              </div>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>

            <div class="patient-body">
              <form [formGroup]="form">

                <!-- Section 1: Personal & Address -->
                <div class="patient-section">
                  <div class="patient-section-title">Section 1 — Personal &amp; Address Information</div>
                  <div class="pg4">
                    <div class="form-group">
                      <label class="form-label">First Name *</label>
                      <input class="form-control" formControlName="firstName"
                             [class.fc-error]="form.get('firstName')?.invalid && form.get('firstName')?.touched"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Middle Name</label>
                      <input class="form-control" formControlName="middleName"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Last Name *</label>
                      <input class="form-control" formControlName="lastName"
                             [class.fc-error]="form.get('lastName')?.invalid && form.get('lastName')?.touched"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Preferred Name</label>
                      <input class="form-control" formControlName="preferredName"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Date of Birth</label>
                      <input type="date" class="form-control" formControlName="dob" [max]="today"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Gender</label>
                      <select class="form-control" formControlName="gender">
                        <option>Female</option><option>Male</option>
                        <option>Non-binary</option><option>Prefer not to say</option>
                      </select>
                    </div>
                    <div class="form-group" style="grid-column:1/-1">
                      <label class="form-label">Address Line 1</label>
                      <input class="form-control" formControlName="address1"
                             placeholder="Street address"/>
                    </div>
                    <div class="form-group" style="grid-column:1/-1">
                      <label class="form-label">Address Line 2</label>
                      <input class="form-control" formControlName="address2"
                             placeholder="Apt, suite, unit…"/>
                    </div>
                    <div class="form-group" style="grid-column:span 2">
                      <label class="form-label">City</label>
                      <input class="form-control" formControlName="city"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">State / Province</label>
                      <select class="form-control" formControlName="state">
                        <option value="">Select State</option>
                        @for (s of states(); track s.code) {
                          <option [value]="s.code">{{ s.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">ZIP Code</label>
                      <input class="form-control" formControlName="zip" maxlength="10"/>
                    </div>
                  </div>
                </div>

                <!-- Section 2+3: Contact & Membership -->
                <div class="pg2" style="margin-top:16px;">
                  <div class="patient-section">
                    <div class="patient-section-title">Section 2 — Contact Information</div>
                    <div class="g2">
                      <div class="form-group">
                        <label class="form-label">Phone *</label>
                        <input class="form-control" formControlName="phone"
                               placeholder="(555) 000-0000"
                               [class.fc-error]="form.get('phone')?.invalid && form.get('phone')?.touched"/>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" formControlName="email"/>
                      </div>
                    </div>
                  </div>
                  <div class="patient-section">
                    <div class="patient-section-title">Section 3 — Membership &amp; Referral</div>
                    <div class="g2">
                      <div class="form-group">
                        <label class="form-label">Membership</label>
                        <select class="form-control" formControlName="membershipType">
                          <option>None</option><option>Silver</option>
                          <option>Gold</option><option>Platinum</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Referred By</label>
                        <input class="form-control" formControlName="referralSource"/>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Section 4: Emergency & Medical -->
                <div class="patient-section" style="margin-top:16px;">
                  <div class="patient-section-title">Section 4 — Emergency &amp; Medical</div>
                  <div class="g2">
                    <div class="form-group">
                      <label class="form-label">Emergency Contact Name</label>
                      <input class="form-control" formControlName="emergencyContact"
                             placeholder="Full name"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Emergency Phone</label>
                      <input class="form-control" formControlName="emergencyPhone"
                             placeholder="(555) 000-0000"/>
                    </div>
                    <div class="form-group" style="grid-column:1/-1">
                      <label class="form-label">Allergies / Medical Notes</label>
                      <textarea class="form-control" formControlName="allergies"
                                rows="3"
                                placeholder="Known allergies, medical conditions, medications…"></textarea>
                    </div>
                  </div>
                </div>

                <!-- Section 5: Legal / Administrative -->
                <div class="patient-section" style="margin-top:16px;">
                  <div class="patient-section-title">Section 5 — Legal / Administrative</div>
                  <div class="legal-row">
                    <div class="legal-item">
                      <div>
                        <div class="legal-label">Consent Form Signed</div>
                        <div class="legal-sub">HIPAA and general treatment consent</div>
                      </div>
                      <label class="toggle">
                        <input type="checkbox" formControlName="consentOnFile">
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                    <div class="legal-item">
                      <div>
                        <div class="legal-label">Active Patient</div>
                        <div class="legal-sub">Deactivate to hide from scheduling</div>
                      </div>
                      <label class="toggle">
                        <input type="checkbox" formControlName="active">
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                @if (error()) {
                  <div class="error-alert" style="margin-top:14px;">{{ error() }}</div>
                }
              </form>
            </div>

            <!-- Footer actions -->
            <div class="patient-footer">
              <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? "Saving…" : "Save Changes" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Patient modal shell ──────────────────────────────────────────── */
    .patient-modal {
      display: flex;
      width: min(1100px, 96vw);
      height: min(90vh, 820px);
      background: #faf9ff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }

    /* ── Sidebar ─────────────────────────────────────────────────────── */
    .patient-sidebar {
      width: 220px;
      flex-shrink: 0;
      background: #f1f3ff;
      border-right: 1px solid #c3c6d6;
      display: flex;
      flex-direction: column;
      padding: 20px 14px;
      overflow-y: auto;
      gap: 0;
    }
    .sidebar-avatar-wrap { display:flex; justify-content:center; margin-bottom:12px; }
    .sidebar-avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--jade);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700;
      font-family: var(--font-display);
      border: 2px solid #003d9b33;
    }
    .sidebar-id-block { text-align:center; margin-bottom:12px; }
    .sidebar-patient-name {
      font-size: 13px; font-weight: 700; color: #051a3e; line-height: 1.3;
      word-break: break-word;
    }
    .sidebar-patient-id { font-size: 11px; color: #737685; margin-top:3px; }
    .sidebar-dob        { font-size: 11px; color: #434654; margin-top:2px; font-weight:600; }

    .sidebar-divider {
      height: 1px; background: #c3c6d6;
      margin: 12px 0;
    }
    .sidebar-status-section { display:flex; flex-direction:column; gap:6px; }
    .sidebar-section-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #737685; margin-bottom: 6px;
    }

    /* Status cards */
    .status-card {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing:.03em;
    }
    .status-icon { font-size: 13px; flex-shrink:0; }
    .status-active { background: #dcfce7; color: #166534; }
    .status-info   { background: #dbeafe; color: #1e40af; }
    .status-gold   { background: #fef9c3; color: #854d0e; }
    .status-warn   { background: #fef3c7; color: #92400e; }

    /* Quick info rows */
    .sidebar-quick-row {
      display: flex; align-items: flex-start; gap: 7px;
      font-size: 12px; color: #434654; padding: 3px 0;
    }
    .sidebar-quick-icon { font-size: 14px; flex-shrink:0; margin-top:1px; }

    .sidebar-all-visits {
      width: 100%; justify-content: center;
      margin-top: 4px;
    }

    /* ── Main content ─────────────────────────────────────────────────── */
    .patient-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .patient-header {
      padding: 16px 24px;
      border-bottom: 1px solid #c3c6d6;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: #faf9ff;
      flex-shrink: 0;
    }
    .patient-header-title {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 700;
      color: #051a3e;
    }
    .patient-header-sub {
      font-size: 11px; color: #737685; text-transform: uppercase;
      letter-spacing: .1em; margin-top: 2px;
    }

    /* Scrollable body */
    .patient-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
    }

    /* Sections */
    .patient-section {
      background: #fff;
      border: 1px solid #c3c6d6;
      border-radius: 8px;
      padding: 16px;
    }
    .patient-section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: #003d9b;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e9edff;
    }

    /* 4-column grid for section 1 */
    .pg4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    /* 2-column grid */
    .pg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .g2  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* Legal toggles */
    .legal-row  { display: flex; flex-direction: column; gap: 8px; }
    .legal-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 14px;
      background: #f1f3ff;
      border-radius: 8px;
    }
    .legal-label { font-size: 13px; font-weight: 600; color: #051a3e; }
    .legal-sub   { font-size: 12px; color: #737685; margin-top:2px; }

    /* Footer */
    .patient-footer {
      padding: 14px 24px;
      border-top: 1px solid #c3c6d6;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #faf9ff;
      flex-shrink: 0;
    }

    /* Validation error on input */
    .fc-error { border-color: var(--danger) !important; }

    .error-alert {
      padding: 10px 16px; border-radius: var(--radius); font-size: 13px;
      background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17;
    }

    @media (max-width: 700px) {
      .patient-modal { flex-direction: column; height: 96vh; width: 98vw; }
      .patient-sidebar { width: 100%; height: auto; flex-direction: row; flex-wrap: wrap; padding: 12px; }
      .pg4 { grid-template-columns: 1fr 1fr; }
      .pg2 { grid-template-columns: 1fr; }
    }
    .inactive-row {
      opacity: 0.6;
    }
  `]
})
export class CustomerListComponent implements OnInit {
  customers = signal<Customer[]>([]);
  states    = signal<{code:string; name:string; country:string}[]>([]);
  today     = new Date().toISOString().slice(0, 10);
  search    = "";
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selected: Customer | null = null;

  form = this.fb.group({
    firstName:        ["", Validators.required],
    middleName:       [""],
    lastName:         ["", Validators.required],
    preferredName:    [""],
    dob:              [null as string | null],
    gender:           ["Female"],
    phone:            ["", Validators.required],
    email:            [""],
    address1:         [""],
    address2:         [""],
    city:             [""],
    state:            [""],
    zip:              [""],
    membershipType:   ["None"],
    referralSource:   [""],
    emergencyContact: [""],
    emergencyPhone:   [""],
    allergies:        [""],
    consentOnFile:    [false],
    active:           [true],
  });

  constructor(
    private adminSvc: AdminService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.doSearch();
    this.loadStates();
  }

  loadStates(country = "US") {
    this.http.get<{code:string; name:string; country:string}[]>(
      `${environment.apiUrl}/states?country=${country}`
    ).subscribe(s => this.states.set(s));
  }

  avatarInitials(): string {
    const f = this.form.get("firstName")?.value ?? "";
    const l = this.form.get("lastName")?.value  ?? "";
    return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "?";
  }

  doSearch() {
    this.adminSvc.searchCustomers(this.search).subscribe(c => this.customers.set(c));
  }

  openModal(c?: Customer) {
    this.editing.set(!!c);
    this.error.set("");
    this.selected = c ?? null;
    if (c) {
      this.form.patchValue({
        firstName:        c.firstName,
        middleName:       c.middleName ?? "",
        lastName:         c.lastName,
        preferredName:    c.preferredName ?? "",
        dob:              c.dob ?? null,
        gender:           c.gender ?? "Female",
        phone:            c.phone ?? "",
        email:            c.email ?? "",
        address1:         c.address1 ?? "",
        address2:         c.address2 ?? "",
        city:             c.city ?? "",
        state:            c.state ?? "",
        zip:              c.zip ?? "",
        membershipType:   c.membershipType ?? "None",
        referralSource:   c.referralSource ?? "",
        emergencyContact: c.emergencyContact ?? "",
        emergencyPhone:   c.emergencyPhone ?? "",
        allergies:        c.allergies ?? "",
        consentOnFile:    c.consentOnFile,
        active:           c.active,
      });
    } else {
      this.form.reset({
        gender: "Female", membershipType: "None",
        consentOnFile: false, active: true
      });
    }
    this.showModal.set(true);
  }

  openAllVisits() {
    if (!this.selected) return;
    this.dialog.open(AllVisitsDialogComponent, {
      width: "860px",
      maxHeight: "90vh",
      data: {
        customerId:       this.selected.id,
        customerFullName: `${this.selected.firstName} ${this.selected.lastName}`,
        currentApptId:    null,
      }
    });
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set("");
    const val = this.form.getRawValue() as any;
    const req = this.editing()
      ? this.adminSvc.updateCustomer(this.selected!.id, val)
      : this.adminSvc.createCustomer(val);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.snack.open("Customer saved.", "×", { duration: 3000 });
        this.doSearch();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e.error?.message ?? "An error occurred.");
      }
    });
  }
}