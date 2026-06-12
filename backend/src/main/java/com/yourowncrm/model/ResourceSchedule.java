package com.yourowncrm.model;
import com.yourowncrm.model.enums.EntityType;
import jakarta.persistence.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity @Table(name="resource_schedules")
public class ResourceSchedule extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Enumerated(EnumType.STRING) @Column(name="entity_type", nullable=false, columnDefinition="VARCHAR(10)") private EntityType entityType;
    @Column(name="entity_id", nullable=false) private Long entityId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="location_id") private Location location;
    @Column(nullable=false) private short priority = 0;
    @Enumerated(EnumType.STRING) @Column(name="day_of_week", nullable=false, columnDefinition="VARCHAR(10)") private DayOfWeek dayOfWeek;
    @Column(name="is_open", nullable=false) private boolean open = true;
    @Column(name="open_time", nullable=false) private LocalTime openTime = LocalTime.of(9,0);
    @Column(name="close_time", nullable=false) private LocalTime closeTime = LocalTime.of(18,0);
    @Column(name="effective_from") private LocalDate effectiveFrom;
    @Column(name="effective_to") private LocalDate effectiveTo;

    public ResourceSchedule() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public EntityType getEntityType() { return entityType; }
    public void setEntityType(EntityType v) { this.entityType=v; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long v) { this.entityId=v; }
    public Location getLocation() { return location; }
    public void setLocation(Location v) { this.location=v; }
    public short getPriority() { return priority; }
    public void setPriority(short v) { this.priority=v; }
    public DayOfWeek getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(DayOfWeek v) { this.dayOfWeek=v; }
    public boolean isOpen() { return open; }
    public void setOpen(boolean v) { this.open=v; }
    public LocalTime getOpenTime() { return openTime; }
    public void setOpenTime(LocalTime v) { this.openTime=v; }
    public LocalTime getCloseTime() { return closeTime; }
    public void setCloseTime(LocalTime v) { this.closeTime=v; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate v) { this.effectiveFrom=v; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate v) { this.effectiveTo=v; }

    // ── Who created this record ──────────────────────────────────
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
    public Long getCreatedBy()         { return createdBy; }
    public void setCreatedBy(Long v)   { this.createdBy = v; }

}