-- V2: SOAP Notes table
CREATE TABLE IF NOT EXISTS appointment_notes (
    id                  BIGSERIAL    PRIMARY KEY,
    appointment_id      BIGINT       NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    subjective          TEXT,
    objective           TEXT,
    assessment          TEXT,
    plan                TEXT,
    chief_complaint     VARCHAR(300),
    followup            TEXT,
    treatment           TEXT,
    products_used       TEXT,
    therapist_initials  VARCHAR(10),
    additional_charges  JSONB,
    created_by          BIGINT       REFERENCES users(id),
    updated_by          BIGINT       REFERENCES users(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_appt_notes_appt ON appointment_notes(appointment_id);

CREATE TRIGGER trg_appt_notes_upd
    BEFORE UPDATE ON appointment_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
