import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AdminService } from "../../../core/services/admin.service";
import { Location } from "../../../shared/models/admin.model";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC",
  "ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

@Component({
  selector: "app-location-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Locations</div>
          <div class="page-subtitle">All practice center branches</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Location</button>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>City, State</th><th>Phone</th><th>Color</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (loc of locations(); track loc.id) {
              <tr>
                <td><code style="font-size:11px;background:var(--stone);padding:2px 6px;border-radius:4px;">{{ loc.code }}</code></td>
                <td><strong>{{ loc.name }}</strong></td>
                <td>{{ loc.city }}@if (loc.city && loc.state) {, }{{ loc.state }}</td>
                <td>{{ loc.phone || "—" }}</td>
                <td><span class="color-swatch" [style.background]="loc.colorHex"></span>{{ loc.colorHex }}</td>
                <td>
                  <span class="badge" [ngClass]="loc.active ? 'badge-success' : 'badge-neutral'">
                    {{ loc.active ? "Active" : "Inactive" }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(loc)">✏️</button>
                </td>
              </tr>
            }
            @if (!locations().length) {
              <tr><td colspan="7" style="text-align:center;padding:32px;color:var(--ink-light);">No locations yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editing() ? "Edit Location" : "Add Location" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div class="g2">
                <div class="form-group gfull">
                  <label class="form-label">Location Name *</label>
                  <input class="form-control" formControlName="name"/>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Address</label>
                  <input class="form-control" formControlName="address1" placeholder="Street address"/>
                </div>
                <div class="form-group">
                  <label class="form-label">City</label>
                  <input class="form-control" formControlName="city"/>
                </div>
                <div class="form-group">
                  <label class="form-label">State</label>
                  <select class="form-control" formControlName="state">
                    <option value="">Select State</option>
                    @for (s of states; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">ZIP Code</label>
                  <input class="form-control" formControlName="zip" maxlength="10"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input class="form-control" formControlName="phone" placeholder="(555) 000-0000"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Color Code</label>
                  <input type="color" class="form-control" formControlName="colorHex"
                         style="padding:4px;height:40px;"/>
                </div>
              </div>
              <div style="margin-top:10px;padding:8px 12px;background:var(--stone);border-radius:var(--radius);font-size:12px;color:var(--ink-mid);">
                📌 Unique location code auto-generated on save.
              </div>
              <div class="toggle-wrap" style="margin-top:12px;">
                <label class="toggle">
                  <input type="checkbox" formControlName="active">
                  <span class="toggle-slider"></span>
                </label>
                <span>Active</span>
              </div>
              @if (error()) {
                <div class="alert alert-danger" style="margin-top:12px;">{{ error() }}</div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Location" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`.alert { padding: 10px 16px; border-radius: var(--radius); font-size: 13px; }
            .alert-danger { background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17; }`]
})
export class LocationListComponent implements OnInit {
  locations = signal<Location[]>([]);
  states = US_STATES;
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selected: Location | null = null;

  form = this.fb.group({
    name:     ["", Validators.required],
    address1: [""],
    city:     [""],
    state:    [""],
    zip:      [""],
    phone:    [""],
    email:    [""],
    colorHex: ["#1a4a3a"],
    active:   [true],
  });

  constructor(private adminSvc: AdminService, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit() { this.adminSvc.getLocations().subscribe(l => this.locations.set(l)); }

  openModal(loc?: Location) {
    this.editing.set(!!loc); this.error.set(""); this.selected = loc ?? null;
    loc ? this.form.patchValue({ ...loc })
        : this.form.reset({ colorHex: "#1a4a3a", active: true });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set("");
    const val = { ...this.form.getRawValue(), code: this.selected?.code || this.genCode() } as any;
    const req = this.editing()
      ? this.adminSvc.updateLocation(this.selected!.id, val)
      : this.adminSvc.createLocation(val);
    req.subscribe({
      next: () => {
        this.saving.set(false); this.closeModal();
        this.snack.open("Location saved.", "×", { duration: 3000 });
        this.adminSvc.getLocations().subscribe(l => this.locations.set(l));
      },
      error: e => { this.saving.set(false); this.error.set(e.error?.message ?? "Error"); }
    });
  }

  private genCode() {
    return "LOC-" + String(this.locations().length + 1).padStart(3, "0");
  }
}
