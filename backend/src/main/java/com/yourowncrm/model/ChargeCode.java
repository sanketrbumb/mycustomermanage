package com.yourowncrm.model;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name="charge_codes")
public class ChargeCode extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(nullable=false, length=30) private String code;
    @Column(nullable=false, length=200) private String description;
    @Column(length=60) private String category = "Service";
    @Column(name="unit_price", precision=10, scale=2) private BigDecimal unitPrice = BigDecimal.ZERO;
    @Column(length=40) private String unit;
    @Column(nullable=false) private boolean active = true;

    public ChargeCode() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getCode() { return code; }
    public void setCode(String v) { this.code=v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description=v; }
    public String getCategory() { return category; }
    public void setCategory(String v) { this.category=v; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal v) { this.unitPrice=v; }
    public String getUnit() { return unit; }
    public void setUnit(String v) { this.unit=v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active=v; }

    // ── Who created this record ──────────────────────────────────
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
    public Long getCreatedBy()         { return createdBy; }
    public void setCreatedBy(Long v)   { this.createdBy = v; }

}