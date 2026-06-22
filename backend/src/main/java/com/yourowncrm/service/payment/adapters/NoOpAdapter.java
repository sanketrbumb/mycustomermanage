package com.yourowncrm.service.payment.adapters;

import com.yourowncrm.service.payment.PaymentGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * No-op adapter for local development and testing.
 *
 * Every method returns a plausible-looking success response without
 * making any real network call or charging anyone.
 *
 * Set GATEWAY_PROVIDER=noop in your .env to use this.
 * This is the default when GATEWAY_PROVIDER is not set, so you can
 * run the app locally without any payment credentials configured.
 *
 * In your tests, inject this adapter directly or set the provider to "noop"
 * so unit/integration tests never hit real payment APIs.
 */
@Component
public class NoOpAdapter implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(NoOpAdapter.class);

    @Override
    public CheckoutSession createCheckoutSession(CheckoutRequest req) {
        String fakeId = "noop_session_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[NOOP] createCheckoutSession → {}", fakeId);
        return new CheckoutSession(fakeId, req.successUrl() + "?session_id=" + fakeId,
            fakeId, "noop");
    }

    @Override
    public ChargeResult chargeCustomer(ChargeRequest req) {
        String fakeId = "noop_charge_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[NOOP] chargeCustomer {} {} → {}", req.amount(), req.currency(), fakeId);
        return new ChargeResult(fakeId, "succeeded", null, req.amount(), req.currency(), null);
    }

    @Override
    public RefundResult refundCharge(String vendorChargeId, BigDecimal amount, String reason) {
        String fakeId = "noop_refund_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[NOOP] refundCharge {} {} → {}", vendorChargeId, amount, fakeId);
        return new RefundResult(fakeId, "succeeded", amount);
    }

    @Override
    public PaymentStatus getPaymentStatus(String vendorChargeId) {
        return new PaymentStatus(vendorChargeId, "succeeded",
            BigDecimal.valueOf(100), "usd", String.valueOf(System.currentTimeMillis() / 1000));
    }

    @Override
    public SubscriptionResult createSubscription(SubscriptionRequest req) {
        String fakeId = "noop_sub_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[NOOP] createSubscription plan={} → {}", req.planId(), fakeId);
        return new SubscriptionResult(fakeId, "active",
            java.time.LocalDate.now().plusMonths(1).toString(), req.planId());
    }

    @Override
    public void cancelSubscription(String vendorSubscriptionId, boolean immediately) {
        log.info("[NOOP] cancelSubscription {} immediately={}", vendorSubscriptionId, immediately);
    }

    @Override
    public SubscriptionResult updateSubscription(String vendorSubscriptionId, String newPlanId) {
        log.info("[NOOP] updateSubscription {} → {}", vendorSubscriptionId, newPlanId);
        return new SubscriptionResult(vendorSubscriptionId, "active",
            java.time.LocalDate.now().plusMonths(1).toString(), newPlanId);
    }

    @Override
    public String getCustomerPortalUrl(String vendorCustomerId, String returnUrl) {
        return returnUrl + "?portal=noop";
    }

    @Override
    public String ensureCustomer(String tenantId, String email, String name) {
        String fakeId = "noop_cust_" + tenantId.substring(0, 8);
        log.info("[NOOP] ensureCustomer {} → {}", email, fakeId);
        return fakeId;
    }

    @Override
    public WebhookEvent verifyAndParseWebhook(byte[] rawBody, String signatureHeader) {
        // In tests, call this directly with whatever payload you need
        return new WebhookEvent(
            WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED.name(),
            "noop_event_" + UUID.randomUUID(),
            "noop_cust", "noop_sub", "noop_charge", Map.of()
        );
    }
}
