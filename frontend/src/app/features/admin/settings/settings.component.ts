import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { environment } from "../../../../environments/environment";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">IAM & Settings</div>
          <div class="page-subtitle">Security policy, permissions and system configuration</div>
        </div>
        <button class="btn btn-primary" (click)="save()" [disabled]="saving() || loading()">
          {{ saving() ? "Saving..." : "Save" }}
        </button>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:40px;color:var(--ink-light);">
          Loading settings…
        </div>
      } @else {
        <div class="card" style="padding:24px;">
          <h4 style="color:var(--jade);margin-bottom:16px;">Practice Branding</h4>
          <div class="g2">
            <div class="form-group">
              <label class="form-label">Practice Name</label>
              <input class="form-control" [(ngModel)]="practiceName"/>
            </div>
          </div>

          <h4 style="color:var(--jade);margin:24px 0 16px;">Security Policy</h4>
          <div class="g2">
            <div class="form-group">
              <label class="form-label">Minimum Password Length</label>
              <input type="number" class="form-control" [(ngModel)]="minPassword" min="4" max="32"/>
            </div>
            <div class="form-group">
              <label class="form-label">Lock Account After (failed attempts)</label>
              <input type="number" class="form-control" [(ngModel)]="maxFails" min="1" max="20"/>
            </div>
          </div>

          <div style="margin-top:24px;padding:16px;background:var(--jade-mist);border-radius:var(--radius);font-size:13px;color:var(--jade);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <span>ℹ️ Manage role permissions and access levels directly in the Roles panel.</span>
            <a class="btn btn-outline btn-sm" routerLink="/admin/roles">Configure Roles →</a>
          </div>
        </div>
      }
    </div>
  `
})
export class SettingsComponent implements OnInit {
  practiceName = "Your Own CRM";
  minPassword  = 6;
  maxFails     = 5;

  saving  = signal(false);
  loading = signal(false);

  constructor(private http: HttpClient, private snack: MatSnackBar, private auth: AuthService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/settings`).subscribe({
      next: res => {
        this.loading.set(false);
        this.practiceName = res.practiceName;
        this.minPassword = res.minPasswordLength;
        this.maxFails = res.maxFailedLogins;
      },
      error: () => {
        this.loading.set(false);
        this.snack.open("Failed to load settings.", "×", { duration: 3000 });
      }
    });
  }

  save() {
    this.saving.set(true);
    this.http.put<any>(`${environment.apiUrl}/settings`, {
      practiceName: this.practiceName,
      minPasswordLength: this.minPassword,
      maxFailedLogins: this.maxFails
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.practiceName = res.practiceName;
        this.minPassword = res.minPasswordLength;
        this.maxFails = res.maxFailedLogins;
        this.snack.open("Settings saved successfully.", "×", { duration: 3000 });
        this.auth.loadMe().subscribe();
      },
      error: err => {
        this.saving.set(false);
        this.snack.open(err.error?.message ?? "Failed to save settings.", "×", { duration: 3000 });
      }
    });
  }
}
