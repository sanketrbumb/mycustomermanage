package com.yourowncrm.model;
import com.yourowncrm.model.enums.InvoiceStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity @Table(name="invoices")
public class Invoice extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(name="invoice_number", nullable=false, unique=true, length=30) private String invoiceNumber;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="customer_id", nullable=false) private Customer customer;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="appointment_id") private Appointment appointment;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="location_id") private Location location;
    @Column(name="invoice_date", nullable=false) private LocalDate invoiceDate = LocalDate.now();
    @Column(name="due_date") private LocalDate dueDate;
    @Column(name="gross_amount", precision=10, scale=2) private BigDecimal grossAmount = BigDecimal.ZERO;
    @Column(name="discount_type", length=10) private String discountType = "NONE";
    @Column(name="discount_value", precision=10, scale=2) private BigDecimal discountValue = BigDecimal.ZERO;
    @Column(name="net_amount", precision=10, scale=2) private BigDecimal netAmount = BigDecimal.ZERO;
    @Column(name="paid_amount", precision=10, scale=2) private BigDecimal paidAmount = BigDecimal.ZERO;
    @Enumerated(EnumType.STRING) @Column(nullable=false, columnDefinition="VARCHAR(10)") private InvoiceStatus status = InvoiceStatus.DRAFT;
    @Column(columnDefinition="TEXT") private String notes;
    @Column(name="voided_at") private Instant voidedAt;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="voided_by") private User voidedBy;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by") private User createdBy;
    @OneToMany(mappedBy="invoice", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<InvoiceLineItem> lineItems = new ArrayList<>();

    public Invoice() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String v) { this.invoiceNumber=v; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer v) { this.customer=v; }
    public Appointment getAppointment() { return appointment; }
    public void setAppointment(Appointment v) { this.appointment=v; }
    public Location getLocation() { return location; }
    public void setLocation(Location v) { this.location=v; }
    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate v) { this.invoiceDate=v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { this.dueDate=v; }
    public BigDecimal getGrossAmount() { return grossAmount; }
    public void setGrossAmount(BigDecimal v) { this.grossAmount=v; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String v) { this.discountType=v; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal v) { this.discountValue=v; }
    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal v) { this.netAmount=v; }
    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal v) { this.paidAmount=v; }
    public InvoiceStatus getStatus() { return status; }
    public void setStatus(InvoiceStatus v) { this.status=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
    public Instant getVoidedAt() { return voidedAt; }
    public void setVoidedAt(Instant v) { this.voidedAt=v; }
    public User getVoidedBy() { return voidedBy; }
    public void setVoidedBy(User v) { this.voidedBy=v; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User v) { this.createdBy=v; }
    public List<InvoiceLineItem> getLineItems() { return lineItems; }
    public void setLineItems(List<InvoiceLineItem> v) { this.lineItems=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final Invoice i = new Invoice();
        public Builder tenantId(UUID v)         { i.tenantId=v; return this; }
        public Builder invoiceNumber(String v)   { i.invoiceNumber=v; return this; }
        public Builder customer(Customer v)      { i.customer=v; return this; }
        public Builder invoiceDate(LocalDate v)  { i.invoiceDate=v; return this; }
        public Builder dueDate(LocalDate v)      { i.dueDate=v; return this; }
        public Builder discountType(String v)    { i.discountType=v; return this; }
        public Builder discountValue(BigDecimal v){ i.discountValue=v; return this; }
        public Builder notes(String v)           { i.notes=v; return this; }
        public Builder status(InvoiceStatus v)   { i.status=v; return this; }
        public Invoice build() { return i; }
    }
}
