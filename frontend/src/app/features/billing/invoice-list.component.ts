import {
  Component, OnInit, OnDestroy, signal, computed
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { BillingService } from "../../core/services/billing.service";
import { AdminService } from "../../core/services/admin.service";
import { Invoice, InvoiceLineItem } from "../../shared/models/invoice.model";
import { Customer, VisitType } from "../../shared/models/admin.model";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from "rxjs";
import { catchError, takeUntil } from "rxjs/operators";

// ─── Status badge / display helpers ─────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  PAID: "badge-success", PARTIAL: "badge-warning",
  ISSUED: "badge-info",  DRAFT:   "badge-neutral", VOID: "badge-danger"
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", ISSUED: "Issued", PARTIAL: "Partial", PAID: "Paid", VOID: "Void"
};

// ─── Line item row (editing state) ──────────────────────────────────────────
interface LineRow {
  description: string;
  chargeCode:  string;
  quantity:    number;
  unitPrice:   number;
}

@Component({
  selector: "app-invoice-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <!-- ══ LIST VIEW ══ -->
      @if (!showDetail()) {

        <!-- Header -->
        <div class="page-header">
          <div>
            <div class="page-title">Invoices</div>
            <div class="page-subtitle">Billing records and payment status</div>
          </div>
          <button class="btn btn-primary" (click)="newInvoice()">+ New Invoice</button>
        </div>

        <!-- KPI cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total</div>
            <div class="kpi-val kpi-jade">{{ allInvoices().length }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Gross Billed</div>
            <div class="kpi-val kpi-gold">{{ kpiGross() | currency }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Collected</div>
            <div class="kpi-val kpi-success">{{ kpiCollected() | currency }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Outstanding</div>
            <div class="kpi-val kpi-danger">{{ kpiOutstanding() | currency }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Overdue</div>
            <div class="kpi-val kpi-danger">{{ kpiOverdue() }}</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters" style="margin-bottom:14px;">
          <input class="form-control" [(ngModel)]="search"
                 placeholder="🔍 Invoice # or customer…" style="width:220px;"/>
          <select class="form-control" [(ngModel)]="statusFilter" style="width:130px;">
            <option value="">All Statuses</option>
            @for (s of statusOptions; track s) {
              <option [value]="s">{{ statusLabel(s) }}</option>
            }
          </select>
          <input type="date" class="form-control" [(ngModel)]="dateFrom" style="width:145px;"/>
          <span style="color:var(--ink-light);font-size:12px;">to</span>
          <input type="date" class="form-control" [(ngModel)]="dateTo"   style="width:145px;"/>
          <button class="btn btn-ghost btn-sm" (click)="clearFilters()">Clear</button>
        </div>

        <!-- Table -->
        <div class="card" style="overflow:hidden;">
          <table class="crm-table">
            <thead>
              <tr>
                <th (click)="sort('invoiceNumber')" class="sortable">
                  Inv # {{ sortIcon('invoiceNumber') }}
                </th>
                <th (click)="sort('invoiceDate')" class="sortable">
                  Date {{ sortIcon('invoiceDate') }}
                </th>
                <th (click)="sort('customerFullName')" class="sortable">
                  Customer {{ sortIcon('customerFullName') }}
                </th>
                <th>Services</th>
                <th (click)="sort('grossAmount')" class="sortable">
                  Gross {{ sortIcon('grossAmount') }}
                </th>
                <th>Discount</th>
                <th (click)="sort('netAmount')" class="sortable">
                  Net {{ sortIcon('netAmount') }}
                </th>
                <th (click)="sort('paidAmount')" class="sortable">
                  Paid {{ sortIcon('paidAmount') }}
                </th>
                <th (click)="sort('balanceDue')" class="sortable">
                  Balance {{ sortIcon('balanceDue') }}
                </th>
                <th>Due Date</th>
                <th (click)="sort('status')" class="sortable">
                  Status {{ sortIcon('status') }}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (inv of filtered(); track inv.id) {
                <tr [class.row-overdue]="isOverdue(inv)"
                    style="cursor:pointer;"
                    (click)="editInvoice(inv)">
                  <td>
                    <strong style="font-family:var(--font-display);">{{ inv.invoiceNumber }}</strong>
                    @if (inv.appointmentId) {
                      <span class="badge badge-info" style="margin-left:4px;font-size:9px;">Appt</span>
                    }
                  </td>
                  <td style="white-space:nowrap;">{{ inv.invoiceDate | date:"MMM d, y" }}</td>
                  <td>{{ fmtName(inv.customerFullName) }}</td>
                  <td style="font-size:11px;color:var(--ink-light);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    {{ linesSummary(inv) }}
                  </td>
                  <td>{{ inv.grossAmount | currency }}</td>
                  <td style="color:var(--success);">
                    @if (inv.discountValue > 0) { −{{ inv.discountValue | currency }} }
                    @else { — }
                  </td>
                  <td style="font-weight:600;">{{ inv.netAmount | currency }}</td>
                  <td style="color:var(--success);">{{ inv.paidAmount | currency }}</td>
                  <td style="font-weight:700;"
                      [style.color]="inv.balanceDue > 0 ? 'var(--danger)' : 'var(--success)'">
                    {{ inv.balanceDue | currency }}
                  </td>
                  <td [class.overdue-cell]="isOverdue(inv)">
                    {{ inv.dueDate ? (inv.dueDate | date:"MMM d") : "—" }}
                  </td>
                  <td><span class="badge" [ngClass]="statusClass(inv.status)">{{ statusLabel(inv.status) }}</span></td>
                  <td (click)="$event.stopPropagation()" style="white-space:nowrap;">
                    <button class="btn btn-outline btn-sm" (click)="editInvoice(inv)">Edit</button>
                    @if (inv.balanceDue > 0 && inv.status !== 'VOID') {
                      <button class="btn btn-gold btn-sm" (click)="openQuickPay(inv)">Pay</button>
                    }
                    <button class="btn btn-ghost btn-sm" (click)="printInvoice(inv)" title="Print">🖨</button>
                    @if (inv.status !== 'VOID' && inv.status !== 'PAID') {
                      <button class="btn btn-ghost btn-sm" style="color:var(--danger);"
                              (click)="voidConfirm(inv)" title="Void">⊘</button>
                    }
                  </td>
                </tr>
              }
              @if (!filtered().length) {
                <tr>
                  <td colspan="12" style="text-align:center;padding:32px;color:var(--ink-light);">
                    @if (loading()) { Loading invoices… }
                    @else { No invoices match the current filters. }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- ══ INVOICE DETAIL / EDITOR ══ -->
      @if (showDetail()) {
        <div>
          <!-- Breadcrumb header -->
          <div class="page-header" style="padding-bottom:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <button class="btn btn-ghost btn-sm" (click)="backToList()">← Back</button>
              <div>
                <div class="page-title">
                  {{ editInv() ? editInv()!.invoiceNumber : "New Invoice" }}
                </div>
                @if (editInv()) {
                  <div class="page-subtitle" style="display:flex;align-items:center;gap:8px;">
                    <span class="badge" [ngClass]="statusClass(editInv()!.status)">{{ statusLabel(editInv()!.status) }}</span>
                    @if (editInv()!.appointmentId) {
                      <span class="badge badge-info">Linked to Appointment</span>
                    }
                  </div>
                }
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              @if (editInv()) {
                <button class="btn btn-outline" (click)="printInvoice(editInv()!)">🖨 Print</button>
              }
              @if (editInv() && editInv()!.status !== 'VOID' && editInv()!.status !== 'PAID') {
                <button class="btn btn-outline" style="color:var(--danger);"
                        (click)="voidConfirm(editInv()!)">⊘ Void</button>
              }
              <button class="btn btn-primary" (click)="saveInvoice()"
                      [disabled]="saving()">
                {{ saving() ? "Saving…" : "Save Invoice" }}
              </button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 320px;gap:12px;align-items:start;">

            <!-- LEFT COLUMN: main form -->
            <div style="display:flex;flex-direction:column;gap:10px;">

              <!-- Customer + dates card -->
              <div class="card" style="padding:14px 16px;">
                <div class="sect-head">Customer & Invoice Details</div>
                <div class="g3">
                  <!-- Customer search -->
                  <div class="form-group gfull" style="position:relative;">
                    <label class="form-label">Customer *</label>
                    <input class="form-control" [formControl]="custCtrl"
                           placeholder="Type last name, first name or phone…"
                           autocomplete="off"
                           (focus)="showCustDrop.set(true)"
                           (blur)="onCustBlur()"/>
                    @if (showCustDrop() && custResults().length) {
                      <div class="ac-dropdown">
                        @for (c of custResults(); track c.id) {
                          <div class="ac-item" (mousedown)="selectCustomer(c)">
                            <strong>{{ c.lastName }}, {{ c.firstName }}</strong>
                            <span class="ac-sub">{{ c.phone }} · {{ c.email }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  @if (selCust()) {
                    <div class="cust-info-card gfull">
                      <div class="cust-info-row">
                        <span>{{ selCust()!.lastName }}, {{ selCust()!.firstName }}</span>
                        @if (selCust()!.dob) {
                          <span class="ci-sub">DOB: {{ selCust()!.dob | date:"mediumDate" }}</span>
                        }
                        <span class="ci-sub">{{ selCust()!.phone }}</span>
                        @if (selCust()!.email) {
                          <span class="ci-sub">{{ selCust()!.email }}</span>
                        }
                        @if (selCust()!.city || selCust()!.state) {
                          <span class="ci-sub">{{ custAddress() }}</span>
                        }
                        @if (selCust()!.allergies) {
                          <span class="allergy-badge">⚠ {{ selCust()!.allergies }}</span>
                        }
                      </div>
                    </div>
                  }

                  <div class="form-group">
                    <label class="form-label">Invoice Date</label>
                    <input type="date" class="form-control" [(ngModel)]="detDate"/>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Due Date</label>
                    <input type="date" class="form-control" [(ngModel)]="detDue"/>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Invoice #</label>
                    <input class="form-control" [value]="editInv() ? editInv()!.invoiceNumber : 'AUTO'"
                           readonly style="background:var(--stone);color:var(--ink-mid);"/>
                  </div>
                </div>
              </div>

              <!-- Line items card -->
              <div class="card" style="padding:14px 16px;">
                <div class="sect-head">
                  Line Items
                  <button class="btn btn-outline btn-sm" style="margin-left:auto;"
                          (click)="addLine()">+ Add Line</button>
                </div>
                <table class="line-tbl">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Charge Code</th>
                      <th style="width:62px;text-align:right;">Qty</th>
                      <th style="width:110px;text-align:right;">Unit Price</th>
                      <th style="width:100px;text-align:right;">Total</th>
                      <th style="width:32px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ln of lines; track $index; let i = $index) {
                      <tr>
                        <td>
                          <div style="position:relative;">
                            <input class="form-control form-control-sm"
                                   [(ngModel)]="ln.description"
                                   (input)="recalc(); onLineDescInput(i, ln.description)"
                                   (focus)="activeLineIdx = i"
                                   (blur)="onLineBlur()"
                                   placeholder="Service or item description…"/>
                            @if (activeLineIdx === i && vtSuggestions().length) {
                              <div class="ac-dropdown" style="z-index:50;">
                                @for (vt of vtSuggestions(); track vt.id) {
                                  <div class="ac-item" (mousedown)="applyVtToLine(i, vt)">
                                    <strong>{{ vt.name }}</strong>
                                    <span class="ac-sub">
                                      {{ vt.durationMin }}min ·
                                      {{ vt.defaultPrice | currency }}
                                    </span>
                                  </div>
                                }
                              </div>
                            }
                          </div>
                        </td>
                        <td>
                          <input class="form-control form-control-sm"
                                 [(ngModel)]="ln.chargeCode"
                                 placeholder="SVC-001" style="max-width:95px;"/>
                        </td>
                        <td>
                          <input type="number" class="form-control form-control-sm"
                                 [(ngModel)]="ln.quantity"
                                 (input)="recalc()" min="1"
                                 style="max-width:58px;text-align:right;"/>
                        </td>
                        <td>
                          <input type="number" class="form-control form-control-sm"
                                 [(ngModel)]="ln.unitPrice"
                                 (input)="recalc()" step="0.01" min="0"
                                 style="max-width:106px;text-align:right;"/>
                        </td>
                        <td style="text-align:right;font-weight:600;padding-right:10px;">
                          {{ (ln.quantity * ln.unitPrice) | currency }}
                        </td>
                        <td>
                          <button class="btn btn-ghost btn-sm btn-icon"
                                  (click)="removeLine(i)"
                                  style="color:var(--danger);">✕</button>
                        </td>
                      </tr>
                    }
                    @if (!lines.length) {
                      <tr>
                        <td colspan="6" style="text-align:center;padding:16px;color:var(--ink-light);">
                          No line items yet. Click "Add Line" or type a appt type name.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                <!-- Totals -->
                <div class="totals-block">
                  <div class="tot-row">
                    <span>Subtotal</span>
                    <span>{{ gross | currency }}</span>
                  </div>
                  <div class="tot-row disc-row">
                    <span>
                      Discount
                      <select class="form-control disc-sel" [(ngModel)]="discType" (change)="recalc()">
                        <option value="NONE">None</option>
                        <option value="PCT">% off</option>
                        <option value="FLAT">$ flat</option>
                      </select>
                      @if (discType !== 'NONE') {
                        <input type="number" class="form-control disc-val"
                               [(ngModel)]="discValue" (input)="recalc()" min="0"
                               [placeholder]="discType === 'PCT' ? '0' : '0.00'"/>
                        <span class="disc-unit">{{ discType === 'PCT' ? '%' : '$' }}</span>
                      }
                    </span>
                    <span style="color:var(--success);">− {{ discount | currency }}</span>
                  </div>
                  <div class="tot-row tot-net">
                    <span>Net Total</span>
                    <span>{{ net | currency }}</span>
                  </div>
                  <div class="tot-row" style="color:var(--success);">
                    <span>Paid</span>
                    <span>{{ detPaid | currency }}</span>
                  </div>
                  <div class="tot-row tot-balance"
                       [style.color]="(net - detPaid) > 0 ? 'var(--danger)' : 'var(--success)'">
                    <span>Balance Due</span>
                    <span>{{ (net - detPaid) | currency }}</span>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="card" style="padding:12px 16px;">
                <div class="sect-head">Notes</div>
                <textarea class="form-control" [(ngModel)]="detNotes" rows="3"
                          placeholder="Internal notes, instructions to patient…"></textarea>
              </div>

              @if (detError()) {
                <div class="err-alert">{{ detError() }}</div>
              }
            </div>

            <!-- RIGHT COLUMN: payment history + quick pay -->
            <div style="display:flex;flex-direction:column;gap:10px;">

              <!-- Quick Pay -->
              @if (editInv() && editInv()!.balanceDue > 0 && editInv()!.status !== 'VOID') {
                <div class="card pay-card">
                  <div class="sect-head">Collect Payment</div>
                  <div class="balance-chip">
                    <div style="font-size:11px;color:var(--jade);font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Balance Due</div>
                    <div style="font-family:var(--font-display);font-size:28px;color:var(--jade);font-weight:600;">
                      {{ editInv()!.balanceDue | currency }}
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
                    <div class="form-group">
                      <label class="form-label">Amount</label>
                      <input type="number" class="form-control" [(ngModel)]="payAmt"
                             step="0.01" min="0"/>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Method</label>
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
                             placeholder="e.g. 4242, Check #101"/>
                    </div>
                    @if (payError()) { <div class="err-alert">{{ payError() }}</div> }
                    <button class="btn btn-primary" (click)="postPayment()"
                            [disabled]="paySaving()">
                      {{ paySaving() ? "Posting…" : "Post Payment" }}
                    </button>
                  </div>
                </div>
              }

              <!-- Payment history -->
              @if (editInv()) {
                <div class="card" style="padding:12px 16px;">
                  <div class="sect-head">Payment History</div>
                  @if (payHistory().length) {
                    @for (p of payHistory(); track p.id) {
                      <div class="pay-hist-row">
                        <div>
                          <div style="font-size:13px;font-weight:600;">{{ p.amount | currency }}</div>
                          <div style="font-size:11px;color:var(--ink-light);">
                            {{ p.paymentDate | date:"MMM d, y" }} · {{ p.method }}
                            @if (p.reference) { · {{ p.reference }} }
                          </div>
                        </div>
                        <span class="badge badge-success">Posted</span>
                      </div>
                    }
                  } @else {
                    <div style="font-size:13px;color:var(--ink-light);text-align:center;padding:12px 0;">
                      No payments recorded yet.
                    </div>
                  }
                </div>

                <!-- Invoice summary -->
                <div class="card" style="padding:12px 16px;">
                  <div class="sect-head">Summary</div>
                  <div class="summ-row"><span>Gross</span><span>{{ editInv()!.grossAmount | currency }}</span></div>
                  <div class="summ-row" style="color:var(--success);">
                    <span>Discount</span><span>− {{ editInv()!.discountValue | currency }}</span>
                  </div>
                  <div class="summ-row summ-net"><span>Net</span><span>{{ editInv()!.netAmount | currency }}</span></div>
                  <div class="summ-row" style="color:var(--success);">
                    <span>Paid</span><span>{{ editInv()!.paidAmount | currency }}</span>
                  </div>
                  <div class="summ-row" [style.color]="editInv()!.balanceDue > 0 ? 'var(--danger)' : 'var(--success)'">
                    <span>Balance</span><span>{{ editInv()!.balanceDue | currency }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>

    <!-- ══ QUICK PAY MODAL (from list) ══ -->
    @if (showPayModal()) {
      <div class="crm-overlay">
        <div class="crm-modal" style="max-width:420px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Post Payment — {{ payModalInv()?.invoiceNumber }}</h3>
            <button class="close-btn" (click)="showPayModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="balance-chip" style="margin-bottom:16px;">
              <div style="font-size:11px;color:var(--jade);font-weight:700;">Balance Due</div>
              <div style="font-family:var(--font-display);font-size:26px;color:var(--jade);font-weight:600;">
                {{ payModalInv()?.balanceDue | currency }}
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div class="form-group">
                <label class="form-label">Amount</label>
                <input type="number" class="form-control" [(ngModel)]="payAmt" step="0.01" min="0"/>
              </div>
              <div class="form-group">
                <label class="form-label">Method</label>
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
                <input class="form-control" [(ngModel)]="payRef"/>
              </div>
              @if (payError()) { <div class="err-alert">{{ payError() }}</div> }
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showPayModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="postPaymentFromModal()"
                    [disabled]="paySaving()">
              {{ paySaving() ? "Posting…" : "Post Payment" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* KPI row */
    .kpi-row { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
    .kpi-card { flex:1; min-width:130px; background:#fff; border-radius:var(--radius-lg);
                padding:10px 14px; box-shadow:var(--shadow-sm); }
    .kpi-label { font-size:10px; font-weight:700; text-transform:uppercase;
                 letter-spacing:.08em; color:var(--ink-light); margin-bottom:4px; }
    .kpi-val { font-family:var(--font-display); font-size:22px; font-weight:600; }
    .kpi-jade    { color:var(--jade); }
    .kpi-gold    { color:var(--gold); }
    .kpi-success { color:var(--success); }
    .kpi-danger  { color:var(--danger); }

    /* Table extras */
    .sortable { cursor:pointer; user-select:none; }
    .sortable:hover { color:var(--jade); }
    .row-overdue td:first-child { border-left:3px solid var(--danger); }
    .overdue-cell { color:var(--danger); font-weight:600; }

    /* Detail layout */
    .sect-head { font-size:10px; font-weight:700; text-transform:uppercase;
                 letter-spacing:.07em; color:var(--jade); margin-bottom:8px;
                 padding-bottom:4px; border-bottom:2px solid var(--jade-mist);
                 display:flex; align-items:center; gap:8px; }
    .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
    .gfull { grid-column:1/-1; }

    /* Customer info card */
    .cust-info-card { background:var(--jade-mist); border-radius:var(--radius);
                      padding:10px 14px; }
    .cust-info-row { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:baseline; }
    .cust-info-row > span:first-child { font-size:14px; font-weight:600; color:var(--jade); }
    .ci-sub { font-size:12px; color:var(--ink-light); }
    .allergy-badge { font-size:11px; background:#fef0d8; color:#7a4800;
                     border-radius:4px; padding:2px 7px; }

    /* Line items table */
    .line-tbl { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:0; }
    .line-tbl th { background:var(--stone); font-size:10px; font-weight:700; text-transform:uppercase;
                   letter-spacing:.06em; color:var(--ink-mid); padding:5px 8px;
                   border-bottom:1px solid var(--stone-mid); }
    .line-tbl td { padding:4px 6px; border-bottom:1px solid var(--stone-mid); vertical-align:middle; }
    .form-control-sm { padding:5px 8px; font-size:12px; }

    /* Totals block */
    .totals-block { border-top:2px solid var(--stone-mid); margin-top:6px; padding-top:6px; }
    .tot-row { display:flex; justify-content:space-between; padding:3px 8px;
               font-size:12px; color:var(--ink-mid); }
    .disc-row span:first-child { display:flex; align-items:center; gap:6px; }
    .disc-sel { width:72px !important; height:28px !important; padding:3px 6px !important;
                font-size:12px !important; display:inline-block; }
    .disc-val { width:62px !important; height:28px !important; padding:3px 6px !important;
                font-size:12px !important; display:inline-block; text-align:right; }
    .disc-unit { font-size:12px; color:var(--ink-light); }
    .tot-net { font-size:15px; font-weight:700; color:var(--jade);
               border-top:1px solid var(--stone-mid); padding-top:8px; }
    .tot-balance { font-size:15px; font-weight:700; }

    /* Right column */
    .pay-card { padding:14px 16px; }
    .balance-chip { background:var(--jade-mist); border-radius:var(--radius);
                    padding:12px 16px; text-align:center; }
    .pay-hist-row { display:flex; justify-content:space-between; align-items:center;
                    padding:8px 0; border-bottom:1px solid var(--stone-mid); }
    .pay-hist-row:last-child { border-bottom:none; }
    .summ-row { display:flex; justify-content:space-between; padding:5px 0;
                font-size:13px; color:var(--ink-mid); }
    .summ-net { font-weight:700; color:var(--jade); border-top:1px solid var(--stone-mid);
                padding-top:8px; }

    /* Autocomplete */
    .ac-dropdown { position:absolute; top:100%; left:0; right:0; background:#fff;
                   border:1.5px solid var(--jade-light); border-radius:var(--radius);
                   box-shadow:var(--shadow-md); z-index:200; max-height:200px; overflow-y:auto; }
    .ac-item { padding:8px 12px; cursor:pointer; font-size:13px;
               border-bottom:1px solid var(--stone-mid); }
    .ac-item:hover { background:var(--jade-mist); }
    .ac-sub { font-size:11px; color:var(--ink-light); margin-left:8px; }

    /* Misc */
    .err-alert { padding:10px 16px; border-radius:var(--radius); font-size:13px;
                 background:#fde8e6; border:1px solid #f5c6c3; color:#9a1f17; }
  `]
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── List state ──────────────────────────────────────────────────────────────
  allInvoices  = signal<Invoice[]>([]);
  loading      = signal(false);
  search       = "";
  statusFilter = "";
  dateFrom     = "";
  dateTo       = "";
  sortCol      = "invoiceDate";
  sortDir: "asc" | "desc" = "desc";
  statusOptions = ["DRAFT","ISSUED","PARTIAL","PAID","VOID"];

  kpiGross       = computed(() => this.allInvoices().reduce((s,i) => s + (i.grossAmount || 0), 0));
  kpiCollected   = computed(() => this.allInvoices().reduce((s,i) => s + (i.paidAmount || 0), 0));
  kpiOutstanding = computed(() => this.allInvoices().reduce((s,i) => s + Math.max(0, i.balanceDue || 0), 0));
  kpiOverdue     = computed(() => this.allInvoices().filter(i => this.isOverdue(i)).length);

  // ── Detail view state ────────────────────────────────────────────────────────
  showDetail = signal(false);
  editInv    = signal<Invoice | null>(null);
  saving     = signal(false);
  detError   = signal("");
  detDate    = "";
  detDue     = "";
  detNotes   = "";
  detPaid    = 0;
  discType   = "NONE";
  discValue  = 0;
  gross      = 0;
  discount   = 0;
  net        = 0;
  lines: LineRow[] = [];

  // Payment history for the open invoice
  payHistory = signal<any[]>([]);

  // Visit-type autocomplete in line items
  visitTypes: VisitType[] = [];
  vtSuggestions = signal<VisitType[]>([]);
  activeLineIdx = -1;

  // Customer search
  custCtrl    = new FormControl("");
  custResults = signal<Customer[]>([]);
  selCust     = signal<Customer | null>(null);
  showCustDrop = signal(false);

  // Inline quick-pay (in detail view)
  payAmt    = 0;
  payMethod = "CARD";
  payRef    = "";
  paySaving = signal(false);
  payError  = signal("");

  // Quick-pay modal (from list)
  showPayModal  = signal(false);
  payModalInv   = signal<Invoice | null>(null);

  constructor(
    private billSvc: BillingService,
    private adminSvc: AdminService,
    private http: HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadInvoices();
    this.adminSvc.getVisitTypes().subscribe(vt => this.visitTypes = vt);

    // Fast customer search with debounce — same pattern as appointment dialog
    this.custCtrl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(q => q && q.length > 1
        ? this.http.get<Customer[]>(`${environment.apiUrl}/customers?q=${encodeURIComponent(q)}`)
            .pipe(catchError(() => of([])))
        : of([])),
      takeUntil(this.destroy$)
    ).subscribe(r => {
      this.custResults.set(r);
      if (r.length) this.showCustDrop.set(true);
    });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  // ── List ─────────────────────────────────────────────────────────────────────
  loadInvoices() {
    this.loading.set(true);
    const params: any = {};
    if (this.dateFrom) params.from = this.dateFrom;
    if (this.dateTo)   params.to   = this.dateTo;
    this.billSvc.getInvoices(params).subscribe({
      next: inv => { this.allInvoices.set(inv); this.loading.set(false); },
      error: ()  => { this.allInvoices.set([]); this.loading.set(false); }
    });
  }

  filtered(): Invoice[] {
    let list = this.allInvoices().filter(inv => {
      const q = this.search.toLowerCase();
      if (q && !inv.invoiceNumber.toLowerCase().includes(q) &&
               !inv.customerFullName.toLowerCase().includes(q)) return false;
      if (this.statusFilter && inv.status !== this.statusFilter) return false;
      if (this.dateFrom && inv.invoiceDate < this.dateFrom) return false;
      if (this.dateTo   && inv.invoiceDate > this.dateTo)   return false;
      return true;
    });
    const col = this.sortCol as keyof Invoice;
    const dir = this.sortDir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[col] ?? "", bv = b[col] ?? "";
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  sort(col: string) {
    if (this.sortCol === col) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    else { this.sortCol = col; this.sortDir = "asc"; }
  }
  sortIcon(col: string): string {
    if (this.sortCol !== col) return "";
    return this.sortDir === "asc" ? " ▲" : " ▼";
  }

  clearFilters() {
    this.search = ""; this.statusFilter = "";
    this.dateFrom = ""; this.dateTo = "";
  }

  isOverdue(inv: Invoice): boolean {
    if (!inv.dueDate || inv.status === "PAID" || inv.status === "VOID") return false;
    return inv.balanceDue > 0 && inv.dueDate < new Date().toISOString().slice(0, 10);
  }

  statusClass(s: string) { return STATUS_CLASS[s] ?? "badge-neutral"; }
  statusLabel(s: string) { return STATUS_LABEL[s] ?? s; }

  fmtName(full: string): string {
    if (!full) return "—";
    const parts = full.trim().split(/\s+/);
    if (parts.length < 2) return full;
    const last  = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(" ");
    return `${last}, ${first}`;
  }

  linesSummary(inv: Invoice): string {
    if (!inv.lineItems?.length) return "—";
    return inv.lineItems.map(l => l.description).join(", ");
  }

  // ── Detail view ───────────────────────────────────────────────────────────────
  newInvoice() {
    this.editInv.set(null);
    this.detDate   = new Date().toISOString().slice(0, 10);
    this.detDue    = "";
    this.detNotes  = "";
    this.detPaid   = 0;
    this.discType  = "NONE";
    this.discValue = 0;
    this.lines     = [];
    this.selCust.set(null);
    this.custCtrl.setValue("", { emitEvent: false });
    this.payHistory.set([]);
    this.detError.set("");
    this.recalc();
    this.showDetail.set(true);
  }

  editInvoice(inv: Invoice) {
    this.editInv.set(inv);
    this.detDate   = inv.invoiceDate;
    this.detDue    = inv.dueDate ?? "";
    this.detNotes  = inv.notes ?? "";
    this.detPaid   = inv.paidAmount ?? 0;
    this.discType  = inv.discountType || "NONE";
    this.discValue = inv.discountValue || 0;
    this.lines     = (inv.lineItems ?? []).map(l => ({
      description: l.description,
      chargeCode:  l.chargeCode ?? "",
      quantity:    l.quantity,
      unitPrice:   l.unitPrice,
    }));
    this.custCtrl.setValue(inv.customerFullName, { emitEvent: false });
    this.selCust.set({
      id: inv.customerId,
      firstName: "", lastName: inv.customerFullName,
      active: true, consentOnFile: false
    } as any);
    this.detError.set("");
    this.payAmt  = inv.balanceDue > 0 ? inv.balanceDue : 0;
    this.payRef  = "";
    this.payError.set("");
    this.recalc();
    this.loadPaymentHistory(inv.id);
    this.showDetail.set(true);
  }

  backToList() {
    this.showDetail.set(false);
    this.loadInvoices();
  }

  custAddress(): string {
    const c = this.selCust();
    if (!c) return "";
    return [c.address1, c.city, c.state, c.zip]
      .filter(v => v != null && v !== "")
      .join(", ");
  }

  // ── Customer ─────────────────────────────────────────────────────────────────
  onCustBlur() { setTimeout(() => this.showCustDrop.set(false), 200); }
  selectCustomer(c: Customer) {
    this.selCust.set(c);
    this.custCtrl.setValue(`${c.lastName}, ${c.firstName}`, { emitEvent: false });
    this.showCustDrop.set(false);
    this.custResults.set([]);
  }

  // ── Line items ────────────────────────────────────────────────────────────────
  addLine() {
    this.lines.push({ description: "", chargeCode: "", quantity: 1, unitPrice: 0 });
  }
  removeLine(i: number) { this.lines.splice(i, 1); this.recalc(); }

  onLineDescInput(i: number, q: string) {
    if (!q || q.length < 2) { this.vtSuggestions.set([]); return; }
    const ql = q.toLowerCase();
    this.vtSuggestions.set(
      this.visitTypes.filter(vt => vt.name.toLowerCase().includes(ql)).slice(0, 6)
    );
  }

  onLineBlur() { setTimeout(() => { this.vtSuggestions.set([]); this.activeLineIdx = -1; }, 200); }

  applyVtToLine(i: number, vt: VisitType) {
    this.lines[i].description = vt.name;
    this.lines[i].unitPrice   = vt.defaultPrice ?? 0;
    this.lines[i].chargeCode  = (vt as any).chargeCodeStr ?? "";
    this.vtSuggestions.set([]);
    this.activeLineIdx = -1;
    this.recalc();
  }

  recalc() {
    this.gross    = this.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    this.discount = this.discType === "PCT"  ? this.gross * this.discValue / 100
                  : this.discType === "FLAT" ? Math.min(this.discValue, this.gross)
                  : 0;
    this.net      = Math.max(0, this.gross - this.discount);
  }

  // ── Save invoice ─────────────────────────────────────────────────────────────
  saveInvoice() {
    if (!this.selCust()?.id) { this.detError.set("Select a customer."); return; }
    const valid = this.lines.filter(l => l.description.trim());
    if (!valid.length) { this.detError.set("Add at least one line item."); return; }

    this.saving.set(true);
    this.detError.set("");

    const payload: any = {
      customerId:    this.selCust()!.id,
      dueDate:       this.detDue || null,
      discountType:  this.discType,
      discountValue: this.discValue,
      notes:         this.detNotes,
      lineItems:     valid.map(l => ({
        description: l.description,
        chargeCode:  l.chargeCode || null,
        quantity:    l.quantity,
        unitPrice:   l.unitPrice,
        totalPrice:  l.quantity * l.unitPrice,
      })),
    };

    const req = this.editInv()
      ? this.billSvc.updateInvoice(this.editInv()!.id, payload)
      : this.billSvc.createInvoice(payload);

    req.subscribe({
      next: (saved: Invoice) => {
        this.saving.set(false);
        this.editInv.set(saved);
        this.detPaid   = saved.paidAmount ?? 0;
        this.payAmt    = saved.balanceDue > 0 ? saved.balanceDue : 0;
        this.snack.open("Invoice saved.", "×", { duration: 2500 });
      },
      error: e => {
        this.saving.set(false);
        this.detError.set(e.error?.message ?? "Could not save invoice.");
      }
    });
  }

  // ── Void ─────────────────────────────────────────────────────────────────────
  voidConfirm(inv: Invoice) {
    if (!confirm(`Void invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    this.billSvc.voidInvoice(inv.id).subscribe({
      next: () => {
        this.snack.open("Invoice voided.", "×", { duration: 2500 });
        if (this.showDetail()) {
          this.billSvc.getInvoice(inv.id).subscribe(fresh => {
            this.editInv.set(fresh);
          });
        }
        this.loadInvoices();
      },
      error: e => this.snack.open(e.error?.message ?? "Could not void invoice.", "×", { duration: 3500 })
    });
  }

  // ── Payment history ───────────────────────────────────────────────────────────
  loadPaymentHistory(invId: number) {
    this.http.get<any[]>(`${environment.apiUrl}/payments?invoiceId=${invId}`)
      .pipe(catchError(() => of([])))
      .subscribe(p => this.payHistory.set(p));
  }

  // ── Inline quick pay (detail view) ───────────────────────────────────────────
  postPayment() {
    if (!this.payAmt || this.payAmt <= 0) { this.payError.set("Enter a valid amount."); return; }
    this.paySaving.set(true);
    this.payError.set("");
    this.billSvc.postPayment({
      customerId:  this.selCust()?.id ?? this.editInv()?.customerId,
      invoiceIds:  [this.editInv()!.id],
      amount:      this.payAmt,
      method:      this.payMethod,
      reference:   this.payRef,
      paymentDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.paySaving.set(false);
        this.snack.open("Payment posted.", "×", { duration: 2500 });
        this.payRef = "";
        this.billSvc.getInvoice(this.editInv()!.id).subscribe(fresh => {
          this.editInv.set(fresh);
          this.detPaid = fresh.paidAmount ?? 0;
          this.payAmt  = fresh.balanceDue > 0 ? fresh.balanceDue : 0;
          this.loadPaymentHistory(fresh.id);
        });
      },
      error: e => {
        this.paySaving.set(false);
        this.payError.set(e.error?.message ?? "Payment failed.");
      }
    });
  }

  // ── Quick pay modal (from list view) ─────────────────────────────────────────
  openQuickPay(inv: Invoice) {
    this.payModalInv.set(inv);
    this.payAmt    = inv.balanceDue > 0 ? inv.balanceDue : 0;
    this.payMethod = "CARD";
    this.payRef    = "";
    this.payError.set("");
    this.showPayModal.set(true);
  }

  postPaymentFromModal() {
    const inv = this.payModalInv();
    if (!inv) return;
    if (!this.payAmt || this.payAmt <= 0) { this.payError.set("Enter a valid amount."); return; }
    this.paySaving.set(true);
    this.payError.set("");
    this.billSvc.postPayment({
      customerId:  inv.customerId,
      invoiceIds:  [inv.id],
      amount:      this.payAmt,
      method:      this.payMethod,
      reference:   this.payRef,
      paymentDate: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.paySaving.set(false);
        this.showPayModal.set(false);
        this.snack.open("Payment posted.", "×", { duration: 2500 });
        this.loadInvoices();
      },
      error: e => {
        this.paySaving.set(false);
        this.payError.set(e.error?.message ?? "Payment failed.");
      }
    });
  }

  // ── Print ─────────────────────────────────────────────────────────────────────
  printInvoice(inv: Invoice) {
    const lineRows = (inv.lineItems ?? []).map(l =>
      `<tr>
         <td style="padding:7px 10px;">${l.description}</td>
         <td style="padding:7px 10px;text-align:center;">${l.quantity}</td>
         <td style="padding:7px 10px;text-align:right;">
           ${(l.unitPrice).toLocaleString("en-US",{style:"currency",currency:"USD"})}
         </td>
         <td style="padding:7px 10px;text-align:right;font-weight:600;">
           ${(l.totalPrice).toLocaleString("en-US",{style:"currency",currency:"USD"})}
         </td>
       </tr>`
    ).join("");

    const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
    const w = window.open("", "_blank")!;
    w.document.write(`<!DOCTYPE html><html>
<head><title>Invoice ${inv.invoiceNumber}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Georgia, serif; color:#2a2a2a; padding:40px; max-width:700px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; }
  .brand { font-size:24px; font-weight:700; color:#1a4a3a; letter-spacing:-.02em; }
  .brand-sub { font-size:12px; color:#7a7a7a; margin-top:2px; }
  .inv-meta { text-align:right; font-size:13px; }
  .inv-num { font-size:22px; font-weight:700; color:#1a4a3a; }
  .status-pill { display:inline-block; padding:3px 12px; border-radius:20px;
                 font-size:11px; font-weight:700; text-transform:uppercase;
                 background:#e8f2ee; color:#1a4a3a; margin-top:4px; }
  .divider { border:none; border-top:2px solid #e8dfd6; margin:20px 0; }
  .bill-block { display:flex; justify-content:space-between; margin-bottom:20px; font-size:13px; }
  .bill-to { }
  .bill-to .label { font-size:10px; font-weight:700; text-transform:uppercase;
                    letter-spacing:.1em; color:#7a7a7a; margin-bottom:6px; }
  .bill-to .name { font-size:16px; font-weight:700; color:#1a4a3a; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead tr { background:#e8f2ee; }
  thead th { padding:9px 10px; text-align:left; font-size:11px;
             font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#1a4a3a; }
  thead th:nth-child(2) { text-align:center; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align:right; }
  tbody tr:nth-child(even) { background:#fafaf8; }
  tbody tr { border-bottom:1px solid #e8dfd6; }
  .totals-table { margin-left:auto; width:280px; margin-top:16px; font-size:13px; }
  .totals-table td { padding:5px 10px; }
  .totals-table .td-lbl { color:#7a7a7a; }
  .totals-table .td-val { text-align:right; font-weight:600; }
  .totals-table .net-row td { font-size:16px; font-weight:700; color:#1a4a3a;
                               border-top:2px solid #1a4a3a; padding-top:9px; }
  .totals-table .bal-row td { font-size:16px; font-weight:700; color:#c0392b; }
  .totals-table .paid-row td { color:#27ae60; }
  .notes-block { margin-top:24px; font-size:12px; color:#7a7a7a; }
  .footer { margin-top:32px; text-align:center; font-size:11px; color:#7a7a7a;
            border-top:1px solid #e8dfd6; padding-top:14px; }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="brand">✿ Your Own CRM</div>
      <div class="brand-sub">Wellness & Spa Management</div>
    </div>
    <div class="inv-meta">
      <div class="inv-num">Invoice #${inv.invoiceNumber}</div>
      <div style="font-size:12px;color:#7a7a7a;margin-top:4px;">
        Date: ${inv.invoiceDate}
        ${inv.dueDate ? `&nbsp;·&nbsp; Due: ${inv.dueDate}` : ""}
      </div>
      <div class="status-pill">${STATUS_LABEL[inv.status] ?? inv.status}</div>
    </div>
  </div>
  <div class="bill-block">
    <div class="bill-to">
      <div class="label">Bill To</div>
      <div class="name">${inv.customerFullName}</div>
      ${inv.customerPhone ? `<div style="font-size:12px;color:#7a7a7a;">${inv.customerPhone}</div>` : ""}
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Description</th><th style="text-align:center;">Qty</th>
      <th style="text-align:right;">Unit Price</th>
      <th style="text-align:right;">Total</th>
    </tr></thead>
    <tbody>${lineRows}</tbody>
  </table>
  <table class="totals-table">
    <tr><td class="td-lbl">Subtotal</td><td class="td-val">${fmt(inv.grossAmount)}</td></tr>
    ${inv.discountValue > 0 ? `<tr><td class="td-lbl">Discount</td><td class="td-val" style="color:#27ae60;">− ${fmt(inv.discountValue)}</td></tr>` : ""}
    <tr class="net-row"><td class="td-lbl">Net Total</td><td class="td-val">${fmt(inv.netAmount)}</td></tr>
    ${inv.paidAmount > 0 ? `<tr class="paid-row"><td class="td-lbl">Paid</td><td class="td-val">${fmt(inv.paidAmount)}</td></tr>` : ""}
    <tr class="bal-row"><td class="td-lbl">Balance Due</td><td class="td-val">${fmt(inv.balanceDue)}</td></tr>
  </table>
  ${inv.notes ? `<div class="notes-block"><strong>Notes:</strong> ${inv.notes}</div>` : ""}
  <div class="footer">Thank you for choosing Your Own CRM — we appreciate your business.</div>
  <script>window.onload = () => window.print();</script>
</body></html>`);
    w.document.close();
  }
}
