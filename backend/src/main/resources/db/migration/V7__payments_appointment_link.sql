-- ════════════════════════════════════════════════════════════════
-- Link payments directly to appointments
--
-- Previously, the only way to find which appointment a payment
-- related to was:
--   payment → payment_invoice_links → invoices → appointment_id
--
-- This adds a direct appointment_id on payments so that:
-- 1. Payments posted from the appointment screen can be found by
--    appointment without going through an invoice (e.g. before an
--    invoice is auto-generated on terminal status).
-- 2. The duplicate-payment bug can be detected server-side:
--    if a payment already exists for this appointment_id and the
--    same invoice, we UPDATE rather than INSERT.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS appointment_id BIGINT
        REFERENCES appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pay_appointment
    ON payments(appointment_id);
