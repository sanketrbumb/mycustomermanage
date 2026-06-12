import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-title">IAM & Settings</div>
          <div class="page-subtitle">Security policy, permissions and system configuration</div>
        </div>
        <button class="btn btn-primary">Save</button>
      </div>

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

        <div style="margin-top:24px;padding:16px;background:var(--jade-mist);border-radius:var(--radius);font-size:13px;color:var(--jade);">
          ℹ️ Full permissions matrix and audit log coming in the next release.
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  practiceName = "Your Own CRM";
  minPassword  = 6;
  maxFails     = 5;
}
