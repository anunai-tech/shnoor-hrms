
BEGIN;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role::text = ANY (ARRAY[
    'superadmin'::text,
    'client'::text,
    'manager'::text,
    'employee'::text
  ]));

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended')),
  ADD COLUMN IF NOT EXISTS client_id INTEGER
    REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_subdomain
  ON companies(subdomain)
  WHERE subdomain IS NOT NULL;


CREATE TABLE IF NOT EXISTS company_branding (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL UNIQUE
                  REFERENCES companies(id) ON DELETE CASCADE,
  display_name    VARCHAR(200),
  tagline         VARCHAR(500),
  logo_url        TEXT,
  primary_color   VARCHAR(7) DEFAULT '#D97706',
  landing_content JSONB DEFAULT '{}',
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS subdomain_requests (
  id                  SERIAL PRIMARY KEY,
  company_id          INTEGER NOT NULL
                      REFERENCES companies(id) ON DELETE CASCADE,
  requested_subdomain VARCHAR(100) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,
  requested_at        TIMESTAMP DEFAULT NOW(),
  reviewed_at         TIMESTAMP,
  reviewed_by         INTEGER
                      REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subdomain_requests_status
  ON subdomain_requests(status);

CREATE INDEX IF NOT EXISTS idx_subdomain_requests_company
  ON subdomain_requests(company_id);

CREATE TABLE IF NOT EXISTS client_registrations (
  id            SERIAL PRIMARY KEY,
  company_name  VARCHAR(200) NOT NULL,
  contact_name  VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  registered_at TIMESTAMP DEFAULT NOW(),
  approved_at   TIMESTAMP,
  approved_by   INTEGER
                REFERENCES users(id) ON DELETE SET NULL
);

COMMIT;


SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'c';

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'company_branding',
  'subdomain_requests',
  'client_registrations'
);