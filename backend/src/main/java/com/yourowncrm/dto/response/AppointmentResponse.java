package com.yourowncrm.dto.response;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public class AppointmentResponse {
    private Long id;
    private Long customerId;
    private String customerFullName;
    private Long resourceId;
    private String resourceName;
    private Long staffResourceId;
    private String staffResourceName;
    private Long staffId;
    private String staffName;
    private Long locationId;
    private String locationName;
    private Long visitTypeId;
    private String visitTypeName;
    private Long   visitStatusId;
    private String visitStatusName;
    private String visitStatusColor;
    private boolean visitStatusTerminal;
    private boolean visitStatusChargeable;
    private boolean invoiceJustCreated; // true when invoice was auto-generated on this save
    private LocalDate apptDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private short durationMin;
    private BigDecimal chargeAmount;
    private String notes;
    private Long invoiceId;
    private String invoiceNumber;
    private Instant createdAt;

    public AppointmentResponse() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long v) { this.customerId=v; }
    public String getCustomerFullName() { return customerFullName; }
    public void setCustomerFullName(String v) { this.customerFullName=v; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long v) { this.resourceId=v; }
    public String getResourceName() { return resourceName; }
    public void setResourceName(String v) { this.resourceName=v; }
    public Long getStaffResourceId() { return staffResourceId; }
    public void setStaffResourceId(Long v) { this.staffResourceId=v; }
    public String getStaffResourceName() { return staffResourceName; }
    public void setStaffResourceName(String v) { this.staffResourceName=v; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long v) { this.staffId=v; }
    public String getStaffName() { return staffName; }
    public void setStaffName(String v) { this.staffName=v; }
    public Long getLocationId() { return locationId; }
    public void setLocationId(Long v) { this.locationId=v; }
    public String getLocationName() { return locationName; }
    public void setLocationName(String v) { this.locationName=v; }
    public Long getVisitTypeId() { return visitTypeId; }
    public void setVisitTypeId(Long v) { this.visitTypeId=v; }
    public String getVisitTypeName() { return visitTypeName; }
    public void setVisitTypeName(String v) { this.visitTypeName=v; }
    public Long   getVisitStatusId()    { return visitStatusId; }
    public void   setVisitStatusId(Long v)   { this.visitStatusId=v; }
    public String getVisitStatusName() { return visitStatusName; }
    public void setVisitStatusName(String v) { this.visitStatusName=v; }
    public String getVisitStatusColor() { return visitStatusColor; }
    public void setVisitStatusColor(String v) { this.visitStatusColor=v; }
    public boolean isVisitStatusTerminal() { return visitStatusTerminal; }
    public void setVisitStatusTerminal(boolean v) { this.visitStatusTerminal=v; }
    public boolean isVisitStatusChargeable() { return visitStatusChargeable; }
    public void setVisitStatusChargeable(boolean v) { this.visitStatusChargeable=v; }
    public boolean isInvoiceJustCreated() { return invoiceJustCreated; }
    public void setInvoiceJustCreated(boolean v) { this.invoiceJustCreated=v; }
    public LocalDate getApptDate() { return apptDate; }
    public void setApptDate(LocalDate v) { this.apptDate=v; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { this.startTime=v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { this.endTime=v; }
    public short getDurationMin() { return durationMin; }
    public void setDurationMin(short v) { this.durationMin=v; }
    public BigDecimal getChargeAmount() { return chargeAmount; }
    public void setChargeAmount(BigDecimal v) { this.chargeAmount=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long v) { this.invoiceId=v; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String v) { this.invoiceNumber=v; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant v) { this.createdAt=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final AppointmentResponse r = new AppointmentResponse();
        public Builder id(Long v)                  { r.id=v; return this; }
        public Builder customerId(Long v)           { r.customerId=v; return this; }
        public Builder customerFullName(String v)   { r.customerFullName=v; return this; }
        public Builder resourceId(Long v)           { r.resourceId=v; return this; }
        public Builder resourceName(String v)       { r.resourceName=v; return this; }
        public Builder staffResourceId(Long v)      { r.staffResourceId=v; return this; }
        public Builder staffResourceName(String v)  { r.staffResourceName=v; return this; }
        public Builder staffId(Long v)              { r.staffId=v; return this; }
        public Builder staffName(String v)          { r.staffName=v; return this; }
        public Builder locationId(Long v)           { r.locationId=v; return this; }
        public Builder locationName(String v)       { r.locationName=v; return this; }
        public Builder visitTypeId(Long v)          { r.visitTypeId=v; return this; }
        public Builder visitTypeName(String v)      { r.visitTypeName=v; return this; }
        public Builder visitStatusId(Long v)        { r.visitStatusId=v; return this; }
        public Builder visitStatusName(String v)    { r.visitStatusName=v; return this; }
        public Builder visitStatusColor(String v)   { r.visitStatusColor=v; return this; }
        public Builder apptDate(LocalDate v)        { r.apptDate=v; return this; }
        public Builder startTime(LocalTime v)       { r.startTime=v; return this; }
        public Builder endTime(LocalTime v)         { r.endTime=v; return this; }
        public Builder durationMin(short v)         { r.durationMin=v; return this; }
        public Builder chargeAmount(BigDecimal v)   { r.chargeAmount=v; return this; }
        public Builder notes(String v)              { r.notes=v; return this; }
        public Builder invoiceId(Long v)            { r.invoiceId=v; return this; }
        public Builder invoiceNumber(String v)      { r.invoiceNumber=v; return this; }
        public Builder createdAt(Instant v)         { r.createdAt=v; return this; }
        public AppointmentResponse build() { return r; }
    }
}
