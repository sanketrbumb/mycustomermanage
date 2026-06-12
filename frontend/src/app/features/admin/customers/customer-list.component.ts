import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AdminService } from "../../../core/services/admin.service";
import { Customer, Location } from "../../../shared/models/admin.model";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC",
  "ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

@Component({
  selector: "app-customer-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
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
               placeholder="🔍 Search name, phone, email…"
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
              <tr>
                <td><strong>{{ c.lastName }}, {{ c.firstName }}</strong></td>
                <td>{{ c.dob ? (c.dob | date:"mediumDate") : "—" }}</td>
                <td>{{ c.phone || "—" }}</td>
                <td>{{ c.email || "—" }}</td>
                <td>{{ c.membershipType || "None" }}</td>
                <td>
                  <span class="badge" [ngClass]="c.active ? 'badge-success' : 'badge-neutral'">
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

    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editing() ? "Edit Customer" : "Add Customer" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div class="g3">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input class="form-control" formControlName="firstName"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input class="form-control" formControlName="lastName"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Date of Birth</label>
                  <input type="date" class="form-control" formControlName="dob"
                         [max]="today"/>
                  <span style="font-size:11px;color:var(--ink-light);">
                    Tip: click the year in the picker to jump quickly
                  </span>
                </div>
                <div class="form-group">
                  <label class="form-label">Gender</label>
                  <select class="form-control" formControlName="gender">
                    <option>Female</option><option>Male</option>
                    <option>Non-binary</option><option>Prefer not to say</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone *</label>
                  <input class="form-control" formControlName="phone" placeholder="(555) 000-0000"/>
                </div>
                <div class="form-group" style="grid-column:1/3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email"/>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Address</label>
                  <input class="form-control" formControlName="address1"/>
                </div>
                <div class="form-group">
                  <label class="form-label">City</label>
                  <input class="form-control" formControlName="city"/>
                </div>
                <div class="form-group">
                  <label class="form-label">State</label>
                  <select class="form-control" formControlName="state">
                    <option value="">Select State</option>
                    @for (s of states; track s) {
                      <option [value]="s">{{ s }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">ZIP Code</label>
                  <input class="form-control" formControlName="zip" maxlength="10"/>
                </div>
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
                <div class="form-group">
                  <label class="form-label">Emergency Contact</label>
                  <input class="form-control" formControlName="emergencyContact"
                         placeholder="Name & phone"/>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Allergies / Medical Notes</label>
                  <textarea class="form-control" formControlName="allergies" rows="2"></textarea>
                </div>
                <div class="form-group gfull">
                  <div class="toggle-wrap">
                    <label class="toggle">
                      <input type="checkbox" formControlName="consentOnFile">
                      <span class="toggle-slider"></span>
                    </label>
                    <span>Consent Form Signed</span>
                  </div>
                </div>
              </div>
              @if (error()) {
                <div class="error-alert">{{ error() }}</div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Customer" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .error-alert {
      margin-top: 12px; padding: 10px 16px;
      border-radius: var(--radius); font-size: 13px;
      background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17;
    }
  `]
})
export class CustomerListComponent implements OnInit {
  customers = signal<Customer[]>([]);
  states    = US_STATES;
  today     = new Date().toISOString().slice(0, 10); // max date for DOB
  search    = "";
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selected: Customer | null = null;

  form = this.fb.group({
    firstName:        ["", Validators.required],
    lastName:         ["", Validators.required],
    dob:              [null as string | null],
    gender:           ["Female"],
    phone:            ["", Validators.required],
    email:            [""],
    address1:         [""],
    city:             [""],
    state:            [""],
    zip:              [""],
    membershipType:   ["None"],
    referralSource:   [""],
    emergencyContact: [""],
    allergies:        [""],
    consentOnFile:    [false],
    active:           [true],
  });

  constructor(
    private adminSvc: AdminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.doSearch(); }

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
        lastName:         c.lastName,
        dob:              c.dob ?? null,
        gender:           c.gender ?? "Female",
        phone:            c.phone ?? "",
        email:            c.email ?? "",
        address1:         c.address1 ?? "",
        city:             c.city ?? "",
        state:            c.state ?? "",
        zip:              c.zip ?? "",
        membershipType:   c.membershipType ?? "None",
        referralSource:   c.referralSource ?? "",
        emergencyContact: c.emergencyContact ?? "",
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
