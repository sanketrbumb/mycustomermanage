-- V3: Add audit columns to all transaction and master tables
-- Adds: created_by, updated_by, deleted_by, deleted_at
-- (created_at and updated_at already exist on most tables)

-- ── appointments ──────────────────────────────────────────────────
-- created_by already exists; add updated_by, deleted_by, deleted_at
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── invoices ──────────────────────────────────────────────────────
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── payments ──────────────────────────────────────────────────────
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── refunds ───────────────────────────────────────────────────────
ALTER TABLE refunds
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── users (staff) ─────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── resources ─────────────────────────────────────────────────────
ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS created_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── customers ─────────────────────────────────────────────────────
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS created_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── visit_types ───────────────────────────────────────────────────
ALTER TABLE visit_types
    ADD COLUMN IF NOT EXISTS created_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── visit_statuses ────────────────────────────────────────────────
ALTER TABLE visit_statuses
    ADD COLUMN IF NOT EXISTS created_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- ── locations ─────────────────────────────────────────────────────
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS created_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_by  BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- Trigger for refunds updated_at (didn't have one before)
CREATE TRIGGER trg_refunds_upd BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
