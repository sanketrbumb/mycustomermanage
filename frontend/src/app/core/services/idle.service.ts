import { Injectable, NgZone, OnDestroy } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

/**
 * Idle session timeout service.
 *
 * Deliberately does NOT inject AuthService — that would create a circular
 * dependency (AuthService → IdleService → AuthService).
 *
 * Instead, AuthService registers a logout callback via setLogoutCallback()
 * after constructing. IdleService calls that callback when idle time expires.
 */
@Injectable({ providedIn: "root" })
export class IdleService implements OnDestroy {

  private logoutCallback: (() => void) | null = null;

  private timeoutMs    = 60 * 60 * 1000;  // default 60 min
  private warnBeforeMs = 60 * 1000;       // warn 60s before logout

  private idleTimer: any = null;
  private warnTimer: any = null;
  private warningShown   = false;
  private running        = false;

  private readonly activityHandler = () => this.onActivity();
  private readonly activityEvents  = [
    "mousemove", "mousedown", "keydown", "scroll", "touchstart", "click",
  ];

  constructor(private zone: NgZone, private snack: MatSnackBar) {}

  /**
   * Register the function IdleService should call when the session times out.
   * AuthService calls this once during construction:
   *   this.idle.setLogoutCallback(() => this.logout());
   */
  setLogoutCallback(fn: () => void) {
    this.logoutCallback = fn;
  }

  start(idleTimeoutMinutes: number) {
    this.stop();
    const minutes    = idleTimeoutMinutes > 0 ? idleTimeoutMinutes : 60;
    this.timeoutMs   = minutes * 60 * 1000;
    this.running     = true;

    this.zone.runOutsideAngular(() => {
      this.activityEvents.forEach(evt =>
        window.addEventListener(evt, this.activityHandler, { passive: true })
      );
      this.resetTimer();
    });
  }

  stop() {
    this.running      = false;
    this.warningShown = false;
    this.clearTimers();
    this.activityEvents.forEach(evt =>
      window.removeEventListener(evt, this.activityHandler)
    );
  }

  private onActivity() {
    if (!this.running) return;
    if (this.warningShown) {
      this.warningShown = false;
      this.zone.run(() => this.snack.dismiss());
    }
    this.resetTimer();
  }

  private resetTimer() {
    this.clearTimers();
    const warnDelay  = Math.max(this.timeoutMs - this.warnBeforeMs, 0);
    this.warnTimer   = setTimeout(() => this.showWarning(), warnDelay);
    this.idleTimer   = setTimeout(() => this.triggerLogout(), this.timeoutMs);
  }

  private showWarning() {
    this.warningShown = true;
    this.zone.run(() => {
      this.snack.open(
        "You'll be signed out shortly due to inactivity. Move the mouse to stay signed in.",
        "Stay signed in",
        { duration: this.warnBeforeMs }
      ).onAction().subscribe(() => this.onActivity());
    });
  }

  private triggerLogout() {
    this.zone.run(() => {
      this.stop();
      this.snack.open("You've been signed out due to inactivity.", "×", { duration: 4000 });
      this.logoutCallback?.();
    });
  }

  private clearTimers() {
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.warnTimer) { clearTimeout(this.warnTimer); this.warnTimer = null; }
  }

  ngOnDestroy() { this.stop(); }
}