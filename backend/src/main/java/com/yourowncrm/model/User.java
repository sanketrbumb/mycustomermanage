package com.yourowncrm.model;
import com.yourowncrm.model.enums.UserRole;
import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="users")
public class User extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(nullable=false, length=60) private String username;
    @Column(nullable=true, length=120) private String email;
    @JsonIgnore
    @Column(name="password_hash", nullable=false, length=255) private String passwordHash;
    @Column(name="first_name", nullable=false, length=80) private String firstName;
    @Column(name="last_name", nullable=false, length=80) private String lastName;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false, columnDefinition="VARCHAR(20)")
    private UserRole role = UserRole.STAFF;
    @Column(length=20) private String phone;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="location_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer","handler"})
    private Location location;
    @Column(name="can_book_appts") private boolean canBookAppts = true;
    @Column(nullable=false) private boolean active = true;
    @Column(nullable=false) private boolean locked = false;
    @Column(name="fail_count") private short failCount = 0;
    @Column(name="last_login_at") private Instant lastLoginAt;

    public User() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getUsername() { return username; }
    public void setUsername(String v) { this.username=v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email=v; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String v) { this.passwordHash=v; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String v) { this.firstName=v; }
    public String getLastName() { return lastName; }
    public void setLastName(String v) { this.lastName=v; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole v) { this.role=v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone=v; }
    public Location getLocation() { return location; }
    public void setLocation(Location v) { this.location=v; }
    public boolean isCanBookAppts() { return canBookAppts; }
    public void setCanBookAppts(boolean v) { this.canBookAppts=v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active=v; }
    public boolean isLocked() { return locked; }
    public void setLocked(boolean v) { this.locked=v; }
    public short getFailCount() { return failCount; }
    public void setFailCount(short v) { this.failCount=v; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(Instant v) { this.lastLoginAt=v; }

    // Convenience getter for API
    public Long getLocationId() { return location != null ? location.getId() : null; }


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
        private final User u = new User();
        public Builder tenantId(UUID v)       { u.tenantId=v; return this; }
        public Builder username(String v)      { u.username=v; return this; }
        public Builder email(String v)         { u.email=v; return this; }
        public Builder passwordHash(String v)  { u.passwordHash=v; return this; }
        public Builder firstName(String v)     { u.firstName=v; return this; }
        public Builder lastName(String v)      { u.lastName=v; return this; }
        public Builder role(UserRole v)        { u.role=v; return this; }
        public Builder phone(String v)         { u.phone=v; return this; }
        public Builder active(boolean v)       { u.active=v; return this; }
        public Builder locked(boolean v)       { u.locked=v; return this; }
        public Builder failCount(short v)      { u.failCount=v; return this; }
        public User build() { return u; }
    }
}
