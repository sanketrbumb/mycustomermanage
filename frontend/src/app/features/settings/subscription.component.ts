import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { environment } from "../../../environments/environment";
import { catchError, of } from "rxjs";

interface Plan {
  id: string;       // gateway's price/plan ID — set these in environment.ts
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  highlight?: boolean;
}

// Define your plans here. The `id` field is the gateway's price/plan ID.
// For Stripe: set to the price ID (e.g. price_xxx) from your Stripe dashboard
// For Razorpay: set to the plan ID (e.g. plan_xxx) from your Razorpay dashboard
// For PayPal: set to the billing plan ID
// Switching gateways = update these IDs + set GATEWAY_PROVIDER in .env
const PLANS: Plan[] = [
  {
    id: environment.plans?.starter ?? "plan_starter",
    name: "Starter",
    price: 49,
    currency: "USD",
    interval: "month",
    features: [
      "1 location",
      "Up to 3 staff",
      "500 appointments/month",
      "Invoicing & payments",
      "Email support",
    ]
  },
  {
    id: environment.plans?.growth ?? "plan_growth",
    name: "Growth",
    price: 99,
    currency: "USD",
    interval: "month",
    features: [
      "3 locations",
      "Up to 10 staff",
      "Unlimited appointments",
      "Reports & analytics",
      "Priority support",
    ],
    highlight: true
  },
  {
    id: environment.plans?.pro ?? "plan_pro",
    name: "Pro",
    price: 199,
    currency: "USD",
    interval: "month",
    features: [
      "Unlimited locations",
      "Unlimited staff",
      "API access",
      "Custom branding",
      "Dedicated support",
    ]
  }
];

@Component({
  selector: "app-subscription",
  standalone: true,
  imports: [CommonModule, MatSnackBarModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">Billing & Subscription</div>
          <div class="page-subtitle">Manage your plan and payment details</div>
        </div>
      </div>

      <!-- Current status card -->
      @if (status()) {
        <div class="card status-card" style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <div style="font-size:12px;color:var(--ink-light);text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:4px;">
                Current Plan
              </div>
              <div style="font-family:var(--font-display);font-size:22px;color:var(--jade);">
                {{ currentPlanName() || "Free Trial" }}
              </div>
              <div style="font-size:13px;color:var(--ink-light);margin-top:4px;">
                Status:
                <span class="badge" [ngClass]="statusClass()">{{ statusLabel() }}</span>
                @if (status()!.currentPeriodEnd) {
                  · Next billing: {{ status()!.currentPeriodEnd | date:"mediumDate" }}
                }
                @if (status()!.trialEndsAt) {
                  · Trial ends: {{ status()!.trialEndsAt | date:"mediumDate" }}
                }
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              @if (status()!.vendorCustomerId) {
                <button class="btn btn-outline btn-sm" (click)="openPortal()"
                        [disabled]="loading()">
                  Manage Billing →
                </button>
              }
              @if (status()!.status === 'ACTIVE' || status()!.status === 'TRIALING') {
                <button class="btn btn-ghost btn-sm" style="color:var(--danger);"
                        (click)="confirmCancel()" [disabled]="loading()">
                  Cancel Plan
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Plans grid -->
      <div class="plans-grid">
        @for (plan of plans; track plan.id) {
          <div class="plan-card" [class.plan-highlight]="plan.highlight">
            @if (plan.highlight) {
              <div class="popular-badge">Most Popular</div>
            }
            <div class="plan-name">{{ plan.name }}</div>
            <div class="plan-price">
              <span class="plan-currency">$</span>{{ plan.price }}
              <span class="plan-interval">/{{ plan.interval }}</span>
            </div>
            <ul class="plan-features">
              @for (f of plan.features; track f) {
                <li><span class="check">✓</span> {{ f }}</li>
              }
            </ul>
            <button class="btn btn-primary plan-btn"
                    [class.btn-outline]="!plan.highlight"
                    (click)="subscribe(plan)"
                    [disabled]="loading() || isCurrentPlan(plan.id)">
              @if (isCurrentPlan(plan.id)) {
                Current Plan
              } @else if (loading() && selectedPlan() === plan.id) {
                Redirecting…
              } @else {
                Get Started
              }
            </button>
          </div>
        }
      </div>

      @if (error()) {
        <div class="err-alert" style="margin-top:16px;">{{ error() }}</div>
      }

      <!-- Vendor notice -->
      <div style="margin-top:24px;font-size:12px;color:var(--ink-light);text-align:center;">
        Payments processed securely by {{ vendorLabel() }}.
        Your card details are never stored on our servers.
      </div>
    </div>
  `,
  styles: [`
    .status-card { padding: 20px 24px; }
    .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 700px) { .plans-grid { grid-template-columns: 1fr; } }

    .plan-card {
      background: #fff;
      border: 1.5px solid var(--stone-mid);
      border-radius: var(--radius-lg);
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }
    .plan-highlight {
      border-color: var(--jade);
      box-shadow: 0 0 0 2px rgba(26,74,58,.08);
    }
    .popular-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--jade);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      padding: 3px 12px;
      border-radius: 12px;
      white-space: nowrap;
    }
    .plan-name { font-size: 16px; font-weight: 700; color: var(--jade); }
    .plan-price {
      font-family: var(--font-display);
      font-size: 36px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1;
    }
    .plan-currency { font-size: 20px; vertical-align: top; margin-top: 6px; display: inline-block; }
    .plan-interval { font-size: 14px; color: var(--ink-light); font-weight: 400; }
    .plan-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .plan-features li { font-size: 13px; color: var(--ink-mid); display: flex; align-items: center; gap: 8px; }
    .check { color: var(--success); font-weight: 700; flex-shrink: 0; }
    .plan-btn { margin-top: auto; justify-content: center; }
    .err-alert { padding: 10px 16px; border-radius: var(--radius); font-size: 13px;
                 background: #fde8e6; border: 1px solid #f5c6c3; color: #9a1f17; }
  `]
})
export class SubscriptionComponent implements OnInit {
  plans = PLANS;
  status   = signal<any>(null);
  loading  = signal(false);
  error    = signal("");
  selectedPlan = signal<string | null>(null);

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() { this.loadStatus(); }

  loadStatus() {
    this.http.get<any>(`${environment.apiUrl}/subscriptions/status`)
      .pipe(catchError(() => of(null)))
      .subscribe(s => this.status.set(s));
  }

  statusClass(): string {
    const s = this.status()?.status;
    if (s === "ACTIVE")    return "badge-success";
    if (s === "TRIALING")  return "badge-info";
    if (s === "PAST_DUE")  return "badge-warning";
    if (s === "CANCELED")  return "badge-danger";
    return "badge-neutral";
  }

  statusLabel(): string {
    const s = this.status()?.status;
    const labels: Record<string, string> = {
      ACTIVE: "Active",
      TRIALING: "Free Trial",
      PAST_DUE: "Payment Due",
      CANCELED: "Canceled",
      NONE: "No Plan"
    };
    return labels[s ?? "NONE"] ?? s ?? "Unknown";
  }

  currentPlanName(): string {
    const planId = this.status()?.planId;
    return PLANS.find(p => p.id === planId)?.name ?? "";
  }

  isCurrentPlan(planId: string): boolean {
    return this.status()?.planId === planId && this.status()?.status === "ACTIVE";
  }

  vendorLabel(): string {
    const v = this.status()?.vendor ?? "";
    const vendors: Record<string, string> = {
      stripe: "Stripe",
      razorpay: "Razorpay",
      paypal: "PayPal",
      noop: "demo payment processor"
    };
    return vendors[v] ?? v;
  }

  subscribe(plan: Plan) {
    this.loading.set(true);
    this.error.set("");
    this.selectedPlan.set(plan.id);

    // Get the current user's email from localStorage (set during login)
    const userStr = localStorage.getItem("current_user");
    const email = userStr ? JSON.parse(userStr).email ?? "" : "";

    this.http.post<any>(`${environment.apiUrl}/subscriptions/checkout`, {
      planId: plan.id,
      planName: plan.name,
      email
    }).subscribe({
      next: res => {
        this.loading.set(false);
        // Redirect the user to the gateway's checkout page
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else {
          this.error.set("No checkout URL returned. Please try again.");
        }
      },
      error: e => {
        this.loading.set(false);
        this.selectedPlan.set(null);
        this.error.set(e.error?.message ?? "Could not start checkout. Please try again.");
      }
    });
  }

  openPortal() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/subscriptions/portal`)
      .subscribe({
        next: res => {
          this.loading.set(false);
          if (res.portalUrl) window.location.href = res.portalUrl;
        },
        error: e => {
          this.loading.set(false);
          this.error.set(e.error?.message ?? "Could not open billing portal.");
        }
      });
  }

  confirmCancel() {
    if (!confirm("Cancel your subscription? You'll retain access until the end of the current billing period.")) return;
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}/subscriptions/cancel`, {})
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.snack.open("Subscription cancellation scheduled.", "×", { duration: 3000 });
          this.loadStatus();
        },
        error: e => {
          this.loading.set(false);
          this.error.set(e.error?.message ?? "Cancellation failed.");
        }
      });
  }
}
