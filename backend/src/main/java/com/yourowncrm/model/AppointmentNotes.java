package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appointment_notes")
public class AppointmentNotes {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(columnDefinition = "TEXT") private String subjective;
    @Column(columnDefinition = "TEXT") private String objective;
    @Column(columnDefinition = "TEXT") private String assessment;
    @Column(columnDefinition = "TEXT") private String plan;
    @Column(name = "chief_complaint", length = 300) private String chiefComplaint;
    @Column(columnDefinition = "TEXT") private String followup;
    @Column(columnDefinition = "TEXT") private String treatment;
    @Column(name = "products_used", columnDefinition = "TEXT") private String products;
    @Column(name = "therapist_initials", length = 10) private String therapistInitials;

    @Column(name = "created_by") private Long createdBy;
    @Column(name = "updated_by") private Long updatedBy;
    @Column(name = "created_at", insertable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", insertable = false, updatable = false) private Instant updatedAt;

    public AppointmentNotes() {}
    public Long getId() { return id; }
    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long v) { this.appointmentId = v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId = v; }
    public String getSubjective() { return subjective; }
    public void setSubjective(String v) { this.subjective = v; }
    public String getObjective() { return objective; }
    public void setObjective(String v) { this.objective = v; }
    public String getAssessment() { return assessment; }
    public void setAssessment(String v) { this.assessment = v; }
    public String getPlan() { return plan; }
    public void setPlan(String v) { this.plan = v; }
    public String getChiefComplaint() { return chiefComplaint; }
    public void setChiefComplaint(String v) { this.chiefComplaint = v; }
    public String getFollowup() { return followup; }
    public void setFollowup(String v) { this.followup = v; }
    public String getTreatment() { return treatment; }
    public void setTreatment(String v) { this.treatment = v; }
    public String getProducts() { return products; }
    public void setProducts(String v) { this.products = v; }
    public String getTherapistInitials() { return therapistInitials; }
    public void setTherapistInitials(String v) { this.therapistInitials = v; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long v) { this.createdBy = v; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long v) { this.updatedBy = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
