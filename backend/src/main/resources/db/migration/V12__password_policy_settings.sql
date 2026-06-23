-- Add password policy fields to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS min_password_length INTEGER NOT NULL DEFAULT 6;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_failed_logins INTEGER NOT NULL DEFAULT 5;
