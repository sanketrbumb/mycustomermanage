import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { AdminService } from "../../../core/services/admin.service";
import { User, Location } from "../../../shared/models/admin.model";

@Component({
  selector: "app-staff-list",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Staff Members</div>
          <div class="page-subtitle">Manage accounts and access</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Add Staff</button>
      </div>

      <div class="filters">
        <input class="form-control" [(ngModel)]="search"
               placeholder="🔍 Search name or username…"
               style="width:240px;"/>
        <select class="form-control" [(ngModel)]="roleFilter" style="width:140px;">
          <option value="">All Roles</option>
          @for (r of roles(); track r.id) {
            <option [value]="r.name">{{ r.name }}</option>
          }
        </select>
        <select class="form-control" [(ngModel)]="statusFilter" style="width:130px;">
          <option value="">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      <div class="card">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Name</th><th>Username</th><th>Role</th>
              <th>Location</th><th>Book Appts</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of filtered(); track u.id) {
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="avatar-sm">{{ initials(u) }}</div>
                    <div>
                      <div style="font-weight:600;">{{ u.firstName }} {{ u.lastName }}</div>
                      <div style="font-size:11px;color:var(--ink-light);">{{ u.email || "—" }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ u.username }}</td>
                <td>
                  <span class="role-badge" [ngClass]="roleCss(u.role)">{{ roleLabel(u.roleName || u.role) }}</span>
                </td>
                <td>{{ locationName(u.locationId) }}</td>
                <td>
                  <span class="badge" [ngClass]="u.canBookAppts ? 'badge-success' : 'badge-neutral'">
                    {{ u.canBookAppts ? "Yes" : "No" }}
                  </span>
                </td>
                <td>
                  @if (u.locked) {
                    <span class="badge badge-danger">Locked</span>
                  } @else {
                    <span class="badge" [ngClass]="u.active ? 'badge-success' : 'badge-neutral'">
                      {{ u.active ? "Active" : "Inactive" }}
                    </span>
                  }
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm btn-icon"
                          (click)="openModal(u)" title="Edit">✏️</button>
                  <button class="btn btn-ghost btn-sm btn-icon"
                          (click)="toggleActive(u)"
                          [title]="u.active ? 'Deactivate' : 'Activate'">
                    {{ u.active ? "🚫" : "✅" }}
                  </button>
                </td>
              </tr>
            }
            @if (!filtered().length) {
              <tr>
                <td colspan="7"
                    style="text-align:center;padding:32px;color:var(--ink-light);">
                  No staff found.
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
            <h3>{{ editing() ? "Edit Staff Member" : "Add Staff Member" }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form [formGroup]="form">
              <div class="g2">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input class="form-control" formControlName="firstName"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input class="form-control" formControlName="lastName"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Username *</label>
                  <input class="form-control" formControlName="username"
                         [attr.readonly]="editing() ? '' : null"/>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    {{ editing() ? "New Password (blank = keep)" : "Password *" }}
                  </label>
                  <input type="password" class="form-control" formControlName="password"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="email"
                         placeholder="email@example.com (optional)"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input class="form-control" formControlName="phone"
                         placeholder="(555) 000-0000"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Role *</label>
                  <select class="form-control" formControlName="role">
                    @for (r of roles(); track r.id) {
                      <option [value]="r.name">{{ r.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Location</label>
                  <select class="form-control" formControlName="locationId">
                    <option [ngValue]="null">— No location —</option>
                    @for (loc of locations(); track loc.id) {
                      <option [ngValue]="loc.id">{{ loc.name }}</option>
                    }
                  </select>
                </div>
              </div>
              <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" formControlName="canBookAppts">
                    <span class="toggle-slider"></span>
                  </label>
                  <strong style="color:var(--jade)">Can Book Appointments</strong>
                </div>
                <div class="toggle-wrap">
                  <label class="toggle">
                    <input type="checkbox" formControlName="active">
                    <span class="toggle-slider"></span>
                  </label>
                  <span>Active Account</span>
                </div>
              </div>
              @if (error()) {
                <div class="error-alert">{{ error() }}</div>
              }
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? "Saving…" : "Save Staff Member" }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .avatar-sm {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--jade); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .error-alert {
      margin-top: 12px; padding: 10px 16px;
      border-radius: var(--radius); font-size: 13px;
      background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17;
    }
  `]
})
export class StaffListComponent implements OnInit {
  users     = signal<User[]>([]);
  locations = signal<Location[]>([]);
  roles     = signal<any[]>([]);
  search      = "";
  roleFilter  = "";
  statusFilter = "";
  showModal = signal(false);
  editing   = signal(false);
  saving    = signal(false);
  error     = signal("");
  selectedUser: User | null = null;

  form = this.fb.group({
    firstName:    ["", Validators.required],
    lastName:     ["", Validators.required],
    username:     ["", Validators.required],
    email:        [""],          // optional — backend will use empty string
    phone:        [""],
    password:     [""],
    role:         ["STAFF", Validators.required],
    locationId:   [null as number | null],
    canBookAppts: [true],
    active:       [true],
  });

  constructor(
    private adminSvc: AdminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.load();
    this.adminSvc.getLocations().subscribe(l => this.locations.set(l));
    this.adminSvc.getRoles().subscribe(r => this.roles.set(r));
  }

  load() { this.adminSvc.getUsers().subscribe(u => this.users.set([...u])); }

  filtered() {
    return this.users().filter(u => {
      const q = this.search.toLowerCase();
      const matchQ = !q ||
        (u.firstName + " " + u.lastName).toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      const matchR = !this.roleFilter || u.role === this.roleFilter;
      const matchS = !this.statusFilter ||
        (this.statusFilter === "active"   &&  u.active) ||
        (this.statusFilter === "inactive" && !u.active);
      return matchQ && matchR && matchS;
    });
  }

  initials(u: User) {
    return ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase();
  }

  roleCss(role: string): string {
    const m: Record<string,string> = {
      SUPER_ADMIN: "role-super-admin", MANAGER: "role-manager",
      STAFF: "role-staff", RESOURCE: "role-resource"
    };
    return m[role] ?? "badge-neutral";
  }

  /** Human-readable role label — converts SUPER_ADMIN → Super Admin etc. */
  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      SUPER_ADMIN: "Super Admin",
      MANAGER:     "Manager",
      STAFF:       "Staff",
      RESOURCE:    "Resource",
    };
    return labels[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  locationName(id?: number | null): string {
    return this.locations().find(l => l.id === id)?.name ?? "—";
  }

  openModal(u?: User) {
    this.editing.set(!!u);
    this.error.set("");
    this.selectedUser = u ?? null;
    const pwdCtrl = this.form.get("password")!;
    if (u) {
      this.form.patchValue({
        firstName: u.firstName, lastName: u.lastName,
        username: u.username, email: u.email ?? "",
        phone: u.phone ?? "", password: "",
        role: u.roleName || u.role, locationId: u.locationId ?? null,
        canBookAppts: u.canBookAppts, active: u.active,
      });
      this.form.get("username")!.disable();
      pwdCtrl.clearValidators();
    } else {
      this.form.reset({ role: "STAFF", canBookAppts: true, active: true });
      this.form.get("username")!.enable();
      pwdCtrl.setValidators([Validators.required]);
    }
    pwdCtrl.updateValueAndValidity();
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.form.reset(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set("");
    const val = { ...this.form.getRawValue() } as any;
    // Ensure email is never null — send empty string if blank
    if (!val.email) val.email = "";
    if (this.editing() && !val.password) delete val.password;

    const req = this.editing()
      ? this.adminSvc.updateUser(this.selectedUser!.id, val)
      : this.adminSvc.createUser(val);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.snack.open("Staff member saved.", "×", { duration: 3000 });
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e.error?.message ?? "An error occurred. Check all required fields.");
      }
    });
  }

  toggleActive(u: User) {
    const action = u.active ? "Deactivate" : "Activate";
    if (!confirm(action + " " + u.firstName + " " + u.lastName + "?")) return;
    this.adminSvc.updateUser(u.id, { active: !u.active }).subscribe({
      next: () => { this.snack.open("Updated.", "×", { duration: 2000 }); this.load(); },
      error: e => this.snack.open(e.error?.message ?? "Error", "×", { duration: 3000 })
    });
  }
}
