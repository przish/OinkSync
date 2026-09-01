-- ============================================================
-- PigTrack Seed Data
-- Migration 005: Initial data for testing and setup
-- ============================================================

-- ============================================================
-- Business Profile (single row)
-- ============================================================
INSERT INTO business_profile (
  business_name,
  total_capital,
  gm_capital_contribution,
  logistics_capital_contribution,
  pen_manager_capital_contribution,
  investor_capital_total,
  target_pig_count,
  cost_per_pig_rearing,
  expected_sale_price_per_pig,
  expected_roi_percentage,
  fiscal_year_start,
  monthly_payroll_budget
) VALUES (
  'PigTrack Farm',
  500000.00,      -- ₱500,000 total capital
  150000.00,      -- GM contribution
  100000.00,      -- Logistics contribution
  100000.00,      -- Pen Manager contribution
  150000.00,      -- 3 investors × ₱50,000 each
  100,            -- Target: 100 pigs
  5000.00,        -- ₱5,000 per pig rearing cost
  8000.00,        -- ₱8,000 expected sale price per pig
  25.00,          -- 25% expected ROI
  1,              -- Fiscal year starts January
  30000.00        -- ₱30,000 monthly payroll
);

-- ============================================================
-- Pens (5 initial pens)
-- ============================================================
INSERT INTO pens (pen_number, pen_name, capacity, location, status, last_cleaned_date) VALUES
  ('PEN-001', 'Farrowing Pen A',   10, 'Barn A, Section 1', 'active',      CURRENT_DATE),
  ('PEN-002', 'Farrowing Pen B',   10, 'Barn A, Section 2', 'active',      CURRENT_DATE),
  ('PEN-003', 'Nursery Pen',       20, 'Barn B, Section 1', 'active',      CURRENT_DATE),
  ('PEN-004', 'Grower Pen',        30, 'Barn B, Section 2', 'active',      CURRENT_DATE),
  ('PEN-005', 'Finisher Pen',      30, 'Barn C, Section 1', 'active',      CURRENT_DATE);

-- ============================================================
-- Business Settings (default configuration)
-- ============================================================
INSERT INTO business_settings (setting_key, setting_value, setting_type) VALUES
  ('currency',                 'PHP',     'text'),
  ('currency_symbol',          '₱',       'text'),
  ('date_format',              'YYYY-MM-DD', 'text'),
  ('timezone',                 'Asia/Manila', 'text'),
  ('receipt_max_size_mb',      '10',      'number'),
  ('receipt_allowed_types',    '["image/jpeg","image/png","application/pdf"]', 'json'),
  ('enable_email_notifications', 'true',  'boolean'),
  ('auto_approve_threshold',   '0',       'number'),
  ('max_animals_per_pen_warning', '90',   'number'),
  ('default_profit_share',    '50',       'number'),
  ('weight_unit',             'kg',       'text'),
  ('temperature_unit',        'celsius',  'text');

-- ============================================================
-- Sample Animals (requires pens to exist first)
-- These use the pen IDs created above
-- ============================================================
-- Note: We use a CTE to reference pen IDs by pen_number
WITH pen_refs AS (
  SELECT id, pen_number FROM pens
)
INSERT INTO animals (pen_id, animal_type, animal_code, birth_date, gender, health_status, current_weight, last_weighed_date, is_breeding_sow, status) VALUES
  -- Farrowing Pen A: 3 breeding sows
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-001'), 'breeding_sow', 'PIG-001', '2025-03-15', 'female', 'healthy', 120.50, CURRENT_DATE, true,  'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-001'), 'breeding_sow', 'PIG-002', '2025-04-20', 'female', 'healthy', 115.00, CURRENT_DATE, true,  'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-001'), 'breeding_sow', 'PIG-003', '2025-02-10', 'female', 'healthy', 130.00, CURRENT_DATE, true,  'active'),

  -- Farrowing Pen B: 2 breeding sows (one recovering)
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-002'), 'breeding_sow', 'PIG-004', '2025-05-01', 'female', 'healthy',    110.00, CURRENT_DATE, true, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-002'), 'breeding_sow', 'PIG-005', '2025-01-15', 'female', 'recovering', 125.00, CURRENT_DATE, true, 'active'),

  -- Nursery Pen: 8 piglets
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-006', '2026-07-01', 'female', 'healthy', 8.50,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-007', '2026-07-01', 'male',   'healthy', 9.00,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-008', '2026-07-01', 'female', 'healthy', 7.80,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-009', '2026-07-02', 'male',   'healthy', 8.20,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-010', '2026-07-02', 'female', 'sick',    6.50,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-011', '2026-07-03', 'male',   'healthy', 8.00,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-012', '2026-07-03', 'female', 'healthy', 8.70,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-003'), 'piglet', 'PIG-013', '2026-07-04', 'male',   'healthy', 7.90,  CURRENT_DATE, false, 'active'),

  -- Grower Pen: 10 pigs growing to market ready
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-004'), 'piglet',       'PIG-014', '2026-05-15', 'male',   'healthy', 35.00, CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-004'), 'piglet',       'PIG-015', '2026-05-15', 'female', 'healthy', 33.50, CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-004'), 'piglet',       'PIG-016', '2026-05-16', 'male',   'healthy', 36.00, CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-004'), 'piglet',       'PIG-017', '2026-05-16', 'female', 'healthy', 32.00, CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-004'), 'piglet',       'PIG-018', '2026-05-17', 'male',   'healthy', 34.50, CURRENT_DATE, false, 'active'),

  -- Finisher Pen: 5 market-ready pigs
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-005'), 'market_ready', 'PIG-019', '2026-02-01', 'male',   'healthy', 90.00,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-005'), 'market_ready', 'PIG-020', '2026-02-01', 'female', 'healthy', 88.50,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-005'), 'market_ready', 'PIG-021', '2026-02-15', 'male',   'healthy', 92.00,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-005'), 'market_ready', 'PIG-022', '2026-02-15', 'female', 'healthy', 85.00,  CURRENT_DATE, false, 'active'),
  ((SELECT id FROM pen_refs WHERE pen_number = 'PEN-005'), 'market_ready', 'PIG-023', '2026-03-01', 'male',   'healthy', 95.00,  CURRENT_DATE, false, 'active');

-- ============================================================
-- Note on Transaction Seed Data
-- ============================================================
-- Transactions require a valid user_id (UUID from auth.users).
-- After creating your first admin user via Supabase Auth, run:
--
-- INSERT INTO transactions (user_id, transaction_date, amount, category, transaction_type, description, status)
-- VALUES
--   ('<admin-user-id>', '2026-07-01', 15000.00, 'Feed',           'expense', 'Monthly feed purchase - Grower Feed 50kg bags x10',     'approved'),
--   ('<admin-user-id>', '2026-07-03', 3500.00,  'Vitamins',       'expense', 'Vitamin supplements and dewormers',                      'approved'),
--   ('<admin-user-id>', '2026-07-05', 25000.00, 'Infrastructure', 'expense', 'Pen repair and new water trough installation',            'approved'),
--   ('<admin-user-id>', '2026-07-10', 5000.00,  'Veterinary',     'expense', 'Veterinarian check-up and vaccination',                   'approved'),
--   ('<admin-user-id>', '2026-07-15', 8000.00,  'Labor',          'expense', 'Part-time worker wages - 2 weeks',                        'approved'),
--   ('<admin-user-id>', '2026-07-20', 2500.00,  'Transportation', 'expense', 'Feed delivery transport',                                 'approved'),
--   ('<admin-user-id>', '2026-07-25', 40000.00, 'Sales',          'income',  'Sold 5 market-ready pigs at ₱8,000 each',                'approved'),
--   ('<admin-user-id>', '2026-08-01', 18000.00, 'Feed',           'expense', 'Monthly feed purchase - Finisher Feed 50kg bags x12',    'approved'),
--   ('<admin-user-id>', '2026-08-05', 2000.00,  'Vitamins',       'expense', 'Iron supplements for piglets',                            'approved'),
--   ('<admin-user-id>', '2026-08-15', 48000.00, 'Sales',          'income',  'Sold 6 market-ready pigs at ₱8,000 each',                'approved');
--
-- This will trigger the monthly_analytics update automatically.
