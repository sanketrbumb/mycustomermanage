import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { environment } from "../../../../environments/environment";
import { catchError, of } from "rxjs";

interface Role {
  id: number;
  name: string;
  description: string;
  systemRole: boolean;
  permissions: string[];
  userCount: number;
}

interface PermissionGroup {
  category: string;
  permissions: string[];
}

const PERMISSION_LABELS: Record<string, string> = {
  SCHEDULE_VIEW:           "View schedule",
  APPOINTMENT_VIEW_ANY:    "View any appointment",
  APPOINTMENT_VIEW_OWN:    "View own appointments only",
  APPOINTMENT_CREATE:      "Book appointments",
  APPOINTMENT_EDIT_ANY:    "Edit any appointment",
  APPOINTMENT_EDIT_OWN:    "Edit own appointments only",
  APPOINTMENT_CANCEL:      "Cancel appointments",
  BILLING_VIEW:            "View billing & invoices",
  INVOICE_CREATE:          "Create & edit invoices",
  INVOICE_VOID:            "Void invoices",
  PAYMENT_COLLECT:         "Collect payments (any)",
  PAYMENT_COLLECT_OWN:     "Collect payments (own appts only)",
  REFUND_ISSUE:            "Issue refunds",
  CUSTOMER_VIEW:           "View customers",
  CUSTOMER_CREATE:         "Add new customers",
  CUSTOMER_EDIT:           "Edit customer details",
  USER_VIEW:               "View staff list",
  USER_CREATE:             "Add new staff accounts",
  USER_EDIT:               "Edit staff details & passwords",
  USER_DEACTIVATE:         "Deactivate / reactivate staff",
  RESOURCE_MANAGE:         "Manage resources & hours",
  LOCATION_MANAGE:         "Manage locations",
  VISIT_TYPE_MANAGE:       "Manage visit types & statuses",
  SETTINGS_VIEW:           "View settings",
  SETTINGS_EDIT:           "Edit org settings",
  REPORT_VIEW:             "Access reports",
  SUBSCRIPTION_MANAGE:     "Manage subscription & billing",
};

@Component({
  selector: "app-roles",
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="roles-layout">
      <!-- ── Left: role list ────────────────────────────────────────────── -->
      <div class="role-list-panel">
        <div class="panel-header">
          <span class="panel-title">Roles</span>
          <button class="btn btn-primary btn-sm" (click)="openCreate()">+ New Role</button>
        </div>

        @for (role of roles(); track role.id) {
          <div class="role-row"
               [class.active]="selectedRole()?.id === role.id"
               (click)="selectRole(role)">
            <div class="role-row-name">
              {{ role.name }}
              @if (role.systemRole) {
                <span class="badge badge-system">built-in</span>
              }
            </div>
            <div class="role-row-meta">
              {{ role.userCount }} user{{ role.userCount !== 1 ? "s" : "" }} ·
              {{ role.permissions.length }} permission{{ role.permissions.length !== 1 ? "s" : "" }}
            </div>
          </div>
        }

        @if (!roles().length && !loading()) {
          <div class="empty-hint">No roles yet.</div>
        }
      </div>

      <!-- ── Right: permission editor ──────────────────────────────────── -->
      <div class="perm-panel">
        @if (!selectedRole()) {
          <div class="perm-empty">
            <div class="perm-empty-icon">🔐</div>
            <div>Select a role to view and edit its permissions</div>
          </div>
        }

        @if (selectedRole()) {
          <div class="perm-header">
            <div>
              <div class="perm-role-name">{{ selectedRole()!.name }}</div>
              <div class="perm-role-desc">{{ selectedRole()!.description || "No description" }}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              @if (!selectedRole()!.systemRole) {
                <button class="btn btn-ghost btn-sm" (click)="openEdit(selectedRole()!)">Edit</button>
                <button class="btn btn-ghost btn-sm danger-btn"
                        [disabled]="selectedRole()!.userCount > 0"
                        [title]="selectedRole()!.userCount > 0 ? 'Move users to another role first' : 'Delete role'"
                        (click)="deleteRole(selectedRole()!)">Delete</button>
              }
              <button class="btn btn-primary btn-sm"
                      (click)="savePermissions()"
                      [disabled]="saving()">
                {{ saving() ? "Saving…" : "Save Permissions" }}
              </button>
            </div>
          </div>

          @if (selectedRole()!.systemRole) {
            <div class="system-note">
              Built-in role — name is fixed but permissions can be adjusted.
            </div>
          }

          <!-- Select All General Checkbox -->
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--stone-mid); background: var(--stone); display: flex; align-items: center; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none; margin: 0; color: var(--jade);">
              <input type="checkbox"
                     [checked]="isAllSelected()"
                     [indeterminate]="isSomeButNotAllSelected()"
                     (change)="toggleSelectAll($event)"
                     style="accent-color: var(--jade); width: 15px; height: 15px; cursor: pointer;"/>
              Select All Permissions
            </label>
          </div>

          <!-- Permission groups -->
          <div class="perm-groups">
            @for (group of permissionGroups(); track group.category) {
              <div class="perm-group">
                <div class="perm-group-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <span>{{ group.category }}</span>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: none; font-weight: 600; cursor: pointer; user-select: none; margin: 0; color: var(--ink-mid);">
                    <input type="checkbox"
                           [checked]="isCategoryAllSelected(group)"
                           [indeterminate]="isCategorySomeSelected(group)"
                           (change)="toggleCategory(group, $event)"
                           style="accent-color: var(--jade); width: 13px; height: 13px; cursor: pointer;"/>
                    Select All in {{ group.category }}
                  </label>
                </div>
                @for (perm of group.permissions; track perm) {
                  <label class="perm-row">
                    <input type="checkbox"
                           [checked]="draftPerms().has(perm)"
                           (change)="togglePerm(perm, $event)"/>
                    <div class="perm-info">
                      <div class="perm-label">{{ label(perm) }}</div>
                      <div class="perm-code">{{ perm }}</div>
                    </div>
                  </label>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ── Create / Edit Role Modal ──────────────────────────────────── -->
    @if (showModal()) {
      <div class="crm-overlay">
        <div class="crm-modal" style="max-width:460px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingRole() ? "Edit Role" : "Create Role" }}</h3>
            <button class="close-btn" (click)="showModal.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Role Name *</label>
              <input class="form-control" [(ngModel)]="formName"
                     [disabled]="editingRole()?.systemRole ?? false"
                     placeholder="e.g. Auditor, Summer Intern, Read-Only"/>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-control" [(ngModel)]="formDesc" rows="2"
                        placeholder="What can this role do?"></textarea>
            </div>
            @if (modalError()) {
              <div class="err-alert">{{ modalError() }}</div>
            }
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="showModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveRole()" [disabled]="saving()">
              {{ saving() ? "Saving…" : (editingRole() ? "Update" : "Create Role") }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .roles-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 16px;
      min-height: 500px;
    }

    /* Role list */
    .role-list-panel {
      background: #fff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--stone-mid);
      overflow: hidden;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: 1px solid var(--stone-mid);
    }
    .panel-title { font-weight: 700; font-size: 13px; color: var(--jade); }
    .role-row {
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid var(--stone-mid);
      transition: background .12s;
    }
    .role-row:hover { background: var(--jade-mist); }
    .role-row.active { background: var(--jade-mist); border-left: 3px solid var(--jade); }
    .role-row-name { font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .role-row-meta { font-size: 11px; color: var(--ink-light); margin-top: 2px; }
    .badge-system {
      font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      padding: 1px 5px; border-radius: 4px;
      background: var(--stone); color: var(--ink-light);
    }
    .empty-hint { padding: 20px; font-size: 13px; color: var(--ink-light); text-align: center; }

    /* Permission panel */
    .perm-panel {
      background: #fff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--stone-mid);
      overflow: hidden;
    }
    .perm-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: var(--ink-light);
      font-size: 14px;
      padding: 60px;
    }
    .perm-empty-icon { font-size: 40px; }
    .perm-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 18px;
      border-bottom: 1px solid var(--stone-mid);
      gap: 12px;
    }
    .perm-role-name { font-size: 16px; font-weight: 700; color: var(--jade); }
    .perm-role-desc { font-size: 12px; color: var(--ink-light); margin-top: 2px; }

    .system-note {
      padding: 8px 18px;
      font-size: 12px;
      color: var(--ink-light);
      background: var(--stone);
      border-bottom: 1px solid var(--stone-mid);
    }

    .perm-groups { padding: 16px 18px; display: flex; flex-direction: column; gap: 20px; }
    .perm-group { }
    .perm-group-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .07em; color: var(--jade);
      padding-bottom: 6px; margin-bottom: 8px;
      border-bottom: 1.5px solid var(--jade-mist);
    }
    .perm-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 6px 0;
      cursor: pointer;
      border-radius: var(--radius);
    }
    .perm-row:hover { background: var(--stone); padding-left: 4px; }
    .perm-row input[type="checkbox"] { margin-top: 2px; accent-color: var(--jade); width: 14px; height: 14px; flex-shrink: 0; }
    .perm-info { flex: 1; }
    .perm-label { font-size: 13px; color: var(--ink); }
    .perm-code { font-size: 10px; color: var(--ink-light); font-family: monospace; margin-top: 1px; }

    .danger-btn { color: var(--danger) !important; }
    .danger-btn:disabled { opacity: .4; cursor: not-allowed; }
    .err-alert { padding: 10px 14px; border-radius: var(--radius); background: #fde8e6; color: #9a1f17; font-size: 13px; }
  `]
})
export class RolesComponent implements OnInit {
  roles       = signal<Role[]>([]);
  selectedRole = signal<Role | null>(null);
  draftPerms  = signal<Set<string>>(new Set());
  loading     = signal(false);
  saving      = signal(false);

  showModal   = signal(false);
  editingRole = signal<Role | null>(null);
  formName    = "";
  formDesc    = "";
  modalError  = signal("");

  permissionGroups = signal<PermissionGroup[]>([]);

  allPermissions = computed(() => {
    return this.permissionGroups().reduce((acc, g) => [...acc, ...g.permissions], [] as string[]);
  });

  isAllSelected(): boolean {
    const all = this.allPermissions();
    if (all.length === 0) return false;
    const draft = this.draftPerms();
    return all.every(p => draft.has(p));
  }

  isSomeButNotAllSelected(): boolean {
    const all = this.allPermissions();
    if (all.length === 0) return false;
    const draft = this.draftPerms();
    const count = all.filter(p => draft.has(p)).length;
    return count > 0 && count < all.length;
  }

  toggleSelectAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const all = this.allPermissions();
    if (checked) {
      this.draftPerms.set(new Set(all));
    } else {
      this.draftPerms.set(new Set());
    }
  }

  isCategoryAllSelected(group: PermissionGroup): boolean {
    const draft = this.draftPerms();
    if (group.permissions.length === 0) return false;
    return group.permissions.every(p => draft.has(p));
  }

  isCategorySomeSelected(group: PermissionGroup): boolean {
    const draft = this.draftPerms();
    if (group.permissions.length === 0) return false;
    const count = group.permissions.filter(p => draft.has(p)).length;
    return count > 0 && count < group.permissions.length;
  }

  toggleCategory(group: PermissionGroup, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.draftPerms());
    group.permissions.forEach(p => {
      if (checked) {
        current.add(p);
      } else {
        current.delete(p);
      }
    });
    this.draftPerms.set(current);
  }

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() {
    this.load();
    this.loadPermissionGroups();
  }

  load() {
    this.loading.set(true);
    this.http.get<Role[]>(`${environment.apiUrl}/roles`)
      .pipe(catchError(() => of([])))
      .subscribe(r => { this.roles.set(r); this.loading.set(false); });
  }

  loadPermissionGroups() {
    this.http.get<Record<string, string[]>>(`${environment.apiUrl}/roles/permissions`)
      .pipe(catchError(() => of({})))
      .subscribe(grouped => {
        this.permissionGroups.set(
          Object.entries(grouped).map(([category, permissions]) => ({ category, permissions }))
        );
      });
  }

  selectRole(role: Role) {
    this.selectedRole.set(role);
    this.draftPerms.set(new Set(role.permissions));
  }

  togglePerm(perm: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.draftPerms());
    checked ? current.add(perm) : current.delete(perm);
    this.draftPerms.set(current);
  }

  savePermissions() {
    const role = this.selectedRole();
    if (!role) return;
    this.saving.set(true);
    this.http.put<Role>(`${environment.apiUrl}/roles/${role.id}/permissions`,
      Array.from(this.draftPerms()))
      .subscribe({
        next: updated => {
          this.saving.set(false);
          this.roles.update(list => list.map(r => r.id === updated.id ? updated : r));
          this.selectedRole.set(updated);
          this.draftPerms.set(new Set(updated.permissions));
          this.snack.open("Permissions saved.", "×", { duration: 2500 });
        },
        error: e => {
          this.saving.set(false);
          this.snack.open(e.error?.message ?? "Could not save.", "×", { duration: 3000 });
        }
      });
  }

  openCreate() {
    this.editingRole.set(null);
    this.formName = "";
    this.formDesc = "";
    this.modalError.set("");
    this.showModal.set(true);
  }

  openEdit(role: Role) {
    this.editingRole.set(role);
    this.formName = role.name;
    this.formDesc = role.description || "";
    this.modalError.set("");
    this.showModal.set(true);
  }

  saveRole() {
    if (!this.formName.trim()) { this.modalError.set("Name is required."); return; }
    this.saving.set(true);
    this.modalError.set("");
    const editing = this.editingRole();
    const req = editing
      ? this.http.put<Role>(`${environment.apiUrl}/roles/${editing.id}`,
          { name: this.formName, description: this.formDesc })
      : this.http.post<Role>(`${environment.apiUrl}/roles`,
          { name: this.formName, description: this.formDesc, permissions: [] });

    req.subscribe({
      next: role => {
        this.saving.set(false);
        this.showModal.set(false);
        this.load();
        if (!editing) this.selectRole(role);
        this.snack.open(editing ? "Role updated." : "Role created.", "×", { duration: 2500 });
      },
      error: e => {
        this.saving.set(false);
        this.modalError.set(e.error?.message ?? "Could not save role.");
      }
    });
  }

  deleteRole(role: Role) {
    if (role.userCount > 0) return;
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    this.http.delete(`${environment.apiUrl}/roles/${role.id}`)
      .subscribe({
        next: () => {
          if (this.selectedRole()?.id === role.id) this.selectedRole.set(null);
          this.load();
          this.snack.open("Role deleted.", "×", { duration: 2500 });
        },
        error: e => this.snack.open(e.error?.message ?? "Could not delete.", "×", { duration: 3000 })
      });
  }

  label(perm: string): string {
    return PERMISSION_LABELS[perm] ?? perm.replace(/_/g, " ").toLowerCase();
  }
}
