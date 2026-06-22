package com.yourowncrm.controller;

import com.yourowncrm.model.Tenant;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.service.payment.GatewayFactory;
import com.yourowncrm.service.payment.PaymentGatewayService;
import com.yourowncrm.service.payment.PaymentGatewayService.WebhookEventType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Vendor-agnostic webhook receiver.
 *
 * All payment gateways post their events to the same endpoint:
 *   POST /api/billing/webhook
 *
 * The gateway adapter handles signature verification and normalises
 * the event into WebhookEvent — this class only ever sees normalised
 * WebhookEventType values (SUBSCRIPTION_CREATED, CHARGE_SUCCEEDED etc.)
 * and never any vendor-specific field names.
 *
 * IMPORTANT: Register this URL in your payment gateway's dashboard
 * so they know where to send events. The URL must be publicly accessible
 * (HTTPS) — use ngrok for local testing: ngrok http 8080
 */
@RestController
@RequestMapping("/api/billing")
public class WebhookController {

    private static final Logger log   = LoggerFactory.getLogger(WebhookController.class);
    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    private final GatewayFactory   gatewayFactory;
    private final TenantRepository tenantRepo;

    @Autowired
    public WebhookController(GatewayFactory gatewayFactory, TenantRepository tenantRepo) {
        this.gatewayFactory = gatewayFactory;
        this.tenantRepo     = tenantRepo;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody byte[] rawBody,
            // Different vendors use different header names — check all of them
            @RequestHeader(value = "Stripe-Signature",         required = false) String stripeSignature,
            @RequestHeader(value = "X-Razorpay-Signature",     required = false) String razorpaySignature,
            @RequestHeader(value = "Paypal-Transmission-Sig",  required = false) String paypalSignature) {

        // Pick whichever signature header is present
        String signatureHeader = stripeSignature != null  ? stripeSignature
                               : razorpaySignature != null ? razorpaySignature
                               : paypalSignature;

        PaymentGatewayService.WebhookEvent event;
        try {
            event = gatewayFactory.get().verifyAndParseWebhook(rawBody, signatureHeader);
        } catch (Exception e) {
            log.warn("Webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build(); // tell the gateway to NOT retry
        }

        AUDIT.info("WEBHOOK type={} eventId={} customerId={} subscriptionId={}",
            event.type(), event.vendorEventId(),
            event.vendorCustomerId(), event.vendorSubscriptionId());

        WebhookEventType type;
        try {
            type = WebhookEventType.valueOf(event.type());
        } catch (IllegalArgumentException e) {
            log.debug("Ignoring unknown webhook event type: {}", event.type());
            return ResponseEntity.ok().build(); // acknowledge to prevent retries
        }

        // Handle the event — find tenant by vendor customer ID
        Optional<Tenant> tenantOpt = event.vendorCustomerId() != null
            ? tenantRepo.findByVendorCustomerId(event.vendorCustomerId())
            : Optional.empty();

        switch (type) {
            case SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED -> {
                tenantOpt.ifPresent(t -> {
                    t.setSubscriptionStatus("ACTIVE");
                    if (event.vendorSubscriptionId() != null) {
                        t.setVendorSubscriptionId(event.vendorSubscriptionId());
                    }
                    tenantRepo.save(t);
                    log.info("Subscription activated for tenant {}", t.getId());
                });
            }
            case SUBSCRIPTION_PAYMENT_SUCCEEDED -> {
                tenantOpt.ifPresent(t -> {
                    t.setSubscriptionStatus("ACTIVE");
                    tenantRepo.save(t);
                    log.info("Subscription payment succeeded for tenant {}", t.getId());
                });
            }
            case SUBSCRIPTION_PAYMENT_FAILED -> {
                tenantOpt.ifPresent(t -> {
                    t.setSubscriptionStatus("PAST_DUE");
                    tenantRepo.save(t);
                    log.warn("Subscription payment FAILED for tenant {} — status → PAST_DUE", t.getId());
                    // TODO: send email reminder via EmailService
                });
            }
            case SUBSCRIPTION_CANCELED -> {
                tenantOpt.ifPresent(t -> {
                    t.setSubscriptionStatus("CANCELED");
                    tenantRepo.save(t);
                    log.info("Subscription canceled for tenant {}", t.getId());
                    // TODO: revoke access or start grace period logic
                });
            }
            case CHARGE_SUCCEEDED -> log.info("Charge succeeded: {}", event.vendorChargeId());
            case CHARGE_FAILED    -> log.warn("Charge failed: {}", event.vendorChargeId());
            case REFUND_SUCCEEDED -> log.info("Refund succeeded: {}", event.vendorChargeId());
            case UNKNOWN          -> log.debug("Ignoring unknown event from vendor");
        }

        // Always return 200 to acknowledge receipt.
        // If you return non-200 the gateway will retry — return 200 even if
        // our processing failed (we already logged it above).
        return ResponseEntity.ok().build();
    }
}
