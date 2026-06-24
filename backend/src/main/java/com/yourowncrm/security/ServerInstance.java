package com.yourowncrm.security;

import org.springframework.stereotype.Component;
import java.util.UUID;

/**
 * Holds a unique identifier generated once when the application starts.
 *
 * This is the mechanism that logs out all users when the server restarts.
 *
 * How it works:
 *   1. On startup, a random UUID is generated (the "server instance ID").
 *   2. Every JWT issued embeds this ID as a "srv" claim.
 *   3. On every authenticated request, JwtAuthenticationFilter compares the
 *      token's "srv" claim against the current instance ID.
 *   4. When the server restarts, a NEW UUID is generated. All tokens issued
 *      by the previous run carry the OLD id, so they no longer match and are
 *      rejected — forcing every user to log in again.
 *
 * Note: in a multi-instance deployment (load balancer with several backend
 * nodes), each node would generate its own ID, which would log users out
 * whenever they hit a different node. For that scenario, store the instance
 * ID in a shared place (DB row or Redis key) seeded once at deploy time and
 * rotated intentionally. For a single-node deployment this in-memory approach
 * is exactly what you want.
 */
@Component
public class ServerInstance {

    private final String instanceId = UUID.randomUUID().toString();

    public String getInstanceId() {
        return instanceId;
    }
}
