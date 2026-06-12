package com.yourowncrm.dto.request;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class InvoiceRequest {
    @NotNull private Long customerId;
    private Long appointmentId;
    private Long locationId;
    private LocalDate dueDate;
    @NotEmpty @Valid private List<LineItemRequest> lineItems;
    private String discountType = "NONE";
    private BigDecimal discountValue = BigDecimal.ZERO;
    private String notes;

    public InvoiceRequest() {}
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long v) { this.customerId=v; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long v) { this.appointmentId=v; }
    public Long getLocationId() { return locationId; }
    public void setLocationId(Long v) { this.locationId=v; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate v) { this.dueDate=v; }
    public List<LineItemRequest> getLineItems() { return lineItems; }
    public void setLineItems(List<LineItemRequest> v) { this.lineItems=v; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String v) { this.discountType=v; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal v) { this.discountValue=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }

    public static class LineItemRequest {
        @NotBlank private String description;
        private Long chargeCodeId;
        private String chargeCode;
        private BigDecimal quantity = BigDecimal.ONE;
        @NotNull private BigDecimal unitPrice;
        public LineItemRequest() {}
        public String getDescription() { return description; }
        public void setDescription(String v) { this.description=v; }
        public Long getChargeCodeId() { return chargeCodeId; }
        public void setChargeCodeId(Long v) { this.chargeCodeId=v; }
        public String getChargeCode() { return chargeCode; }
        public void setChargeCode(String v) { this.chargeCode=v; }
        public BigDecimal getQuantity() { return quantity; }
        public void setQuantity(BigDecimal v) { this.quantity=v; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public void setUnitPrice(BigDecimal v) { this.unitPrice=v; }
    }
}
