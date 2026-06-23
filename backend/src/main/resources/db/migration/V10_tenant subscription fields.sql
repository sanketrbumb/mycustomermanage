-- ════════════════════════════════════════════════════════════════
-- Tenant subscription tracking fields (was V8, renamed to V9
-- because V8__appt_charges.sql already exists in this project)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS vendor_customer_id      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS vendor_subscription_id  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS subscription_status     VARCHAR(20) DEFAULT 'TRIALING',
    ADD COLUMN IF NOT EXISTS plan_id                 VARCHAR(100),
    ADD COLUMN IF NOT EXISTS trial_ends_at           DATE,
    ADD COLUMN IF NOT EXISTS current_period_end      DATE;

UPDATE tenants SET subscription_status = 'ACTIVE' WHERE subscription_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_vendor_customer ON tenants(vendor_customer_id);