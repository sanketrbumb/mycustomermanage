import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

/**
 * Structural directive that removes DOM elements when the user lacks permission.
 *
 * Usage:
 *   *hasPermission="'BILLING_VIEW'"                → single permission
 *   *hasPermission="['INVOICE_CREATE','INVOICE_VOID']"  → any of these (OR)
 *
 * Unlike [hidden] or *ngIf with a manual check, this directive:
 * - Completely removes the element from the DOM (not just hidden)
 * - Reads from AuthService so it's always in sync with the loaded user
 * - Works anywhere in any component without injecting AuthService manually
 *
 * Example:
 *   <button *hasPermission="'USER_MANAGE'" (click)="openUserAdmin()">
 *     Manage Staff
 *   </button>
 *
 *   <div *hasPermission="['REPORT_VIEW']" class="reports-section">
 *     ...
 *   </div>
 */
@Directive({
  selector: "[hasPermission]",
  standalone: true,
})
export class HasPermissionDirective implements OnInit {

  @Input("hasPermission") permission!: string | string[];

  private auth     = inject(AuthService);
  private template = inject(TemplateRef<any>);
  private vcr      = inject(ViewContainerRef);

  ngOnInit() {
    const permissions = Array.isArray(this.permission)
      ? this.permission
      : [this.permission];

    if (this.auth.canAny(...permissions)) {
      this.vcr.createEmbeddedView(this.template);
    } else {
      this.vcr.clear();
    }
  }
}

/**
 * Inverse directive — shows content when the user LACKS a permission.
 * Useful for "upgrade required" banners and locked-feature placeholders.
 *
 * Usage:
 *   <div *lacksPermission="'REPORT_VIEW'" class="upgrade-prompt">
 *     Upgrade to access reports
 *   </div>
 */
@Directive({
  selector: "[lacksPermission]",
  standalone: true,
})
export class LacksPermissionDirective implements OnInit {

  @Input("lacksPermission") permission!: string | string[];

  private auth     = inject(AuthService);
  private template = inject(TemplateRef<any>);
  private vcr      = inject(ViewContainerRef);

  ngOnInit() {
    const permissions = Array.isArray(this.permission)
      ? this.permission
      : [this.permission];

    if (!this.auth.canAny(...permissions)) {
      this.vcr.createEmbeddedView(this.template);
    } else {
      this.vcr.clear();
    }
  }
}
