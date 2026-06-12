package com.yourowncrm.model;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name="visit_types")
public class VisitType extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(nullable=false, length=100) private String name;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="charge_code_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private ChargeCode chargeCode;
    @Column(name="default_price", precision=10, scale=2) private BigDecimal defaultPrice = BigDecimal.ZERO;
    @Column(name="duration_min", nullable=false) private short durationMin = 60;
    @Column(name="color_hex", length=7) private String colorHex = "#1a4a3a";
    @Column(nullable=false) private boolean active = true;

    public VisitType() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getName() { return name; }
    public void setName(String v) { this.name=v; }
    public ChargeCode getChargeCode() { return chargeCode; }
    public void setChargeCode(ChargeCode v) { this.chargeCode=v; }
    public BigDecimal getDefaultPrice() { return defaultPrice; }
    public void setDefaultPrice(BigDecimal v) { this.defaultPrice=v; }
    public short getDurationMin() { return durationMin; }
    public void setDurationMin(short v) { this.durationMin=v; }
    public String getColorHex() { return colorHex; }
    public void setColorHex(String v) { this.colorHex=v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active=v; }


    // ── Audit fields ────────────────────────────────────────────
    @Column(name = "created_by", updatable = false) private Long createdBy;
    @Column(name = "updated_by") private Long updatedBy;
    @Column(name = "deleted_by") private Long deletedBy;
    @Column(name = "deleted_at") private java.time.Instant deletedAt;

    public Long    getCreatedBy()            { return createdBy; }
    public void    setCreatedBy(Long v)      { this.createdBy = v; }
    public Long    getUpdatedBy()            { return updatedBy; }
    public void    setUpdatedBy(Long v)      { this.updatedBy = v; }
    public Long    getDeletedBy()            { return deletedBy; }
    public void    setDeletedBy(Long v)      { this.deletedBy = v; }
    public java.time.Instant getDeletedAt()  { return deletedAt; }
    public void    setDeletedAt(java.time.Instant v) { this.deletedAt = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final VisitType vt = new VisitType();
        public Builder tenantId(UUID v)        { vt.tenantId=v; return this; }
        public Builder name(String v)           { vt.name=v; return this; }
        public Builder defaultPrice(BigDecimal v){ vt.defaultPrice=v; return this; }
        public Builder durationMin(short v)     { vt.durationMin=v; return this; }
        public Builder colorHex(String v)       { vt.colorHex=v; return this; }
        public Builder active(boolean v)        { vt.active=v; return this; }
        public VisitType build() { return vt; }
    }
}
