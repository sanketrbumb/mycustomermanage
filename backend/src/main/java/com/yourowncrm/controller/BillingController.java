package com.yourowncrm.controller;

import com.yourowncrm.dto.request.InvoiceRequest;
import com.yourowncrm.dto.request.PaymentRequest;
import com.yourowncrm.dto.response.InvoiceResponse;
import com.yourowncrm.dto.response.ReportSummary;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.BillingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

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
    @GetMapping("/api/payments")
    public List<com.yourowncrm.dto.response.PaymentResponse> getPayments(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) Long invoiceId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<com.yourowncrm.dto.response.PaymentResponse> all = service.getPayments(tenantId(token), invoiceId, from, to);
        if (q == null || q.isBlank()) return all;
        String ql = q.toLowerCase();
        return all.stream().filter(p ->
            (p.paymentNumber != null && p.paymentNumber.toLowerCase().contains(ql)) ||
            (p.customerFullName != null && p.customerFullName.toLowerCase().contains(ql)) ||
            (p.reference != null && p.reference.toLowerCase().contains(ql))
        ).toList();
    }

    @PostMapping("/api/payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','MANAGER','STAFF')")
    @ResponseStatus(HttpStatus.CREATED)
    public void postPayment(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody PaymentRequest req) {
        log.info("PAYMENT_POST: customerId={} method={} amount={} invoiceIds={} paymentDate={}",
                req.getCustomerId(),
                req.getMethod(),
                req.getAmount(),
                req.getInvoiceIds(),
                req.getPaymentDate());
        try {
            service.postPayment(tenantId(token), req, userId(token));
            log.info("PAYMENT_POST: SUCCESS customerId={} amount={}", req.getCustomerId(), req.getAmount());
        } catch (Exception e) {
            log.error("PAYMENT_POST: FAILED customerId={} amount={} method={} error={}",
                    req.getCustomerId(), req.getAmount(), req.getMethod(), e.getMessage(), e);
            throw e; // re-throw so Spring still returns the correct error response
        }
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
