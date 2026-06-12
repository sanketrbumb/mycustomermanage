package com.yourowncrm.model;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="visit_statuses")
public class VisitStatus extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="tenant_id", nullable=false) private UUID tenantId;
    @Column(nullable=false, length=80) private String name;
    @Column(name="sort_order") private short sortOrder = 0;
    @Column(name="is_terminal") private boolean terminal = false;
    @Column(name="is_chargeable") private boolean chargeable = true;
    @Column(name="color_hex", length=7) private String colorHex = "#7a7a7a";

    public VisitStatus() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id=v; }
    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID v) { this.tenantId=v; }
    public String getName() { return name; }
    public void setName(String v) { this.name=v; }
    public short getSortOrder() { return sortOrder; }
    public void setSortOrder(short v) { this.sortOrder=v; }
    public boolean isTerminal() { return terminal; }
    public void setTerminal(boolean v) { this.terminal=v; }
    public boolean isChargeable() { return chargeable; }
    public void setChargeable(boolean v) { this.chargeable=v; }
    public String getColorHex() { return colorHex; }
    public void setColorHex(String v) { this.colorHex=v; }


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
        private final VisitStatus s = new VisitStatus();
        public Builder tenantId(UUID v)    { s.tenantId=v; return this; }
        public Builder name(String v)      { s.name=v; return this; }
        public Builder sortOrder(short v)  { s.sortOrder=v; return this; }
        public Builder terminal(boolean v) { s.terminal=v; return this; }
        public Builder chargeable(boolean v){ s.chargeable=v; return this; }
        public Builder colorHex(String v)  { s.colorHex=v; return this; }
        public VisitStatus build() { return s; }
    }
}
