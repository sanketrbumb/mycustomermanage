import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient, HttpClientModule } from "@angular/common/http";
import { Router, RouterLink } from "@angular/router";
import { environment } from "../../../environments/environment";
import { debounceTime, Subject } from "rxjs";
import { switchMap } from "rxjs/operators";

@Component({
  selector: "app-signup",
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  template: `
    <div class="signup-shell">
      <!-- Left panel — branding -->
      <div class="signup-left">
        <div class="brand">
          <div class="brand-logo">✿</div>
          <div class="brand-name">Your Own CRM</div>
          <div class="brand-tagline">Wellness & Spa Practice Management</div>
        </div>
        <ul class="feature-list">
          <li>📅 Smart scheduling with resource hours</li>
          <li>💳 Invoicing, payments & refunds</li>
          <li>📊 Revenue reports & day sheets</li>
          <li>👥 Multi-staff, multi-location</li>
          <li>🔒 HIPAA-friendly, fully multi-tenant</li>
        </ul>
        <div class="signup-footer">
          Already have an account?
          <a routerLink="/login" class="login-link">Sign in →</a>
        </div>
      </div>

      <!-- Right panel — form -->
      <div class="signup-right">
        @if (!success()) {
          <div class="signup-card">
            <h1 class="signup-title">Start your free trial</h1>
            <p class="signup-sub">Set up your spa in minutes. No credit card required.</p>

            <!-- Step indicator -->
            <div class="steps">
              <div class="step" [class.active]="step() >= 1" [class.done]="step() > 1">
                <span class="step-num">1</span> Your Practice
              </div>
              <div class="step-line"></div>
              <div class="step" [class.active]="step() >= 2" [class.done]="step() > 2">
                <span class="step-num">2</span> Your Account
              </div>
              <div class="step-line"></div>
              <div class="step" [class.active]="step() >= 3">
                <span class="step-num">3</span> Review
              </div>
            </div>

            <!-- Step 1: Practice info -->
            @if (step() === 1) {
              <div class="step-body">
                <div class="form-group">
                  <label class="form-label">Practice / Business Name *</label>
                  <input class="form-control" [(ngModel)]="orgName"
                         placeholder="e.g. Serenity Day Spa"
                         (input)="suggestSlug()"/>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    Your URL
                    <span class="url-hint">yourowncrm.com/<strong>{{ slug || "your-spa" }}</strong></span>
                  </label>
                  <div class="slug-wrap">
                    <input class="form-control" [(ngModel)]="slug"
                           placeholder="your-spa-name"
                           (input)="onSlugInput()"
                           [class.slug-ok]="slugAvailable() === true"
                           [class.slug-taken]="slugAvailable() === false"/>
                    @if (slugAvailable() === true) {
                      <span class="slug-badge ok">✓ Available</span>
                    }
                    @if (slugAvailable() === false) {
                      <span class="slug-badge taken">✗ Taken</span>
                    }
                    @if (slugChecking()) {
                      <span class="slug-badge checking">Checking…</span>
                    }
                  </div>
                  <div class="field-hint">
                    Letters, numbers and hyphens only. Min 3 characters.
                  </div>
                </div>
                <button class="btn btn-primary btn-lg"
                        (click)="nextStep()"
                        [disabled]="!orgName.trim() || slug.length < 3 || slugAvailable() === false">
                  Continue →
                </button>
              </div>
            }

            <!-- Step 2: Account info -->
            @if (step() === 2) {
              <div class="step-body">
                <div class="name-row">
                  <div class="form-group">
                    <label class="form-label">First Name *</label>
                    <input class="form-control" [(ngModel)]="firstName" placeholder="Jane"/>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Name *</label>
                    <input class="form-control" [(ngModel)]="lastName" placeholder="Smith"/>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Email *</label>
                  <input type="email" class="form-control" [(ngModel)]="email"
                         placeholder="jane@yourspam.com"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-control" [(ngModel)]="phone"
                         placeholder="+1 (555) 000-0000"/>
                </div>
                <div class="form-group">
                  <label class="form-label">Username *</label>
                  <input class="form-control" [(ngModel)]="username"
                         placeholder="jane.smith" autocomplete="username"/>
                  <div class="field-hint">You'll use this to log in. Lowercase letters only.</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Password *</label>
                  <input [type]="showPwd ? 'text' : 'password'"
                         class="form-control" [(ngModel)]="password"
                         placeholder="At least 8 characters" autocomplete="new-password"/>
                  <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                    <input type="checkbox" [(ngModel)]="showPwd" id="showPwd"/>
                    <label for="showPwd" style="font-size:12px;color:var(--ink-light);cursor:pointer;">
                      Show password
                    </label>
                    @if (password.length > 0) {
                      <span class="pwd-strength" [class]="pwdStrengthClass()">
                        {{ pwdStrengthLabel() }}
                      </span>
                    }
                  </div>
                </div>
                <div class="btn-row">
                  <button class="btn btn-ghost" (click)="step.set(1)">← Back</button>
                  <button class="btn btn-primary btn-lg"
                          (click)="nextStep()"
                          [disabled]="!firstName.trim() || !lastName.trim() ||
                                      !email.includes('@') || !username.trim() ||
                                      password.length < 8">
                    Review →
                  </button>
                </div>
              </div>
            }

            <!-- Step 3: Review + submit -->
            @if (step() === 3) {
              <div class="step-body">
                <div class="review-card">
                  <div class="review-section">Practice</div>
                  <div class="review-row"><span>Name</span><strong>{{ orgName }}</strong></div>
                  <div class="review-row">
                    <span>URL</span>
                    <strong>yourowncrm.com/{{ slug }}</strong>
                  </div>
                  <div class="review-section">Administrator Account</div>
                  <div class="review-row">
                    <span>Name</span><strong>{{ firstName }} {{ lastName }}</strong>
                  </div>
                  <div class="review-row"><span>Email</span><strong>{{ email }}</strong></div>
                  <div class="review-row"><span>Username</span><strong>{{ username }}</strong></div>
                </div>
                <div class="terms-note">
                  By signing up you agree to our
                  <a href="#" style="color:var(--jade)">Terms of Service</a>
                  and
                  <a href="#" style="color:var(--jade)">Privacy Policy</a>.
                </div>
                @if (error()) {
                  <div class="err-alert">{{ error() }}</div>
                }
                <div class="btn-row">
                  <button class="btn btn-ghost" (click)="step.set(2)">← Back</button>
                  <button class="btn btn-primary btn-lg"
                          (click)="submit()" [disabled]="saving()">
                    {{ saving() ? "Creating account…" : "🚀 Create My Account" }}
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- Success screen -->
        @if (success()) {
          <div class="signup-card success-card">
            <div class="success-icon">🎉</div>
            <h2 class="success-title">Welcome to Your Own CRM!</h2>
            <p class="success-msg">
              Your account for <strong>{{ orgName }}</strong> has been created.
              Log in to start setting up your practice.
            </p>
            <div class="success-creds">
              <div class="cred-row"><span>Username</span><strong>{{ username }}</strong></div>
              <div class="cred-row"><span>Password</span><strong>{{ password }}</strong></div>
            </div>
            <p class="success-hint">Save these credentials — you'll need them to log in.</p>
            <button class="btn btn-primary btn-lg" (click)="goToLogin()">
              Sign In Now →
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }

    .signup-shell {
      min-height: 100vh;
      display: flex;
    }

    /* ── Left branding panel ── */
    .signup-left {
      width: 380px;
      flex-shrink: 0;
      background: var(--jade);
      color: #fff;
      display: flex;
      flex-direction: column;
      padding: 48px 40px;
    }
    .brand { margin-bottom: 48px; }
    .brand-logo { font-size: 48px; margin-bottom: 8px; }
    .brand-name { font-family: var(--font-display); font-size: 28px; font-weight: 700; }
    .brand-tagline { font-size: 13px; opacity: .75; margin-top: 4px; }
    .feature-list { list-style: none; padding: 0; margin: 0 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .feature-list li { font-size: 14px; opacity: .9; }
    .signup-footer { font-size: 13px; opacity: .7; margin-top: 32px; }
    .login-link { color: #fff; font-weight: 700; text-decoration: underline; }

    /* ── Right form panel ── */
    .signup-right {
      flex: 1;
      background: var(--stone);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }
    .signup-card {
      background: #fff;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 40px 44px;
      width: 100%;
      max-width: 520px;
    }
    .signup-title { font-family: var(--font-display); font-size: 28px; color: var(--jade); margin-bottom: 6px; }
    .signup-sub { font-size: 14px; color: var(--ink-light); margin-bottom: 28px; }

    /* Steps */
    .steps { display: flex; align-items: center; gap: 4px; margin-bottom: 28px; }
    .step { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
            color: var(--ink-light); white-space: nowrap; }
    .step.active { color: var(--jade); }
    .step.done { color: var(--success); }
    .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--stone-mid);
                display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: 700; }
    .step.active .step-num { background: var(--jade); color: #fff; }
    .step.done .step-num { background: var(--success); color: #fff; }
    .step-line { flex: 1; height: 1px; background: var(--stone-mid); }

    .step-body { display: flex; flex-direction: column; gap: 16px; }

    /* Slug input */
    .slug-wrap { position: relative; display: flex; align-items: center; gap: 8px; }
    .slug-wrap .form-control { flex: 1; }
    .slug-badge { font-size: 11px; font-weight: 700; padding: 3px 8px;
                  border-radius: 12px; white-space: nowrap; }
    .slug-badge.ok      { background: #e8f8ee; color: var(--success); }
    .slug-badge.taken   { background: #fde8e6; color: var(--danger); }
    .slug-badge.checking { background: var(--stone); color: var(--ink-light); }
    .form-control.slug-ok    { border-color: var(--success); }
    .form-control.slug-taken { border-color: var(--danger); }
    .field-hint { font-size: 11px; color: var(--ink-light); margin-top: 3px; }
    .url-hint { font-size: 11px; color: var(--ink-light); font-weight: 400; margin-left: 8px; }

    /* Password strength */
    .pwd-strength { font-size: 11px; font-weight: 700; padding: 2px 8px;
                    border-radius: 10px; }
    .pwd-strength.weak   { background: #fde8e6; color: var(--danger); }
    .pwd-strength.fair   { background: #fff3cd; color: #856404; }
    .pwd-strength.strong { background: #e8f8ee; color: var(--success); }

    /* Name row — two columns */
    .name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    /* Buttons */
    .btn-lg { padding: 12px 24px; font-size: 15px; width: 100%; justify-content: center; }
    .btn-row { display: flex; gap: 10px; }
    .btn-row .btn-ghost { flex: 0 0 auto; }
    .btn-row .btn-primary { flex: 1; }

    /* Review */
    .review-card { background: var(--stone); border-radius: var(--radius); padding: 16px 18px; margin-bottom: 16px; }
    .review-section { font-size: 10px; font-weight: 700; text-transform: uppercase;
                      letter-spacing: .08em; color: var(--jade); margin: 14px 0 6px; }
    .review-section:first-child { margin-top: 0; }
    .review-row { display: flex; justify-content: space-between; font-size: 13px;
                  padding: 4px 0; border-bottom: 1px solid var(--stone-mid); }
    .review-row:last-child { border-bottom: none; }
    .terms-note { font-size: 12px; color: var(--ink-light); margin-bottom: 14px; }

    /* Error */
    .err-alert { padding: 10px 16px; border-radius: var(--radius); font-size: 13px;
                 background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17; }

    /* Success */
    .success-card { text-align: center; }
    .success-icon { font-size: 56px; margin-bottom: 16px; }
    .success-title { font-family: var(--font-display); font-size: 26px; color: var(--jade); margin-bottom: 8px; }
    .success-msg { font-size: 14px; color: var(--ink-mid); margin-bottom: 20px; }
    .success-creds { background: var(--jade-mist); border-radius: var(--radius);
                     padding: 16px 20px; text-align: left; margin-bottom: 12px; }
    .cred-row { display: flex; justify-content: space-between; font-size: 14px;
                padding: 5px 0; }
    .success-hint { font-size: 12px; color: var(--ink-light); margin-bottom: 20px; }

    @media (max-width: 700px) {
      .signup-left { display: none; }
      .signup-card { padding: 28px 20px; }
    }
  `]
})
export class SignupComponent {
  step = signal(1);

  // Step 1
  orgName = "";
  slug    = "";
  slugAvailable = signal<boolean | null>(null);
  slugChecking  = signal(false);

  // Step 2
  firstName = "";
  lastName  = "";
  email     = "";
  phone     = "";
  username  = "";
  password  = "";
  showPwd   = false;

  // Submit
  saving  = signal(false);
  error   = signal("");
  success = signal(false);

  private slugSubject = new Subject<string>();

  constructor(private http: HttpClient, private router: Router) {
    // Debounced slug availability check
    this.slugSubject.pipe(
      debounceTime(400),
      switchMap(slug =>
        this.http.get<{ slug: string; available: boolean }>(
          `${environment.apiUrl}/public/check-slug?slug=${encodeURIComponent(slug)}`
        )
      )
    ).subscribe({
      next: res => {
        this.slug = res.slug;
        this.slugAvailable.set(res.available);
        this.slugChecking.set(false);
      },
      error: () => this.slugChecking.set(false)
    });
  }

  suggestSlug() {
    if (!this.orgName.trim()) return;
    const suggested = this.orgName.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    this.slug = suggested;
    this.onSlugInput();
  }

  onSlugInput() {
    const s = this.slug.trim();
    if (s.length < 3) { this.slugAvailable.set(null); return; }
    this.slugChecking.set(true);
    this.slugAvailable.set(null);
    this.slugSubject.next(s);
  }

  nextStep() {
    if (this.step() === 1 && this.orgName.trim() && this.slug.length >= 3 && this.slugAvailable() !== false) {
      this.step.set(2);
    } else if (this.step() === 2) {
      this.username = this.username.toLowerCase().trim();
      this.step.set(3);
    }
  }

  pwdStrengthClass(): string {
    const p = this.password;
    if (p.length < 8) return "weak";
    const hasUpper = /[A-Z]/.test(p);
    const hasNum   = /\d/.test(p);
    const hasSpec  = /[^a-zA-Z0-9]/.test(p);
    const score = (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);
    return score >= 2 ? "strong" : "fair";
  }

  pwdStrengthLabel(): string {
    const cls = this.pwdStrengthClass();
    return cls === "strong" ? "Strong" : cls === "fair" ? "Fair" : "Weak";
  }

  submit() {
    this.saving.set(true);
    this.error.set("");
    this.http.post(`${environment.apiUrl}/public/signup`, {
      orgName:   this.orgName.trim(),
      orgSlug:   this.slug.trim(),
      firstName: this.firstName.trim(),
      lastName:  this.lastName.trim(),
      email:     this.email.trim(),
      phone:     this.phone.trim() || null,
      username:  this.username.trim(),
      password:  this.password,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e.error?.message ?? "Something went wrong. Please try again.");
      }
    });
  }

  goToLogin() {
    this.router.navigate(["/login"]);
  }
}
