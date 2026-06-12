package com.yourowncrm.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public class AppointmentRequest {
    @NotNull private Long customerId;
    private Long resourceId;
    private Long staffResourceId;
    private Long staffId;
    private Long locationId;
    private Long visitTypeId;
    @NotNull private Long visitStatusId;
    @NotNull private LocalDate apptDate;
    @NotNull private LocalTime startTime;
    @NotNull private LocalTime endTime;
    private Long excludeAppointmentId;
    private BigDecimal chargeAmount = BigDecimal.ZERO;
    private String notes;

    public AppointmentRequest() {}
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long v) { this.customerId=v; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long v) { this.resourceId=v; }
    public Long getStaffResourceId() { return staffResourceId; }
    public void setStaffResourceId(Long v) { this.staffResourceId=v; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long v) { this.staffId=v; }
    public Long getLocationId() { return locationId; }
    public void setLocationId(Long v) { this.locationId=v; }
    public Long getVisitTypeId() { return visitTypeId; }
    public void setVisitTypeId(Long v) { this.visitTypeId=v; }
    public Long getVisitStatusId() { return visitStatusId; }
    public void setVisitStatusId(Long v) { this.visitStatusId=v; }
    public LocalDate getApptDate() { return apptDate; }
    public void setApptDate(LocalDate v) { this.apptDate=v; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { this.startTime=v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { this.endTime=v; }
    public Long getExcludeAppointmentId() { return excludeAppointmentId; }
    public void setExcludeAppointmentId(Long v) { this.excludeAppointmentId=v; }
    public BigDecimal getChargeAmount() { return chargeAmount; }
    public void setChargeAmount(BigDecimal v) { this.chargeAmount=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
}
