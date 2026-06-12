import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Invoice, ReportSummary } from "../../shared/models/invoice.model";

@Injectable({ providedIn: "root" })
export class BillingService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}

  // ── Invoices ─────────────────────────────────────────────────
  getInvoices(params?: any): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.base}/invoices`, { params });
  }
  getInvoice(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.base}/invoices/${id}`);
  }
  createInvoice(req: any): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base}/invoices`, req);
  }
  updateInvoice(id: number, req: any): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.base}/invoices/${id}`, req);
  }
  voidInvoice(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/invoices/${id}`);
  }
  generateFromAppointment(apptId: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.base}/invoices/from-appointment/${apptId}`, {});
  }

  // ── Payments ─────────────────────────────────────────────────
  getPayments(params?: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/payments`, { params });
  }
  postPayment(req: any): Observable<any> {
    return this.http.post<any>(`${this.base}/payments`, req);
  }

  // ── Reports ──────────────────────────────────────────────────
  getDailyReport(date: string): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.base}/reports/daily`,
      { params: new HttpParams().set("date", date) });
  }
  getMonthlyReport(year: number, month: number): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.base}/reports/monthly`,
      { params: new HttpParams().set("year", String(year)).set("month", String(month)) });
  }
  getYtdReport(year: number): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.base}/reports/ytd`,
      { params: new HttpParams().set("year", String(year)) });
  }
}
