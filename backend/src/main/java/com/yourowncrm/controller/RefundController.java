package com.yourowncrm.controller;

import com.yourowncrm.dto.response.PaymentResponse;
import com.yourowncrm.dto.response.RefundResponse;
import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.Payment;
import com.yourowncrm.model.Refund;
import com.yourowncrm.model.User;
import com.yourowncrm.repository.PaymentRepository;
import com.yourowncrm.repository.RefundRepository;
import com.yourowncrm.repository.UserRepository;
import com.yourowncrm.security.JwtTokenProvider;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    private static final Logger log = LoggerFactory.getLogger(RefundController.class);

    private final RefundRepository  refundRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository    userRepo;
    private final JwtTokenProvider  jwtProvider;

    @Autowired
    public RefundController(RefundRepository refundRepo,
                            PaymentRepository paymentRepo,
                            UserRepository userRepo,
                            JwtTokenProvider jwtProvider) {
        this.refundRepo  = refundRepo;
        this.paymentRepo = paymentRepo;
        this.userRepo    = userRepo;
        this.jwtProvider = jwtProvider;
    }

    /** GET /api/refunds — list all refunds, optionally filtered by date range */
    @GetMapping
    public List<RefundResponse> list(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        List<Refund> refunds;

        if (from != null && to != null) {
            refunds = refundRepo.findByDateRange(tenantId,
                    LocalDate.parse(from), LocalDate.parse(to));
        } else {
            refunds = refundRepo.findAllForTenant(tenantId);
        }
        return refunds.stream().map(this::toResponse).toList();
    }

    /** GET /api/refunds/payment/{paymentId} — refunds for a specific payment */
    @GetMapping("/payment/{paymentId}")
    public List<RefundResponse> forPayment(
            @RequestHeader("Authorization") String token,
            @PathVariable Long paymentId) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        return refundRepo.findAllForTenant(tenantId).stream()
                .filter(r -> r.getPayment().getId().equals(paymentId))
                .map(this::toResponse)
                .toList();
    }

    /** POST /api/refunds — issue a new refund against a payment */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RefundResponse issue(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody RefundRequest req) {

        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Long userId   = jwtProvider.getUserId(token.substring(7));

        Payment payment = paymentRepo.findById(req.getPaymentId())
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new BusinessException("Payment not found: " + req.getPaymentId()));

        // Validate: refund cannot exceed original payment minus already-refunded
        BigDecimal alreadyRefunded = refundRepo.totalRefundedForPayment(tenantId, req.getPaymentId());
        BigDecimal maxRefundable   = payment.getAmount().subtract(alreadyRefunded);

        if (req.getAmount().compareTo(maxRefundable) > 0) {
            throw new BusinessException(
                "Refund amount " + req.getAmount() + " exceeds refundable balance " + maxRefundable
                + " (original: " + payment.getAmount() + ", already refunded: " + alreadyRefunded + ")"
            );
        }
        if (req.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Refund amount must be greater than zero.");
        }

        // Generate refund number
        int seq = refundRepo.findMaxRefundSequence(tenantId) + 1;
        String refundNumber = String.format("REF-%05d", seq);

        Refund refund = new Refund();
        refund.setTenantId(tenantId);
        refund.setRefundNumber(refundNumber);
        refund.setPayment(payment);
        refund.setAmount(req.getAmount());
        refund.setReason(req.getReason());
        refund.setNotes(req.getNotes());
        refund.setRefundDate(req.getRefundDate() != null ? req.getRefundDate() : LocalDate.now());
        userRepo.findById(userId).ifPresent(refund::setCreatedBy);

        Refund saved = refundRepo.save(refund);
        log.info("Refund {} issued for payment {} (amount: {})", refundNumber, payment.getPaymentNumber(), req.getAmount());
        return toResponse(saved);
    }

    /** DELETE /api/refunds/{id} — void a refund (admin only) */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void voidRefund(
            @RequestHeader("Authorization") String token,
            @PathVariable Long id) {
        UUID tenantId = jwtProvider.getTenantId(token.substring(7));
        Refund r = refundRepo.findById(id)
                .filter(ref -> ref.getTenantId().equals(tenantId))
                .orElseThrow(() -> new BusinessException("Refund not found: " + id));
        refundRepo.delete(r);
        log.info("Refund {} deleted", r.getRefundNumber());
    }

    private RefundResponse toResponse(Refund r) {
        RefundResponse res = new RefundResponse();
        res.id                    = r.getId();
        res.refundNumber          = r.getRefundNumber();
        res.paymentId             = r.getPayment().getId();
        res.paymentNumber         = r.getPayment().getPaymentNumber();
        res.customerId            = r.getPayment().getCustomer().getId();
        res.customerFullName      = r.getPayment().getCustomer().getFirstName()
                                  + " " + r.getPayment().getCustomer().getLastName();
        res.amount                = r.getAmount();
        res.originalPaymentAmount = r.getPayment().getAmount();
        res.totalRefunded         = refundRepo.totalRefundedForPayment(r.getTenantId(), r.getPayment().getId());
        res.reason                = r.getReason();
        res.notes                 = r.getNotes();
        res.refundDate            = r.getRefundDate();
        res.createdByName         = r.getCreatedBy() != null
                ? r.getCreatedBy().getFirstName() + " " + r.getCreatedBy().getLastName()
                : null;
        return res;
    }

    /** Request body for issuing a refund */
    public static class RefundRequest {
        @NotNull public Long paymentId;
        @NotNull @DecimalMin("0.01") public BigDecimal amount;
        public String reason;
        public String notes;
        public LocalDate refundDate;

        public Long        getPaymentId()  { return paymentId; }
        public BigDecimal  getAmount()     { return amount; }
        public String      getReason()     { return reason; }
        public String      getNotes()      { return notes; }
        public LocalDate   getRefundDate() { return refundDate; }
    }
}
