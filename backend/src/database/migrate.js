'use strict';

require('dotenv').config();
const db = require('./connection');
const logger = require('../utils/logger');

const SCHEMA_SQL = `

-- ─────────────────────────────────────────────
-- Enable UUID support
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                VARCHAR(255) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  role                 VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','DOCTOR','RECEPTIONIST','LAB_ASSISTANT','PATIENT')),
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100) NOT NULL,
  phone                VARCHAR(20),
  is_active            BOOLEAN DEFAULT TRUE,
  is_email_verified    BOOLEAN DEFAULT FALSE,
  password_changed_at  TIMESTAMPTZ,
  last_login_at        TIMESTAMPTZ,
  failed_login_attempts INT DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  avatar_url           VARCHAR(500),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- REFRESH TOKENS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE,
  revoked_at  TIMESTAMPTZ,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─────────────────────────────────────────────
-- PATIENTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  uhid              VARCHAR(20) UNIQUE NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  date_of_birth     DATE NOT NULL,
  gender            VARCHAR(10) NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  blood_group       VARCHAR(5),
  phone             VARCHAR(20) NOT NULL,
  email             VARCHAR(255),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  pincode           VARCHAR(10),
  emergency_contact_name   VARCHAR(200),
  emergency_contact_phone  VARCHAR(20),
  allergies         TEXT[],
  chronic_conditions TEXT[],
  insurance_provider      VARCHAR(200),
  insurance_policy_number VARCHAR(100),
  is_active         BOOLEAN DEFAULT TRUE,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(uhid);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name);

-- ─────────────────────────────────────────────
-- DOCTORS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  specialization    VARCHAR(200) NOT NULL,
  department        VARCHAR(200),
  qualification     VARCHAR(500),
  experience_years  INT DEFAULT 0,
  consultation_fee  DECIMAL(10,2) DEFAULT 0,
  available_days    VARCHAR(7) DEFAULT 'MTWTFSS',
  slot_duration_min INT DEFAULT 30,
  max_patients_per_day INT DEFAULT 20,
  bio               TEXT,
  is_available      BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- ─────────────────────────────────────────────
-- APPOINTMENTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_min    INT DEFAULT 30,
  status          VARCHAR(30) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
  type            VARCHAR(50) DEFAULT 'CONSULTATION' CHECK (type IN ('CONSULTATION','FOLLOW_UP','EMERGENCY','LAB_REVIEW')),
  chief_complaint TEXT,
  notes           TEXT,
  cancellation_reason TEXT,
  booked_by       UUID REFERENCES users(id),
  reminder_sent   BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot ON appointments(doctor_id, appointment_date, appointment_time) WHERE deleted_at IS NULL AND status != 'CANCELLED';

-- ─────────────────────────────────────────────
-- MEDICAL RECORDS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_id    UUID REFERENCES appointments(id),
  visit_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint   TEXT,
  history_of_illness TEXT,
  examination_notes TEXT,
  diagnosis         TEXT,
  icd_codes         VARCHAR(20)[],
  treatment_plan    TEXT,
  prescription      JSONB,
  follow_up_date    DATE,
  is_confidential   BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(visit_date DESC);

-- ─────────────────────────────────────────────
-- LAB TESTS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  record_id       UUID REFERENCES medical_records(id),
  appointment_id  UUID REFERENCES appointments(id),
  lab_assistant_id UUID REFERENCES users(id),
  test_name       VARCHAR(200) NOT NULL,
  test_code       VARCHAR(50),
  category        VARCHAR(100),
  status          VARCHAR(30) DEFAULT 'ORDERED' CHECK (status IN ('ORDERED','SAMPLE_COLLECTED','PROCESSING','COMPLETED','CANCELLED')),
  priority        VARCHAR(20) DEFAULT 'ROUTINE' CHECK (priority IN ('ROUTINE','URGENT','STAT')),
  ordered_date    TIMESTAMPTZ DEFAULT NOW(),
  sample_collected_at TIMESTAMPTZ,
  result_date     TIMESTAMPTZ,
  result_summary  TEXT,
  report_url      VARCHAR(500),
  report_filename VARCHAR(255),
  doctor_reviewed BOOLEAN DEFAULT FALSE,
  doctor_review_notes TEXT,
  reviewed_at     TIMESTAMPTZ,
  cost            DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_doctor ON lab_tests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_status ON lab_tests(status);

-- ─────────────────────────────────────────────
-- BILLING TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number    VARCHAR(50) UNIQUE NOT NULL,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id    UUID REFERENCES appointments(id),
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate          DECIMAL(5,2) DEFAULT 0,
  tax_amount        DECIMAL(12,2) DEFAULT 0,
  discount_amount   DECIMAL(12,2) DEFAULT 0,
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount       DECIMAL(12,2) DEFAULT 0,
  balance_due       DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  payment_status    VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PARTIAL','PAID','CANCELLED','REFUNDED')),
  payment_method    VARCHAR(50),
  payment_date      TIMESTAMPTZ,
  insurance_claim   BOOLEAN DEFAULT FALSE,
  insurance_amount  DECIMAL(12,2) DEFAULT 0,
  notes             TEXT,
  generated_by      UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoice ON billing(invoice_number);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_date ON billing(created_at DESC);

-- ─────────────────────────────────────────────
-- AUDIT LOGS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action         VARCHAR(100) NOT NULL,
  resource       VARCHAR(100) NOT NULL,
  resource_id    VARCHAR(255),
  old_values     JSONB,
  new_values     JSONB,
  ip_address     VARCHAR(45),
  user_agent     TEXT,
  status         VARCHAR(20) DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS','FAILURE')),
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ─────────────────────────────────────────────
-- TRIGGERS: updated_at auto-update
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','patients','doctors','appointments','medical_records','lab_tests','billing']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%s ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$;

`;

async function migrate() {
    logger.info('🔄 Running database migrations...');
    try {
        await db.query(SCHEMA_SQL);
        logger.info('✅ Database schema created/updated successfully');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
