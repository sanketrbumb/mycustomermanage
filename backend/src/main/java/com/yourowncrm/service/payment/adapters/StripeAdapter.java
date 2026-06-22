package com.yourowncrm.service.payment.adapters;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.*;
import com.stripe.param.checkout.SessionCreateParams;
import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.service.payment.PaymentGatewayService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Stripe adapter.
 *
 * Setup:
 *   1. Create account at stripe.com
 *   2. Get your API keys from Dashboard → Developers → API Keys
 *   3. Set in .env:
 *        GATEWAY_PROVIDER=stripe
 *        STRIPE_SECRET_KEY=sk_live_...
 *        STRIPE_WEBHOOK_SECRET=whsec_...
 *   4. Add to pom.xml:
 *        <dependency>
 *          <groupId>com.stripe</groupId>
 *          <artifactId>stripe-java</artifactId>
 *          <version>25.1.0</version>
 *        </dependency>
 *   5. In the Stripe dashboard, create products/prices for each plan tier
 *      and set the price IDs in your config (e.g. STRIPE_PRICE_STARTER etc.)
 *   6. Set up webhooks at Dashboard → Developers → Webhooks → Add endpoint:
 *        URL: https://yourdomain.com/api/billing/webhook
 *        Events: customer.subscription.*, invoice.payment_*
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "stripe")
public class StripeAdapter implements PaymentGatewayService {

    private static final Logger log = LoggerFactory.getLogger(StripeAdapter.class);

    @Value("${app.payment.stripe.secret-key:}")
    private String secretKey;

    @Value("${app.payment.stripe.webhook-secret:}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        if (secretKey.isBlank()) {
            log.warn("STRIPE_SECRET_KEY not set — Stripe payments will fail");
        } else {
            Stripe.apiKey = secretKey;
            log.info("Stripe adapter initialised (mode: {})",
                secretKey.startsWith("sk_live") ? "LIVE" : "TEST");
        }
    }

    @Override
    public CheckoutSession createCheckoutSession(CheckoutRequest req) {
        try {
            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(req.amount() == null
                    ? SessionCreateParams.Mode.SUBSCRIPTION
                    : SessionCreateParams.Mode.PAYMENT)
                .setCustomer(req.vendorCustomerId())
                .setSuccessUrl(req.successUrl() + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(req.cancelUrl())
                .putAllMetadata(req.metadata() != null ? req.metadata() : Map.of());

            if (req.amount() == null) {
                // Subscription
                builder.addLineItem(SessionCreateParams.LineItem.builder()
                    .setPrice(req.planId())
                    .setQuantity(1L)
                    .build());
            } else {
                // One-time payment
                builder.addLineItem(SessionCreateParams.LineItem.builder()
                    .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                        .setCurrency(req.currency())
                        .setUnitAmount(req.amount().multiply(BigDecimal.valueOf(100)).longValue())
                        .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                            .setName(req.description())
                            .build())
                        .build())
                    .setQuantity(1L)
                    .build());
            }

            Session session = Session.create(builder.build());
            return new CheckoutSession(session.getId(), session.getUrl(), null, "stripe");
        } catch (StripeException e) {
            throw new BusinessException("Stripe checkout session failed: " + e.getMessage());
        }
    }

    @Override
    public ChargeResult chargeCustomer(ChargeRequest req) {
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(req.amount().multiply(BigDecimal.valueOf(100)).longValue())
                .setCurrency(req.currency())
                .setCustomer(req.vendorCustomerId())
                .setPaymentMethod(req.paymentMethodId())
                .setConfirm(true)
                .setDescription(req.description())
                .setIdempotencyKey(req.idempotencyKey())
                .setOffSession(true)
                .build();

            PaymentIntent pi = PaymentIntent.create(params);

            return new ChargeResult(
                pi.getId(),
                pi.getStatus(),
                null,
                BigDecimal.valueOf(pi.getAmount()).divide(BigDecimal.valueOf(100)),
                pi.getCurrency(),
                null
            );
        } catch (StripeException e) {
            return new ChargeResult(null, "failed", null, req.amount(), req.currency(), e.getMessage());
        }
    }

    @Override
    public RefundResult refundCharge(String vendorChargeId, BigDecimal amount, String reason) {
        try {
            RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(vendorChargeId)
                .setAmount(amount.multiply(BigDecimal.valueOf(100)).longValue())
                .setReason(RefundCreateParams.Reason.REQUESTED_BY_CUSTOMER)
                .build();
            Refund refund = Refund.create(params);
            return new RefundResult(refund.getId(), refund.getStatus(),
                BigDecimal.valueOf(refund.getAmount()).divide(BigDecimal.valueOf(100)));
        } catch (StripeException e) {
            throw new BusinessException("Stripe refund failed: " + e.getMessage());
        }
    }

    @Override
    public PaymentStatus getPaymentStatus(String vendorChargeId) {
        try {
            PaymentIntent pi = PaymentIntent.retrieve(vendorChargeId);
            return new PaymentStatus(pi.getId(), pi.getStatus(),
                BigDecimal.valueOf(pi.getAmount()).divide(BigDecimal.valueOf(100)),
                pi.getCurrency(), String.valueOf(pi.getCreated()));
        } catch (StripeException e) {
            throw new BusinessException("Stripe status lookup failed: " + e.getMessage());
        }
    }

    @Override
    public SubscriptionResult createSubscription(SubscriptionRequest req) {
        try {
            SubscriptionCreateParams.Builder builder = SubscriptionCreateParams.builder()
                .setCustomer(req.vendorCustomerId())
                .addItem(SubscriptionCreateParams.Item.builder()
                    .setPrice(req.planId())
                    .build())
                .putAllMetadata(req.metadata() != null ? req.metadata() : Map.of());

            if (req.trialEndDate() != null) {
                builder.setTrialEnd(java.time.LocalDate.parse(req.trialEndDate())
                    .atStartOfDay(java.time.ZoneOffset.UTC).toEpochSecond());
            }

            Subscription sub = Subscription.create(builder.build());
            return new SubscriptionResult(
                sub.getId(), sub.getStatus(),
                String.valueOf(sub.getCurrentPeriodEnd()),
                sub.getItems().getData().get(0).getPrice().getId()
            );
        } catch (StripeException e) {
            throw new BusinessException("Stripe subscription creation failed: " + e.getMessage());
        }
    }

    @Override
    public void cancelSubscription(String vendorSubscriptionId, boolean immediately) {
        try {
            Subscription sub = Subscription.retrieve(vendorSubscriptionId);
            if (immediately) {
                sub.cancel();
            } else {
                sub.update(SubscriptionUpdateParams.builder()
                    .setCancelAtPeriodEnd(true).build());
            }
        } catch (StripeException e) {
            throw new BusinessException("Stripe subscription cancel failed: " + e.getMessage());
        }
    }

    @Override
    public SubscriptionResult updateSubscription(String vendorSubscriptionId, String newPlanId) {
        try {
            Subscription sub = Subscription.retrieve(vendorSubscriptionId);
            String itemId = sub.getItems().getData().get(0).getId();
            sub.update(SubscriptionUpdateParams.builder()
                .addItem(SubscriptionUpdateParams.Item.builder()
                    .setId(itemId)
                    .setPrice(newPlanId)
                    .build())
                .setProrationBehavior(SubscriptionUpdateParams.ProrationBehavior.CREATE_PRORATIONS)
                .build());
            return new SubscriptionResult(sub.getId(), sub.getStatus(),
                String.valueOf(sub.getCurrentPeriodEnd()), newPlanId);
        } catch (StripeException e) {
            throw new BusinessException("Stripe plan update failed: " + e.getMessage());
        }
    }

    @Override
    public String getCustomerPortalUrl(String vendorCustomerId, String returnUrl) {
        try {
            com.stripe.model.billingportal.Session session =
                com.stripe.model.billingportal.Session.create(
                    com.stripe.param.billingportal.SessionCreateParams.builder()
                        .setCustomer(vendorCustomerId)
                        .setReturnUrl(returnUrl)
                        .build()
                );
            return session.getUrl();
        } catch (StripeException e) {
            throw new BusinessException("Stripe portal session failed: " + e.getMessage());
        }
    }

    @Override
    public String ensureCustomer(String tenantId, String email, String name) {
        try {
            // Search for existing customer by metadata
            CustomerSearchParams search = CustomerSearchParams.builder()
                .setQuery("metadata['tenantId']:'" + tenantId + "'")
                .build();
            CustomerSearchResult result = Customer.search(search);
            if (!result.getData().isEmpty()) {
                return result.getData().get(0).getId();
            }
            // Create new
            Map<String, String> meta = new HashMap<>();
            meta.put("tenantId", tenantId);
            Customer customer = Customer.create(CustomerCreateParams.builder()
                .setEmail(email).setName(name).putAllMetadata(meta).build());
            return customer.getId();
        } catch (StripeException e) {
            throw new BusinessException("Stripe customer creation failed: " + e.getMessage());
        }
    }

    @Override
    public WebhookEvent verifyAndParseWebhook(byte[] rawBody, String signatureHeader) {
        Event event;
        try {
            event = Webhook.constructEvent(new String(rawBody), signatureHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new BusinessException("Invalid Stripe webhook signature");
        }

        // Map Stripe event type → normalised WebhookEventType
        WebhookEventType type = switch (event.getType()) {
            case "customer.subscription.created"     -> WebhookEventType.SUBSCRIPTION_CREATED;
            case "customer.subscription.updated"     -> WebhookEventType.SUBSCRIPTION_UPDATED;
            case "customer.subscription.deleted"     -> WebhookEventType.SUBSCRIPTION_CANCELED;
            case "invoice.payment_succeeded"         -> WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED;
            case "invoice.payment_failed"            -> WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED;
            case "payment_intent.succeeded"          -> WebhookEventType.CHARGE_SUCCEEDED;
            case "payment_intent.payment_failed"     -> WebhookEventType.CHARGE_FAILED;
            case "charge.refunded"                   -> WebhookEventType.REFUND_SUCCEEDED;
            default                                  -> WebhookEventType.UNKNOWN;
        };

        // Extract common fields
        StripeObject obj = event.getDataObjectDeserializer().getObject().orElse(null);
        String customerId = null, subscriptionId = null, chargeId = null;
        if (obj instanceof Subscription s) {
            customerId = s.getCustomer(); subscriptionId = s.getId();
        } else if (obj instanceof Invoice i) {
            customerId = i.getCustomer(); subscriptionId = i.getSubscription();
            chargeId = i.getCharge();
        } else if (obj instanceof PaymentIntent pi) {
            customerId = pi.getCustomer(); chargeId = pi.getId();
        }

        return new WebhookEvent(type.name(), event.getId(),
            customerId, subscriptionId, chargeId, Map.of());
    }
}
