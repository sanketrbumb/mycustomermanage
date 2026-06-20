import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { debounceTime, distinctUntilChanged, switchMap, of } from "rxjs";
import { catchError } from "rxjs/operators";

interface Refund {
  id: number;
  refundNumber: string;
  paymentId: number;
  paymentNumber: string;
  customerId: number;
  customerFullName: string;
  amount: number;
  originalPaymentAmount: number;
  totalRefunded: number;
  reason?: string;
  notes?: string;
  refundDate: string;
  createdByName?: string;
}

interface Payment {
  id: number;
  paymentNumber: string;
  customerId: number;
  customerFullName: string;
  amount: number;
  method: string;
  reference?: string;
  paymentDate: string;
  invoiceNumbers: string[];
}

const REFUND_REASONS = [
  "Service not rendered",
  "Duplicate payment",
  "Customer dissatisfaction",
  "Cancelled appointment",
  "Overbilling / pricing error",
  "Insurance adjustment",
  "Credit issued",
  "Other",
];

@Component({
  selector: "app-refund-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Refunds</div>
          <div class="page-subtitle">Issue and track payment refunds</div>
        </div>
        <button class="btn btn-primary" (click)="openNew()">+ Issue Refund</button>
      </div>

      <!-- KPI row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Refunds</div>
          <div class="kpi-val kpi-jade">{{ refunds().length }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Refunded</div>
          <div class="kpi-val kpi-danger">{{ totalRefunded() | currency }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">This Month</div>
          <div class="kpi-val kpi-gold">{{ monthCount() }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">This Month $</div>
          <div class="kpi-val kpi-danger">{{ monthTotal() | currency }}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters" style="margin-bottom:14px;">
        <input class="form-control" [(ngModel)]="search"
               placeholder="🔍 Refund #, patient, payment…" style="width:220px;"/>
        <input type="date" class="form-control" [(ngModel)]="dateFrom" style="width:145px;"/>
        <span style="color:var(--ink-light);font-size:12px;">to</span>
        <input type="date" class="form-control" [(ngModel)]="dateTo"   style="width:145px;"/>
        <button class="btn btn-ghost btn-sm" (click)="clearFilters(); load()">Clear</button>
        <button class="btn btn-outline btn-sm" (click)="load()">Search</button>
      </div>

      <!-- Table -->
      <div class="card" style="overflow:hidden;">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Refund #</th>
              <th>Date</th>
              <th>Patient</th>
              <th>Original Payment</th>
              <th>Refund Amount</th>
              <th>Refundable Balance</th>
              <th>Reason</th>
              <th>Issued By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtered(); track r.id) {
              <tr>
                <td>
                  <strong style="font-family:var(--font-display);">{{ r.refundNumber }}</strong>
                </td>
                <td style="white-space:nowrap;">{{ r.refundDate | date:"MMM d, y" }}</td>
                <td>{{ fmtName(r.customerFullName) }}</td>
                <td style="font-size:12px;">
                  <div style="font-weight:600;">{{ r.originalPaymentAmount | currency }}</div>
                  <div style="color:var(--ink-light);">{{ r.paymentNumber }}</div>
                </td>
                <td style="font-weight:700;color:var(--danger);">{{ r.amount | currency }}</td>
                <td [style.color]="(r.originalPaymentAmount - r.totalRefunded) > 0 ? 'var(--success)' : 'var(--ink-light)'">
                  {{ (r.originalPaymentAmount - r.totalRefunded) | currency }}
                </td>
                <td style="font-size:12px;color:var(--ink-light);">{{ r.reason || "—" }}</td>
                <td style="font-size:12px;">{{ r.createdByName || "—" }}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" (click)="viewDetail(r)">View</button>
                  <!-- Add refund button — only if there's still refundable balance -->
                  @if ((r.originalPaymentAmount - r.totalRefunded) > 0) {
                    <button class="btn btn-outline btn-sm"
                            (click)="openAdditional(r)">+ Refund</button>
                  }
                </td>
              </tr>
            }
            @if (!filtered().length) {
              <tr>
                <td colspan="9" style="text-align:center;padding:32px;color:var(--ink-light);">
                  @if (loading()) { Loading refunds… }
                  @else { No refunds found. }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ ISSUE / ADDITIONAL REFUND MODAL ══ -->
    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal" style="max-width:620px;"
             (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ modalTitle() }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">

            <!-- Payment search (only for new refunds) -->
            @if (!selectedPayment()) {
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Search Payment *</label>
                <div style="position:relative;">
                  <input class="form-control" [formControl]="paySearch"
                         placeholder="Type patient name or payment number…"
                         autocomplete="off"
                         (focus)="showPayDrop.set(true)"
                         (blur)="onPayBlur()"/>
                  @if (showPayDrop() && payResults().length) {
                    <div class="ac-dropdown">
                      @for (p of payResults(); track p.id) {
                        <div class="ac-item" (mousedown)="selectPayment(p)">
                          <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                              <strong>{{ p.paymentNumber }}</strong>
                              <span class="ac-sub">{{ fmtName(p.customerFullName) }}</span>
                            </div>
                            <div style="text-align:right;">
                              <div style="font-weight:700;color:var(--jade);">{{ p.amount | currency }}</div>
                              <div style="font-size:10px;color:var(--ink-light);">{{ p.paymentDate | date:"MMM d, y" }}</div>
                            </div>
                          </div>
                          @if (p.invoiceNumbers?.length) {
                            <div style="font-size:11px;color:var(--ink-light);margin-top:2px;">
                              Inv: {{ p.invoiceNumbers.join(", ") }}
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (payResults().length === 0 && paySearch.value && paySearch.value.length > 1) {
                    <div style="font-size:12px;color:var(--ink-light);margin-top:6px;">
                      No payments found matching "{{ paySearch.value }}"
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Selected payment summary -->
            @if (selectedPayment()) {
              <div class="pay-summary-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                  <div>
                    <div style="font-size:14px;font-weight:700;color:var(--jade);">
                      {{ fmtName(selectedPayment()!.customerFullName) }}
                    </div>
                    <div style="font-size:12px;color:var(--ink-light);">
                      {{ selectedPayment()!.paymentNumber }} ·
                      {{ selectedPayment()!.paymentDate | date:"MMM d, y" }} ·
                      {{ selectedPayment()!.method }}
                      @if (selectedPayment()!.reference) { · {{ selectedPayment()!.reference }} }
                    </div>
                    @if (selectedPayment()!.invoiceNumbers?.length) {
                      <div style="font-size:11px;color:var(--ink-light);">
                        Invoice(s): {{ selectedPayment()!.invoiceNumbers.join(", ") }}
                      </div>
                    }
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:11px;color:var(--ink-light);">Original Amount</div>
                    <div style="font-family:var(--font-display);font-size:20px;color:var(--jade);font-weight:600;">
                      {{ selectedPayment()!.amount | currency }}
                    </div>
                    @if (alreadyRefunded() > 0) {
                      <div style="font-size:11px;color:var(--danger);">
                        − {{ alreadyRefunded() | currency }} refunded
                      </div>
                      <div style="font-size:13px;font-weight:700;color:var(--jade);">
                        = {{ maxRefundable() | currency }} refundable
                      </div>
                    }
                  </div>
                </div>
                @if (!fixedPayment()) {
                  <button class="btn btn-ghost btn-sm"
                          style="margin-top:8px;font-size:11px;"
                          (click)="clearPayment()">
                    Change payment
                  </button>
                }
              </div>

              <!-- Refund form -->
              <div class="g2" style="margin-top:16px;">
                <div class="form-group">
                  <label class="form-label">
                    Refund Amount *
                    @if (maxRefundable() < selectedPayment()!.amount) {
                      <span style="color:var(--ink-light);font-weight:400;">
                        (max {{ maxRefundable() | currency }})
                      </span>
                    }
                  </label>
                  <input type="number" class="form-control" [(ngModel)]="refAmount"
                         step="0.01" min="0.01" [max]="maxRefundable()"
                         (input)="checkAmountValidity()"/>
                  @if (amountError()) {
                    <div style="font-size:11px;color:var(--danger);margin-top:3px;">
                      {{ amountError() }}
                    </div>
                  }
                </div>
                <div class="form-group">
                  <label class="form-label">Refund Date</label>
                  <input type="date" class="form-control" [(ngModel)]="refDate"/>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Reason *</label>
                  <select class="form-control" [(ngModel)]="refReason">
                    <option value="">— Select reason —</option>
                    @for (r of reasons; track r) {
                      <option [value]="r">{{ r }}</option>
                    }
                  </select>
                </div>
                <div class="form-group gfull">
                  <label class="form-label">Notes (optional)</label>
                  <textarea class="form-control" [(ngModel)]="refNotes"
                            rows="2" placeholder="Additional context…"></textarea>
                </div>
              </div>

              @if (modalError()) {
                <div class="err-alert" style="margin-top:12px;">{{ modalError() }}</div>
              }
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            @if (selectedPayment()) {
              <button class="btn btn-primary" (click)="issueRefund()"
                      [disabled]="saving()">
                {{ saving() ? "Processing…" : "Issue Refund" }}
              </button>
            }
          </div>
        </div>
      </div>
    }

    <!-- ══ DETAIL VIEW MODAL ══ -->
    @if (showDetail()) {
      <div class="crm-overlay">
        <div class="crm-modal" style="max-width:520px;"
             (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ detailRefund()?.refundNumber }}</h3>
            <button class="close-btn" (click)="showDetail.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (detailRefund()) {
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-lbl">Patient</span>
                  <span class="detail-val">{{ fmtName(detailRefund()!.customerFullName) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Refund Date</span>
                  <span class="detail-val">{{ detailRefund()!.refundDate | date:"fullDate" }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Refund Amount</span>
                  <span class="detail-val" style="font-size:18px;font-weight:700;color:var(--danger);">
                    {{ detailRefund()!.amount | currency }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Original Payment</span>
                  <span class="detail-val">
                    {{ detailRefund()!.paymentNumber }} —
                    {{ detailRefund()!.originalPaymentAmount | currency }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Total Refunded</span>
                  <span class="detail-val">{{ detailRefund()!.totalRefunded | currency }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Remaining Balance</span>
                  <span class="detail-val"
                        [style.color]="(detailRefund()!.originalPaymentAmount - detailRefund()!.totalRefunded) > 0 ? 'var(--success)' : 'var(--ink-light)'">
                    {{ (detailRefund()!.originalPaymentAmount - detailRefund()!.totalRefunded) | currency }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Reason</span>
                  <span class="detail-val">{{ detailRefund()!.reason || "—" }}</span>
                </div>
                @if (detailRefund()!.notes) {
                  <div class="detail-row">
                    <span class="detail-lbl">Notes</span>
                    <span class="detail-val">{{ detailRefund()!.notes }}</span>
                  </div>
                }
                <div class="detail-row">
                  <span class="detail-lbl">Issued By</span>
                  <span class="detail-val">{{ detailRefund()!.createdByName || "—" }}</span>
                </div>
              </div>
            }
          </div>
          <div class="modal-footer" style="justify-content:space-between;">
            <button class="btn btn-ghost btn-sm" style="color:var(--danger);"
                    (click)="voidRefund(detailRefund()!)">
              🗑 Void Refund
            </button>
            <button class="btn btn-outline" (click)="printRefund(detailRefund()!)">
              🖨 Print Receipt
            </button>
            <button class="btn btn-ghost" (click)="showDetail.set(false)">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .kpi-row { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
    .kpi-card { flex:1; min-width:140px; background:#fff; border-radius:var(--radius-lg);
                padding:12px 16px; box-shadow:var(--shadow-sm); }
    .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase;
                 letter-spacing:.08em; color:var(--ink-light); margin-bottom:4px; }
    .kpi-val   { font-family:var(--font-display); font-size:22px; font-weight:600; }
    .kpi-jade   { color:var(--jade); }
    .kpi-danger { color:var(--danger); }
    .kpi-gold   { color:var(--gold); }

    .ac-dropdown { position:absolute; top:100%; left:0; right:0; background:#fff;
                   border:1.5px solid var(--jade-light); border-radius:var(--radius);
                   box-shadow:var(--shadow-md); z-index:200; max-height:280px; overflow-y:auto; }
    .ac-item { padding:10px 14px; cursor:pointer; font-size:13px;
               border-bottom:1px solid var(--stone-mid); }
    .ac-item:hover { background:var(--jade-mist); }
    .ac-sub { font-size:11px; color:var(--ink-light); margin-left:8px; }

    .pay-summary-card { background:var(--jade-mist); border-radius:var(--radius);
                        padding:14px 16px; }
    .g2  { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .gfull { grid-column:1/-1; }

    .err-alert { padding:10px 16px; border-radius:var(--radius); font-size:13px;
                 background:#fde8e6; border:1px solid #f5c6c3; color:#9a1f17; }

    .detail-grid { display:flex; flex-direction:column; gap:0; }
    .detail-row { display:flex; justify-content:space-between; align-items:flex-start;
                  padding:10px 0; border-bottom:1px solid var(--stone-mid); gap:16px; }
    .detail-row:last-child { border-bottom:none; }
    .detail-lbl { font-size:11px; font-weight:700; text-transform:uppercase;
                  letter-spacing:.05em; color:var(--ink-light); white-space:nowrap; min-width:120px; }
    .detail-val { font-size:14px; color:var(--ink); text-align:right; }
  `]
})
export class RefundListComponent implements OnInit {
  refunds  = signal<Refund[]>([]);
  loading  = signal(false);
  search   = "";
  dateFrom = "";
  dateTo   = "";

  // KPIs
  totalRefunded = signal(0);
  monthCount    = signal(0);
  monthTotal    = signal(0);

  // Issue refund modal
  showModal      = signal(false);
  saving         = signal(false);
  modalError     = signal("");
  modalTitle     = signal("Issue Refund");
  fixedPayment   = signal(false); // true when opened from "Additional refund" on existing

  selectedPayment  = signal<Payment | null>(null);
  alreadyRefunded  = signal(0);
  paySearch        = new FormControl("");
  payResults       = signal<Payment[]>([]);
  showPayDrop      = signal(false);
  refAmount        = 0;
  refDate          = new Date().toISOString().slice(0, 10);
  refReason        = "";
  refNotes         = "";
  amountError      = signal("");
  reasons          = REFUND_REASONS;

  maxRefundable = signal(0);

  // Detail modal
  showDetail   = signal(false);
  detailRefund = signal<Refund | null>(null);

  constructor(
    private http: HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.load();

    // Fast payment search with debounce
    this.paySearch.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q && q.length > 1
        ? this.http.get<Payment[]>(`${environment.apiUrl}/payments?q=${encodeURIComponent(q)}`)
            .pipe(catchError(() => of([])))
        : of([]))
    ).subscribe(r => {
      this.payResults.set(r);
      if (r.length) this.showPayDrop.set(true);
    });
  }

  load() {
    this.loading.set(true);
    const params = this.dateFrom && this.dateTo
      ? `?from=${this.dateFrom}&to=${this.dateTo}` : "";
    this.http.get<Refund[]>(`${environment.apiUrl}/refunds${params}`)
      .pipe(catchError(() => of([])))
      .subscribe(r => {
        this.refunds.set(r);
        this.loading.set(false);
        this.computeKPIs(r);
      });
  }

  private computeKPIs(refunds: Refund[]) {
    const total = refunds.reduce((s, r) => s + (r.amount || 0), 0);
    this.totalRefunded.set(total);

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthly = refunds.filter(r => r.refundDate?.startsWith(thisMonth));
    this.monthCount.set(monthly.length);
    this.monthTotal.set(monthly.reduce((s, r) => s + (r.amount || 0), 0));
  }

  filtered(): Refund[] {
    const q = this.search.toLowerCase();
    return this.refunds().filter(r => {
      if (!q) return true;
      return r.refundNumber.toLowerCase().includes(q) ||
             r.customerFullName.toLowerCase().includes(q) ||
             r.paymentNumber.toLowerCase().includes(q) ||
             (r.reason ?? "").toLowerCase().includes(q);
    });
  }

  clearFilters() { this.search = ""; this.dateFrom = ""; this.dateTo = ""; }

  fmtName(full: string): string {
    if (!full) return "—";
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) return full;
    const last  = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(" ");
    return `${last}, ${first}`;
  }

  // ── Payment search ──────────────────────────────────────────────────────────
  onPayBlur() { setTimeout(() => this.showPayDrop.set(false), 200); }

  selectPayment(p: Payment) {
    this.selectedPayment.set(p);
    this.showPayDrop.set(false);
    this.payResults.set([]);
    this.refAmount = p.amount;
    this.loadAlreadyRefunded(p.id);
  }

  clearPayment() {
    this.selectedPayment.set(null);
    this.alreadyRefunded.set(0);
    this.maxRefundable.set(0);
    this.paySearch.setValue("", { emitEvent: false });
    this.amountError.set("");
  }

  private loadAlreadyRefunded(paymentId: number) {
    this.http.get<Refund[]>(`${environment.apiUrl}/refunds/payment/${paymentId}`)
      .pipe(catchError(() => of([])))
      .subscribe(refs => {
        const already = refs.reduce((s, r) => s + (r.amount || 0), 0);
        this.alreadyRefunded.set(already);
        const p = this.selectedPayment();
        const max = p ? p.amount - already : 0;
        this.maxRefundable.set(max);
        this.refAmount = Math.min(this.refAmount, max);
      });
  }

  checkAmountValidity() {
    const max = this.maxRefundable();
    if (this.refAmount > max) {
      this.amountError.set(`Cannot exceed refundable balance of ${max.toLocaleString("en-US", { style: "currency", currency: "USD" })}.`);
    } else if (this.refAmount <= 0) {
      this.amountError.set("Amount must be greater than zero.");
    } else {
      this.amountError.set("");
    }
  }

  // ── Modal open/close ────────────────────────────────────────────────────────
  openNew() {
    this.modalTitle.set("Issue Refund");
    this.fixedPayment.set(false);
    this.selectedPayment.set(null);
    this.alreadyRefunded.set(0);
    this.maxRefundable.set(0);
    this.paySearch.setValue("", { emitEvent: false });
    this.payResults.set([]);
    this.refAmount = 0;
    this.refDate   = new Date().toISOString().slice(0, 10);
    this.refReason = "";
    this.refNotes  = "";
    this.amountError.set("");
    this.modalError.set("");
    this.showModal.set(true);
  }

  openAdditional(r: Refund) {
    this.openNew();
    this.modalTitle.set("Additional Refund — " + r.paymentNumber);
    this.fixedPayment.set(true);
    // Reconstruct a Payment object from the refund data
    this.selectedPayment.set({
      id: r.paymentId,
      paymentNumber: r.paymentNumber,
      customerId: r.customerId,
      customerFullName: r.customerFullName,
      amount: r.originalPaymentAmount,
      method: "",
      paymentDate: "",
      invoiceNumbers: [],
    });
    this.loadAlreadyRefunded(r.paymentId);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedPayment.set(null);
  }

  issueRefund() {
    const p = this.selectedPayment();
    if (!p) { this.modalError.set("Select a payment."); return; }
    if (!this.refAmount || this.refAmount <= 0) { this.modalError.set("Enter a valid amount."); return; }
    if (this.refAmount > this.maxRefundable()) {
      this.modalError.set(`Amount exceeds refundable balance of ${this.maxRefundable().toLocaleString("en-US",{style:"currency",currency:"USD"})}.`);
      return;
    }
    if (!this.refReason) { this.modalError.set("Select a reason."); return; }

    this.saving.set(true);
    this.modalError.set("");

    this.http.post<Refund>(`${environment.apiUrl}/refunds`, {
      paymentId:  p.id,
      amount:     this.refAmount,
      reason:     this.refReason,
      notes:      this.refNotes || null,
      refundDate: this.refDate,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.snack.open("Refund issued successfully.", "×", { duration: 3000 });
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.modalError.set(e.error?.message ?? "Could not issue refund.");
      }
    });
  }

  // ── Detail modal ────────────────────────────────────────────────────────────
  viewDetail(r: Refund) {
    this.detailRefund.set(r);
    this.showDetail.set(true);
  }

  voidRefund(r: Refund) {
    if (!confirm(`Void refund ${r.refundNumber} for ${(r.amount).toLocaleString("en-US",{style:"currency",currency:"USD"})}? This cannot be undone.`)) return;
    this.http.delete(`${environment.apiUrl}/refunds/${r.id}`)
      .subscribe({
        next: () => {
          this.showDetail.set(false);
          this.snack.open("Refund voided.", "×", { duration: 2500 });
          this.load();
        },
        error: e => this.snack.open(e.error?.message ?? "Could not void refund.", "×", { duration: 3000 })
      });
  }

  // ── Print receipt ───────────────────────────────────────────────────────────
  printRefund(r: Refund) {
    const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
    const w = window.open("", "_blank")!;
    w.document.write(`<!DOCTYPE html><html>
<head><title>Refund ${r.refundNumber}</title>
<style>
  body { font-family:Georgia,serif; padding:40px; max-width:500px; margin:0 auto; color:#2a2a2a; }
  .brand { font-size:22px; font-weight:700; color:#1a4a3a; margin-bottom:4px; }
  .brand-sub { font-size:12px; color:#7a7a7a; margin-bottom:20px; }
  .title { font-size:18px; font-weight:700; color:#c0392b; margin-bottom:20px; letter-spacing:.05em; }
  .row { display:flex; justify-content:space-between; padding:9px 0;
         border-bottom:1px solid #e8dfd6; font-size:13px; }
  .lbl { color:#7a7a7a; }
  .amount-row { font-size:20px; font-weight:700; color:#c0392b; margin-top:16px;
                display:flex; justify-content:space-between; }
  .footer { margin-top:28px; text-align:center; font-size:11px; color:#7a7a7a;
            border-top:1px solid #e8dfd6; padding-top:14px; }
</style></head>
<body>
  <div class="brand">✿ Your Own CRM</div>
  <div class="brand-sub">Wellness & Spa Management</div>
  <div class="title">REFUND RECEIPT</div>
  <div class="row"><span class="lbl">Refund #</span><span>${r.refundNumber}</span></div>
  <div class="row"><span class="lbl">Date</span><span>${r.refundDate}</span></div>
  <div class="row"><span class="lbl">Patient</span><span>${this.fmtName(r.customerFullName)}</span></div>
  <div class="row"><span class="lbl">Original Payment</span><span>${r.paymentNumber} — ${fmt(r.originalPaymentAmount)}</span></div>
  <div class="row"><span class="lbl">Reason</span><span>${r.reason || "—"}</span></div>
  ${r.notes ? `<div class="row"><span class="lbl">Notes</span><span>${r.notes}</span></div>` : ""}
  <div class="amount-row"><span>Refund Amount</span><span>${fmt(r.amount)}</span></div>
  <div class="footer">Thank you for your business. Please retain this receipt for your records.</div>
  <script>window.onload = () => window.print();</script>
</body></html>`);
    w.document.close();
  }
}
