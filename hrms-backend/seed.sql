-- SHNOOR HRMS — Seed Data
-- Run this AFTER schema.sql

-- Subscription plans
INSERT INTO subscriptions (name, monthly_price, annual_price, max_users) VALUES
('Default', 0, 0, 50),
('Monthly', 499, 3500, 50),
('Shnoor', 3500, 30000, 1000)
ON CONFLICT DO NOTHING;

-- Website settings (one row only)
INSERT INTO website_settings (
  hero_title, hero_subtitle, cta_button_text,
  cta_button_link, contact_email, contact_phone, footer_text
) VALUES (
  'Next Generation HR Management For Your Company',
  'Best-rated HR management application for small to large scale business. Manage employees, attendance, leaves, payroll, and more — all in one place.',
  'Get Started Free',
  '/login',
  'info@shnoorintl.com',
  '+91 98765 43210',
  '© 2026 SHNOOR INTERNATIONAL LLC. All rights reserved.'
) ON CONFLICT DO NOTHING;

-- Superadmin user
-- Before running this, generate a bcrypt hash for 'admin123':
-- Open CMD in hrms-backend and run:
-- node -e "const b = require('bcryptjs'); b.hash('admin123', 10).then(h => console.log(h))"
-- Copy the output and replace REPLACE_WITH_BCRYPT_HASH below

INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES
('Admin', 'SHNOOR', 'admin@shnoor.com', 'REPLACE_WITH_BCRYPT_HASH', 'superadmin')
ON CONFLICT (email) DO NOTHING;