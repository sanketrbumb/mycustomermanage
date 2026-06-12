package com.yourowncrm.model;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.UUID;

@Entity @Table(name="appointments")
public class Appointment extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="customer_id", nullable=false) private Customer customer;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="resource_id") private Resource resource;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="staff_resource_id") private User staffResource;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="staff_id") private User staff;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="location_id") private Location location;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="visit_type_id") private VisitType visitType;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="visit_status_id", nullable=false) private VisitStatus visitStatus;
    @Column(name="appt_date", nullable=false) private LocalDate apptDate;
    @Column(name="start_time", nullable=false) private LocalTime startTime;
    @Column(name="end_time", nullable=false) private LocalTime endTime;
    @Column(name="duration_min", nullable=false) private short durationMin;
    @Column(name="charge_amount", precision=10, scale=2) private BigDecimal chargeAmount = BigDecimal.ZERO;
    @Column(columnDefinition="TEXT") private String notes;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="soap_notes", columnDefinition="jsonb") private Map<String,String> soapNotes;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="invoice_id") private Invoice invoice;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="created_by") private User createdBy;
    @Column(name = "updated_by") private Long updatedBy;
    @Column(name = "deleted_by") private Long deletedBy;
    @Column(name = "deleted_at") private java.time.Instant deletedAt;
    public Long    getUpdatedBy()           { return updatedBy; }
    public void    setUpdatedBy(Long v)     { this.updatedBy = v; }
    public Long    getDeletedBy()           { return deletedBy; }
    public void    setDeletedBy(Long v)     { this.deletedBy = v; }
    public java.time.Instant getDeletedAt() { return deletedAt; }
    public void    setDeletedAt(java.time.Instant v) { this.deletedAt = v; }

    public Appointment() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer v) { this.customer=v; }
    public Resource getResource() { return resource; }
    public void setResource(Resource v) { this.resource=v; }
    public User getStaffResource() { return staffResource; }
    public void setStaffResource(User v) { this.staffResource=v; }
    public User getStaff() { return staff; }
    public void setStaff(User v) { this.staff=v; }
    public Location getLocation() { return location; }
    public void setLocation(Location v) { this.location=v; }
    public VisitType getVisitType() { return visitType; }
    public void setVisitType(VisitType v) { this.visitType=v; }
    public VisitStatus getVisitStatus() { return visitStatus; }
    public void setVisitStatus(VisitStatus v) { this.visitStatus=v; }
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
    public Map<String,String> getSoapNotes() { return soapNotes; }
    public void setSoapNotes(Map<String,String> v) { this.soapNotes=v; }
    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice v) { this.invoice=v; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User v) { this.createdBy=v; }
}
