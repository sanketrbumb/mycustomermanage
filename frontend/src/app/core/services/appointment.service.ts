import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Appointment, AppointmentRequest, AvailabilityConflict } from "../../shared/models/appointment.model";

@Injectable({ providedIn: "root" })
export class AppointmentService {
  private base = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  getDailySchedule(date: string, locationId?: number): Observable<Appointment[]> {
    let p = new HttpParams().set("date", date);
    if (locationId) p = p.set("locationId", locationId);
    return this.http.get<Appointment[]>(`${this.base}/daily`, { params: p });
  }

  checkAvailability(req: AppointmentRequest): Observable<AvailabilityConflict> {
    return this.http.post<AvailabilityConflict>(`${this.base}/check-availability`, req);
  }

  create(req: AppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(this.base, req);
  }

  update(id: number, req: AppointmentRequest): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.base}/${id}`, req);
  }

  cancel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
