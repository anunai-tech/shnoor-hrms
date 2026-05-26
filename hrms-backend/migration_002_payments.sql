BEGIN;

-- Extend subscriptions with display data — features, highlight flag, and CTA text.
-- Also renames existing seed plans to match frontend display names.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS features JSONB,
  ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100);

-- Rename seed plans to proper display names used in frontend defaults.
UPDATE subscriptions SET name = 'Basic'      WHERE name = 'Default';
UPDATE subscriptions SET name = 'Pro'        WHERE name = 'Monthly';
UPDATE subscriptions SET name = 'Enterprise' WHERE name = 'Shnoor';

-- Seed feature lists and display config for each plan (only if not yet set).
UPDATE subscriptions SET
  features = '["Up to 50 employees","Attendance tracking","Leave management","Basic reports","Email support"]'::jsonb,
  is_highlighted = false,
  cta_text = 'Get Started Free'
WHERE name = 'Basic' AND features IS NULL;

UPDATE subscriptions SET
  features = '["Up to 50 employees","All Basic features","Expense management","Company policies","Priority support"]'::jsonb,
  is_highlighted = true,
  cta_text = 'Start Pro Plan'
WHERE name = 'Pro' AND features IS NULL;

UPDATE subscriptions SET
  features = '["Up to 1000 employees","All Pro features","Multi-company support","Custom integrations","Dedicated support"]'::jsonb,
  is_highlighted = false,
  cta_text = 'Contact Sales'
WHERE name = 'Enterprise' AND features IS NULL;


-- Extend transactions with payment processing columns needed for real billing.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS gateway        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gateway_order_id   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS currency       VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS exchange_rate  NUMERIC(10,4) DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS billing_type   VARCHAR(20);


-- Extend website_settings with invoice configuration — SHNOOR's legal details
-- used on every generated invoice PDF. Superadmin can update from the UI.
ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS invoice_company_name VARCHAR(255)
    DEFAULT 'SHNOOR International LLC',
  ADD COLUMN IF NOT EXISTS invoice_address TEXT
    DEFAULT '10009 Mount Tabor Road, Odessa, Missouri, United States, Zip 640766109',
  ADD COLUMN IF NOT EXISTS invoice_rep_office TEXT
    DEFAULT 'Building No. 25, 504, Al Khuwair St, Muscat 133, Oman',
  ADD COLUMN IF NOT EXISTS invoice_email VARCHAR(255)
    DEFAULT 'vivek@shnoor.com',
  ADD COLUMN IF NOT EXISTS invoice_phone VARCHAR(150)
    DEFAULT '+968-98764627 (Oman) | +91-9041914601 (IN) | +91-9429694298 (O)',
  ADD COLUMN IF NOT EXISTS invoice_website VARCHAR(255)
    DEFAULT 'www.shnoor.com',
  ADD COLUMN IF NOT EXISTS invoice_gstin VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20) DEFAULT 'SHNOOR-INV';


-- Stores API credentials for each automatic payment gateway.
-- Secret keys are stored AES-256 encrypted — never as plaintext.
CREATE TABLE IF NOT EXISTS payment_gateways (
  id                   SERIAL PRIMARY KEY,
  gateway_name         VARCHAR(50) NOT NULL UNIQUE,
  is_active            BOOLEAN DEFAULT false,
  public_key           TEXT,
  secret_key_encrypted TEXT,
  extra_config         JSONB DEFAULT '{}',
  updated_at           TIMESTAMP DEFAULT NOW()
);

-- Seed all 5 gateways in inactive state — superadmin configures credentials from UI.
INSERT INTO payment_gateways (gateway_name, is_active) VALUES
  ('razorpay', false),
  ('cashfree', false),
  ('payu',     false),
  ('paytm',    false),
  ('paypal',   false)
ON CONFLICT (gateway_name) DO NOTHING;


-- Stores UPI and bank transfer details for manual payment collection.
-- Exactly one row — superadmin edits it from the payment gateways page.
CREATE TABLE IF NOT EXISTS manual_payment_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  upi_id           VARCHAR(100),
  upi_name         VARCHAR(200),
  upi_is_active    BOOLEAN DEFAULT false,
  bank_name        VARCHAR(100),
  bank_account_no  VARCHAR(100),
  bank_ifsc        VARCHAR(20),
  bank_holder      VARCHAR(200),
  bank_is_active   BOOLEAN DEFAULT false,
  updated_at       TIMESTAMP DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Ensure the one row always exists for the settings form.
INSERT INTO manual_payment_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- Auto-incrementing sequence for invoice numbers — ensures no gaps or duplicates.
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Stores every invoice generated after a successful payment.
-- invoice_number format: SHNOOR-INV-2026-0042 (built using the sequence above).
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  company_id     INTEGER NOT NULL REFERENCES companies(id),
  transaction_id INTEGER REFERENCES transactions(id),
  plan_id        INTEGER REFERENCES subscriptions(id),
  billing_type   VARCHAR(20) CHECK (billing_type IN ('monthly', 'yearly')),
  base_amount    NUMERIC(10,2) NOT NULL,
  gst_rate       NUMERIC(5,2) DEFAULT 18.00,
  gst_amount     NUMERIC(10,2) NOT NULL,
  total_amount   NUMERIC(10,2) NOT NULL,
  currency       VARCHAR(10) DEFAULT 'INR',
  exchange_rate  NUMERIC(10,4) DEFAULT 1.0000,
  gateway_used   VARCHAR(50),
  pdf_path       TEXT,
  status         VARCHAR(20) DEFAULT 'paid'
                 CHECK (status IN ('paid', 'pending', 'failed', 'cancelled')),
  period_start   DATE,
  period_end     DATE,
  generated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company     ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_transaction ON invoices(transaction_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number      ON invoices(invoice_number);


-- Tracks active subscription period per company — needed for expiry, renewal reminders.
-- Replaces the simple subscription_id FK on companies with a proper time-bounded record.
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),
  billing_type    VARCHAR(20) NOT NULL CHECK (billing_type IN ('monthly', 'yearly')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_subs_company ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subs_status  ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_subs_end     ON company_subscriptions(end_date);

COMMIT;


-- Verification — run these to confirm everything applied correctly.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'website_settings'
ORDER BY ordinal_position;

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_gateways',
  'manual_payment_settings',
  'invoices',
  'company_subscriptions'
);

SELECT id, name, monthly_price, is_highlighted, cta_text FROM subscriptions;
SELECT * FROM payment_gateways;
SELECT * FROM manual_payment_settings;