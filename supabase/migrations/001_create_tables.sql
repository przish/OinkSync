-- ============================================================
-- PigTrack Database Schema
-- Migration 001: Create all tables with indexes
-- Execute in Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- ============================================================
-- TABLE 1: users
-- Core user table, references Supabase auth.users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'logistics', 'pen_manager', 'investor')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit fields
  created_by UUID REFERENCES users(id),
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- TABLE 2: business_profile
-- Single-row table for farm-wide business configuration
-- ============================================================
CREATE TABLE business_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'Piggery Farm',
  total_capital NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Capital breakdown per member
  gm_capital_contribution NUMERIC(15,2) NOT NULL DEFAULT 0,
  logistics_capital_contribution NUMERIC(15,2) NOT NULL DEFAULT 0,
  pen_manager_capital_contribution NUMERIC(15,2) NOT NULL DEFAULT 0,
  investor_capital_total NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Scaling targets
  target_pig_count INTEGER DEFAULT 100,
  cost_per_pig_rearing NUMERIC(10,2) NOT NULL DEFAULT 5000,
  expected_sale_price_per_pig NUMERIC(10,2) NOT NULL DEFAULT 8000,
  expected_roi_percentage NUMERIC(5,2) DEFAULT 25,

  -- Configuration
  fiscal_year_start INTEGER DEFAULT 1 CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
  monthly_payroll_budget NUMERIC(12,2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: investors
-- Investor records linked to users
-- ============================================================
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  capital_contributed NUMERIC(15,2) NOT NULL,
  investment_date DATE NOT NULL,
  profit_share_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_investors_user_id ON investors(user_id);
CREATE UNIQUE INDEX idx_one_investor_per_user ON investors(user_id);

-- ============================================================
-- TABLE 4: pens
-- Physical pen/enclosure inventory
-- ============================================================
CREATE TABLE pens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pen_number TEXT NOT NULL UNIQUE,
  pen_name TEXT,
  capacity INTEGER NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),

  -- Environment
  current_temperature NUMERIC(5,2),
  current_humidity NUMERIC(5,2),
  last_cleaned_date DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pens_status ON pens(status);

-- ============================================================
-- TABLE 5: animals
-- Individual animal/pig inventory
-- ============================================================
CREATE TABLE animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pen_id UUID NOT NULL REFERENCES pens(id),

  -- Animal details
  animal_type TEXT NOT NULL CHECK (animal_type IN ('breeding_sow', 'piglet', 'market_ready')),
  animal_code TEXT UNIQUE,
  birth_date DATE NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')),

  -- Health & Status
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'sick', 'recovering', 'dead')),
  current_weight NUMERIC(6,2),
  last_weighed_date DATE,

  -- Breeding (if applicable)
  is_breeding_sow BOOLEAN DEFAULT false,
  litter_count INTEGER DEFAULT 0,
  last_litter_date DATE,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold', 'deceased')),
  sale_date DATE,
  sale_price NUMERIC(10,2),

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_animals_pen_id ON animals(pen_id);
CREATE INDEX idx_animals_type ON animals(animal_type);
CREATE INDEX idx_animals_health_status ON animals(health_status);
CREATE INDEX idx_animals_status ON animals(status);

-- ============================================================
-- TABLE 6: transactions
-- Financial transactions (expenses and income)
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Transaction details
  transaction_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN (
    'Feed',
    'Vitamins',
    'Infrastructure',
    'Veterinary',
    'Labor',
    'Transportation',
    'Sales'
  )),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income')),
  description TEXT NOT NULL,

  -- Receipt/documentation
  receipt_url TEXT,
  receipt_filename TEXT,
  receipt_upload_date TIMESTAMP WITH TIME ZONE,
  receipt_storage_path TEXT,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_approved_by ON transactions(approved_by);

-- ============================================================
-- TABLE 7: pen_daily_logs
-- Daily operational logs for each pen
-- ============================================================
CREATE TABLE pen_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pen_id UUID NOT NULL REFERENCES pens(id),
  logged_by_user_id UUID NOT NULL REFERENCES users(id),

  -- Log date/time
  log_date DATE NOT NULL,
  log_time TIME DEFAULT NOW()::time,

  -- Daily operations
  feed_type TEXT,
  feed_amount_kg NUMERIC(8,2) NOT NULL,
  water_provided BOOLEAN DEFAULT true,

  -- Health & Cleaning
  health_observations TEXT,
  cleaning_status TEXT CHECK (cleaning_status IN ('cleaned', 'partially_cleaned', 'not_cleaned')),
  cleanliness_score INTEGER CHECK (cleanliness_score >= 1 AND cleanliness_score <= 10),

  -- Mortality & Issues
  animals_died INTEGER DEFAULT 0,
  animals_sick INTEGER DEFAULT 0,
  mortality_cause TEXT,

  -- General notes
  general_notes TEXT,
  issues_reported BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pen_logs_pen_id ON pen_daily_logs(pen_id);
CREATE INDEX idx_pen_logs_date ON pen_daily_logs(log_date);
CREATE INDEX idx_pen_logs_user_id ON pen_daily_logs(logged_by_user_id);

-- ============================================================
-- TABLE 8: monthly_analytics
-- Computed/cached monthly financial and operational metrics
-- ============================================================
CREATE TABLE monthly_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analytics_month DATE NOT NULL,

  -- Financial metrics
  total_revenue NUMERIC(15,2) DEFAULT 0,
  total_expenses NUMERIC(15,2) DEFAULT 0,
  net_profit NUMERIC(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,

  -- Expense breakdown
  feed_expenses NUMERIC(12,2) DEFAULT 0,
  vitamin_expenses NUMERIC(12,2) DEFAULT 0,
  infrastructure_expenses NUMERIC(12,2) DEFAULT 0,
  veterinary_expenses NUMERIC(12,2) DEFAULT 0,
  labor_expenses NUMERIC(12,2) DEFAULT 0,
  transportation_expenses NUMERIC(12,2) DEFAULT 0,

  -- Operational metrics
  average_pig_count INTEGER DEFAULT 0,
  animals_sold INTEGER DEFAULT 0,
  animals_died INTEGER DEFAULT 0,
  mortality_rate NUMERIC(5,2),

  -- ROI calculation
  total_capital NUMERIC(15,2),
  roi_percentage NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_capital > 0 THEN ((total_revenue - total_expenses) / total_capital) * 100
      ELSE 0
    END
  ) STORED,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(analytics_month)
);

CREATE INDEX idx_analytics_month ON monthly_analytics(analytics_month);

-- ============================================================
-- TABLE 9: activity_logs
-- Audit trail for all user actions
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================
-- TABLE 10: business_settings
-- Key-value store for application configuration
-- ============================================================
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
