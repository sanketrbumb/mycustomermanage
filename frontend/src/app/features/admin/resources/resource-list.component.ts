import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AdminService } from "../../../core/services/admin.service";
import { Resource, Location } from "../../../shared/models/admin.model";

@Component({
  selector: "app-resource-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Resources</div>
          <div class="page-subtitle">Bookable rooms, suites and equipment</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Resource</button>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Location</th>
              <th>Capacity</th><th>Color</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of resources(); track r.id) {
              <tr>
                <td><strong>{{ r.name }}</strong></td>
                <td>{{ r.type || "—" }}</td>
                <td>{{ locationName(r.locationId) }}</td>
                <td>{{ r.capacity }}</td>
                <td>
                  <span class="color-swatch" [style.background]="r.colorHex"></span>
                  {{ r.colorHex }}
                </td>
                <td>
                  <span class="badge" [ngClass]="r.active ? 'badge-success' : 'badge-neutral'">
                    {{ r.active ? "Active" : "Inactive" }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(r)">✏️</button>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="toggleActive(r)">
                    {{ r.active ? "🚫" : "✅" }}
                  </button>
                </td>
              </tr>
            }
            @if (!resources().length) {
              <tr><td colspan="7" style="text-align:center;padding:32px;color:var(--ink-light);">No resources yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editing() ? "Edit Resource" : "Add Resource" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div class="g2">
                <div class="form-group gfull">
                  <label class="form-label">Resource Name *</label>
                  <input class="form-control" formControlName="name" placeholder="e.g. Sauna Suite A"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Type</label>
                  <select class="form-control" formControlName="type">
                    <option>Room</option><option>Equipment</option>
                    <option>Practitioner</option><option>Suite</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Capacity</label>
                  <input type="number" class="form-control" formControlName="capacity" min="1"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Location *</label>
                  <select class="form-control" formControlName="locationId">
                    <option [ngValue]="null">— Select —</option>
                    @for (loc of locations(); track loc.id) {
                      <option [ngValue]="loc.id">{{ loc.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Color</label>
                  <input type="color" class="form-control" formControlName="colorHex"
                         style="padding:4px;height:40px;"/>
                </div>
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
              {{ saving() ? "Saving…" : "Save Resource" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`.alert { padding: 10px 16px; border-radius: var(--radius); font-size: 13px; }
            .alert-danger { background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17; }`]
})
export class ResourceListComponent implements OnInit {
  resources = signal<Resource[]>([]);
  locations = signal<Location[]>([]);
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selected: Resource | null = null;

  form = this.fb.group({
    name:       ["", Validators.required],
    type:       ["Room"],
    capacity:   [1, [Validators.required, Validators.min(1)]],
    locationId: [null as number | null, Validators.required],
    colorHex:   ["#4a9478"],
    active:     [true],
  });

  constructor(private adminSvc: AdminService, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit() {
    this.adminSvc.getResources().subscribe(r => this.resources.set(r));
    this.adminSvc.getLocations().subscribe(l => this.locations.set(l));
  }

  locationName(id?: number) { return this.locations().find(l => l.id === id)?.name ?? "—"; }

  openModal(r?: Resource) {
    this.editing.set(!!r); this.error.set(""); this.selected = r ?? null;
    r ? this.form.patchValue({ ...r }) : this.form.reset({ type: "Room", capacity: 1, colorHex: "#4a9478", active: true });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set("");
    const val = this.form.getRawValue() as any;
    const req = this.editing()
      ? this.adminSvc.updateResource(this.selected!.id, val)
      : this.adminSvc.createResource(val);
    req.subscribe({
      next: () => {
        this.saving.set(false); this.closeModal();
        this.snack.open("Resource saved.", "×", { duration: 3000 });
        this.adminSvc.getResources().subscribe(r => this.resources.set(r));
      },
      error: e => { this.saving.set(false); this.error.set(e.error?.message ?? "Error"); }
    });
  }

  toggleActive(r: Resource) {
    this.adminSvc.updateResource(r.id, { active: !r.active }).subscribe(() => {
      this.snack.open("Updated.", "×", { duration: 2000 });
      this.adminSvc.getResources().subscribe(rs => this.resources.set(rs));
    });
  }
}
