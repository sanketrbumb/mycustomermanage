import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { User, Resource, VisitType, VisitStatus, Location, Customer } from "../../shared/models/admin.model";

@Injectable({ providedIn: "root" })
export class AdminService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Users ─────────────────────────────────────────────────
  getUsers():                          Observable<User[]>   { return this.http.get<User[]>(`${this.base}/users`); }
  createUser(u: any):                  Observable<User>     { return this.http.post<User>(`${this.base}/users`, u); }
  updateUser(id: number, u: any):      Observable<User>     { return this.http.put<User>(`${this.base}/users/${id}`, u); }
  deleteUser(id: number):              Observable<void>     { return this.http.delete<void>(`${this.base}/users/${id}`); }
  getRoles():                          Observable<any[]>    { return this.http.get<any[]>(`${this.base}/roles`); }

  // ── Resources ─────────────────────────────────────────────
  getResources():                      Observable<Resource[]>  { return this.http.get<Resource[]>(`${this.base}/resources`); }
  createResource(r: any):              Observable<Resource>    { return this.http.post<Resource>(`${this.base}/resources`, r); }
  updateResource(id: number, r: any):  Observable<Resource>    { return this.http.put<Resource>(`${this.base}/resources/${id}`, r); }

  // ── Visit Types ───────────────────────────────────────────
  getVisitTypes():                     Observable<VisitType[]>  { return this.http.get<VisitType[]>(`${this.base}/visit-types`); }
  createVisitType(v: any):             Observable<VisitType>    { return this.http.post<VisitType>(`${this.base}/visit-types`, v); }
  updateVisitType(id: number, v: any): Observable<VisitType>    { return this.http.put<VisitType>(`${this.base}/visit-types/${id}`, v); }

  // ── Visit Statuses ────────────────────────────────────────
  getVisitStatuses():                  Observable<VisitStatus[]> { return this.http.get<VisitStatus[]>(`${this.base}/visit-statuses`); }
  createVisitStatus(s: any):           Observable<VisitStatus>   { return this.http.post<VisitStatus>(`${this.base}/visit-statuses`, s); }
  updateVisitStatus(id: number, s: any): Observable<VisitStatus> { return this.http.put<VisitStatus>(`${this.base}/visit-statuses/${id}`, s); }

  // ── Locations ─────────────────────────────────────────────
  getLocations():                      Observable<Location[]>  { return this.http.get<Location[]>(`${this.base}/locations`); }
  createLocation(l: any):              Observable<Location>    { return this.http.post<Location>(`${this.base}/locations`, l); }
  updateLocation(id: number, l: any):  Observable<Location>    { return this.http.put<Location>(`${this.base}/locations/${id}`, l); }

  // ── Customers ─────────────────────────────────────────────
  searchCustomers(q: string):          Observable<Customer[]>  {
    return this.http.get<Customer[]>(`${this.base}/customers`, { params: { q } });
  }
  getCustomer(id: number):             Observable<Customer>    { return this.http.get<Customer>(`${this.base}/customers/${id}`); }
  createCustomer(c: any):              Observable<Customer>    { return this.http.post<Customer>(`${this.base}/customers`, c); }
  updateCustomer(id: number, c: any):  Observable<Customer>    { return this.http.put<Customer>(`${this.base}/customers/${id}`, c); }
}
