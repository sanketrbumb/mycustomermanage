package com.yourowncrm.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "refunds")
public class Refund {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "refund_number", nullable = false, length = 30)
    private String refundNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Column(precision = 10, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(length = 200)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "refund_date", nullable = false)
    private LocalDate refundDate = LocalDate.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public Refund() {}

    public Long      getId()           { return id; }
    public UUID      getTenantId()     { return tenantId; }
    public void      setTenantId(UUID v)   { this.tenantId = v; }
    public String    getRefundNumber() { return refundNumber; }
    public void      setRefundNumber(String v) { this.refundNumber = v; }
    public Payment   getPayment()      { return payment; }
    public void      setPayment(Payment v)   { this.payment = v; }
    public BigDecimal getAmount()      { return amount; }
    public void      setAmount(BigDecimal v) { this.amount = v; }
    public String    getReason()       { return reason; }
    public void      setReason(String v)     { this.reason = v; }
    public String    getNotes()        { return notes; }
    public void      setNotes(String v)      { this.notes = v; }
    public LocalDate getRefundDate()   { return refundDate; }
    public void      setRefundDate(LocalDate v) { this.refundDate = v; }
    public User      getCreatedBy()    { return createdBy; }
    public void      setCreatedBy(User v)    { this.createdBy = v; }
    public Instant   getCreatedAt()    { return createdAt; }
}
