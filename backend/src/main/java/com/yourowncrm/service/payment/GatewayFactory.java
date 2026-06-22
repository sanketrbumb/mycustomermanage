package com.yourowncrm.service.payment;

import com.yourowncrm.service.payment.adapters.RazorpayAdapter;
import com.yourowncrm.service.payment.adapters.StripeAdapter;
import com.yourowncrm.service.payment.adapters.PayPalAdapter;
import com.yourowncrm.service.payment.adapters.NoOpAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

/**
 * Reads GATEWAY_PROVIDER from .env / application.yml and returns
 * the matching adapter. Your code never calls this directly —
 * inject PaymentGatewayService and let Spring wire the right bean.
 *
 * Supported values for GATEWAY_PROVIDER:
 *   stripe    — Stripe Checkout + Billing
 *   razorpay  — Razorpay (popular in India/SE Asia)
 *   paypal    — PayPal REST API
 *   noop      — No-op stub for local dev / testing (never charges anyone)
 *
 * Adding a new vendor:
 *   1. Create a class in adapters/ implementing PaymentGatewayService
 *   2. Add a case here
 *   3. Add the vendor's SDK to pom.xml
 *   4. Done. Zero changes to business logic.
 */
@Component
public class GatewayFactory {

    private static final Logger log = LoggerFactory.getLogger(GatewayFactory.class);

    @Value("${app.payment.provider:noop}")
    private String provider;

    private final ApplicationContext ctx;

    @Autowired
    public GatewayFactory(ApplicationContext ctx) {
        this.ctx = ctx;
    }

    public PaymentGatewayService get() {
        return switch (provider.toLowerCase().trim()) {
            case "stripe"   -> ctx.getBean(StripeAdapter.class);
            case "razorpay" -> ctx.getBean(RazorpayAdapter.class);
            case "paypal"   -> ctx.getBean(PayPalAdapter.class);
            case "noop", "none", "test" -> {
                log.warn("Payment gateway is in NO-OP mode — no real charges will occur");
                yield ctx.getBean(NoOpAdapter.class);
            }
            default -> throw new IllegalStateException(
                "Unknown payment provider: '" + provider + "'. " +
                "Set GATEWAY_PROVIDER to: stripe, razorpay, paypal, or noop"
            );
        };
    }
}
