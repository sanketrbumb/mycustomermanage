package com.yourowncrm.dto.response;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class ReportSummary {
    private String period;
    private String label;
    private int totalAppointments;
    private int completedAppointments;
    private int cancelledAppointments;
    private BigDecimal grossBilled;
    private BigDecimal totalCollected;
    private BigDecimal outstanding;
    private double completionRate;
    private Map<String, BigDecimal> revenueByVisitType;
    private Map<String, Integer> appointmentsByStatus;
    private List<ResourceUtilization> resourceUtilization;

    public ReportSummary() {}
    public String getPeriod() { return period; }
    public void setPeriod(String v) { this.period=v; }
    public String getLabel() { return label; }
    public void setLabel(String v) { this.label=v; }
    public int getTotalAppointments() { return totalAppointments; }
    public void setTotalAppointments(int v) { this.totalAppointments=v; }
    public int getCompletedAppointments() { return completedAppointments; }
    public void setCompletedAppointments(int v) { this.completedAppointments=v; }
    public int getCancelledAppointments() { return cancelledAppointments; }
    public void setCancelledAppointments(int v) { this.cancelledAppointments=v; }
    public BigDecimal getGrossBilled() { return grossBilled; }
    public void setGrossBilled(BigDecimal v) { this.grossBilled=v; }
    public BigDecimal getTotalCollected() { return totalCollected; }
    public void setTotalCollected(BigDecimal v) { this.totalCollected=v; }
    public BigDecimal getOutstanding() { return outstanding; }
    public void setOutstanding(BigDecimal v) { this.outstanding=v; }
    public double getCompletionRate() { return completionRate; }
    public void setCompletionRate(double v) { this.completionRate=v; }
    public Map<String, BigDecimal> getRevenueByVisitType() { return revenueByVisitType; }
    public void setRevenueByVisitType(Map<String, BigDecimal> v) { this.revenueByVisitType=v; }
    public Map<String, Integer> getAppointmentsByStatus() { return appointmentsByStatus; }
    public void setAppointmentsByStatus(Map<String, Integer> v) { this.appointmentsByStatus=v; }
    public List<ResourceUtilization> getResourceUtilization() { return resourceUtilization; }
    public void setResourceUtilization(List<ResourceUtilization> v) { this.resourceUtilization=v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final ReportSummary r = new ReportSummary();
        public Builder period(String v)                            { r.period=v; return this; }
        public Builder label(String v)                             { r.label=v; return this; }
        public Builder totalAppointments(int v)                    { r.totalAppointments=v; return this; }
        public Builder completedAppointments(int v)                { r.completedAppointments=v; return this; }
        public Builder cancelledAppointments(int v)                { r.cancelledAppointments=v; return this; }
        public Builder grossBilled(BigDecimal v)                   { r.grossBilled=v; return this; }
        public Builder totalCollected(BigDecimal v)                { r.totalCollected=v; return this; }
        public Builder outstanding(BigDecimal v)                   { r.outstanding=v; return this; }
        public Builder completionRate(double v)                    { r.completionRate=v; return this; }
        public Builder revenueByVisitType(Map<String,BigDecimal> v){ r.revenueByVisitType=v; return this; }
        public Builder appointmentsByStatus(Map<String,Integer> v) { r.appointmentsByStatus=v; return this; }
        public Builder resourceUtilization(List<ResourceUtilization> v){ r.resourceUtilization=v; return this; }
        public ReportSummary build() { return r; }
    }

    public static class ResourceUtilization {
        private Long entityId;
        private String entityName;
        private String entityType;
        private int totalMinutes;
        private int appointmentCount;
        public ResourceUtilization() {}
        public Long getEntityId() { return entityId; }
        public void setEntityId(Long v) { this.entityId=v; }
        public String getEntityName() { return entityName; }
        public void setEntityName(String v) { this.entityName=v; }
        public String getEntityType() { return entityType; }
        public void setEntityType(String v) { this.entityType=v; }
        public int getTotalMinutes() { return totalMinutes; }
        public void setTotalMinutes(int v) { this.totalMinutes=v; }
        public int getAppointmentCount() { return appointmentCount; }
        public void setAppointmentCount(int v) { this.appointmentCount=v; }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private final ResourceUtilization u = new ResourceUtilization();
            public Builder entityId(Long v)          { u.entityId=v; return this; }
            public Builder entityName(String v)      { u.entityName=v; return this; }
            public Builder entityType(String v)      { u.entityType=v; return this; }
            public Builder totalMinutes(int v)       { u.totalMinutes=v; return this; }
            public Builder appointmentCount(int v)   { u.appointmentCount=v; return this; }
            public ResourceUtilization build() { return u; }
        }
    }
}
