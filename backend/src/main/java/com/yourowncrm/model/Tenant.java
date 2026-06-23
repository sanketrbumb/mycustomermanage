package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 60)
    private String slug;

    // Original fields that DataSeeder uses
    @Column(length = 50)
    private String timezone;

    @Column(name = "currency_code", length = 10)
    private String currencyCode;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    // ── Subscription / billing fields (added by V8 migration) ────────────────

    @Column(name = "vendor_customer_id", length = 100)
    private String vendorCustomerId;

    @Column(name = "vendor_subscription_id", length = 100)
    private String vendorSubscriptionId;

    @Column(name = "subscription_status", length = 20)
    private String subscriptionStatus = "TRIALING";

    @Column(name = "plan_id", length = 100)
    private String planId;

    @Column(name = "trial_ends_at")
    private LocalDate trialEndsAt;

    @Column(name = "current_period_end")
    private LocalDate currentPeriodEnd;

    public Tenant() {}

    // ── Core getters / setters ────────────────────────────────────────────────

    public UUID    getId()                    { return id; }
    public void    setId(UUID v)              { this.id = v; }

    public String  getName()                  { return name; }
    public void    setName(String v)          { this.name = v; }

    public String  getSlug()                  { return slug; }
    public void    setSlug(String v)          { this.slug = v; }

    public String  getTimezone()              { return timezone; }
    public void    setTimezone(String v)      { this.timezone = v; }

    public String  getCurrencyCode()          { return currencyCode; }
    public void    setCurrencyCode(String v)  { this.currencyCode = v; }

    public boolean isActive()                 { return active; }
    public void    setActive(boolean v)       { this.active = v; }

    public Instant getCreatedAt()             { return createdAt; }
    public Instant getUpdatedAt()             { return updatedAt; }

    // ── Subscription getters / setters ────────────────────────────────────────

    public String    getVendorCustomerId()              { return vendorCustomerId; }
    public void      setVendorCustomerId(String v)      { this.vendorCustomerId = v; }

    public String    getVendorSubscriptionId()          { return vendorSubscriptionId; }
    public void      setVendorSubscriptionId(String v)  { this.vendorSubscriptionId = v; }

    public String    getSubscriptionStatus()            { return subscriptionStatus; }
    public void      setSubscriptionStatus(String v)    { this.subscriptionStatus = v; }

    public String    getPlanId()                        { return planId; }
    public void      setPlanId(String v)                { this.planId = v; }

    public LocalDate getTrialEndsAt()                   { return trialEndsAt; }
    public void      setTrialEndsAt(LocalDate v)        { this.trialEndsAt = v; }

    public LocalDate getCurrentPeriodEnd()              { return currentPeriodEnd; }
    public void      setCurrentPeriodEnd(LocalDate v)   { this.currentPeriodEnd = v; }
}
