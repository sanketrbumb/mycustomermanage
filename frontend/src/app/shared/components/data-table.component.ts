import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatProgressBarModule } from "@angular/material/progress-bar";

@Component({
  selector: "app-data-table",
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule],
  template: `
    @if (loading) { <mat-progress-bar mode="indeterminate"/> }
    <table mat-table [dataSource]="rows" class="crm-table">
      <ng-content/>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns;"
          (click)="rowClick.emit(row)" [class.selected]="row === selected"></tr>
    </table>
    @if (!rows.length && !loading) {
      <div class="empty-state">
        <mat-icon>inbox</mat-icon>
        <p>No records found.</p>
      </div>
    }
  `,
  styles: [\`
    .crm-table { width: 100%; }
    tr.mat-mdc-row:hover { background: var(--jade-mist); cursor: pointer; }
    tr.selected { background: var(--jade-mist) !important; }
    .empty-state { text-align: center; padding: 40px; color: var(--ink-light);
      mat-icon { font-size: 40px; width: 40px; height: 40px; } }
  \`]
})
export class DataTableComponent {
  @Input() rows: any[]    = [];
  @Input() columns: string[] = [];
  @Input() loading = false;
  @Input() selected: any = null;
  @Output() rowClick = new EventEmitter<any>();
}
