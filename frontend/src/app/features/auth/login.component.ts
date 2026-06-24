import { Component, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page">

      <!-- Left brand panel -->
      <div class="brand-panel">
        <div class="brand-content">
          <div class="brand-logo">✿</div>
          <h1>Your Own CRM</h1>
          <p>Wellness Practice Management</p>
          <div class="brand-tagline">Appointments · Billing · Reports</div>
        </div>
      </div>

      <!-- Right form panel -->
      <div class="form-panel">
        <div class="login-card">
          <div class="login-card-header">
            <div class="login-title">Sign In</div>
            <div class="login-subtitle">Enter your credentials to continue</div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="login-form">

            <div class="form-group">
              <label class="form-label">Organization</label>
              <input class="form-control"
                     formControlName="tenantSlug"
                     placeholder="e.g. demo"
                     autocomplete="organization"/>
              @if (form.get('tenantSlug')?.invalid && form.get('tenantSlug')?.touched) {
                <span class="field-error">Organization is required</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Username</label>
              <input class="form-control"
                     formControlName="username"
                     placeholder="Enter your username"
                     autocomplete="username"/>
              @if (form.get('username')?.invalid && form.get('username')?.touched) {
                <span class="field-error">Username is required</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input class="form-control"
                     type="password"
                     formControlName="password"
                     placeholder="Enter your password"
                     autocomplete="current-password"/>
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <span class="field-error">Password is required</span>
              }
            </div>

            @if (error()) {
              <div class="login-error">
                <span class="error-icon">⚠</span>
                {{ error() }}
              </div>
            }

            <button class="login-btn" type="submit" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner"></span> Signing in…
              } @else {
                Sign In
              }
            </button>

          </form>

          <div class="login-hint">
            Demo credentials: <strong>demo</strong> / <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ── Brand panel ──────────────────────────────── */
    .brand-panel {
      flex: 0 0 42%;
      background: var(--jade);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .brand-panel::before {
      content: "✿";
      position: absolute;
      font-size: 400px;
      color: rgba(255,255,255,.04);
      top: -80px;
      right: -100px;
      line-height: 1;
    }

    .brand-content {
      text-align: center;
      color: #fff;
      position: relative;
      z-index: 1;
      padding: 40px;
    }

    .brand-logo {
      font-size: 64px;
      color: var(--gold);
      margin-bottom: 20px;
      line-height: 1;
    }

    .brand-content h1 {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 500;
      margin: 0 0 8px;
      color: #fff;
    }

    .brand-content p {
      font-size: 15px;
      opacity: .75;
      margin: 0 0 20px;
    }

    .brand-tagline {
      font-size: 11px;
      opacity: .5;
      letter-spacing: .15em;
      text-transform: uppercase;
    }

    /* ── Form panel ───────────────────────────────── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--stone);
      padding: 32px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background: var(--white);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 36px;
    }

    .login-card-header {
      margin-bottom: 28px;
    }

    .login-title {
      font-family: var(--font-display);
      font-size: 28px;
      color: var(--jade);
      font-weight: 500;
      line-height: 1;
      margin-bottom: 6px;
    }

    .login-subtitle {
      font-size: 13px;
      color: var(--ink-light);
    }

    /* ── Login form ───────────────────────────────── */
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-error {
      font-size: 11px;
      color: var(--danger);
      margin-top: 3px;
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #fde8e6;
      border: 1px solid #f5c6c3;
      color: #9a1f17;
      border-radius: var(--radius);
      padding: 10px 14px;
      font-size: 13px;
    }

    .error-icon { font-size: 15px; flex-shrink: 0; }

    .login-btn {
      width: 100%;
      height: 48px;
      background: var(--jade);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background .18s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 4px;
    }

    .login-btn:hover:not(:disabled) { background: var(--jade-mid); }
    .login-btn:disabled { opacity: .65; cursor: not-allowed; }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .login-hint {
      margin-top: 20px;
      padding: 10px 14px;
      background: var(--jade-mist);
      border-radius: var(--radius);
      font-size: 12px;
      color: var(--jade);
      text-align: center;
    }
  `]
})
export class LoginComponent {
  form = this.fb.nonNullable.group({
    tenantSlug: ["demo",  Validators.required],
    username:   ["admin", Validators.required],
    password:   ["",      Validators.required],
  });

  loading = signal(false);
  error   = signal("");

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set("");

    const { tenantSlug, username, password } = this.form.getRawValue();

    this.auth.login(tenantSlug, username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(["/"]);
      },
      error: err => {
        this.loading.set(false);
        const msg = err.error?.message;
        if (msg === "Invalid credentials") {
          this.error.set("Incorrect username or password.");
        } else if (msg?.includes("locked")) {
          this.error.set("Account is locked. Contact your administrator.");
        } else if (msg?.includes("Organisation not found")) {
          this.error.set("Organisation not found. Check your organization name.");
        } else {
          this.error.set(msg ?? "Login failed. Please try again.");
        }
      }
    });
  }
}