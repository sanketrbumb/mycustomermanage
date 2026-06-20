-- ════════════════════════════════════════════════════════════════
-- V8: Appointment charges table
--
-- Replaces the JSONB additionalCharges field on appointment_notes.
-- Stores ALL line-item charges for an appointment:
--   source = 'VISIT_TYPE'  → auto-populated from the selected visit type
--   source = 'ADDITIONAL'  → manually entered by staff in the visit notes tab
-- Invoice generation pulls from this table instead of visit_type.default_price.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS appt_charges (
    id             BIGSERIAL    PRIMARY KEY,
    tenant_id      UUID         NOT NULL,
    appointment_id BIGINT       NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    source         VARCHAR(20)  NOT NULL DEFAULT 'ADDITIONAL',  -- 'VISIT_TYPE' | 'ADDITIONAL'
    description    VARCHAR(200) NOT NULL,
    charge_code    VARCHAR(30),
    quantity       NUMERIC(8,2) NOT NULL DEFAULT 1,
    unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order     SMALLINT     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_charges_appt   ON appt_charges(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_charges_tenant ON appt_charges(tenant_id);

-- ── Migrate existing ADDITIONAL charges from appointment_notes JSONB ──────────
-- JSON shape: [{"qty":1,"code":"B111","unitPrice":45,"description":"botox"}]
INSERT INTO appt_charges
    (tenant_id, appointment_id, source, description, charge_code, quantity, unit_price, sort_order)
SELECT
    an.tenant_id,
    an.appointment_id,
    'ADDITIONAL',
    COALESCE(elem.value->>'description', 'Service'),
    NULLIF(elem.value->>'code', ''),
    COALESCE((elem.value->>'qty')::NUMERIC(8,2),  1),
    COALESCE((elem.value->>'unitPrice')::NUMERIC(10,2), 0),
    (elem.ordinality - 1)::SMALLINT
FROM appointment_notes an,
     jsonb_array_elements(an.additional_charges) WITH ORDINALITY AS elem
WHERE an.additional_charges IS NOT NULL
  AND jsonb_typeof(an.additional_charges) = 'array'
  AND jsonb_array_length(an.additional_charges) > 0;

-- ── Seed VISIT_TYPE charges from appointments that have a visit type ───────────
-- These represent the base charge derived from the visit type at booking time.
INSERT INTO appt_charges
    (tenant_id, appointment_id, source, description, charge_code, quantity, unit_price, sort_order)
SELECT
    a.tenant_id,
    a.id,
    'VISIT_TYPE',
    vt.name,
    cc.code,
    1,
    COALESCE(
        NULLIF(a.charge_amount, 0),
        vt.default_price,
        0
    ),
    0
FROM appointments a
JOIN visit_types  vt ON vt.id = a.visit_type_id
LEFT JOIN charge_codes cc ON cc.id = vt.charge_code_id
WHERE a.visit_type_id IS NOT NULL
  AND a.deleted_at IS NULL;

-- ── Remove the now-redundant JSONB column from appointment_notes ──────────────
ALTER TABLE appointment_notes DROP COLUMN IF EXISTS additional_charges;
