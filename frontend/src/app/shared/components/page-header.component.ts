import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-page-header",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">{{ title }}</div>
        <div class="page-subtitle">{{ subtitle }}</div>
      </div>
      @if (btnLabel) {
        <button class="btn btn-primary" (click)="btnClick.emit()">{{ btnLabel }}</button>
      }
    </div>
  `
})
export class PageHeaderComponent {
  @Input() title = "";
  @Input() subtitle = "";
  @Input() btnLabel = "";
  @Output() btnClick = new EventEmitter<void>();
}
