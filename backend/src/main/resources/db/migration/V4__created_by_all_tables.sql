-- V4: Add created_by to all master/config tables that are missing it
-- Transaction tables (appointments, invoices, payments, refunds) already have it.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE charge_codes
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE visit_types
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE visit_statuses
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE resource_schedules
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);

ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES users(id);
