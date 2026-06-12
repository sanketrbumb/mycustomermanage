import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { AdminService } from "../../../core/services/admin.service";
import { VisitType } from "../../../shared/models/admin.model";
import { environment } from "../../../../environments/environment";

interface ChargeCode { id: number; code: string; description: string; unitPrice: number; }

@Component({
  selector: "app-visit-type-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Visit Types</div>
          <div class="page-subtitle">Services with charge codes and durations</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Visit Type</button>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Name</th><th>Duration</th><th>Default Price</th>
              <th>Charge Code</th><th>Color</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (vt of visitTypes(); track vt.id) {
              <tr>
                <td>
                  <span class="color-swatch" [style.background]="vt.colorHex"></span>
                  <strong>{{ vt.name }}</strong>
                </td>
                <td>{{ vt.durationMin }} min</td>
                <td>{{ vt.defaultPrice | currency }}</td>
                <td>
                  @if (vt.chargeCode) {
                    <code style="font-size:11px;background:var(--stone);
                                 padding:2px 6px;border-radius:4px;">
                      {{ vt.chargeCode.code }}
                    </code>
                  } @else {
                    <span style="color:var(--ink-light)">—</span>
                  }
                </td>
                <td>
                  <span class="color-swatch" [style.background]="vt.colorHex"></span>
                  {{ vt.colorHex }}
                </td>
                <td>
                  <span class="badge" [ngClass]="vt.active ? 'badge-success' : 'badge-neutral'">
                    {{ vt.active ? "Active" : "Inactive" }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(vt)">✏️</button>
                </td>
              </tr>
            }
            @if (!visitTypes().length) {
              <tr>
                <td colspan="7"
                    style="text-align:center;padding:32px;color:var(--ink-light);">
                  No visit types yet.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editing() ? "Edit Visit Type" : "Add Visit Type" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div class="g2">
                <div class="form-group gfull">
                  <label class="form-label">Visit Type Name *</label>
                  <input class="form-control" formControlName="name"
                         placeholder="e.g. Swedish Massage 60 min"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Default Duration (min)</label>
                  <input type="number" class="form-control"
                         formControlName="durationMin" min="15" step="15"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Default Price ($)</label>
                  <input type="number" class="form-control"
                         formControlName="defaultPrice" min="0" step="0.01"/>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Charge Code</label>
                  <select class="form-control" formControlName="chargeCodeId">
                    <option [ngValue]="null">— No charge code —</option>
                    @for (cc of chargeCodes(); track cc.id) {
                      <option [ngValue]="cc.id">
                        {{ cc.code }} — {{ cc.description }}
                        ({{ cc.unitPrice | currency }})
                      </option>
                    }
                  </select>
                  @if (!chargeCodes().length) {
                    <div style="font-size:11px;color:var(--ink-light);margin-top:4px;">
                      No charge codes configured yet. Add them in the Billing settings.
                    </div>
                  }
                </div>
                <div class="form-group">
                  <label class="form-label">Calendar Color</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" class="form-control" formControlName="colorHex"
                           style="padding:3px;height:40px;width:60px;cursor:pointer;"/>
                    <input class="form-control" formControlName="colorHex"
                           style="flex:1;" placeholder="#3498db"/>
                  </div>
                </div>
              </div>
              <div class="toggle-wrap" style="margin-top:14px;">
                <label class="toggle">
                  <input type="checkbox" formControlName="active">
                  <span class="toggle-slider"></span>
                </label>
                <span>Active</span>
              </div>
              @if (error()) {
                <div class="error-alert">{{ error() }}</div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Visit Type" }}
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
export class VisitTypeListComponent implements OnInit {
  visitTypes   = signal<VisitType[]>([]);
  chargeCodes  = signal<ChargeCode[]>([]);
  showModal    = signal(false);
  editing      = signal(false);
  saving       = signal(false);
  error        = signal("");
  selected: VisitType | null = null;

  form = this.fb.group({
    name:         ["", Validators.required],
    durationMin:  [60, [Validators.required, Validators.min(5)]],
    defaultPrice: [0,  [Validators.required, Validators.min(0)]],
    chargeCodeId: [null as number | null],
    colorHex:     ["#3498db"],
    active:       [true],
  });

  constructor(
    private adminSvc: AdminService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.adminSvc.getVisitTypes().subscribe(v => this.visitTypes.set(v));
    this.http.get<ChargeCode[]>(`${environment.apiUrl}/charge-codes`)
             .subscribe({ next: cc => this.chargeCodes.set(cc), error: () => {} });
  }

  openModal(vt?: VisitType) {
    this.editing.set(!!vt);
    this.error.set("");
    this.selected = vt ?? null;
    if (vt) {
      this.form.patchValue({
        name: vt.name, durationMin: vt.durationMin,
        defaultPrice: vt.defaultPrice,
        chargeCodeId: (vt as any).chargeCode?.id ?? null,
        colorHex: vt.colorHex, active: vt.active,
      });
    } else {
      this.form.reset({
        durationMin: 60, defaultPrice: 0,
        chargeCodeId: null, colorHex: "#3498db", active: true
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
      ? this.adminSvc.updateVisitType(this.selected!.id, val)
      : this.adminSvc.createVisitType(val);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.snack.open("Visit type saved.", "×", { duration: 3000 });
        this.adminSvc.getVisitTypes().subscribe(v => this.visitTypes.set(v));
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e.error?.message ?? "Error saving.");
      }
    });
  }
}
