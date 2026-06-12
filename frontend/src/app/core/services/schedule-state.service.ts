import { Injectable, signal } from "@angular/core";
import { Resource, Location, User } from "../../shared/models/admin.model";

@Injectable({ providedIn: "root" })
export class ScheduleStateService {
  // Lookup data — persists across navigation
  resources  = signal<Resource[]>([]);
  locations  = signal<Location[]>([]);
  allUsers   = signal<User[]>([]);

  // Sidebar visibility — persists across navigation
  visibleResources = signal<Record<number, boolean>>({});
  visibleStaff     = signal<Record<number, boolean>>({});

  // Schedule state
  selectedLocationId: number | null = null;
  currentDate: Date = new Date();
  view: string = "day";
  initialized = false;
}
