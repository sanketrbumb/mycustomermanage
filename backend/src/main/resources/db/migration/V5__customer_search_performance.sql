-- ════════════════════════════════════════════════════════════════
-- Customer search performance fix
--
-- Root cause: the customer search query used LIKE '%term%' (leading
-- wildcard) wrapped in LOWER() across 4 OR'd columns. Standard B-tree
-- indexes (idx_cust_name, idx_cust_phone) CANNOT be used for infix
-- ('%term%') matches — only prefix ('term%') matches. This forced a
-- full sequential scan with per-row LOWER() evaluation on every
-- keystroke, which gets progressively slower as the customers table
-- grows.
--
-- Fix: pg_trgm (trigram) indexes. These break text into 3-character
-- sequences and index those, which Postgres's query planner CAN use
-- for '%term%' style searches via the GIN index + similarity/LIKE
-- operators. This is the standard, well-supported solution for fast
-- substring search in Postgres.
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN indexes on the columns used in customer search.
-- gin_trgm_ops enables LIKE '%...%' and ILIKE to use the index.
CREATE INDEX IF NOT EXISTS idx_cust_first_name_trgm
    ON customers USING GIN (first_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cust_last_name_trgm
    ON customers USING GIN (last_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cust_email_trgm
    ON customers USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cust_phone_trgm
    ON customers USING GIN (phone gin_trgm_ops);

-- Composite index to speed up the tenant_id + active filter that
-- always accompanies the search (so Postgres can narrow down rows
-- before even touching the trigram indexes).
CREATE INDEX IF NOT EXISTS idx_cust_tenant_active
    ON customers (tenant_id, active);
