package com.yourowncrm.model;
import jakarta.persistence.*;
import java.util.UUID;

@Entity @Table(name="tenants")
public class Tenant extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    private UUID id;
    @Column(nullable=false, length=120) private String name;
    @Column(nullable=false, unique=true, length=60) private String slug;
    @Column(name="logo_url") private String logoUrl;
    @Column(nullable=false, length=60) private String timezone = "America/New_York";
    @Column(name="currency_code", length=3) private String currencyCode = "USD";
    @Column(nullable=false) private boolean active = true;

    public Tenant() {}
    public UUID getId() { return id; }
    public void setId(UUID v) { this.id = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getSlug() { return slug; }
    public void setSlug(String v) { this.slug = v; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String v) { this.logoUrl = v; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String v) { this.timezone = v; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String v) { this.currencyCode = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }


    // ── Who created this record ──────────────────────────────────
    @Column(name = "created_by", updatable = false)
    private Long createdBy;
    public Long getCreatedBy()         { return createdBy; }
    public void setCreatedBy(Long v)   { this.createdBy = v; }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private final Tenant t = new Tenant();
        public Builder id(UUID v)           { t.id=v; return this; }
        public Builder name(String v)        { t.name=v; return this; }
        public Builder slug(String v)        { t.slug=v; return this; }
        public Builder timezone(String v)    { t.timezone=v; return this; }
        public Builder currencyCode(String v){ t.currencyCode=v; return this; }
        public Builder active(boolean v)     { t.active=v; return this; }
        public Tenant build() { return t; }
    }
}
