-- ════════════════════════════════════════════════════════════════
-- Payment method enum fix
--
-- Root cause of "payment posted is not saving... validation failed...
-- 400... Invalid CORS request":
--
-- The frontend's payment dropdowns (Quick Pay popup AND the main
-- Billing > Payments screen) have always offered 5 options:
--   CARD, CASH, CHECK, TRANSFER, OTHER
--
-- But the database's payment_method ENUM type (and the matching Java
-- PaymentMethod enum) only recognized 4 values:
--   CASH, CARD, ONLINE, CHECK
--
-- Whenever a user selected "Online / ACH" (value="TRANSFER") or
-- "Other" (value="OTHER"), Jackson failed to deserialize the request
-- body into the Java enum before validation even ran. Spring surfaced
-- this as a 400 Bad Request — which browsers sometimes display
-- ambiguously as a CORS-looking failure when the response has no
-- body/headers the browser expects, even though the real cause was
-- payload deserialization, not CORS configuration.
--
-- This migration adds the two missing values to the Postgres enum.
-- Postgres does not support removing enum values without recreating
-- the type, so ONLINE is left in place for backward compatibality
-- with any existing rows — the Java enum and frontend simply don't
-- use it going forward.
-- ════════════════════════════════════════════════════════════════

-- This migration is defensive: if payment_method doesn't exist yet
-- (e.g. V1 was skipped, or the database was provisioned by running
-- database/001_schema.sql manually rather than letting Flyway run
-- V1-V5 in order), create it directly with ALL values already
-- included — this avoids a same-transaction CREATE TYPE + ALTER TYPE
-- ADD VALUE sequence, which has inconsistent support across Postgres
-- versions due to internal enum OID visibility rules.
--
-- If the type already exists (the expected case on a normally
-- provisioned database), just add the two new values to it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('CASH','CARD','ONLINE','CHECK','TRANSFER','OTHER');
    END IF;
END$$;

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'OTHER';