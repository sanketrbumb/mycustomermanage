package com.yourowncrm.model;
import com.yourowncrm.model.enums.PaymentMethod;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity @Table(name="payments")
public class Payment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(name="payment_number", nullable=false, length=30) private String paymentNumber;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="customer_id", nullable=false) private Customer customer;
    @Enumerated(EnumType.STRING) @Column(nullable=false, columnDefinition="VARCHAR(10)") private PaymentMethod method = PaymentMethod.CARD;
    @Column(precision=10, scale=2, nullable=false) private BigDecimal amount;
    @Column(name="payment_date", nullable=false) private LocalDate paymentDate = LocalDate.now();
    @Column(length=100) private String reference;
    @Column(columnDefinition="TEXT") private String notes;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by") private User createdBy;
    @Column(name="created_at") private Instant createdAt = Instant.now();
    @OneToMany(mappedBy="payment", cascade=CascadeType.ALL, orphanRemoval=true)
    private List<PaymentInvoiceLink> invoiceLinks = new ArrayList<>();

    public Payment() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getPaymentNumber() { return paymentNumber; }
    public void setPaymentNumber(String v) { this.paymentNumber=v; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer v) { this.customer=v; }
    public PaymentMethod getMethod() { return method; }
    public void setMethod(PaymentMethod v) { this.method=v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount=v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { this.paymentDate=v; }
    public String getReference() { return reference; }
    public void setReference(String v) { this.reference=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User v) { this.createdBy=v; }
    public Instant getCreatedAt() { return createdAt; }
    public List<PaymentInvoiceLink> getInvoiceLinks() { return invoiceLinks; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final Payment p = new Payment();
        public Builder tenantId(UUID v)          { p.tenantId=v; return this; }
        public Builder paymentNumber(String v)    { p.paymentNumber=v; return this; }
        public Builder customer(Customer v)       { p.customer=v; return this; }
        public Builder method(PaymentMethod v)    { p.method=v; return this; }
        public Builder amount(BigDecimal v)       { p.amount=v; return this; }
        public Builder paymentDate(LocalDate v)   { p.paymentDate=v; return this; }
        public Builder reference(String v)        { p.reference=v; return this; }
        public Builder notes(String v)            { p.notes=v; return this; }
        public Payment build() { return p; }
    }
}
