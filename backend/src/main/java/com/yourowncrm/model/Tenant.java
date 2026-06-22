package com.yourowncrm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Represents one spa/wellness business (tenant) in the multi-tenant system.
 *
 * Subscription fields (vendor_customer_id, vendor_subscription_id,
 * subscription_status, plan_id, trial_ends_at, current_period_end)
 * are added by V8 migration and used by SubscriptionController +
 * WebhookController for gateway-agnostic billing tracking.
 */
@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 60)
    private String slug;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    // ── Subscription / billing fields (added by V8 migration) ────────────────

    /**
     * The payment gateway's customer ID for this tenant.
     * Stripe: cus_xxx  |  Razorpay: cust_xxx  |  PayPal: pp_xxx  |  NoOp: noop_cust_xxx
     */
    @Column(name = "vendor_customer_id", length = 100)
    private String vendorCustomerId;

    /**
     * The payment gateway's subscription ID for this tenant's active subscription.
     * Stripe: sub_xxx  |  Razorpay: sub_xxx  |  PayPal: I-xxx
     */
    @Column(name = "vendor_subscription_id", length = 100)
    private String vendorSubscriptionId;

    /**
     * Normalised subscription status — set by WebhookController based on
     * incoming gateway events. Never store raw vendor status strings here.
     * Values: TRIALING | ACTIVE | PAST_DUE | CANCELED | CANCEL_PENDING | NONE
     */
    @Column(name = "subscription_status", length = 20)
    private String subscriptionStatus = "TRIALING";

    /**
     * The gateway's price/plan ID for the tenant's current plan.
     * Stripe: price_xxx  |  Razorpay: plan_xxx  |  PayPal: billing plan ID
     */
    @Column(name = "plan_id", length = 100)
    private String planId;

    /**
     * When the free trial expires. Null if the tenant never had a trial
     * or if the trial has already converted to a paid subscription.
     */
    @Column(name = "trial_ends_at")
    private LocalDate trialEndsAt;

    /**
     * The end of the current billing period. Updated by webhook on each
     * successful payment. Used for UI display ("renews on...") and for
     * grace-period logic in access checks.
     */
    @Column(name = "current_period_end")
    private LocalDate currentPeriodEnd;

    public Tenant() {}

    // ── Core getters / setters ────────────────────────────────────────────────

    public UUID    getId()              { return id; }
    public void    setId(UUID v)        { this.id = v; }

    public String  getName()            { return name; }
    public void    setName(String v)    { this.name = v; }

    public String  getSlug()            { return slug; }
    public void    setSlug(String v)    { this.slug = v; }

    public Instant getCreatedAt()       { return createdAt; }
    public Instant getUpdatedAt()       { return updatedAt; }

    // ── Subscription getters / setters ────────────────────────────────────────

    public String    getVendorCustomerId()                  { return vendorCustomerId; }
    public void      setVendorCustomerId(String v)          { this.vendorCustomerId = v; }

    public String    getVendorSubscriptionId()              { return vendorSubscriptionId; }
    public void      setVendorSubscriptionId(String v)      { this.vendorSubscriptionId = v; }

    public String    getSubscriptionStatus()                { return subscriptionStatus; }
    public void      setSubscriptionStatus(String v)        { this.subscriptionStatus = v; }

    public String    getPlanId()                            { return planId; }
    public void      setPlanId(String v)                    { this.planId = v; }

    public LocalDate getTrialEndsAt()                       { return trialEndsAt; }
    public void      setTrialEndsAt(LocalDate v)            { this.trialEndsAt = v; }

    public LocalDate getCurrentPeriodEnd()                  { return currentPeriodEnd; }
    public void      setCurrentPeriodEnd(LocalDate v)       { this.currentPeriodEnd = v; }
}
