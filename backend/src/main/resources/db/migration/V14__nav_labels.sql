-- ══════════════════════════════════════════════════════════════════════════
-- Nav labels — per-tenant customisable sidebar menu names
--
-- Each row overrides the default label for a given route on a given tenant.
-- Routes not present in this table fall back to the hardcoded defaults
-- in the Angular shell, so the table starts empty and only grows when
-- a tenant actually changes something.
--
-- icon: emoji or icon code. NULL = keep the default icon.
-- sort_order: within the group. NULL = keep default ordering.
-- ══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nav_labels (
    id          BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    route       VARCHAR(120) NOT NULL,   -- e.g. "/admin/visit-types"
    label       VARCHAR(80)  NOT NULL,   -- e.g. "Treatments"
    icon        VARCHAR(20),             -- e.g. "💆" — null = keep default
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, route)
);

CREATE INDEX IF NOT EXISTS idx_nav_labels_tenant ON nav_labels(tenant_id);
