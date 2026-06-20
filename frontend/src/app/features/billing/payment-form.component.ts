import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { BillingService } from "../../core/services/billing.service";
import { AdminService } from "../../core/services/admin.service";
import { Invoice } from "../../shared/models/invoice.model";
import { Customer, Resource, Location } from "../../shared/models/admin.model";

interface Payment {
  id: number;
  paymentNumber: string;
  customerId: number;
  customerFullName: string;
  amount: number;
  method: string;
  reference: string;
  paymentDate: string;
  invoiceNumbers: string[];
  notes?: string;
}

@Component({
  selector: "app-payment-form",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div>
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Payments</div>
          <div class="page-subtitle">All received payments and receipts</div>
        </div>
        <button class="btn btn-primary" (click)="openAddPayment()">+ Add Payment</button>
      </div>

      <!-- Filters -->
      <div class="filters" style="flex-wrap:wrap;gap:10px;">
        <input class="form-control" [(ngModel)]="search"
               placeholder="🔍 Search patient, invoice, ref…" style="width:220px;"/>
        <select class="form-control" [(ngModel)]="methodFilter" style="width:140px;">
          <option value="">All Methods</option>
          <option value="CARD">Card</option>
          <option value="CASH">Cash</option>
          <option value="CHECK">Check</option>
          <option value="TRANSFER">Online/ACH</option>
          <option value="OTHER">Other</option>
        </select>
        <select class="form-control" [(ngModel)]="staffFilter" style="width:170px;">
          <option value="">All Staff</option>
          @for (r of allResources(); track r.id) {
            <option [value]="r.id">{{ r.name }}</option>
          }
        </select>
        <select class="form-control" [(ngModel)]="locFilter" style="width:180px;">
          <option value="">All Locations</option>
          @for (l of allLocations(); track l.id) {
            <option [value]="l.id">{{ l.name }}</option>
          }
        </select>
        <input type="date" class="form-control" [(ngModel)]="dateFrom" style="width:150px;"/>
        <input type="date" class="form-control" [(ngModel)]="dateTo"   style="width:150px;"/>
      </div>

      <!-- Payments grouped by date -->
      @for (group of groupedPayments(); track group.date) {
        <div class="day-group-label">
          {{ group.date | date:"fullDate" }}
          <span style="margin-left:12px;font-weight:400;">
            {{ group.payments.length }} payment{{ group.payments.length > 1 ? "s" : "" }}
            · {{ group.total | currency }}
          </span>
        </div>
        <div class="card">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Payment #</th><th>Customer</th><th>Invoice(s)</th>
                <th>Method</th><th>Amount</th><th>Reference</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of group.payments; track p.id) {
                <tr>
                  <td><code style="font-size:11px;background:var(--stone);padding:2px 6px;border-radius:4px;">{{ p.paymentNumber }}</code></td>
                  <td><strong>{{ p.customerFullName }}</strong></td>
                  <td style="font-size:12px;color:var(--ink-light);">
                    {{ p.invoiceNumbers.join(", ") || "—" }}
                  </td>
                  <td>
                    <span class="method-pill" [ngClass]="methodClass(p.method)">
                      {{ p.method }}
                    </span>
                  </td>
                  <td style="font-weight:700;">{{ p.amount | currency }}</td>
                  <td style="font-size:12px;color:var(--ink-light);">
                    {{ p.reference || "—" }}
                  </td>
                  <td>
                    <button class="btn btn-outline btn-sm"
                            (click)="viewReceipt(p)">Receipt</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!payments().length) {
        <div class="card" style="padding:40px;text-align:center;color:var(--ink-light);">
          <div style="font-size:32px;margin-bottom:12px;">💳</div>
          <div style="font-family:var(--font-display);font-size:18px;color:var(--jade);margin-bottom:6px;">
            No payments yet
          </div>
          <div>Post a payment using the button above.</div>
        </div>
      }
    </div>

    <!-- ═══ ADD PAYMENT MODAL ═══ -->
    @if (showAdd()) {
      <div class="crm-overlay" (mousedown)="$event.preventDefault()">
        <div class="crm-modal modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Add Payment</h3>
            <button class="close-btn" (click)="showAdd.set(false)">✕</button>
          </div>
          <div class="modal-body">

            <!-- Customer selector -->
            <div class="form-group" style="margin-bottom:14px;">
              <label class="form-label">Customer *</label>
              <div class="autocomplete-wrap">
                <input class="form-control" [(ngModel)]="addCustSearch"
                       (input)="onAddCustSearch()"
                       (focus)="showAddCustDrop.set(true)"
                       (blur)="onAddCustBlur()"
                       placeholder="Type customer name…"/>
                @if (showAddCustDrop() && addCustResults().length) {
                  <div class="ac-dropdown">
                    @for (c of addCustResults(); track c.id) {
                      <div class="ac-item" (mousedown)="selectAddCustomer(c)">
                        <strong>{{ c.lastName }}, {{ c.firstName }}</strong>
                        <span class="ac-sub">{{ c.phone }}</span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Invoice selection panel -->
            <div class="inv-pick-panel">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                  <div class="inv-pick-header">Invoice(s) to Link</div>
                  <div style="font-size:13px;color:var(--ink-light);">
                    @if (selectedInvIds.size === 0) {
                      No invoices selected
                    } @else {
                      <span style="color:var(--jade);font-weight:600;">
                        {{ selectedInvIds.size }} selected:
                      </span>
                      {{ selectedInvNumbers().join(", ") }}
                    }
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="text-align:right;">
                    <div style="font-size:11px;color:var(--ink-light);">Selected Balance</div>
                    <div style="font-size:18px;font-weight:700;color:var(--jade);">
                      {{ selectedBalance() | currency }}
                    </div>
                  </div>
                  <button class="btn btn-outline" (click)="showPicker.set(true)">
                    🧾 Select Invoices
                  </button>
                </div>
              </div>
            </div>

            <div class="g3" style="margin-top:14px;">
              <div class="form-group">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-control" [(ngModel)]="addDate"/>
              </div>
              <div class="form-group">
                <label class="form-label">Payment Method</label>
                <select class="form-control" [(ngModel)]="addMethod">
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="TRANSFER">Online / ACH</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Reference / Card Last 4</label>
                <input class="form-control" [(ngModel)]="addRef"
                       placeholder="e.g. 4242 / Check #101"/>
              </div>
            </div>
            <div class="g2" style="margin-top:12px;">
              <div class="form-group">
                <label class="form-label">Total Amount Paid ($) *</label>
                <input type="number" class="form-control" [(ngModel)]="addAmount"
                       step="0.01" min="0" (input)="onAmountInput()"/>
              </div>
              @if (addMethod === 'CASH') {
                <div class="form-group">
                  <label class="form-label">Change Due (Cash)</label>
                  <input class="form-control" [value]="changeDueDisplay()"
                         readonly style="background:var(--stone);font-weight:700;color:var(--jade);"/>
                </div>
              }
            </div>
            <div class="form-group" style="margin-top:10px;">
              <label class="form-label">Notes</label>
              <textarea class="form-control" [(ngModel)]="addNotes" rows="2"
                        placeholder="Optional payment notes…"></textarea>
            </div>

            @if (addError()) {
              <div class="error-alert" style="margin-top:12px;">{{ addError() }}</div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showAdd.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveAddPayment()"
                    [disabled]="addSaving()">
              {{ addSaving() ? "Saving…" : "Save Payment" }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ INVOICE PICKER ═══ -->
    @if (showPicker()) {
      <div class="crm-overlay" (mousedown)="$event.preventDefault()">
        <div class="crm-modal modal-wide" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Select Invoices</h3>
            <button class="close-btn" (click)="showPicker.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
              <input class="form-control" [(ngModel)]="pickerSearch"
                     placeholder="🔍 Search invoice # or customer…"
                     style="flex:1;min-width:200px;"/>
              <select class="form-control" [(ngModel)]="pickerStatus" style="width:140px;">
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
              <button class="btn btn-ghost btn-sm"
                      (click)="selectAllPicker()">Select All</button>
              <button class="btn btn-ghost btn-sm"
                      (click)="clearPicker()">Clear</button>
            </div>

            <div style="overflow-x:auto;max-height:360px;overflow-y:auto;">
              <table class="crm-table">
                <thead style="position:sticky;top:0;z-index:5;">
                  <tr>
                    <th style="width:36px;"></th>
                    <th>Invoice #</th><th>Patient</th><th>Date</th>
                    <th>Service(s)</th>
                    <th>Gross</th><th>Paid</th><th>Balance</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (inv of pickerFiltered(); track inv.id) {
                    <tr style="cursor:pointer;"
                        [style.background]="selectedInvIds.has(inv.id) ? 'var(--jade-mist)' : ''"
                        (click)="togglePicker(inv.id)">
                      <td (click)="$event.stopPropagation()">
                        <input type="checkbox"
                               [checked]="selectedInvIds.has(inv.id)"
                               (change)="togglePicker(inv.id)"
                               style="accent-color:var(--jade);width:15px;height:15px;cursor:pointer;"/>
                      </td>
                      <td><strong>{{ inv.invoiceNumber }}</strong></td>
                      <td>{{ inv.customerFullName }}</td>
                      <td>{{ inv.invoiceDate | date:"mediumDate" }}</td>
                      <td style="font-size:12px;color:var(--ink-light);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        {{ invServices(inv) }}
                      </td>
                      <td>{{ inv.grossAmount | currency }}</td>
                      <td style="color:var(--success);">{{ inv.paidAmount | currency }}</td>
                      <td [style.color]="inv.balanceDue > 0 ? 'var(--danger)' : 'var(--success)'"
                          style="font-weight:600;">
                        {{ inv.balanceDue | currency }}
                      </td>
                      <td>
                        <span class="badge" [ngClass]="statusClass(inv.status)">
                          {{ inv.status }}
                        </span>
                      </td>
                    </tr>
                  }
                  @if (!pickerFiltered().length) {
                    <tr><td colspan="9"
                            style="text-align:center;padding:24px;color:var(--ink-light);">
                      No invoices found.
                    </td></tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Selection summary -->
            <div style="margin-top:14px;padding:10px 14px;background:var(--jade-mist);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;color:var(--jade);font-weight:600;">
                {{ selectedInvIds.size }} invoice{{ selectedInvIds.size !== 1 ? "s" : "" }} selected
              </span>
              <span style="font-size:15px;font-weight:700;color:var(--jade);">
                Balance Total: {{ selectedBalance() | currency }}
              </span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showPicker.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="confirmPicker()">
              Confirm Selection
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ RECEIPT MODAL ═══ -->
    @if (showReceipt()) {
      <div class="crm-overlay" (mousedown)="$event.preventDefault()">
        <div class="crm-modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Payment Receipt</h3>
            <button class="close-btn" (click)="showReceipt.set(false)">✕</button>
          </div>
          <div class="modal-body">
            @if (receiptPayment()) {
              <div style="font-family:Georgia,serif;max-width:420px;margin:0 auto;">
                <div style="text-align:center;margin-bottom:16px;">
                  <h2 style="font-size:20px;color:var(--jade);">✿ Your Own CRM</h2>
                  <p style="font-size:12px;color:var(--ink-light);">Payment Receipt</p>
                </div>
                <hr style="border:1px solid var(--stone-mid);"/>
                <table style="width:100%;font-size:13px;margin:12px 0;">
                  <tr>
                    <td><strong>Payment #:</strong></td>
                    <td>{{ receiptPayment()!.paymentNumber }}</td>
                  </tr>
                  <tr>
                    <td><strong>Date:</strong></td>
                    <td>{{ receiptPayment()!.paymentDate | date:"mediumDate" }}</td>
                  </tr>
                  <tr>
                    <td><strong>Customer:</strong></td>
                    <td>{{ receiptPayment()!.customerFullName }}</td>
                  </tr>
                  <tr>
                    <td><strong>Method:</strong></td>
                    <td>{{ receiptPayment()!.method }}</td>
                  </tr>
                  @if (receiptPayment()!.reference) {
                    <tr>
                      <td><strong>Reference:</strong></td>
                      <td>{{ receiptPayment()!.reference }}</td>
                    </tr>
                  }
                  @if (receiptPayment()!.invoiceNumbers.length) {
                    <tr>
                      <td><strong>Invoice(s):</strong></td>
                      <td>{{ receiptPayment()!.invoiceNumbers.join(", ") }}</td>
                    </tr>
                  }
                </table>
                <hr style="border:1px solid var(--stone-mid);"/>
                <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px;color:var(--jade);padding:12px 0;">
                  <span>Amount Paid</span>
                  <span>{{ receiptPayment()!.amount | currency }}</span>
                </div>
                <p style="text-align:center;font-size:11px;color:var(--ink-light);margin-top:12px;">
                  Thank you for choosing Your Own CRM.
                </p>
              </div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showReceipt.set(false)">Close</button>
            <button class="btn btn-outline" (click)="printReceipt()">🖨 Print</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .day-group-label { background:var(--jade-mist); padding:8px 14px; font-size:12px; font-weight:700; color:var(--jade); border-radius:var(--radius); margin:12px 0 4px; }
    .method-pill { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600; }
    .pill-CARD     { background:#ddeefb;color:#1a5c8a; }
    .pill-CASH     { background:#d4f0e0;color:#1a7a45; }
    .pill-CHECK    { background:#fef0d8;color:#9a5e0a; }
    .pill-TRANSFER { background:#f0e6fb;color:#6c3483; }
    .pill-OTHER    { background:var(--stone-mid);color:var(--ink-mid); }
    .inv-pick-panel { padding:14px 16px;background:var(--stone);border-radius:var(--radius);border:1px solid var(--stone-mid); }
    .inv-pick-header { font-size:11px;font-weight:700;color:var(--ink-mid);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px; }
    .autocomplete-wrap { position:relative; }
    .ac-dropdown { position:absolute;top:100%;left:0;right:0;background:var(--white);border:1.5px solid var(--jade-light);border-radius:var(--radius);box-shadow:var(--shadow-md);z-index:100;max-height:220px;overflow-y:auto; }
    .ac-item { padding:9px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--stone-mid); }
    .ac-item:hover { background:var(--jade-mist); }
    .ac-sub { font-size:11px;color:var(--ink-light);margin-left:8px; }
    .error-alert { padding:10px 16px;border-radius:var(--radius);font-size:13px;background:#fde8e6;border:1px solid #f5c6c3;color:#9a1f17; }
  `]
})
export class PaymentFormComponent implements OnInit {
  payments      = signal<Payment[]>([]);
  allInvoices   = signal<Invoice[]>([]);
  allResources  = signal<Resource[]>([]);
  allLocations  = signal<Location[]>([]);
  search        = "";
  methodFilter  = "";
  staffFilter   = "";
  locFilter     = "";
  dateFrom      = "";
  dateTo        = "";

  // Add payment modal
  showAdd         = signal(false);
  addSaving       = signal(false);
  addError        = signal("");
  addCustSearch   = "";
  addCustResults  = signal<Customer[]>([]);
  showAddCustDrop = signal(false);
  selectedCust    = signal<Customer | null>(null);
  addDate         = new Date().toISOString().slice(0, 10);
  addMethod       = "CARD";
  addRef          = "";
  addAmount       = 0;
  addNotes        = "";

  // Invoice picker
  showPicker    = signal(false);
  pickerSearch  = "";
  pickerStatus  = "";
  selectedInvIds = new Set<number>();

  // Receipt modal
  showReceipt    = signal(false);
  receiptPayment = signal<Payment | null>(null);

  constructor(
    private billSvc: BillingService,
    private adminSvc: AdminService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPayments();
    this.billSvc.getInvoices().subscribe(inv => this.allInvoices.set(inv));
    this.adminSvc.getResources().subscribe(r => this.allResources.set(r));
    this.adminSvc.getLocations().subscribe(l => this.allLocations.set(l));
  }

  loadPayments() {
    this.billSvc.getPayments().subscribe({
      next: p  => this.payments.set(p as Payment[]),
      error: () => this.payments.set([])
    });
  }

  filtered(): Payment[] {
    return this.payments().filter(p => {
      const q = this.search.toLowerCase();
      const matchQ = !q || p.customerFullName.toLowerCase().includes(q) ||
                     p.paymentNumber.toLowerCase().includes(q) ||
                     (p.reference ?? "").toLowerCase().includes(q);
      const matchM = !this.methodFilter || p.method === this.methodFilter;
      const matchF = !this.dateFrom || p.paymentDate >= this.dateFrom;
      const matchT = !this.dateTo   || p.paymentDate <= this.dateTo;
      return matchQ && matchM && matchF && matchT;
    });
  }

  groupedPayments(): { date: string; payments: Payment[]; total: number }[] {
    const groups: Record<string, Payment[]> = {};
    this.filtered().forEach(p => {
      (groups[p.paymentDate] = groups[p.paymentDate] || []).push(p);
    });
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => ({
        date,
        payments: groups[date],
        total: groups[date].reduce((s, p) => s + p.amount, 0)
      }));
  }

  clearFilters() {
    this.search = ""; this.methodFilter = "";
    this.staffFilter = ""; this.locFilter = "";
    this.dateFrom = ""; this.dateTo = "";
  }

  methodClass(m: string): string { return `method-pill pill-${m}`; }

  invServices(inv: Invoice): string {
    if (!inv.lineItems?.length) return "—";
    return inv.lineItems.map(l => l.description).filter(Boolean).slice(0, 2).join(", ");
  }

  changeDueDisplay(): string {
    const paid  = this.addAmount || 0;
    const total = this.selectedBalance();
    const change = Math.max(0, paid - total);
    return change > 0 ? change.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "";
  }

  onAmountInput() { /* triggers change-due recompute via binding */ }

  statusClass(status: string): string {
    const m: Record<string,string> = {
      PAID: "badge-success", PARTIAL: "badge-warning",
      ISSUED: "badge-info", DRAFT: "badge-neutral", VOID: "badge-danger"
    };
    return m[status] ?? "badge-neutral";
  }

  // ── Customer autocomplete ─────────────────────────────────────
  onAddCustSearch() {
    if (this.addCustSearch.length < 2) { this.addCustResults.set([]); return; }
    this.adminSvc.searchCustomers(this.addCustSearch)
        .subscribe(c => this.addCustResults.set(c));
    this.showAddCustDrop.set(true);
  }
  onAddCustBlur() { setTimeout(() => this.showAddCustDrop.set(false), 200); }
  selectAddCustomer(c: Customer) {
    this.selectedCust.set(c);
    this.addCustSearch = `${c.lastName}, ${c.firstName}`;
    this.showAddCustDrop.set(false);
    this.addCustResults.set([]);
    this.selectedInvIds.clear();
  }

  // ── Invoice picker ────────────────────────────────────────────
  pickerFiltered(): Invoice[] {
    const custId = this.selectedCust()?.id;
    return this.allInvoices().filter(inv => {
      const q = this.pickerSearch.toLowerCase();
      const matchC = !custId || inv.customerId === custId || q.length > 0;
      const matchQ = !q || inv.invoiceNumber.toLowerCase().includes(q) ||
                     inv.customerFullName.toLowerCase().includes(q);
      const matchS = !this.pickerStatus || inv.status === this.pickerStatus;
      return matchC && matchQ && matchS;
    });
  }

  togglePicker(id: number) {
    this.selectedInvIds.has(id) ? this.selectedInvIds.delete(id) : this.selectedInvIds.add(id);
  }

  selectAllPicker() {
    this.pickerFiltered().forEach(inv => this.selectedInvIds.add(inv.id));
  }

  clearPicker() { this.selectedInvIds.clear(); }

  confirmPicker() {
    this.addAmount = this.selectedBalance();
    this.showPicker.set(false);
  }

  selectedBalance(): number {
    let total = 0;
    this.selectedInvIds.forEach(id => {
      const inv = this.allInvoices().find(i => i.id === id);
      if (inv) total += Math.max(0, inv.balanceDue);
    });
    return total;
  }

  selectedInvNumbers(): string[] {
    const nums: string[] = [];
    this.selectedInvIds.forEach(id => {
      const inv = this.allInvoices().find(i => i.id === id);
      if (inv) nums.push(inv.invoiceNumber);
    });
    return nums;
  }

  // ── Add payment ───────────────────────────────────────────────
  openAddPayment() {
    this.selectedCust.set(null);
    this.addCustSearch = "";
    this.selectedInvIds.clear();
    this.addDate   = new Date().toISOString().slice(0, 10);
    this.addMethod = "CARD";
    this.addRef    = "";
    this.addAmount = 0;
    this.addNotes  = "";
    this.addError.set("");
    this.showAdd.set(true);
  }

  saveAddPayment() {
    if (!this.selectedCust()?.id) {
      this.addError.set("Select a customer."); return;
    }
    if (this.selectedInvIds.size === 0) {
      this.addError.set("Select at least one invoice to link."); return;
    }
    if (!this.addAmount || this.addAmount <= 0) {
      this.addError.set("Enter a valid amount."); return;
    }

    this.addSaving.set(true);
    this.addError.set("");

    this.billSvc.postPayment({
      customerId:  this.selectedCust()!.id,
      invoiceIds:  Array.from(this.selectedInvIds),
      amount:      this.addAmount,
      method:      this.addMethod,
      reference:   this.addRef,
      paymentDate: this.addDate,
      notes:       this.addNotes,
    }).subscribe({
      next: () => {
        this.addSaving.set(false);
        this.showAdd.set(false);
        this.snack.open("Payment saved.", "×", { duration: 3000 });
        this.loadPayments();
        this.billSvc.getInvoices().subscribe(inv => this.allInvoices.set(inv));
      },
      error: e => {
        this.addSaving.set(false);
        this.addError.set(e.error?.message ?? "Could not save payment.");
      }
    });
  }

  // ── Receipt ───────────────────────────────────────────────────
  viewReceipt(p: Payment) {
    this.receiptPayment.set(p);
    this.showReceipt.set(true);
  }

  printReceipt() {
    const p = this.receiptPayment();
    if (!p) return;
    const w = window.open("", "_blank")!;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${p.paymentNumber}</title></head>
      <body style="font-family:Georgia,serif;padding:30px;max-width:480px;margin:0 auto;">
        <h2 style="color:#1a4a3a;text-align:center;">✿ Your Own CRM</h2>
        <p style="text-align:center;color:#7a7a7a;font-size:12px;">Payment Receipt</p>
        <hr style="border:1px solid #e8dfd6;"/>
        <table style="width:100%;font-size:13px;margin:12px 0;">
          <tr><td><b>Payment #:</b></td><td>${p.paymentNumber}</td></tr>
          <tr><td><b>Date:</b></td><td>${p.paymentDate}</td></tr>
          <tr><td><b>Customer:</b></td><td>${p.customerFullName}</td></tr>
          <tr><td><b>Method:</b></td><td>${p.method}</td></tr>
          ${p.reference ? `<tr><td><b>Reference:</b></td><td>${p.reference}</td></tr>` : ""}
          ${p.invoiceNumbers.length ? `<tr><td><b>Invoice(s):</b></td><td>${p.invoiceNumbers.join(", ")}</td></tr>` : ""}
        </table>
        <hr style="border:1px solid #e8dfd6;"/>
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:#1a4a3a;padding:12px 0;">
          <span>Amount Paid</span>
          <span>${p.amount.toLocaleString("en-US",{style:"currency",currency:"USD"})}</span>
        </div>
        <p style="text-align:center;font-size:11px;color:#7a7a7a;margin-top:12px;">Thank you for choosing Your Own CRM.</p>
        <script>window.onload=()=>window.print();</script>
      </body></html>`);
    w.document.close();
  }
}
