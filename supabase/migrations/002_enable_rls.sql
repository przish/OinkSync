-- ============================================================
-- PigTrack Row-Level Security Policies
-- Migration 002: Enable RLS and create all policies
-- ============================================================

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pens ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pen_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS policies
-- ============================================================
-- Everyone can read their own profile
CREATE POLICY "users_read_own_profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can insert users
CREATE POLICY "admins_insert_users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can update their own profile (non-role fields)
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user
CREATE POLICY "admins_update_any_user" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- BUSINESS_PROFILE policies
-- ============================================================
-- Everyone can read the business profile
CREATE POLICY "everyone_reads_business_profile" ON business_profile
  FOR SELECT USING (true);

-- Only admins can modify business profile
CREATE POLICY "admins_modify_business_profile" ON business_profile
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_insert_business_profile" ON business_profile
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- INVESTORS policies
-- ============================================================
-- Investors can see their own record
CREATE POLICY "investors_read_own" ON investors
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all investors
CREATE POLICY "admins_read_all_investors" ON investors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Only admins can create/update investor records
CREATE POLICY "admins_manage_investors" ON investors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_update_investors" ON investors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- PENS policies
-- ============================================================
-- All authenticated users can read pens
CREATE POLICY "authenticated_read_pens" ON pens
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admins and pen managers can manage pens
CREATE POLICY "managers_manage_pens" ON pens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

CREATE POLICY "managers_update_pens" ON pens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

-- ============================================================
-- ANIMALS policies
-- ============================================================
-- Pen managers and admins can see all animals
CREATE POLICY "pen_managers_see_animals" ON animals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

-- Investors and logistics can see animal summary (read-only)
CREATE POLICY "other_roles_see_animals" ON animals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('investor', 'logistics')
    )
  );

-- Only pen managers and admins can insert/update animals
CREATE POLICY "managers_insert_animals" ON animals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

CREATE POLICY "managers_update_animals" ON animals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

-- ============================================================
-- TRANSACTIONS policies
-- ============================================================
-- Users see their own transactions
CREATE POLICY "users_see_own_transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins see all transactions
CREATE POLICY "admins_see_all_transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can insert their own transactions
CREATE POLICY "users_can_insert_own_transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can approve/reject transactions (update)
CREATE POLICY "admins_approve_transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- PEN_DAILY_LOGS policies
-- ============================================================
-- Pen managers and admins can create logs
CREATE POLICY "pen_managers_create_logs" ON pen_daily_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'pen_manager')
    )
  );

-- Admins see all logs
CREATE POLICY "admins_see_all_logs" ON pen_daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Pen managers see their own logs
CREATE POLICY "pen_managers_see_own_logs" ON pen_daily_logs
  FOR SELECT USING (auth.uid() = logged_by_user_id);

-- ============================================================
-- MONTHLY_ANALYTICS policies
-- ============================================================
-- Everyone can read analytics
CREATE POLICY "everyone_reads_analytics" ON monthly_analytics
  FOR SELECT USING (true);

-- Only admin can update analytics (or system via service role)
CREATE POLICY "admin_updates_analytics" ON monthly_analytics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Allow inserts for analytics (system/triggers use service role)
CREATE POLICY "admin_inserts_analytics" ON monthly_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- ACTIVITY_LOGS policies
-- ============================================================
-- Only admins can read activity logs
CREATE POLICY "admins_read_activity_logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- All authenticated users can insert activity logs (for audit trail)
CREATE POLICY "authenticated_insert_activity_logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- BUSINESS_SETTINGS policies
-- ============================================================
-- Everyone can read settings
CREATE POLICY "everyone_reads_settings" ON business_settings
  FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "admins_modify_settings" ON business_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_insert_settings" ON business_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
