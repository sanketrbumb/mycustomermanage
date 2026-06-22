package com.yourowncrm.controller;

import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.model.Tenant;
import com.yourowncrm.repository.TenantRepository;
import com.yourowncrm.security.JwtTokenProvider;
import com.yourowncrm.service.payment.GatewayFactory;
import com.yourowncrm.service.payment.PaymentGatewayService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Vendor-agnostic subscription management API.
 *
 * The frontend talks to these endpoints exclusively.
 * Zero vendor-specific code or imports here — all gateway calls
 * go through PaymentGatewayService (the abstraction layer).
 *
 * Routes:
 *   POST /api/subscriptions/checkout   — create a checkout session → redirect URL
 *   POST /api/subscriptions/cancel     — cancel at period end
 *   POST /api/subscriptions/reactivate — un-cancel
 *   GET  /api/subscriptions/status     — current subscription state
 *   GET  /api/subscriptions/portal     — vendor's self-serve billing portal URL
 */
@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final GatewayFactory     gatewayFactory;
    private final TenantRepository   tenantRepo;
    private final JwtTokenProvider   jwt;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Autowired
    public SubscriptionController(GatewayFactory gatewayFactory,
                                  TenantRepository tenantRepo,
                                  JwtTokenProvider jwt) {
        this.gatewayFactory = gatewayFactory;
        this.tenantRepo     = tenantRepo;
        this.jwt            = jwt;
    }

    /**
     * Start a subscription checkout flow.
     * Returns a URL — the frontend redirects the user's browser to this URL.
     * For Stripe: hosted checkout page on stripe.com
     * For Razorpay: order ID for checkout.js to open
     * For PayPal: PayPal approval URL
     * For NoOp: the successUrl directly (for local dev)
     */
    @PostMapping("/checkout")
    public Map<String, Object> createCheckout(
            @RequestHeader("Authorization") String token,
            @RequestBody CheckoutBody req) {

        UUID tenantId = jwt.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
            .orElseThrow(() -> new BusinessException("Tenant not found"));

        PaymentGatewayService gateway = gatewayFactory.get();

        // Ensure the tenant has a customer record with the gateway
        String vendorCustomerId = gateway.ensureCustomer(
            tenantId.toString(), req.email(), tenant.getName());

        // Save vendor customer ID back to tenant (so we can look it up later)
        tenant.setVendorCustomerId(vendorCustomerId);
        tenantRepo.save(tenant);

        var session = gateway.createCheckoutSession(new PaymentGatewayService.CheckoutRequest(
            tenantId.toString(),
            vendorCustomerId,
            req.planId(),
            "Subscription to " + req.planName(),
            null, // null = subscription pricing (amount comes from the plan)
            "usd",
            frontendUrl + "/settings/billing?success=true",
            frontendUrl + "/settings/billing?cancelled=true",
            Map.of("tenantId", tenantId.toString(), "plan", req.planId())
        ));

        log.info("Checkout session created for tenant {} plan {}", tenantId, req.planId());
        return Map.of(
            "checkoutUrl",  session.checkoutUrl(),
            "sessionId",    session.sessionId(),
            "clientSecret", session.clientSecret() != null ? session.clientSecret() : "",
            "vendor",       session.vendor()
        );
    }

    /** Cancel at end of billing period (no immediate access loss) */
    @PostMapping("/cancel")
    public Map<String, String> cancel(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
            .orElseThrow(() -> new BusinessException("Tenant not found"));

        if (tenant.getVendorSubscriptionId() == null) {
            throw new BusinessException("No active subscription found for this account.");
        }

        gatewayFactory.get().cancelSubscription(tenant.getVendorSubscriptionId(), false);
        tenant.setSubscriptionStatus("CANCEL_PENDING");
        tenantRepo.save(tenant);

        log.info("Subscription cancellation requested for tenant {}", tenantId);
        return Map.of("status", "cancel_scheduled",
            "message", "Your subscription will end at the next billing date.");
    }

    /** Get current subscription status */
    @GetMapping("/status")
    public Map<String, Object> status(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
            .orElseThrow(() -> new BusinessException("Tenant not found"));

        return Map.of(
            "status",              tenant.getSubscriptionStatus() != null ? tenant.getSubscriptionStatus() : "NONE",
            "planId",              tenant.getPlanId() != null ? tenant.getPlanId() : "",
            "currentPeriodEnd",    tenant.getCurrentPeriodEnd() != null ? tenant.getCurrentPeriodEnd() : "",
            "vendorCustomerId",    tenant.getVendorCustomerId() != null ? tenant.getVendorCustomerId() : "",
            "trialEndsAt",         tenant.getTrialEndsAt() != null ? tenant.getTrialEndsAt() : "",
            "vendor",              System.getProperty("app.payment.provider", "noop")
        );
    }

    /** Get the gateway's self-serve customer portal URL */
    @GetMapping("/portal")
    public Map<String, String> portal(@RequestHeader("Authorization") String token) {
        UUID tenantId = jwt.getTenantId(token.substring(7));
        Tenant tenant = tenantRepo.findById(tenantId)
            .orElseThrow(() -> new BusinessException("Tenant not found"));

        if (tenant.getVendorCustomerId() == null) {
            throw new BusinessException("No billing account found. Please subscribe first.");
        }

        String url = gatewayFactory.get().getCustomerPortalUrl(
            tenant.getVendorCustomerId(),
            frontendUrl + "/settings/billing"
        );
        return Map.of("portalUrl", url);
    }

    public record CheckoutBody(String planId, String planName, String email) {}
}
