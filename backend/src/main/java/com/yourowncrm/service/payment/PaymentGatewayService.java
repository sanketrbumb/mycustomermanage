package com.yourowncrm.service.payment;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Payment Gateway Abstraction Layer.
 *
 * This is the ONLY interface your business logic ever calls.
 * No vendor SDK classes appear anywhere above this layer.
 *
 * To switch vendors: change GATEWAY_PROVIDER in your .env file.
 * To add a new vendor: implement this interface + register in GatewayFactory.
 *
 * All amounts are in the smallest currency unit (e.g. cents for USD).
 * All IDs are strings because different vendors use different ID formats.
 */
public interface PaymentGatewayService {

    // ── One-time payments ────────────────────────────────────────────────────

    /**
     * Create a payment session.
     * Returns a URL the user's browser redirects to for hosted checkout,
     * OR a client secret for embedded checkout (depending on the vendor).
     */
    CheckoutSession createCheckoutSession(CheckoutRequest req);

    /**
     * Charge an amount against a saved payment method (for returning customers).
     * Returns the vendor's charge/transaction ID.
     */
    ChargeResult chargeCustomer(ChargeRequest req);

    /**
     * Refund a previous charge, fully or partially.
     */
    RefundResult refundCharge(String vendorChargeId, BigDecimal amount, String reason);

    /**
     * Look up the status of a charge/payment by the vendor's transaction ID.
     */
    PaymentStatus getPaymentStatus(String vendorChargeId);

    // ── Subscriptions ────────────────────────────────────────────────────────

    /**
     * Create a subscription for a tenant (recurring billing).
     * Returns the vendor's subscription ID + next billing date.
     */
    SubscriptionResult createSubscription(SubscriptionRequest req);

    /**
     * Cancel a subscription. immediatelyOrAtPeriodEnd controls whether
     * access is revoked now or at the end of the current billing period.
     */
    void cancelSubscription(String vendorSubscriptionId, boolean immediately);

    /**
     * Update a subscription's plan (upgrade or downgrade).
     */
    SubscriptionResult updateSubscription(String vendorSubscriptionId, String newPlanId);

    /**
     * Get the customer portal URL where the tenant can manage their own
     * billing, update card details, download invoices etc.
     */
    String getCustomerPortalUrl(String vendorCustomerId, String returnUrl);

    // ── Customer records ─────────────────────────────────────────────────────

    /**
     * Create or retrieve a vendor-side customer record.
     * Most gateways need a customer object before you can charge or subscribe.
     */
    String ensureCustomer(String tenantId, String email, String name);

    // ── Webhook verification ──────────────────────────────────────────────────

    /**
     * Verify that an incoming webhook payload was genuinely sent by this
     * vendor and hasn't been tampered with. Throws if invalid.
     * Returns a parsed WebhookEvent ready for your handler to process.
     */
    WebhookEvent verifyAndParseWebhook(byte[] rawBody, String signatureHeader);

    // ── DTOs — shared across all vendors ────────────────────────────────────

    record CheckoutRequest(
        String tenantId,
        String vendorCustomerId,
        String planId,          // vendor's price/plan ID
        String description,
        BigDecimal amount,      // for one-time; null for subscription
        String currency,        // "usd", "inr", "gbp" etc.
        String successUrl,
        String cancelUrl,
        Map<String, String> metadata   // pass-through key/value bag
    ) {}

    record CheckoutSession(
        String sessionId,           // vendor's checkout session ID
        String checkoutUrl,         // redirect the user here
        String clientSecret,        // for embedded checkout (if supported)
        String vendor               // which adapter produced this
    ) {}

    record ChargeRequest(
        String vendorCustomerId,
        String paymentMethodId,     // saved card token
        BigDecimal amount,
        String currency,
        String description,
        String idempotencyKey       // prevents double-charges on retry
    ) {}

    record ChargeResult(
        String vendorChargeId,
        String status,              // "succeeded", "pending", "failed"
        String receiptUrl,
        BigDecimal amountCharged,
        String currency,
        String failureReason        // null on success
    ) {}

    record RefundResult(
        String vendorRefundId,
        String status,
        BigDecimal amount
    ) {}

    record PaymentStatus(
        String vendorChargeId,
        String status,              // "succeeded", "pending", "failed", "refunded"
        BigDecimal amount,
        String currency,
        String created
    ) {}

    record SubscriptionRequest(
        String vendorCustomerId,
        String planId,
        String trialEndDate,        // ISO date or null
        Map<String, String> metadata
    ) {}

    record SubscriptionResult(
        String vendorSubscriptionId,
        String status,              // "active", "trialing", "past_due", "canceled"
        String currentPeriodEnd,    // ISO date
        String planId
    ) {}

    record WebhookEvent(
        String type,                // normalised event type (see WebhookEventType)
        String vendorEventId,
        String vendorCustomerId,
        String vendorSubscriptionId,
        String vendorChargeId,
        Map<String, String> metadata
    ) {}

    /**
     * Normalised event types — all vendors' events map to one of these.
     * Your webhook handler switches on these, never on vendor-specific strings.
     */
    enum WebhookEventType {
        SUBSCRIPTION_CREATED,
        SUBSCRIPTION_UPDATED,
        SUBSCRIPTION_CANCELED,
        SUBSCRIPTION_PAYMENT_SUCCEEDED,
        SUBSCRIPTION_PAYMENT_FAILED,
        CHARGE_SUCCEEDED,
        CHARGE_FAILED,
        REFUND_SUCCEEDED,
        UNKNOWN
    }
}
