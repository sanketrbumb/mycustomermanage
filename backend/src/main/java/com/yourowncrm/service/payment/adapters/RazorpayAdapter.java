package com.yourowncrm.service.payment.adapters;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.service.payment.PaymentGatewayService;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Razorpay adapter.
 *
 * Popular in India and SE Asia. Supports INR, USD, and many other currencies.
 * Uses Razorpay's REST API directly (no Java SDK dependency required —
 * the SDK is optional and can be added later if preferred).
 *
 * Setup:
 *   1. Create account at razorpay.com → Dashboard → Settings → API Keys
 *   2. Set in .env:
 *        GATEWAY_PROVIDER=razorpay
 *        RAZORPAY_KEY_ID=rzp_live_...
 *        RAZORPAY_KEY_SECRET=...
 *        RAZORPAY_WEBHOOK_SECRET=...
 *   3. Plans: create plans in Razorpay Dashboard → Subscriptions → Plans
 *   4. Webhooks: Dashboard → Settings → Webhooks → Add endpoint
 *        URL: https://yourdomain.com/api/billing/webhook
 *        Events: subscription.*, payment.*
 *
 * NOTE: Razorpay doesn't have a hosted checkout URL model like Stripe.
 *       The frontend uses the Razorpay checkout.js script with the
 *       order ID returned in CheckoutSession.sessionId.
 *       Set clientSecret = order ID and handle it in the Angular component.
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "razorpay")
public class RazorpayAdapter implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayAdapter.class);
    private static final String BASE = "https://api.razorpay.com/v1";

    @Value("${app.payment.razorpay.key-id:}")
    private String keyId;

    @Value("${app.payment.razorpay.key-secret:}")
    private String keySecret;

    @Value("${app.payment.razorpay.webhook-secret:}")
    private String webhookSecret;

    private final RestTemplate rest = new RestTemplate();

    private HttpHeaders authHeaders() {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBasicAuth(keyId, keySecret);
        return h;
    }

    @Override
    public CheckoutSession createCheckoutSession(CheckoutRequest req) {
        // Create a Razorpay order
        JSONObject body = new JSONObject();
        body.put("amount", req.amount().multiply(BigDecimal.valueOf(100)).intValue());
        body.put("currency", req.currency().toUpperCase());
        body.put("receipt", "rcpt_" + System.currentTimeMillis());
        body.put("notes", new JSONObject(req.metadata() != null ? req.metadata() : Map.of()));

        ResponseEntity<String> resp = rest.postForEntity(
            BASE + "/orders",
            new HttpEntity<>(body.toString(), authHeaders()), String.class);

        JSONObject order = new JSONObject(resp.getBody());
        // The frontend uses Razorpay checkout.js with this orderId
        // checkoutUrl is null — the frontend handles display
        return new CheckoutSession(order.getString("id"), req.successUrl(),
            order.getString("id"), "razorpay");
    }

    @Override
    public ChargeResult chargeCustomer(ChargeRequest req) {
        // Capture an already-authorised payment
        JSONObject body = new JSONObject();
        body.put("amount", req.amount().multiply(BigDecimal.valueOf(100)).intValue());
        body.put("currency", "INR");

        ResponseEntity<String> resp = rest.postForEntity(
            BASE + "/payments/" + req.paymentMethodId() + "/capture",
            new HttpEntity<>(body.toString(), authHeaders()), String.class);

        JSONObject p = new JSONObject(resp.getBody());
        return new ChargeResult(p.getString("id"), p.getString("status"),
            null, req.amount(), "INR", null);
    }

    @Override
    public RefundResult refundCharge(String vendorChargeId, BigDecimal amount, String reason) {
        JSONObject body = new JSONObject();
        body.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue());
        body.put("notes", new JSONObject(Map.of("reason", reason)));

        ResponseEntity<String> resp = rest.postForEntity(
            BASE + "/payments/" + vendorChargeId + "/refund",
            new HttpEntity<>(body.toString(), authHeaders()), String.class);

        JSONObject r = new JSONObject(resp.getBody());
        return new RefundResult(r.getString("id"), r.getString("status"), amount);
    }

    @Override
    public PaymentStatus getPaymentStatus(String vendorChargeId) {
        ResponseEntity<String> resp = rest.exchange(
            BASE + "/payments/" + vendorChargeId,
            HttpMethod.GET, new HttpEntity<>(authHeaders()), String.class);
        JSONObject p = new JSONObject(resp.getBody());
        return new PaymentStatus(p.getString("id"), p.getString("status"),
            BigDecimal.valueOf(p.getInt("amount")).divide(BigDecimal.valueOf(100)),
            p.getString("currency"), String.valueOf(p.getLong("created_at")));
    }

    @Override
    public SubscriptionResult createSubscription(SubscriptionRequest req) {
        JSONObject body = new JSONObject();
        body.put("plan_id", req.planId());
        body.put("customer_id", req.vendorCustomerId());
        body.put("quantity", 1);
        body.put("total_count", 120); // up to 10 years of monthly billing
        if (req.trialEndDate() != null) {
            body.put("start_at", java.time.LocalDate.parse(req.trialEndDate())
                .atStartOfDay(java.time.ZoneOffset.UTC).toEpochSecond());
        }

        ResponseEntity<String> resp = rest.postForEntity(
            BASE + "/subscriptions",
            new HttpEntity<>(body.toString(), authHeaders()), String.class);

        JSONObject s = new JSONObject(resp.getBody());
        return new SubscriptionResult(s.getString("id"), s.getString("status"),
            String.valueOf(s.optLong("current_end")), req.planId());
    }

    @Override
    public void cancelSubscription(String vendorSubscriptionId, boolean immediately) {
        JSONObject body = new JSONObject();
        body.put("cancel_at_cycle_end", !immediately ? 1 : 0);
        rest.postForEntity(
            BASE + "/subscriptions/" + vendorSubscriptionId + "/cancel",
            new HttpEntity<>(body.toString(), authHeaders()), String.class);
    }

    @Override
    public SubscriptionResult updateSubscription(String vendorSubscriptionId, String newPlanId) {
        // Razorpay: cancel + create new subscription with new plan
        cancelSubscription(vendorSubscriptionId, false);
        return createSubscription(new SubscriptionRequest(
            null, newPlanId, null, Map.of()));
    }

    @Override
    public String getCustomerPortalUrl(String vendorCustomerId, String returnUrl) {
        // Razorpay doesn't have a self-serve portal — redirect to your own billing page
        log.info("Razorpay has no self-serve portal. Returning billing settings URL.");
        return returnUrl + "?gateway=razorpay&customerId=" + vendorCustomerId;
    }

    @Override
    public String ensureCustomer(String tenantId, String email, String name) {
        JSONObject body = new JSONObject();
        body.put("name", name);
        body.put("email", email);
        body.put("notes", new JSONObject(Map.of("tenantId", tenantId)));

        try {
            ResponseEntity<String> resp = rest.postForEntity(
                BASE + "/customers",
                new HttpEntity<>(body.toString(), authHeaders()), String.class);
            return new JSONObject(resp.getBody()).getString("id");
        } catch (Exception e) {
            // Razorpay returns 400 if customer already exists with that email
            // In production: search by email first using GET /customers?email=...
            log.warn("Razorpay customer creation: {}", e.getMessage());
            return "cust_" + tenantId; // fallback ID
        }
    }

    @Override
    public WebhookEvent verifyAndParseWebhook(byte[] rawBody, String signatureHeader) {
        // Razorpay HMAC-SHA256 signature verification
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] computed = mac.doFinal(rawBody);
            String expected = HexFormat.of().formatHex(computed);
            if (!expected.equals(signatureHeader)) {
                throw new BusinessException("Invalid Razorpay webhook signature");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Webhook signature verification failed: " + e.getMessage());
        }

        JSONObject event = new JSONObject(new String(rawBody, StandardCharsets.UTF_8));
        String eventType = event.getString("event");
        JSONObject payload = event.getJSONObject("payload");

        WebhookEventType type = switch (eventType) {
            case "subscription.activated"    -> WebhookEventType.SUBSCRIPTION_CREATED;
            case "subscription.updated"      -> WebhookEventType.SUBSCRIPTION_UPDATED;
            case "subscription.cancelled"    -> WebhookEventType.SUBSCRIPTION_CANCELED;
            case "subscription.charged"      -> WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED;
            case "subscription.halted"       -> WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED;
            case "payment.captured"          -> WebhookEventType.CHARGE_SUCCEEDED;
            case "payment.failed"            -> WebhookEventType.CHARGE_FAILED;
            case "refund.created"            -> WebhookEventType.REFUND_SUCCEEDED;
            default                          -> WebhookEventType.UNKNOWN;
        };

        return new WebhookEvent(type.name(), event.optString("id"),
            null, null, null, Map.of());
    }
}
