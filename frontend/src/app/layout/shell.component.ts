import { Component, computed, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { filter } from "rxjs/operators";
import { AuthService } from "../core/services/auth.service";

interface NavItem  { icon: string; label: string; route: string; roles?: string[]; }
interface NavGroup { label: string; items: NavItem[]; roles?: string[]; }

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">

      <!-- ══ TOP HEADER ════════════════════════════════════════ -->
      <header class="top-header">
        <a class="logo" routerLink="/">
          <div class="logo-icon">✿</div>
          <span class="logo-text">Your Own CRM</span>
        </a>
        <div class="hdr-spacer"></div>
        <div class="hdr-user">
          <div class="avatar">{{ userInitials() }}</div>
          <span>{{ auth.currentUser()?.fullName }}</span>
          <a class="sign-out" (click)="auth.logout()">Sign out</a>
        </div>
      </header>

      <div class="body-row">

        <!-- ══ SIDEBAR ═══════════════════════════════════════════ -->
        <nav class="sidebar">
          @for (group of visibleGroups(); track group.label) {
            <div class="band-label">{{ group.label }}</div>
            @for (item of group.items; track item.route) {
              <a class="nav-item"
                 [routerLink]="item.route"
                 routerLinkActive="active">
                <span class="nav-icon">{{ item.icon }}</span>
                {{ item.label }}
              </a>
            }
            <div class="band-divider"></div>
          }
        </nav>

        <!-- ══ MAIN CONTENT ══════════════════════════════════════ -->
        <main class="main">
          <router-outlet/>
        </main>

      </div>
    </div>
  `,
  styles: [`
    /* exact copy of serenity-shared.css layout classes */
    .app-shell { display: flex; flex-direction: column; height: 100vh; }
    .body-row   { flex: 1; display: flex; min-height: 0; overflow: clip; }

    /* Header */
    .top-header {
      height: var(--header-h);
      background: var(--jade);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 16px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,.2);
    }
    .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; cursor: pointer; }
    .logo-icon {
      width: 32px; height: 32px;
      background: var(--gold);
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .logo-text { font-family: var(--font-display); font-size: 18px; color: var(--white); font-weight: 500; }
    .hdr-spacer { flex: 1; }
    .hdr-user { display: flex; align-items: center; gap: 8px; color: var(--white); font-size: 13px; }
    .avatar {
      width: 30px; height: 30px;
      background: var(--gold); border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: var(--jade); flex-shrink: 0;
    }
    .sign-out { color: rgba(255,255,255,.6); font-size: 12px; margin-left: 8px; cursor: pointer; }
    .sign-out:hover { color: var(--white); }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-w);
      background: var(--white);
      border-right: 1px solid var(--stone-mid);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .band-label {
      font-size: 10px; font-weight: 700;
      color: var(--ink-light);
      text-transform: uppercase; letter-spacing: .1em;
      padding: 10px 18px 4px;
    }
    .band-divider { height: 1px; background: var(--stone-mid); margin: 6px 10px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 18px; cursor: pointer; transition: all .15s;
      color: var(--ink-mid); font-size: 13px; position: relative;
      text-decoration: none;
    }
    .nav-item:hover { background: var(--jade-mist); color: var(--jade); }
    .nav-item.active { background: var(--jade-mist); color: var(--jade); font-weight: 600; }
    .nav-item.active::before {
      content: ""; position: absolute; left: 0; top: 0; bottom: 0;
      width: 3px; background: var(--jade); border-radius: 0 2px 2px 0;
    }
    .nav-icon { font-size: 15px; width: 20px; text-align: center; }

    /* Main */
    .main { flex: 1; overflow-y: auto; padding: 24px; min-height: 0; }
  `]
})
export class ShellComponent {
  private readonly GROUPS: NavGroup[] = [
    {
      label: "Operations",
      items: [
        { icon: "📅", label: "Schedule", route: "/schedule" },
      ]
    },
    {
      label: "Billing",
      items: [
        { icon: "🧾", label: "Invoices",  route: "/billing/invoices" },
        { icon: "💳", label: "Payments",  route: "/billing/payments" },
        { icon: "📊", label: "Reports",   route: "/reports" },
      ]
    },
    {
      label: "Admin",
      roles: ["SUPER_ADMIN", "MANAGER"],
      items: [
        { icon: "👤", label: "Staff",          route: "/admin/staff",          roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "🏠", label: "Resources",      route: "/admin/resources",      roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "👥", label: "Customers",      route: "/admin/customers",      roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "🏷️", label: "Visit Types",    route: "/admin/visit-types",    roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "🔄", label: "Visit Statuses", route: "/admin/visit-statuses", roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "📍", label: "Locations",      route: "/admin/locations",      roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "🕐", label: "Resource Hours", route: "/admin/resource-hours", roles: ["SUPER_ADMIN","MANAGER"] },
        { icon: "⚙️", label: "Settings",       route: "/admin/settings",       roles: ["SUPER_ADMIN"] },
      ]
    }
  ];

  visibleGroups = computed(() => {
    const role = this.auth.currentUser()?.role ?? "";
    return this.GROUPS
      .filter(g => !g.roles || g.roles.includes(role))
      .map(g => ({ ...g, items: g.items.filter(i => !i.roles || i.roles.includes(role)) }))
      .filter(g => g.items.length > 0);
  });

  userInitials = computed(() => {
    const name = this.auth.currentUser()?.fullName ?? "";
    return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
  });

  constructor(public auth: AuthService, private router: Router) {}
}
