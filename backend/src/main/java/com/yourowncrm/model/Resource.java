package com.yourowncrm.model;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.UUID;

@Entity @Table(name="resources")
public class Resource extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="location_id", nullable=false)
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private Location location;
    @Column(nullable=false, length=120) private String name;
    @Column(length=80) private String type;
    @Column(nullable=false) private short capacity = 1;
    @Column(name="color_hex", length=7) private String colorHex = "#2980b9";
    @Column(nullable=false) private boolean active = true;

    public Resource() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public Location getLocation() { return location; }
    public void setLocation(Location v) { this.location=v; }
    public String getName() { return name; }
    public void setName(String v) { this.name=v; }
    public String getType() { return type; }
    public void setType(String v) { this.type=v; }
    public short getCapacity() { return capacity; }
    public void setCapacity(short v) { this.capacity=v; }
    public String getColorHex() { return colorHex; }
    public void setColorHex(String v) { this.colorHex=v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active=v; }

    // Convenience getters for API responses
    public Long getLocationId() { return location != null ? location.getId() : null; }
    public String getLocationName() { return location != null ? location.getName() : null; }


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
        private final Resource r = new Resource();
        public Builder tenantId(UUID v)   { r.tenantId=v; return this; }
        public Builder location(Location v){ r.location=v; return this; }
        public Builder name(String v)     { r.name=v; return this; }
        public Builder type(String v)     { r.type=v; return this; }
        public Builder capacity(short v)  { r.capacity=v; return this; }
        public Builder colorHex(String v) { r.colorHex=v; return this; }
        public Builder active(boolean v)  { r.active=v; return this; }
        public Resource build() { return r; }
    }
}
