import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";
import { AppComponent } from "./app/app.component";
import { OverlayContainer } from "@angular/cdk/overlay";

bootstrapApplication(AppComponent, appConfig).then(appRef => {
  // Get the CDK overlay container and force it to body level
  const overlayContainer = appRef.injector.get(OverlayContainer);
  const el = overlayContainer.getContainerElement();

  // Move to body if not already there
  if (el.parentElement !== document.body) {
    document.body.appendChild(el);
  }

  // Force correct CSS so it covers full viewport
  el.style.position   = "fixed";
  el.style.top        = "0";
  el.style.left       = "0";
  el.style.width      = "100%";
  el.style.height     = "100%";
  el.style.zIndex     = "1000";
  el.style.pointerEvents = "none";

}).catch(err => console.error(err));
