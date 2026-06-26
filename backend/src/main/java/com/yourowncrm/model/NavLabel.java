package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "nav_labels",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "route"}))
public class NavLabel {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 120)
    private String route;

    @Column(nullable = false, length = 80)
    private String label;

    @Column(length = 20)
    private String icon;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public NavLabel() {}

    public Long    getId()              { return id; }
    public UUID    getTenantId()        { return tenantId; }
    public void    setTenantId(UUID v)  { this.tenantId = v; }
    public String  getRoute()           { return route; }
    public void    setRoute(String v)   { this.route = v; }
    public String  getLabel()           { return label; }
    public void    setLabel(String v)   { this.label = v; }
    public String  getIcon()            { return icon; }
    public void    setIcon(String v)    { this.icon = v; }
    public Instant getUpdatedAt()       { return updatedAt; }
}
