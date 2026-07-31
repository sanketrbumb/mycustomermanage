package com.yourowncrm.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * No external dependency needed — uses ConcurrentHashMap + AtomicInteger.
 * Good enough for a single-node deployment. For multi-node, replace with
 * Redis-backed rate limiting (Bucket4j + RedisRateLimiter).
 *
 * Usage:
 *   rateLimiter.check("signup", clientIp, 5, 3600)   // 5 requests per hour
 *   rateLimiter.check("slug",   clientIp, 30, 60)     // 30 requests per minute
 */
@Component
public class RateLimiter {

    private record Window(AtomicInteger count, long resetAt) {}
    private final ConcurrentHashMap<String, Window> store = new ConcurrentHashMap<>();

    /**
     * Returns true if the request is allowed, false if rate limit exceeded.
     *
     * @param action     logical name for the action (e.g. "signup", "slug-check")
     * @param clientKey  IP address or any unique client identifier
     * @param maxRequests max allowed requests within the window
     * @param windowSecs  window size in seconds
     */
    public boolean allow(String action, String clientKey, int maxRequests, int windowSecs) {
        String key   = action + ":" + clientKey;
        long   nowMs = Instant.now().toEpochMilli();
        long   reset = nowMs + (windowSecs * 1000L);

        Window window = store.compute(key, (k, existing) -> {
            if (existing == null || nowMs > existing.resetAt()) {
                // New window
                return new Window(new AtomicInteger(1), reset);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        return window.count().get() <= maxRequests;
    }

    /**
     * Convenience: throws a 429 response if rate limit exceeded.
     * Catch RateLimitException in the controller and return 429.
     */
    public void check(String action, String clientKey, int maxRequests, int windowSecs) {
        if (!allow(action, clientKey, maxRequests, windowSecs)) {
            throw new RateLimitException("Too many requests. Please slow down and try again later.");
        }
    }

    public static class RateLimitException extends RuntimeException {
        public RateLimitException(String msg) { super(msg); }
    }
}
