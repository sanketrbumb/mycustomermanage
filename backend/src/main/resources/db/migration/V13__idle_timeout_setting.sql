-- Idle session timeout per tenant (Feature: auto-logout after inactivity)
-- Default: 60 minutes. Valid range: 1–1440 (1 min to 24 hours).

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS idle_timeout_minutes INTEGER NOT NULL DEFAULT 60;

ALTER TABLE tenants
    ADD CONSTRAINT chk_idle_timeout_range
    CHECK (idle_timeout_minutes BETWEEN 1 AND 1440);
