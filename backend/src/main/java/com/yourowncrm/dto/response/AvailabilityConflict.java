package com.yourowncrm.dto.response;
import java.time.LocalDate;
import java.time.LocalTime;

public class AvailabilityConflict {
    private boolean available;
    private String reason;
    private String conflictType; // DOUBLE_BOOK | OUTSIDE_HOURS | SAME_PATIENT_SAME_DAY
    private boolean overridable;  // true if user can click "Book Anyway"
    private Long conflictingAppointmentId;
    private String conflictingCustomerName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;

    public AvailabilityConflict() {}
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean v) { this.available=v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason=v; }
    public String getConflictType() { return conflictType; }
    public void setConflictType(String v) { this.conflictType=v; }
    public boolean isOverridable() { return overridable; }
    public void setOverridable(boolean v) { this.overridable=v; }
    public Long getConflictingAppointmentId() { return conflictingAppointmentId; }
    public void setConflictingAppointmentId(Long v) { this.conflictingAppointmentId=v; }
    public String getConflictingCustomerName() { return conflictingCustomerName; }
    public void setConflictingCustomerName(String v) { this.conflictingCustomerName=v; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate v) { this.date=v; }
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime v) { this.startTime=v; }
    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime v) { this.endTime=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final AvailabilityConflict a = new AvailabilityConflict();
        public Builder available(boolean v)                    { a.available=v; return this; }
        public Builder reason(String v)                        { a.reason=v; return this; }
        public Builder conflictType(String v)                  { a.conflictType=v; return this; }
        public Builder overridable(boolean v)                  { a.overridable=v; return this; }
        public Builder conflictingAppointmentId(Long v)        { a.conflictingAppointmentId=v; return this; }
        public Builder conflictingCustomerName(String v)       { a.conflictingCustomerName=v; return this; }
        public Builder date(LocalDate v)                       { a.date=v; return this; }
        public Builder startTime(LocalTime v)                  { a.startTime=v; return this; }
        public Builder endTime(LocalTime v)                    { a.endTime=v; return this; }
        public AvailabilityConflict build() { return a; }
    }
}
