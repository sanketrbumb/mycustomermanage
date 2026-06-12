-- ============================================================
--  YOUR OWN CRM — PostgreSQL DDL  v1.0
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role      AS ENUM ('SUPER_ADMIN','MANAGER','STAFF','RESOURCE');
CREATE TYPE payment_method AS ENUM ('CASH','CARD','ONLINE','CHECK');
CREATE TYPE invoice_status AS ENUM ('DRAFT','ISSUED','PARTIAL','PAID','VOID');
CREATE TYPE dow            AS ENUM ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');

-- ── TENANTS ──────────────────────────────────────────────────
CREATE TABLE tenants (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(120) NOT NULL,
    slug          VARCHAR(60)  NOT NULL UNIQUE,
    logo_url      TEXT,
    timezone      VARCHAR(60)  NOT NULL DEFAULT 'America/New_York',
    currency_code CHAR(3)      NOT NULL DEFAULT 'USD',
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── LOCATIONS ────────────────────────────────────────────────
CREATE TABLE locations (
    id          BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    address1    VARCHAR(200),
    city        VARCHAR(100),
    state       CHAR(2),
    zip         VARCHAR(10),
    phone       VARCHAR(20),
    email       VARCHAR(120),
    color_hex   CHAR(7)      NOT NULL DEFAULT '#1a4a3a',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE users (
    id             BIGSERIAL    PRIMARY KEY,
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username       VARCHAR(60)  NOT NULL,
    email          VARCHAR(120) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    first_name     VARCHAR(80)  NOT NULL,
    last_name      VARCHAR(80)  NOT NULL,
    role           user_role    NOT NULL DEFAULT 'STAFF',
    phone          VARCHAR(20),
    location_id    BIGINT       REFERENCES locations(id) ON DELETE SET NULL,
    can_book_appts BOOLEAN      NOT NULL DEFAULT TRUE,
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    locked         BOOLEAN      NOT NULL DEFAULT FALSE,
    fail_count     SMALLINT     NOT NULL DEFAULT 0,
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, username),
    UNIQUE(tenant_id, email)
);

-- ── ROLE PERMISSIONS ─────────────────────────────────────────
CREATE TABLE role_permissions (
    id          BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role        user_role    NOT NULL,
    permission  VARCHAR(100) NOT NULL,
    granted     BOOLEAN      NOT NULL DEFAULT TRUE,
    UNIQUE(tenant_id, role, permission)
);

-- ── CHARGE CODES ─────────────────────────────────────────────
CREATE TABLE charge_codes (
    id          BIGSERIAL     PRIMARY KEY,
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code        VARCHAR(30)   NOT NULL,
    description VARCHAR(200)  NOT NULL,
    category    VARCHAR(60)   NOT NULL DEFAULT 'Service',
    unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit        VARCHAR(40),
    active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ── VISIT TYPES ──────────────────────────────────────────────
CREATE TABLE visit_types (
    id             BIGSERIAL     PRIMARY KEY,
    tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           VARCHAR(100)  NOT NULL,
    charge_code_id BIGINT        REFERENCES charge_codes(id) ON DELETE SET NULL,
    default_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    duration_min   SMALLINT      NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 1 AND 480),
    color_hex      CHAR(7)       NOT NULL DEFAULT '#1a4a3a',
    active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ── VISIT STATUSES ───────────────────────────────────────────
CREATE TABLE visit_statuses (
    id            BIGSERIAL   PRIMARY KEY,
    tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(80) NOT NULL,
    sort_order    SMALLINT    NOT NULL DEFAULT 0,
    is_terminal   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_chargeable BOOLEAN     NOT NULL DEFAULT TRUE,
    color_hex     CHAR(7)     NOT NULL DEFAULT '#7a7a7a',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ── RESOURCES ────────────────────────────────────────────────
CREATE TABLE resources (
    id          BIGSERIAL    PRIMARY KEY,
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id BIGINT       NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,
    type        VARCHAR(80),
    capacity    SMALLINT     NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    color_hex   CHAR(7)      NOT NULL DEFAULT '#2980b9',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ── RESOURCE SCHEDULES ───────────────────────────────────────
CREATE TABLE resource_schedules (
    id             BIGSERIAL   PRIMARY KEY,
    tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type    VARCHAR(10) NOT NULL CHECK (entity_type IN ('RESOURCE','STAFF')),
    entity_id      BIGINT      NOT NULL,
    location_id    BIGINT      REFERENCES locations(id) ON DELETE SET NULL,
    priority       SMALLINT    NOT NULL DEFAULT 0,
    day_of_week    dow         NOT NULL,
    is_open        BOOLEAN     NOT NULL DEFAULT TRUE,
    open_time      TIME        NOT NULL DEFAULT '09:00',
    close_time     TIME        NOT NULL DEFAULT '18:00',
    effective_from DATE,
    effective_to   DATE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sched_times CHECK (close_time > open_time)
);
CREATE INDEX idx_sched_entity ON resource_schedules(entity_type, entity_id);

-- ── BLOCK-OUT DATES ──────────────────────────────────────────
CREATE TABLE block_out_dates (
    id          BIGSERIAL   PRIMARY KEY,
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('RESOURCE','STAFF','LOCATION','ALL')),
    entity_id   BIGINT,
    block_date  DATE        NOT NULL,
    reason      VARCHAR(200),
    all_day     BOOLEAN     NOT NULL DEFAULT TRUE,
    start_time  TIME,
    end_time    TIME,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_block_date   ON block_out_dates(block_date);
CREATE INDEX idx_block_entity ON block_out_dates(entity_type, entity_id);

-- ── CUSTOMERS ────────────────────────────────────────────────
CREATE TABLE customers (
    id                BIGSERIAL    PRIMARY KEY,
    tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    email             VARCHAR(120),
    phone             VARCHAR(20),
    dob               DATE,
    gender            VARCHAR(20),
    address1          VARCHAR(200),
    city              VARCHAR(100),
    state             CHAR(2),
    zip               VARCHAR(10),
    membership_type   VARCHAR(60),
    referral_source   VARCHAR(100),
    emergency_contact VARCHAR(150),
    emergency_phone   VARCHAR(20),
    allergies         TEXT,
    medical_notes     TEXT,
    consent_on_file   BOOLEAN     NOT NULL DEFAULT FALSE,
    active            BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cust_name  ON customers(tenant_id, last_name, first_name);
CREATE INDEX idx_cust_phone ON customers(tenant_id, phone);

-- ── APPOINTMENTS ─────────────────────────────────────────────
CREATE TABLE appointments (
    id                BIGSERIAL     PRIMARY KEY,
    tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id       BIGINT        NOT NULL REFERENCES customers(id),
    resource_id       BIGINT        REFERENCES resources(id),
    staff_resource_id BIGINT        REFERENCES users(id),
    staff_id          BIGINT        REFERENCES users(id),
    location_id       BIGINT        REFERENCES locations(id),
    visit_type_id     BIGINT        REFERENCES visit_types(id),
    visit_status_id   BIGINT        NOT NULL REFERENCES visit_statuses(id),
    appt_date         DATE          NOT NULL,
    start_time        TIME          NOT NULL,
    end_time          TIME          NOT NULL,
    duration_min      SMALLINT      NOT NULL CHECK (duration_min > 0),
    charge_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes             TEXT,
    soap_notes        JSONB,
    created_by        BIGINT        REFERENCES users(id),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_appt_times    CHECK (end_time > start_time),
    CONSTRAINT chk_appt_resource CHECK (resource_id IS NOT NULL OR staff_resource_id IS NOT NULL)
);
CREATE INDEX idx_appt_date      ON appointments(tenant_id, appt_date);
CREATE INDEX idx_appt_resource  ON appointments(resource_id, appt_date);
CREATE INDEX idx_appt_staff_res ON appointments(staff_resource_id, appt_date);
CREATE INDEX idx_appt_customer  ON appointments(customer_id);

-- ── INVOICES ─────────────────────────────────────────────────
CREATE TABLE invoices (
    id             BIGSERIAL     PRIMARY KEY,
    tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(30)   NOT NULL,
    appointment_id BIGINT        REFERENCES appointments(id),
    customer_id    BIGINT        NOT NULL REFERENCES customers(id),
    location_id    BIGINT        REFERENCES locations(id),
    invoice_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    due_date       DATE,
    gross_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_type  VARCHAR(10)   NOT NULL DEFAULT 'NONE'
                       CHECK (discount_type IN ('NONE','PCT','FLAT')),
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
    status         invoice_status NOT NULL DEFAULT 'DRAFT',
    notes          TEXT,
    voided_at      TIMESTAMPTZ,
    voided_by      BIGINT        REFERENCES users(id),
    created_by     BIGINT        REFERENCES users(id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);
CREATE INDEX idx_inv_customer ON invoices(customer_id);
CREATE INDEX idx_inv_date     ON invoices(tenant_id, invoice_date);
CREATE INDEX idx_inv_status   ON invoices(tenant_id, status);

-- ── INVOICE LINE ITEMS ───────────────────────────────────────
CREATE TABLE invoice_line_items (
    id             BIGSERIAL     PRIMARY KEY,
    invoice_id     BIGINT        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    charge_code_id BIGINT        REFERENCES charge_codes(id) ON DELETE SET NULL,
    description    VARCHAR(200)  NOT NULL,
    charge_code    VARCHAR(30),
    quantity       NUMERIC(8,2)  NOT NULL DEFAULT 1,
    unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_price    NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sort_order     SMALLINT      NOT NULL DEFAULT 0
);
CREATE INDEX idx_line_inv ON invoice_line_items(invoice_id);

-- ── INVOICE FK back onto appointments ────────────────────────
ALTER TABLE appointments ADD COLUMN invoice_id BIGINT REFERENCES invoices(id);

-- ── PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE payments (
    id             BIGSERIAL     PRIMARY KEY,
    tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_number VARCHAR(30)   NOT NULL,
    customer_id    BIGINT        NOT NULL REFERENCES customers(id),
    method         payment_method NOT NULL DEFAULT 'CARD',
    amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    reference      VARCHAR(100),
    notes          TEXT,
    created_by     BIGINT        REFERENCES users(id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, payment_number)
);
CREATE INDEX idx_pay_date     ON payments(tenant_id, payment_date);
CREATE INDEX idx_pay_customer ON payments(customer_id);

-- ── PAYMENT–INVOICE LINKS ────────────────────────────────────
CREATE TABLE payment_invoice_links (
    id             BIGSERIAL     PRIMARY KEY,
    payment_id     BIGINT        NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id     BIGINT        NOT NULL REFERENCES invoices(id),
    amount_applied NUMERIC(10,2) NOT NULL CHECK (amount_applied > 0),
    UNIQUE(payment_id, invoice_id)
);
CREATE INDEX idx_pil_invoice ON payment_invoice_links(invoice_id);

-- ── REFUNDS ──────────────────────────────────────────────────
CREATE TABLE refunds (
    id            BIGSERIAL     PRIMARY KEY,
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    refund_number VARCHAR(30)   NOT NULL,
    payment_id    BIGINT        NOT NULL REFERENCES payments(id),
    amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    reason        VARCHAR(200),
    notes         TEXT,
    refund_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_by    BIGINT        REFERENCES users(id),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, refund_number)
);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id          BIGSERIAL   PRIMARY KEY,
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action      VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80),
    entity_id   BIGINT,
    user_id     BIGINT      REFERENCES users(id),
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_time   ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ── AUTO UPDATED_AT ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS
$$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['tenants','locations','users','charge_codes','visit_types',
    'visit_statuses','resources','resource_schedules','customers','appointments','invoices'] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_upd BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',t,t);
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════
-- SOAP NOTES TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS appointment_notes (
    id                  BIGSERIAL    PRIMARY KEY,
    appointment_id      BIGINT       NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    -- SOAP
    subjective          TEXT,
    objective           TEXT,
    assessment          TEXT,
    plan                TEXT,
    chief_complaint     VARCHAR(300),
    followup            TEXT,
    -- Treatment
    treatment           TEXT,
    products_used       TEXT,
    therapist_initials  VARCHAR(10),
    -- Additional charges stored as JSONB
    additional_charges  JSONB,
    -- Audit
    created_by          BIGINT       REFERENCES users(id),
    updated_by          BIGINT       REFERENCES users(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_appt_notes_appt ON appointment_notes(appointment_id);
CREATE TRIGGER trg_appt_notes_upd BEFORE UPDATE ON appointment_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- CHAR TO VARCHAR FIX — color_hex columns
-- Run if schema was created before this fix.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE locations    ALTER COLUMN color_hex TYPE VARCHAR(7) USING TRIM(color_hex)::VARCHAR;
ALTER TABLE resources    ALTER COLUMN color_hex TYPE VARCHAR(7) USING TRIM(color_hex)::VARCHAR;
ALTER TABLE visit_statuses ALTER COLUMN color_hex TYPE VARCHAR(7) USING TRIM(color_hex)::VARCHAR;
ALTER TABLE visit_types  ALTER COLUMN color_hex TYPE VARCHAR(7) USING TRIM(color_hex)::VARCHAR;
