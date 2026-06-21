-- Make email nullable so staff members without email don't violate the unique constraint
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Blank emails stored as '' cause false unique violations; convert to NULL
UPDATE users SET email = NULL WHERE email = '';

-- Drop the old unique constraint (PostgreSQL auto-names it)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_email_key;

-- Partial unique index — only enforces uniqueness for non-null, non-blank emails
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_uq
    ON users(tenant_id, email)
    WHERE email IS NOT NULL AND email <> '';
