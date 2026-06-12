import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { BillingService } from "../../core/services/billing.service";
import { AdminService } from "../../core/services/admin.service";
import { Invoice, InvoiceLineItem } from "../../shared/models/invoice.model";
import { Customer } from "../../shared/models/admin.model";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { forkJoin } from "rxjs";

@Component({
  selector: "app-invoice-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            MatDialogModule, MatSnackBarModule],
  template: `
    <div>
      <!-- Page header -->
      <div class="page-header">
        <div>
          <div class="page-title">Invoices</div>
          <div class="page-subtitle">Billing records and payment status</div>
        </div>
        <button class="btn btn-primary" (click)="openNewInvoice()">+ New Invoice</button>
      </div>

      <!-- KPI stats -->
      <div class="stats-row">
        <div class="stat-card stat-jade">
          <div class="stat-label">Total Invoices</div>
          <div class="stat-value">{{ allInvoices().length }}</div>
        </div>
        <div class="stat-card stat-gold">
          <div class="stat-label">Gross Billed</div>
          <div class="stat-value">{{ totalGross() | currency }}</div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-label">Total Collected</div>
          <div class="stat-value">{{ totalCollected() | currency }}</div>
        </div>
        <div class="stat-card stat-danger">
          <div class="stat-label">Outstanding</div>
          <div class="stat-value">{{ totalOutstanding() | currency }}</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <input class="form-control" [(ngModel)]="search"
               placeholder="🔍 Search invoice # or customer…"
               style="width:220px;"/>
        <select class="form-control" [(ngModel)]="statusFilter" style="width:140px;">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
        </select>
        <input type="date" class="form-control" [(ngModel)]="dateFrom" style="width:140px;"/>
        <input type="date" class="form-control" [(ngModel)]="dateTo"   style="width:140px;"/>
        <button class="btn btn-ghost btn-sm" (click)="clearFilters()">Clear</button>
      </div>

      <!-- Table -->
      <div class="card">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Invoice #</th><th>Date</th><th>Customer</th>
              <th>Gross</th><th>Discount</th><th>Net</th>
              <th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (inv of filtered(); track inv.id) {
              <tr style="cursor:pointer;" (click)="openInvoiceDetail(inv)">
                <td><strong>{{ inv.invoiceNumber }}</strong></td>
                <td>{{ inv.invoiceDate | date:"mediumDate" }}</td>
                <td>{{ inv.customerFullName }}</td>
                <td>{{ inv.grossAmount | currency }}</td>
                <td style="color:var(--success);">
                  @if (inv.discountValue > 0) { — {{ inv.discountValue | currency }} }
                  @else { — }
                </td>
                <td style="font-weight:600;">{{ inv.netAmount | currency }}</td>
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
                <td (click)="$event.stopPropagation()">
                  <button class="btn btn-outline btn-sm"
                          (click)="openInvoiceDetail(inv)">Edit</button>
                  <button class="btn btn-gold btn-sm"
                          (click)="openQuickPay(inv)"
                          [disabled]="inv.balanceDue <= 0">Pay</button>
                  <button class="btn btn-ghost btn-sm btn-icon"
                          (click)="printInvoice(inv)" title="Print">🖨</button>
                </td>
              </tr>
            }
            @if (!filtered().length) {
              <tr>
                <td colspan="10"
                    style="text-align:center;padding:32px;color:var(--ink-light);">
                  No invoices found.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ INVOICE DETAIL MODAL ═══ -->
    @if (showDetail()) {
      <div class="crm-overlay" (mousedown)="$event.preventDefault()">
        <div class="crm-modal modal-wide" (click)="$event.stopPropagation()"
             style="max-width:900px;">
          <div class="modal-header">
            <h3>{{ editingInvoice() ? "Invoice " + editingInvoice()!.invoiceNumber : "New Invoice" }}</h3>
            <button class="close-btn" (click)="closeDetail()">✕</button>
          </div>
          <div class="modal-body">

            <!-- Customer + meta -->
            <div class="g3">
              <div class="form-group gfull">
                <label class="form-label">Customer *</label>
                <div class="autocomplete-wrap">
                  <input class="form-control"
                         [(ngModel)]="custSearch"
                         (input)="onCustSearch()"
                         (focus)="showCustDrop.set(true)"
                         (blur)="onCustBlur()"
                         placeholder="Type name or phone…"/>
                  @if (showCustDrop() && custResults().length) {
                    <div class="ac-dropdown">
                      @for (c of custResults(); track c.id) {
                        <div class="ac-item" (mousedown)="selectCustomer(c)">
                          <strong>{{ c.lastName }}, {{ c.firstName }}</strong>
                          <span class="ac-sub">{{ c.phone }} {{ c.email }}</span>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Invoice Date</label>
                <input type="date" class="form-control" [(ngModel)]="detDate"/>
              </div>
              <div class="form-group">
                <label class="form-label">Invoice #</label>
                <input class="form-control" [(ngModel)]="detNumber" readonly
                       style="background:var(--stone);"/>
              </div>
              @if (selectedCust()) {
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input class="form-control" [value]="selectedCust()!.phone || '—'" readonly
                         style="background:var(--stone);"/>
                </div>
                <div class="form-group">
                  <label class="form-label">DOB</label>
                  <input class="form-control"
                         [value]="selectedCust()!.dob ? (selectedCust()!.dob | date:'mediumDate') : '—'"
                         readonly style="background:var(--stone);"/>
                </div>
                <div class="form-group">
                  <label class="form-label">City, State ZIP</label>
                  <input class="form-control"
                         [value]="custAddress()"
                         readonly style="background:var(--stone);"/>
                </div>
              }
            </div>

            <!-- Line items -->
            <div class="section-head">Line Items</div>
            <table class="inv-lines-table">
              <thead>
                <tr>
                  <th>Description</th><th>Charge Code</th>
                  <th style="width:60px;">Qty</th>
                  <th style="width:100px;">Unit Price</th>
                  <th style="width:90px;">Total</th>
                  <th style="width:40px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (line of lines; track $index; let i = $index) {
                  <tr>
                    <td>
                      <input class="form-control" [(ngModel)]="line.description"
                             (input)="recalc()" placeholder="Service description"/>
                    </td>
                    <td>
                      <input class="form-control" [(ngModel)]="line.chargeCode"
                             style="max-width:90px;" placeholder="SVC-001"/>
                    </td>
                    <td>
                      <input type="number" class="form-control" [(ngModel)]="line.quantity"
                             (input)="recalc()" min="1" style="max-width:60px;"/>
                    </td>
                    <td>
                      <input type="number" class="form-control" [(ngModel)]="line.unitPrice"
                             (input)="recalc()" step="0.01" min="0" style="max-width:100px;"/>
                    </td>
                    <td style="font-weight:600;padding:0 8px;">
                      {{ (line.quantity * line.unitPrice) | currency }}
                    </td>
                    <td>
                      <button class="btn btn-ghost btn-sm btn-icon"
                              (click)="removeLine(i)"
                              style="color:var(--danger);">✕</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <button class="btn btn-outline btn-sm" style="margin-top:10px;"
                    (click)="addLine()">+ Add Line</button>

            <!-- Totals bar -->
            <div class="totals-bar">
              <div class="total-item">
                <div class="total-label">Gross</div>
                <div class="total-value">{{ gross | currency }}</div>
              </div>
              <div class="total-item">
                <div class="total-label">Discount</div>
                <div class="total-value" style="color:var(--success);">
                  — {{ discount | currency }}
                </div>
              </div>
              <div class="total-item">
                <div class="total-label">Net</div>
                <div class="total-value total-net">{{ net | currency }}</div>
              </div>
              <div class="total-item">
                <div class="total-label">Paid</div>
                <div class="total-value" style="color:var(--success);">
                  {{ detPaid | currency }}
                </div>
              </div>
              <div class="total-item">
                <div class="total-label">Balance Due</div>
                <div class="total-value"
                     [style.color]="(net - detPaid) > 0 ? 'var(--danger)' : 'var(--success)'">
                  {{ (net - detPaid) | currency }}
                </div>
              </div>
            </div>

            <!-- Discount + notes -->
            <div class="g2" style="margin-top:16px;">
              <div class="form-group">
                <label class="form-label">Discount Type</label>
                <select class="form-control" [(ngModel)]="discType" (change)="recalc()">
                  <option value="NONE">None</option>
                  <option value="PCT">Percentage %</option>
                  <option value="FLAT">Flat $</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Discount Value</label>
                <input type="number" class="form-control" [(ngModel)]="discValue"
                       (input)="recalc()" min="0"/>
              </div>
              <div class="form-group gfull">
                <label class="form-label">Notes</label>
                <textarea class="form-control" [(ngModel)]="detNotes" rows="2"></textarea>
              </div>
            </div>

            @if (detError()) {
              <div class="error-alert" style="margin-top:12px;">{{ detError() }}</div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeDetail()">Cancel</button>
            <button class="btn btn-outline" (click)="printCurrentInvoice()">🖨 Print</button>
            <button class="btn btn-gold" (click)="collectPaymentFromDetail()"
                    [disabled]="!editingInvoice()">
              💳 Collect Payment
            </button>
            <button class="btn btn-primary" (click)="saveInvoice()" [disabled]="detSaving()">
              {{ detSaving() ? "Saving…" : "Save Invoice" }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ═══ QUICK PAY MODAL ═══ -->
    @if (showPay()) {
      <div class="crm-overlay" (mousedown)="$event.preventDefault()">
        <div class="crm-modal modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Post Payment</h3>
            <button class="close-btn" (click)="showPay.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="balance-hero">
              <div class="balance-label">Balance Due</div>
              <div class="balance-amount">{{ payBalance | currency }}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px;margin-top:16px;">
              <div class="form-group">
                <label class="form-label">Amount ($) *</label>
                <input type="number" class="form-control" [(ngModel)]="payAmount"
                       step="0.01" min="0"/>
              </div>
              <div class="form-group">
                <label class="form-label">Payment Method</label>
                <select class="form-control" [(ngModel)]="payMethod">
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="TRANSFER">Online / ACH</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Reference / Last 4</label>
                <input class="form-control" [(ngModel)]="payRef"
                       placeholder="e.g. 4242 / Check #101 / Txn ID"/>
              </div>
            </div>
            @if (payError()) {
              <div class="error-alert" style="margin-top:12px;">{{ payError() }}</div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showPay.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="savePayment()" [disabled]="paySaving()">
              {{ paySaving() ? "Saving…" : "Post Payment" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Stats row ─────────────────────────────────── */
    .stats-row { display:flex; gap:16px; margin-bottom:20px; flex-wrap:wrap; }
    .stat-card { flex:1; min-width:160px; background:var(--white); border-radius:var(--radius-lg); padding:18px 20px; box-shadow:var(--shadow-sm); }
    .stat-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--ink-light); margin-bottom:6px; }
    .stat-value { font-family:var(--font-display); font-size:24px; font-weight:600; }
    .stat-jade    .stat-value { color:var(--jade); }
    .stat-gold    .stat-value { color:var(--gold); }
    .stat-success .stat-value { color:var(--success); }
    .stat-danger  .stat-value { color:var(--danger); }

    /* ── Line items table ───────────────────────────── */
    .section-head { font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--jade); margin:20px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--jade-mist); }
    .inv-lines-table { width:100%; border-collapse:collapse; font-size:13px; }
    .inv-lines-table th { background:var(--stone); color:var(--ink-mid); font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding:7px 10px; text-align:left; border-bottom:1px solid var(--stone-mid); }
    .inv-lines-table td { padding:6px 8px; border-bottom:1px solid var(--stone-mid); vertical-align:middle; }

    /* ── Totals bar ─────────────────────────────────── */
    .totals-bar { display:flex; justify-content:flex-end; gap:28px; align-items:flex-end; padding:16px 4px 0; flex-wrap:wrap; }
    .total-item { text-align:right; }
    .total-label { font-size:12px; color:var(--ink-light); }
    .total-value { font-family:var(--font-display); font-size:20px; font-weight:600; color:var(--ink); }
    .total-net   { font-size:24px; color:var(--jade); }

    /* ── Balance hero ───────────────────────────────── */
    .balance-hero { background:var(--jade-mist); border-radius:var(--radius); padding:16px; text-align:center; }
    .balance-label { font-size:12px; color:var(--ink-light); margin-bottom:4px; }
    .balance-amount { font-family:var(--font-display); font-size:32px; color:var(--jade); font-weight:600; }

    /* ── Autocomplete ───────────────────────────────── */
    .autocomplete-wrap { position:relative; }
    .ac-dropdown { position:absolute; top:100%; left:0; right:0; background:var(--white); border:1.5px solid var(--jade-light); border-radius:var(--radius); box-shadow:var(--shadow-md); z-index:100; max-height:220px; overflow-y:auto; }
    .ac-item { padding:9px 14px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--stone-mid); }
    .ac-item:hover { background:var(--jade-mist); }
    .ac-sub { font-size:11px; color:var(--ink-light); margin-left:8px; }

    /* ── Error alert ────────────────────────────────── */
    .error-alert { padding:10px 16px; border-radius:var(--radius); font-size:13px; background:#fde8e6; border:1px solid #f5c6c3; color:#9a1f17; }
  `]
})
export class InvoiceListComponent implements OnInit {
  allInvoices  = signal<Invoice[]>([]);
  search       = "";
  statusFilter = "";
  dateFrom     = "";
  dateTo       = "";

  // Invoice detail state
  showDetail    = signal(false);
  editingInvoice = signal<Invoice | null>(null);
  detSaving     = signal(false);
  detError      = signal("");
  detDate       = new Date().toISOString().slice(0,10);
  detNumber     = "";
  detNotes      = "";
  detPaid       = 0;
  discType      = "NONE";
  discValue     = 0;
  gross         = 0;
  discount      = 0;
  net           = 0;
  lines: Array<{ description: string; chargeCode: string; quantity: number; unitPrice: number; }> = [];

  // Customer autocomplete
  custSearch    = "";
  custResults   = signal<Customer[]>([]);
  selectedCust  = signal<Customer | null>(null);
  showCustDrop  = signal(false);

  // Quick pay state
  showPay   = signal(false);
  payInvId  = 0;
  payBalance = 0;
  payAmount  = 0;
  payMethod  = "CARD";
  payRef     = "";
  paySaving  = signal(false);
  payError   = signal("");

  constructor(
    private billSvc: BillingService,
    private adminSvc: AdminService,
    private http: HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.loadInvoices(); }

  loadInvoices() {
    const params: any = {};
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo)   params.to   = this.dateTo;
    this.billSvc.getInvoices(params).subscribe({
      next: inv => this.allInvoices.set(inv),
      error: ()  => this.allInvoices.set([])
    });
  }

  filtered(): Invoice[] {
    return this.allInvoices().filter(inv => {
      const q = this.search.toLowerCase();
      const matchQ = !q || inv.invoiceNumber.toLowerCase().includes(q) ||
                     inv.customerFullName.toLowerCase().includes(q);
      const matchS = !this.statusFilter || inv.status === this.statusFilter;
      const matchF = !this.dateFrom || inv.invoiceDate >= this.dateFrom;
      const matchT = !this.dateTo   || inv.invoiceDate <= this.dateTo;
      return matchQ && matchS && matchF && matchT;
    });
  }

  clearFilters() {
    this.search = ""; this.statusFilter = "";
    this.dateFrom = ""; this.dateTo = "";
  }

  // ── KPI computeds ────────────────────────────────────────────
  totalGross()       { return this.allInvoices().reduce((s,i) => s + i.grossAmount, 0); }
  totalCollected()   { return this.allInvoices().reduce((s,i) => s + i.paidAmount, 0); }
  totalOutstanding() { return this.allInvoices().reduce((s,i) => s + Math.max(0, i.balanceDue), 0); }

  statusClass(status: string): string {
    const m: Record<string,string> = {
      PAID: "badge-success", PARTIAL: "badge-warning",
      ISSUED: "badge-info", DRAFT: "badge-neutral", VOID: "badge-danger"
    };
    return m[status] ?? "badge-neutral";
  }

  // ── Invoice detail ────────────────────────────────────────────
  openNewInvoice() {
    this.editingInvoice.set(null);
    this.detDate    = new Date().toISOString().slice(0, 10);
    this.detNumber  = "AUTO";
    this.detNotes   = "";
    this.detPaid    = 0;
    this.discType   = "NONE";
    this.discValue  = 0;
    this.lines      = [{ description: "", chargeCode: "", quantity: 1, unitPrice: 0 }];
    this.custSearch = "";
    this.selectedCust.set(null);
    this.detError.set("");
    this.gross = 0; this.discount = 0; this.net = 0;
    this.showDetail.set(true);
  }

  openInvoiceDetail(inv: Invoice) {
    this.editingInvoice.set(inv);
    this.detDate   = inv.invoiceDate;
    this.detNumber = inv.invoiceNumber;
    this.detNotes  = inv.notes ?? "";
    this.detPaid   = inv.paidAmount;
    this.discType  = inv.discountType || "NONE";
    this.discValue = inv.discountValue || 0;
    this.lines     = (inv.lineItems ?? []).map(l => ({
      description: l.description,
      chargeCode:  l.chargeCode ?? "",
      quantity:    l.quantity,
      unitPrice:   l.unitPrice,
    }));
    if (!this.lines.length)
      this.lines.push({ description: "", chargeCode: "", quantity: 1, unitPrice: 0 });
    this.custSearch = inv.customerFullName;
    this.selectedCust.set({ id: inv.customerId, firstName: "", lastName: "", phone: "", active: true } as any);
    this.detError.set("");
    this.recalc();
    this.showDetail.set(true);
  }

  closeDetail() { this.showDetail.set(false); }

  // Customer autocomplete
  onCustSearch() {
    if (this.custSearch.length < 2) { this.custResults.set([]); return; }
    this.adminSvc.searchCustomers(this.custSearch)
        .subscribe(c => this.custResults.set(c));
    this.showCustDrop.set(true);
  }
  onCustBlur() { setTimeout(() => this.showCustDrop.set(false), 200); }
  selectCustomer(c: Customer) {
    this.selectedCust.set(c);
    this.custSearch = `${c.lastName}, ${c.firstName}`;
    this.showCustDrop.set(false);
    this.custResults.set([]);
  }
  custAddress(): string {
    const c = this.selectedCust();
    if (!c) return "—";
    return [c.city, c.state, c.zip].filter(Boolean).join(", ");
  }

  // Line items
  addLine() {
    this.lines.push({ description: "", chargeCode: "", quantity: 1, unitPrice: 0 });
  }
  removeLine(i: number) { this.lines.splice(i, 1); this.recalc(); }

  recalc() {
    this.gross    = this.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    this.discount = this.discType === "PCT"  ? this.gross * this.discValue / 100
                  : this.discType === "FLAT" ? Math.min(this.discValue, this.gross)
                  : 0;
    this.net = this.gross - this.discount;
  }

  saveInvoice() {
    this.recalc();
    if (!this.selectedCust()?.id) { this.detError.set("Select a customer."); return; }
    const validLines = this.lines.filter(l => l.description.trim());
    if (!validLines.length) { this.detError.set("Add at least one line item."); return; }

    this.detSaving.set(true);
    this.detError.set("");

    const payload = {
      customerId:    this.selectedCust()!.id,
      invoiceDate:   this.detDate,
      discountType:  this.discType,
      discountValue: this.discValue,
      notes:         this.detNotes,
      lineItems:     validLines.map(l => ({
        description: l.description,
        chargeCode:  l.chargeCode,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        totalPrice:  l.quantity * l.unitPrice,
      })),
    };

    const req = this.editingInvoice()
      ? this.billSvc.updateInvoice(this.editingInvoice()!.id, payload)
      : this.billSvc.createInvoice(payload);

    req.subscribe({
      next: () => {
        this.detSaving.set(false);
        this.closeDetail();
        this.snack.open("Invoice saved.", "×", { duration: 3000 });
        this.loadInvoices();
      },
      error: e => {
        this.detSaving.set(false);
        this.detError.set(e.error?.message ?? "Could not save invoice.");
      }
    });
  }

  collectPaymentFromDetail() {
    if (!this.editingInvoice()) return;
    this.closeDetail();
    this.openQuickPay(this.editingInvoice()!);
  }

  // ── Quick Pay ─────────────────────────────────────────────────
  openQuickPay(inv: Invoice) {
    this.payInvId   = inv.id;
    this.payBalance = Math.max(0, inv.balanceDue);
    this.payAmount  = this.payBalance;
    this.payMethod  = "CARD";
    this.payRef     = "";
    this.payError.set("");
    this.showPay.set(true);
  }

  savePayment() {
    if (!this.payAmount || this.payAmount <= 0) {
      this.payError.set("Enter a valid amount."); return;
    }
    this.paySaving.set(true);
    this.payError.set("");
    this.billSvc.postPayment({
      invoiceId:   this.payInvId,
      invoiceIds:  [this.payInvId],
      amount:      this.payAmount,
      method:      this.payMethod,
      reference:   this.payRef,
      paymentDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.paySaving.set(false);
        this.showPay.set(false);
        this.snack.open("Payment posted.", "×", { duration: 3000 });
        this.loadInvoices();
      },
      error: e => {
        this.paySaving.set(false);
        this.payError.set(e.error?.message ?? "Could not post payment.");
      }
    });
  }

  printInvoice(inv: Invoice) {
    const lines = (inv.lineItems ?? []).map(l =>
      `<tr><td style="padding:6px;">${l.description}</td>
           <td style="padding:6px;text-align:right;">${(l.totalPrice).toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>`
    ).join("");
    const w = window.open("", "_blank")!;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoiceNumber}</title></head>
      <body style="font-family:Georgia,serif;padding:30px;max-width:600px;margin:0 auto;">
        <h1 style="color:#1a4a3a;text-align:center;">✿ Your Own CRM</h1>
        <h2 style="text-align:center;">INVOICE</h2>
        <hr style="border:1px solid #e8dfd6;"/>
        <table style="width:100%;font-size:13px;margin-bottom:12px;">
          <tr><td><b>Invoice #:</b> ${inv.invoiceNumber}</td>
              <td align="right"><b>Date:</b> ${inv.invoiceDate}</td></tr>
          <tr><td><b>Patient:</b> ${inv.customerFullName}</td>
              <td align="right">${inv.customerPhone ?? ""}</td></tr>
        </table>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <tr style="background:#e8f2ee;"><th style="padding:6px;text-align:left;">Service</th>
              <th style="padding:6px;text-align:right;">Amount</th></tr>
          ${lines}
          <tr style="color:#27ae60;"><td style="padding:6px;">Discount</td>
              <td style="padding:6px;text-align:right;">— ${inv.discountValue.toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>
          <tr style="font-weight:700;border-top:2px solid #1a4a3a;">
              <td style="padding:8px;">Net Total</td>
              <td style="padding:8px;text-align:right;">${inv.netAmount.toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>
          <tr style="color:#27ae60;"><td style="padding:6px;">Paid</td>
              <td style="padding:6px;text-align:right;">${inv.paidAmount.toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>
          <tr style="font-weight:700;color:#c0392b;">
              <td style="padding:6px;">Balance Due</td>
              <td style="padding:6px;text-align:right;">${inv.balanceDue.toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>
        </table>
        <p style="text-align:center;font-size:11px;color:#7a7a7a;margin-top:20px;">Thank you for choosing Your Own CRM.</p>
        <script>window.onload=()=>window.print();</script>
      </body></html>`);
    w.document.close();
  }

  printCurrentInvoice() {
    if (this.editingInvoice()) this.printInvoice(this.editingInvoice()!);
  }
}
