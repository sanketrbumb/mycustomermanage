package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A tenant-scoped role. Each tenant has their own copy of all roles,
 * including the 3 built-in ones, so they can customise permissions
 * independently without affecting other tenants.
 *
 * system_role = true  →  name is fixed, cannot be deleted, permissions editable
 * system_role = false →  fully managed by the tenant admin
 */
@Entity
@Table(name = "roles",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "name"}))
public class Role {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 60)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(name = "system_role", nullable = false)
    private boolean systemRole = false;

    /** The set of Permission enum names granted to this role */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions",
                     joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission_name")
    private Set<String> permissions = new HashSet<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    public Role() {}

    public Long    getId()            { return id; }
    public UUID    getTenantId()      { return tenantId; }
    public void    setTenantId(UUID v){ this.tenantId = v; }
    public String  getName()          { return name; }
    public void    setName(String v)  { this.name = v; }
    public String  getDescription()   { return description; }
    public void    setDescription(String v) { this.description = v; }
    public boolean isSystemRole()     { return systemRole; }
    public void    setSystemRole(boolean v) { this.systemRole = v; }
    public Set<String> getPermissions() { return permissions; }
    public void    setPermissions(Set<String> v) { this.permissions = v; }
    public Instant getCreatedAt()     { return createdAt; }
}
