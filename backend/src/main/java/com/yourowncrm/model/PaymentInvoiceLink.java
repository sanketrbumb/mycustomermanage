package com.yourowncrm.model;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name="payment_invoice_links")
public class PaymentInvoiceLink {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="payment_id", nullable=false) private Payment payment;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id", nullable=false) private Invoice invoice;
    @Column(name="amount_applied", precision=10, scale=2, nullable=false) private BigDecimal amountApplied;

    public PaymentInvoiceLink() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public Payment getPayment() { return payment; }
    public void setPayment(Payment v) { this.payment=v; }
    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice v) { this.invoice=v; }
    public BigDecimal getAmountApplied() { return amountApplied; }
    public void setAmountApplied(BigDecimal v) { this.amountApplied=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final PaymentInvoiceLink l = new PaymentInvoiceLink();
        public Builder payment(Payment v)        { l.payment=v; return this; }
        public Builder invoice(Invoice v)        { l.invoice=v; return this; }
        public Builder amountApplied(BigDecimal v){ l.amountApplied=v; return this; }
        public PaymentInvoiceLink build() { return l; }
    }
}
