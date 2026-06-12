package com.yourowncrm.model;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name="invoice_line_items")
public class InvoiceLineItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id", nullable=false) private Invoice invoice;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="charge_code_id") private ChargeCode chargeCode;
    @Column(nullable=false, length=200) private String description;
    @Column(name="charge_code", length=30) private String chargeCodeStr;
    @Column(precision=8, scale=2) private BigDecimal quantity = BigDecimal.ONE;
    @Column(name="unit_price", precision=10, scale=2) private BigDecimal unitPrice = BigDecimal.ZERO;
    @Column(name="sort_order") private short sortOrder = 0;

    public InvoiceLineItem() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice v) { this.invoice=v; }
    public ChargeCode getChargeCode() { return chargeCode; }
    public void setChargeCode(ChargeCode v) { this.chargeCode=v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description=v; }
    public String getChargeCodeStr() { return chargeCodeStr; }
    public void setChargeCodeStr(String v) { this.chargeCodeStr=v; }
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal v) { this.quantity=v; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal v) { this.unitPrice=v; }
    public short getSortOrder() { return sortOrder; }
    public void setSortOrder(short v) { this.sortOrder=v; }
    public BigDecimal getTotalPrice() { return unitPrice.multiply(quantity); }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final InvoiceLineItem li = new InvoiceLineItem();
        public Builder invoice(Invoice v)       { li.invoice=v; return this; }
        public Builder chargeCode(ChargeCode v) { li.chargeCode=v; return this; }
        public Builder description(String v)    { li.description=v; return this; }
        public Builder chargeCodeStr(String v)  { li.chargeCodeStr=v; return this; }
        public Builder quantity(BigDecimal v)   { li.quantity=v; return this; }
        public Builder unitPrice(BigDecimal v)  { li.unitPrice=v; return this; }
        public Builder sortOrder(short v)       { li.sortOrder=v; return this; }
        public InvoiceLineItem build() { return li; }
    }
}
