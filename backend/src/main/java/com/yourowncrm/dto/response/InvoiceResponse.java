package com.yourowncrm.dto.response;
import com.yourowncrm.model.enums.InvoiceStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Long customerId;
    private String customerFullName;
    private String customerPhone;
    private Long appointmentId;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private BigDecimal grossAmount;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal netAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceDue;
    private InvoiceStatus status;
    private String notes;
    private List<LineItemResponse> lineItems;

    public InvoiceResponse() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String v) { this.invoiceNumber=v; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long v) { this.customerId=v; }
    public String getCustomerFullName() { return customerFullName; }
    public void setCustomerFullName(String v) { this.customerFullName=v; }
    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String v) { this.customerPhone=v; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long v) { this.appointmentId=v; }
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
    public BigDecimal getBalanceDue() { return balanceDue; }
    public void setBalanceDue(BigDecimal v) { this.balanceDue=v; }
    public InvoiceStatus getStatus() { return status; }
    public void setStatus(InvoiceStatus v) { this.status=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
    public List<LineItemResponse> getLineItems() { return lineItems; }
    public void setLineItems(List<LineItemResponse> v) { this.lineItems=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final InvoiceResponse r = new InvoiceResponse();
        public Builder id(Long v)                  { r.id=v; return this; }
        public Builder invoiceNumber(String v)      { r.invoiceNumber=v; return this; }
        public Builder customerId(Long v)           { r.customerId=v; return this; }
        public Builder customerFullName(String v)   { r.customerFullName=v; return this; }
        public Builder customerPhone(String v)      { r.customerPhone=v; return this; }
        public Builder appointmentId(Long v)        { r.appointmentId=v; return this; }
        public Builder invoiceDate(LocalDate v)     { r.invoiceDate=v; return this; }
        public Builder dueDate(LocalDate v)         { r.dueDate=v; return this; }
        public Builder grossAmount(BigDecimal v)    { r.grossAmount=v; return this; }
        public Builder discountType(String v)       { r.discountType=v; return this; }
        public Builder discountValue(BigDecimal v)  { r.discountValue=v; return this; }
        public Builder netAmount(BigDecimal v)      { r.netAmount=v; return this; }
        public Builder paidAmount(BigDecimal v)     { r.paidAmount=v; return this; }
        public Builder balanceDue(BigDecimal v)     { r.balanceDue=v; return this; }
        public Builder status(InvoiceStatus v)      { r.status=v; return this; }
        public Builder notes(String v)              { r.notes=v; return this; }
        public Builder lineItems(List<LineItemResponse> v){ r.lineItems=v; return this; }
        public InvoiceResponse build() { return r; }
    }

    public static class LineItemResponse {
        private Long id;
        private String description;
        private String chargeCode;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        public LineItemResponse() {}
        public Long getId() { return id; }
        public void setId(Long v) { this.id=v; }
        public String getDescription() { return description; }
        public void setDescription(String v) { this.description=v; }
        public String getChargeCode() { return chargeCode; }
        public void setChargeCode(String v) { this.chargeCode=v; }
        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal v) { this.quantity=v; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal v) { this.unitPrice=v; }
        public BigDecimal getTotalPrice() { return totalPrice; }
        public void setTotalPrice(BigDecimal v) { this.totalPrice=v; }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final LineItemResponse li = new LineItemResponse();
            public Builder id(Long v)              { li.id=v; return this; }
            public Builder description(String v)   { li.description=v; return this; }
            public Builder chargeCode(String v)    { li.chargeCode=v; return this; }
            public Builder quantity(BigDecimal v)  { li.quantity=v; return this; }
            public Builder unitPrice(BigDecimal v) { li.unitPrice=v; return this; }
            public Builder totalPrice(BigDecimal v){ li.totalPrice=v; return this; }
            public LineItemResponse build() { return li; }
        }
    }
}
