import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AdminService } from "../../../core/services/admin.service";
import { VisitStatus } from "../../../shared/models/admin.model";

@Component({
  selector: "app-visit-status-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Visit Statuses</div>
          <div class="page-subtitle">Appointment lifecycle stages</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Status</button>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr><th>Order</th><th>Name</th><th>Color</th><th>Terminal?</th><th>Chargeable?</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (s of statuses(); track s.id) {
              <tr>
                <td style="font-weight:600;">{{ s.sortOrder }}</td>
                <td>
                  <span class="badge"
                        [style.background]="s.colorHex + '22'"
                        [style.color]="s.colorHex"
                        style="font-size:12px;font-weight:700;">
                    {{ s.name }}
                  </span>
                </td>
                <td>
                  <span class="color-swatch" [style.background]="s.colorHex"></span>
                  {{ s.colorHex }}
                </td>
                <td>
                  <span class="badge" [ngClass]="s.terminal ? 'badge-danger' : 'badge-neutral'">
                    {{ s.terminal ? "Yes" : "No" }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="s.chargeable ? 'badge-success' : 'badge-neutral'">
                    {{ s.chargeable ? "Yes" : "No" }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(s)" title="Edit">✏️</button>
                </td>
              </tr>
            }
            @if (!statuses().length) {
              <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--ink-light);">No statuses configured yet.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editing() ? "Edit Status" : "Add Visit Status" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div style="display:flex;flex-direction:column;gap:14px;">
                <div class="form-group">
                  <label class="form-label">Status Name *</label>
                  <input class="form-control" formControlName="name"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Color</label>
                  <input type="color" class="form-control" formControlName="colorHex"
                         style="padding:4px;height:40px;"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Sort Order</label>
                  <input type="number" class="form-control" formControlName="sortOrder"/>
                </div>
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" formControlName="terminal">
                    <span class="toggle-slider"></span>
                  </label>
                  <span>Terminal Status (no further transitions)</span>
                </div>
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" formControlName="chargeable">
                    <span class="toggle-slider"></span>
                  </label>
                  <span>Chargeable (triggers invoice generation)</span>
                </div>
              </div>
              @if (error()) {
                <div class="alert alert-danger" style="margin-top:12px;">{{ error() }}</div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Status" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .alert { padding: 10px 16px; border-radius: var(--radius); font-size: 13px; }
    .alert-danger { background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17; }
  `]
})
export class VisitStatusListComponent implements OnInit {
  statuses  = signal<VisitStatus[]>([]);
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selected: VisitStatus | null = null;

  form = this.fb.group({
    name:       ["", Validators.required],
    colorHex:   ["#2980b9"],
    sortOrder:  [1],
    terminal:   [false],
    chargeable: [true],
  });

  constructor(
    private adminSvc: AdminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.adminSvc.getVisitStatuses().subscribe(s => this.statuses.set(s)); }

  openModal(s?: VisitStatus) {
    this.editing.set(!!s); this.error.set(""); this.selected = s ?? null;
    s ? this.form.patchValue({ ...s })
      : this.form.reset({ colorHex: "#2980b9", sortOrder: this.statuses().length + 1,
                          terminal: false, chargeable: true });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set("");
    const val = this.form.getRawValue() as any;
    const req = this.editing()
      ? this.adminSvc.updateVisitStatus(this.selected!.id, val)
      : this.adminSvc.createVisitStatus(val);
    req.subscribe({
      next: () => {
        this.saving.set(false); this.closeModal();
        this.snack.open("Status saved.", "×", { duration: 3000 });
        this.adminSvc.getVisitStatuses().subscribe(s => this.statuses.set(s));
      },
      error: e => { this.saving.set(false); this.error.set(e.error?.message ?? "Error"); }
    });
  }
}
