package com.yourowncrm.model;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="locations")
public class Location extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(nullable=false, length=20) private String code;
    @Column(nullable=false, length=120) private String name;
    private String address1;
    private String city;
    @Column(length=2) private String state;
    @Column(length=10) private String zip;
    private String phone;
    private String email;
    @Column(name="color_hex", length=7) private String colorHex = "#1a4a3a";
    @Column(nullable=false) private boolean active = true;

    public Location() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getCode() { return code; }
    public void setCode(String v) { this.code=v; }
    public String getName() { return name; }
    public void setName(String v) { this.name=v; }
    public String getAddress1() { return address1; }
    public void setAddress1(String v) { this.address1=v; }
    public String getCity() { return city; }
    public void setCity(String v) { this.city=v; }
    public String getState() { return state; }
    public void setState(String v) { this.state=v; }
    public String getZip() { return zip; }
    public void setZip(String v) { this.zip=v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone=v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email=v; }
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
        private final Location l = new Location();
        public Builder tenantId(UUID v)   { l.tenantId=v; return this; }
        public Builder code(String v)     { l.code=v; return this; }
        public Builder name(String v)     { l.name=v; return this; }
        public Builder address1(String v) { l.address1=v; return this; }
        public Builder city(String v)     { l.city=v; return this; }
        public Builder state(String v)    { l.state=v; return this; }
        public Builder zip(String v)      { l.zip=v; return this; }
        public Builder phone(String v)    { l.phone=v; return this; }
        public Builder email(String v)    { l.email=v; return this; }
        public Builder colorHex(String v) { l.colorHex=v; return this; }
        public Builder active(boolean v)  { l.active=v; return this; }
        public Location build() { return l; }
    }
}
