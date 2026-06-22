-- ════════════════════════════════════════════════════════════════
-- Tenant subscription tracking fields
--
-- Adds all fields needed to track a tenant's subscription state
-- independent of which payment gateway they're using.
--
-- vendor_customer_id    — the gateway's customer ID (cus_xxx, rzp_cust_xxx etc.)
-- vendor_subscription_id — the gateway's subscription ID
-- subscription_status   — normalised: TRIALING, ACTIVE, PAST_DUE, CANCELED
-- plan_id               — the gateway's price/plan ID for the current plan
-- trial_ends_at         — when the free trial expires (null if never on trial)
-- current_period_end    — next billing date (for UI display + access checks)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS vendor_customer_id      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendor_subscription_id  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subscription_status     VARCHAR(20) DEFAULT 'TRIALING',
    ADD COLUMN IF NOT EXISTS plan_id                 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS trial_ends_at           DATE,
    ADD COLUMN IF NOT EXISTS current_period_end      DATE;

-- Set all existing tenants to ACTIVE (they were using the system before billing was added)
UPDATE tenants SET subscription_status = 'ACTIVE' WHERE subscription_status IS NULL;

-- Index for webhook lookup: gateway sends customer ID, we need to find the tenant
CREATE INDEX IF NOT EXISTS idx_tenant_vendor_customer ON tenants(vendor_customer_id);
