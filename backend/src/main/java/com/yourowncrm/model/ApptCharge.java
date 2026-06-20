package com.yourowncrm.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "appt_charges")
public class ApptCharge {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "appointment_id", nullable = false)
    private Long appointmentId;

    /** "VISIT_TYPE" or "ADDITIONAL" */
    @Column(name = "source", nullable = false, length = 20)
    private String source = "ADDITIONAL";

    @Column(name = "description", nullable = false, length = 200)
    private String description;

    @Column(name = "charge_code", length = 30)
    private String chargeCode;

    @Column(name = "quantity", precision = 8, scale = 2)
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "sort_order")
    private short sortOrder;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public ApptCharge() {}

    public Long    getId()                          { return id; }
    public UUID    getTenantId()                    { return tenantId; }
    public void    setTenantId(UUID v)              { this.tenantId = v; }
    public Long    getAppointmentId()               { return appointmentId; }
    public void    setAppointmentId(Long v)         { this.appointmentId = v; }
    public String  getSource()                      { return source; }
    public void    setSource(String v)              { this.source = v; }
    public String  getDescription()                 { return description; }
    public void    setDescription(String v)         { this.description = v; }
    public String  getChargeCode()                  { return chargeCode; }
    public void    setChargeCode(String v)          { this.chargeCode = v; }
    public BigDecimal getQuantity()                 { return quantity; }
    public void    setQuantity(BigDecimal v)        { this.quantity = v; }
    public BigDecimal getUnitPrice()                { return unitPrice; }
    public void    setUnitPrice(BigDecimal v)       { this.unitPrice = v; }
    public short   getSortOrder()                   { return sortOrder; }
    public void    setSortOrder(short v)            { this.sortOrder = v; }
    public Instant getCreatedAt()                   { return createdAt; }
    public Instant getUpdatedAt()                   { return updatedAt; }
}
