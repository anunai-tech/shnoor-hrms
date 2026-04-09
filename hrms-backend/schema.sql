-- SHNOOR HRMS — Database Schema
-- Run this file in pgAdmin to create all tables

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  monthly_price NUMERIC(10,2) DEFAULT 0,
  annual_price NUMERIC(10,2) DEFAULT 0,
  max_users INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  subscription_id INTEGER REFERENCES subscriptions(id) DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('superadmin', 'manager', 'employee')) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  department VARCHAR(100),
  designation VARCHAR(100),
  joining_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  amount NUMERIC(10,2) NOT NULL,
  plan VARCHAR(100),
  type VARCHAR(50) DEFAULT 'Monthly',
  status VARCHAR(50) DEFAULT 'Paid',
  payment_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  date DATE NOT NULL,
  clock_in VARCHAR(20),
  clock_out VARCHAR(20),
  status VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Late', 'On Leave')) DEFAULT 'Present',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
  approved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  basic NUMERIC(10,2) DEFAULT 0,
  hra NUMERIC(10,2) DEFAULT 0,
  transport NUMERIC(10,2) DEFAULT 0,
  other_allowance NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_pay NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_policies (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_queries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(20) CHECK (status IN ('Unread', 'Read', 'Replied')) DEFAULT 'Unread',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_settings (
  id SERIAL PRIMARY KEY,
  logo_url TEXT,
  hero_title TEXT DEFAULT 'Next Generation HR Management For Your Company',
  hero_subtitle TEXT DEFAULT 'Best-rated HR management application for small to large scale business.',
  cta_button_text VARCHAR(100) DEFAULT 'Get Started Free',
  cta_button_link VARCHAR(255) DEFAULT '/login',
  contact_email VARCHAR(255) DEFAULT 'info@shnoorintl.com',
  contact_phone VARCHAR(50) DEFAULT '+91 98765 43210',
  footer_text TEXT DEFAULT '© 2026 SHNOOR INTERNATIONAL LLC. All rights reserved.',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Letters table
CREATE TABLE IF NOT EXISTS letters (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  letter_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  generated_by INTEGER REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT NOW()
);

-- Offboarding requests table
CREATE TABLE IF NOT EXISTS offboarding_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  type VARCHAR(50) DEFAULT 'Resignation',
  reason TEXT,
  last_working_day DATE,
  status VARCHAR(50) DEFAULT 'Pending',
  manager_notes TEXT,
  requested_by VARCHAR(20) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id),
  company_id INTEGER REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Open',
  manager_response TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);