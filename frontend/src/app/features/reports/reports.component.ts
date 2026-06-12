import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { BillingService } from "../../core/services/billing.service";
import { ReportSummary } from "../../shared/models/invoice.model";

@Component({
  selector: "app-reports",
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonToggleModule,
            MatButtonModule, MatIconModule, MatProgressBarModule,
            MatTableModule, MatTooltipModule],
  template: `
    <div class="reports-page">
      <div class="page-header-bar">
        <div>
          <div class="page-title">Reports</div>
          <div class="page-subtitle">Financial performance and resource utilization</div>
        </div>
        <div class="toolbar-right">
          <mat-button-toggle-group [(ngModel)]="mode" (change)="load()">
            <mat-button-toggle value="DAILY">Day</mat-button-toggle>
            <mat-button-toggle value="MONTHLY">Month</mat-button-toggle>
            <mat-button-toggle value="YTD">YTD</mat-button-toggle>
          </mat-button-toggle-group>

          @if (mode === "DAILY") {
            <input type="date" [(ngModel)]="selectedDate" (change)="load()" class="date-input"/>
          }
          @if (mode === "MONTHLY") {
            <select [(ngModel)]="selectedMonth" (change)="load()" class="sel-input">
              @for (m of months; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
            <select [(ngModel)]="selectedYear" (change)="load()" class="sel-input">
              @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
            </select>
          }
          @if (mode === "YTD") {
            <select [(ngModel)]="selectedYear" (change)="load()" class="sel-input">
              @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
            </select>
          }
        </div>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate"/> }

      @if (report()) {
        <div class="kpi-row">
          <div class="kpi-card jade">
            <div class="kpi-icon"><mat-icon>calendar_today</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.totalAppointments }}</div>
              <div class="kpi-label">Total Appointments</div>
            </div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.completedAppointments }}</div>
              <div class="kpi-label">Completed</div>
              <div class="kpi-sub">{{ report()!.completionRate | number:"1.0-1" }}% rate</div>
            </div>
          </div>
          <div class="kpi-card red">
            <div class="kpi-icon"><mat-icon>cancel</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.cancelledAppointments }}</div>
              <div class="kpi-label">Cancelled</div>
            </div>
          </div>
          <div class="kpi-card gold">
            <div class="kpi-icon"><mat-icon>attach_money</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.grossBilled | currency }}</div>
              <div class="kpi-label">Gross Billed</div>
            </div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-icon"><mat-icon>payments</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.totalCollected | currency }}</div>
              <div class="kpi-label">Collected</div>
            </div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-icon"><mat-icon>pending</mat-icon></div>
            <div class="kpi-body">
              <div class="kpi-value">{{ report()!.outstanding | currency }}</div>
              <div class="kpi-label">Outstanding</div>
            </div>
          </div>
        </div>

        <div class="charts-row">
          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Revenue by visit type</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (revenueEntries().length) {
                <div class="bar-chart">
                  @for (entry of revenueEntries(); track entry.label) {
                    <div class="bar-row">
                      <div class="bar-label">{{ entry.label }}</div>
                      <div class="bar-track">
                        <div class="bar-fill"
                             [style.width.%]="entry.pct"
                             [title]="(entry.value | currency) ?? ''">
                        </div>
                      </div>
                      <div class="bar-value">{{ entry.value | currency }}</div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-chart">No revenue data for this period.</div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card class="chart-card">
            <mat-card-header><mat-card-title>Appointments by status</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (statusEntries().length) {
                <div class="donut-legend">
                  @for (entry of statusEntries(); track entry.label) {
                    <div class="legend-row">
                      <span class="legend-dot" [style.background]="entry.color"></span>
                      <span class="legend-label">{{ entry.label }}</span>
                      <span class="legend-val">{{ entry.value }}</span>
                      <div class="mini-bar">
                        <div class="mini-fill"
                             [style.width.%]="entry.pct"
                             [style.background]="entry.color"></div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-chart">No appointment data.</div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="util-card">
          <mat-card-header><mat-card-title>Resource utilization</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (report()!.resourceUtilization && report()!.resourceUtilization.length) {
              <table mat-table [dataSource]="report()!.resourceUtilization">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Resource / Staff</th>
                  <td mat-cell *matCellDef="let r"><strong>{{ r.entityName }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let r">{{ r.entityType }}</td>
                </ng-container>
                <ng-container matColumnDef="count">
                  <th mat-header-cell *matHeaderCellDef>Appointments</th>
                  <td mat-cell *matCellDef="let r">{{ r.appointmentCount }}</td>
                </ng-container>
                <ng-container matColumnDef="minutes">
                  <th mat-header-cell *matHeaderCellDef>Total Time</th>
                  <td mat-cell *matCellDef="let r">{{ r.totalMinutes }} min</td>
                </ng-container>
                <ng-container matColumnDef="bar">
                  <th mat-header-cell *matHeaderCellDef>Utilization</th>
                  <td mat-cell *matCellDef="let r">
                    <div class="util-bar-track">
                      <div class="util-bar-fill" [style.width.%]="utilPct(r.totalMinutes)"></div>
                    </div>
                    <span class="util-pct">{{ utilPct(r.totalMinutes) | number:"1.0-0" }}%</span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="utilCols"></tr>
                <tr mat-row *matRowDef="let r; columns: utilCols;"></tr>
              </table>
            } @else {
              <div class="empty-chart">No utilization data for this period.</div>
            }
          </mat-card-content>
        </mat-card>
      } @else if (!loading()) {
        <div class="empty-report">
          <mat-icon>bar_chart</mat-icon>
          <p>Select a reporting period above to view data.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-page { padding: 24px; overflow-y: auto; height: 100%; }
    .page-header-bar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
    }
    .toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .date-input, .sel-input {
      border: 1px solid var(--stone-dark, #c8bdb4);
      border-radius: 6px; padding: 6px 10px; font-size: 13px; background: white;
    }
    .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .kpi-card {
      display: flex; align-items: center; gap: 12px;
      background: white; border-radius: 12px; padding: 16px 18px;
      box-shadow: 0 1px 6px rgba(0,0,0,.08); flex: 1 1 160px; min-width: 140px;
      border-left: 4px solid transparent;
    }
    .kpi-card.jade   { border-left-color: #1a4a3a; }
    .kpi-card.green  { border-left-color: #27ae60; }
    .kpi-card.red    { border-left-color: #c0392b; }
    .kpi-card.gold   { border-left-color: #c9a84c; }
    .kpi-card.blue   { border-left-color: #2980b9; }
    .kpi-card.orange { border-left-color: #e67e22; }
    .kpi-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: #7a7a7a; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #1a4a3a; }
    .kpi-label { font-size: 11px; color: #7a7a7a; font-weight: 600;
      text-transform: uppercase; letter-spacing: .04em; }
    .kpi-sub { font-size: 11px; color: #27ae60; margin-top: 2px; }
    .charts-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .chart-card { flex: 1 1 300px; }
    .bar-chart { padding: 8px 0; }
    .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .bar-label {
      width: 140px; font-size: 12px; text-align: right; color: #4a4a4a;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0;
    }
    .bar-track { flex: 1; background: #e8dfd6; border-radius: 4px; height: 16px; overflow: hidden; }
    .bar-fill  { height: 100%; background: #1a4a3a; border-radius: 4px; transition: width .4s; }
    .bar-value { width: 80px; font-size: 12px; font-weight: 700; color: #1a4a3a; }
    .empty-chart { color: #7a7a7a; font-size: 13px; text-align: center; padding: 24px; }
    .donut-legend { padding: 8px 0; }
    .legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .legend-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-label{ width: 120px; font-size: 12px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap; }
    .legend-val  { width: 32px; font-size: 12px; font-weight: 700; text-align: right; }
    .mini-bar    { flex: 1; height: 10px; background: #e8dfd6; border-radius: 5px; overflow: hidden; }
    .mini-fill   { height: 100%; border-radius: 5px; transition: width .4s; }
    .util-card   { margin-bottom: 16px; }
    .util-bar-track {
      display: inline-block; width: 120px; height: 10px;
      background: #e8dfd6; border-radius: 5px; overflow: hidden;
      vertical-align: middle; margin-right: 6px;
    }
    .util-bar-fill { height: 100%; border-radius: 5px; background: #1a4a3a; }
    .util-pct { font-size: 12px; font-weight: 700; color: #1a4a3a; }
    .empty-report { text-align: center; padding: 64px; color: #7a7a7a; }
    .empty-report mat-icon { font-size: 56px; width: 56px; height: 56px; display: block; margin: 0 auto 12px; }
  `]
})
export class ReportsComponent implements OnInit {
  mode          = "DAILY";
  selectedDate  = new Date().toISOString().slice(0, 10);
  selectedYear  = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;

  report   = signal<ReportSummary | null>(null);
  loading  = signal(false);
  utilCols = ["name", "type", "count", "minutes", "bar"];

  months = [
    { value: 1,  label: "January" },  { value: 2,  label: "February" },
    { value: 3,  label: "March" },    { value: 4,  label: "April" },
    { value: 5,  label: "May" },      { value: 6,  label: "June" },
    { value: 7,  label: "July" },     { value: 8,  label: "August" },
    { value: 9,  label: "September" },{ value: 10, label: "October" },
    { value: 11, label: "November" }, { value: 12, label: "December" },
  ];
  years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  private STATUS_COLORS: Record<string, string> = {
    Scheduled:   "#2980b9",
    "Checked In":"#27ae60",
    "In Progress":"#f39c12",
    Completed:   "#1a4a3a",
    Cancelled:   "#c0392b",
    "No Show":   "#7f8c8d",
  };

  constructor(private billingSvc: BillingService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    let req$;
    if      (this.mode === "DAILY")   req$ = this.billingSvc.getDailyReport(this.selectedDate);
    else if (this.mode === "MONTHLY") req$ = this.billingSvc.getMonthlyReport(this.selectedYear, this.selectedMonth);
    else                              req$ = this.billingSvc.getYtdReport(this.selectedYear);

    req$.subscribe({
      next:  r  => { this.report.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  revenueEntries() {
    const r = this.report();
    if (!r?.revenueByVisitType) return [];
    const entries = Object.entries(r.revenueByVisitType)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const max = entries[0]?.value || 1;
    return entries.map(e => ({ ...e, pct: (e.value / max) * 100 }));
  }

  statusEntries() {
    const r = this.report();
    if (!r?.appointmentsByStatus) return [];
    const entries = Object.entries(r.appointmentsByStatus)
      .map(([label, value]) => ({
        label, value,
        color: this.STATUS_COLORS[label] ?? "#7f8c8d"
      }))
      .sort((a, b) => b.value - a.value);
    const total = entries.reduce((s, e) => s + e.value, 0) || 1;
    return entries.map(e => ({ ...e, pct: (e.value / total) * 100 }));
  }

  utilPct(minutes: number): number {
    return Math.min((minutes / 480) * 100, 100);
  }
}
