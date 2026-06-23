-- ════════════════════════════════════════════════════════════════════════════
-- Dynamic RBAC: roles + role_permissions tables
--
-- Design decisions:
--   - roles.name is a VARCHAR matching the UserRole enum values for the 3
--     built-in roles. Custom roles (Auditor, Intern etc.) use any string.
--   - roles.system_role = TRUE means the role cannot be deleted and its
--     name cannot be changed. Permissions can still be adjusted.
--   - role_permissions stores which Permission enum names are granted.
--     The Permission enum in Java is the authoritative list of what exists.
--   - users.role_name FK references roles(name) within the same tenant.
--     We use a trigger to enforce tenant scoping rather than a composite FK.
--   - The 3 built-in roles are seeded per-tenant in DataSeeder.java so each
--     tenant gets their own copy with their own permission overrides.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Roles table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(60)  NOT NULL,
    description VARCHAR(200),
    system_role BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

-- ── Role permissions join table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         BIGINT      NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_name VARCHAR(80) NOT NULL,
    PRIMARY KEY (role_id, permission_name)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role_id);

-- ── Add role_name to users (nullable during migration, backfilled below) ──────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role_name VARCHAR(60);

-- Backfill role_name from existing role enum values
UPDATE users SET role_name = role::text WHERE role_name IS NULL;

-- ── Comment: users.role (the enum column) stays as-is for Spring Security ─────
-- JwtAuthenticationFilter uses it to build GrantedAuthority('ROLE_xxx').
-- role_name is the FK to roles.name — used for permission lookups.
-- They are kept in sync: when role_name changes, role changes too.
