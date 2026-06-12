package com.yourowncrm.controller;

import com.yourowncrm.dto.request.InvoiceRequest;
import com.yourowncrm.dto.request.PaymentRequest;
import com.yourowncrm.dto.response.InvoiceResponse;
import com.yourowncrm.dto.response.ReportSummary;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.BillingService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
public class BillingController {

    private final BillingService  service;
    private final JwtTokenProvider jwtProvider;
    @org.springframework.beans.factory.annotation.Autowired
    public BillingController(BillingService service, JwtTokenProvider jwtProvider) {
        this.service = service;
        this.jwtProvider = jwtProvider;
    }


    // ── Invoices ──────────────────────────────────────────────────────
    @PostMapping("/api/invoices/from-appointment/{apptId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    public ResponseEntity<InvoiceResponse> generateFromAppt(
            @RequestHeader("Authorization") String token,
            @PathVariable Long apptId) {
        UUID tenantId = tenantId(token);
        Long userId   = userId(token);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.generateInvoiceFromAppointment(tenantId, apptId, userId));
    }

    @GetMapping("/api/invoices")
    public List<InvoiceResponse> listInvoices(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate f = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate t = to   != null ? to   : LocalDate.now();
        return service.getInvoices(tenantId(token), f, t);
    }

    @GetMapping("/api/invoices/{id}")
    public InvoiceResponse getInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        return service.getInvoice(tenantId(token), id);
    }

    @PostMapping("/api/invoices")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    public ResponseEntity<InvoiceResponse> createInvoice(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody InvoiceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createInvoice(tenantId(token), req, userId(token)));
    }

    @PutMapping("/api/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    public InvoiceResponse updateInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id,
            @Valid @RequestBody InvoiceRequest req) {
        return service.updateInvoice(tenantId(token), id, req, userId(token));
    }

    @DeleteMapping("/api/invoices/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void voidInvoice(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        service.voidInvoice(tenantId(token), id, userId(token));
    }

    // ── Payments ──────────────────────────────────────────────────────
    @PostMapping("/api/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    @ResponseStatus(HttpStatus.CREATED)
    public void postPayment(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody PaymentRequest req) {
        service.postPayment(tenantId(token), req, userId(token));
    }

    // ── Reports ───────────────────────────────────────────────────────
    @GetMapping("/api/reports/daily")
    public ReportSummary dailyReport(
            @RequestHeader("Authorization") String token,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.getDailyReport(tenantId(token), date);
    }

    @GetMapping("/api/reports/monthly")
    public ReportSummary monthlyReport(
            @RequestHeader("Authorization") String token,
            @RequestParam int year, @RequestParam int month) {
        return service.getMonthlyReport(tenantId(token), year, month);
    }

    @GetMapping("/api/reports/ytd")
    public ReportSummary ytdReport(
            @RequestHeader("Authorization") String token,
            @RequestParam int year) {
        return service.getYtdReport(tenantId(token), year);
    }

    private UUID tenantId(String header) { return jwtProvider.getTenantId(header.substring(7)); }
    private Long userId  (String header) { return jwtProvider.getUserId  (header.substring(7)); }
}
