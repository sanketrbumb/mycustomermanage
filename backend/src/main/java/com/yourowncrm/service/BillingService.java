package com.yourowncrm.service;

import com.yourowncrm.dto.request.InvoiceRequest;
import com.yourowncrm.dto.request.PaymentRequest;
import com.yourowncrm.dto.response.InvoiceResponse;
import com.yourowncrm.dto.response.ReportSummary;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BillingService {
    InvoiceResponse  generateInvoiceFromAppointment(UUID tenantId, Long appointmentId, Long userId);
    InvoiceResponse  createInvoice(UUID tenantId, InvoiceRequest req, Long userId);
    InvoiceResponse  updateInvoice(UUID tenantId, Long invoiceId, InvoiceRequest req, Long userId);
    InvoiceResponse  voidInvoice(UUID tenantId, Long invoiceId, Long userId);
    InvoiceResponse  getInvoice(UUID tenantId, Long invoiceId);
    List<InvoiceResponse> getInvoices(UUID tenantId, LocalDate from, LocalDate to);

    void             postPayment(UUID tenantId, PaymentRequest req, Long userId);

    ReportSummary    getDailyReport(UUID tenantId, LocalDate date);
    ReportSummary    getMonthlyReport(UUID tenantId, int year, int month);
    ReportSummary    getYtdReport(UUID tenantId, int year);
}
