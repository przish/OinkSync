-- =============================================================================
-- OinkSync (PiggyTrack) — Master Production Database Setup & Fix Script
-- =============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard -> SQL Editor (for your PRODUCTION project).
-- 2. Paste this entire script into a new query.
-- 3. Click "Run".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Schema Updates & Missing Columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.business_profile 
ADD COLUMN IF NOT EXISTS target_monthly_profit NUMERIC DEFAULT 0 NOT NULL;

-- -----------------------------------------------------------------------------
-- STEP 2: Auto-Sync User Profiles (Fixes User Lockout & Missing Profiles)
-- Creates a trigger on auth.users so whenever a user signs up/logs in,
-- they immediately get a row in public.users.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::text, 'admin'),
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill all existing auth.users into public.users
INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'User'),
  COALESCE((raw_user_meta_data->>'role')::text, 'admin'),
  true,
  created_at,
  now()
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  role = COALESCE(public.users.role, EXCLUDED.role);

-- -----------------------------------------------------------------------------
-- STEP 3: Setup Storage Bucket for Receipts
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for receipts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update receipts" ON storage.objects;
END $$;

CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can update receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts');

-- -----------------------------------------------------------------------------
-- STEP 4: Stored Procedures / RPC Functions for Dashboard & Analytics
-- -----------------------------------------------------------------------------

-- 4.1 calculate_roi
CREATE OR REPLACE FUNCTION calculate_roi(
  p_capital NUMERIC,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_revenue NUMERIC;
  v_expenses NUMERIC;
  v_profit NUMERIC;
  v_roi NUMERIC;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_revenue, v_expenses
  FROM transactions
  WHERE transaction_date BETWEEN p_start_date AND p_end_date
    AND status = 'approved';

  v_profit := v_revenue - v_expenses;
  v_roi := CASE
    WHEN p_capital > 0 THEN (v_profit / p_capital) * 100
    ELSE 0
  END;

  RETURN ROUND(v_roi, 2);
END;
$$;

-- 4.2 calculate_scaling_readiness
CREATE OR REPLACE FUNCTION calculate_scaling_readiness()
RETURNS TABLE(
  gap_amount NUMERIC,
  is_ready BOOLEAN,
  recommendation TEXT,
  projected_scale_date DATE
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_capital NUMERIC;
  v_target_pigs INTEGER;
  v_cost_per_pig NUMERIC;
  v_required_capital NUMERIC;
  v_monthly_profit NUMERIC;
  v_months_needed INTEGER;
BEGIN
  SELECT total_capital, target_pig_count, cost_per_pig_rearing
  INTO v_current_capital, v_target_pigs, v_cost_per_pig
  FROM business_profile LIMIT 1;

  IF v_current_capital IS NULL THEN
    gap_amount := 0;
    is_ready := false;
    recommendation := 'No business profile configured. Please set up business profile first.';
    projected_scale_date := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_required_capital := v_target_pigs * v_cost_per_pig;

  SELECT COALESCE(AVG(total_revenue - total_expenses), 0)
  INTO v_monthly_profit
  FROM monthly_analytics
  WHERE analytics_month >= (CURRENT_DATE - INTERVAL '3 months');

  IF v_current_capital >= v_required_capital THEN
    gap_amount := 0;
    is_ready := true;
    recommendation := 'Capital sufficient for scaling to ' || v_target_pigs || ' pigs. Ready to execute.';
    projected_scale_date := CURRENT_DATE;
  ELSE
    gap_amount := v_required_capital - v_current_capital;
    is_ready := false;

    IF v_monthly_profit > 0 THEN
      v_months_needed := CEILING(gap_amount / v_monthly_profit)::INTEGER;
      projected_scale_date := (CURRENT_DATE + (v_months_needed || ' months')::INTERVAL)::DATE;
      recommendation := 'Need ₱' || TO_CHAR(gap_amount, 'FM999,999,999.00') ||
                         ' more capital. Scaling possible in ' || v_months_needed ||
                         ' months at current profit rate of ₱' ||
                         TO_CHAR(v_monthly_profit, 'FM999,999,999.00') || '/month.';
    ELSE
      projected_scale_date := NULL;
      recommendation := 'Need ₱' || TO_CHAR(gap_amount, 'FM999,999,999.00') ||
                         ' more capital. Need to improve profitability before scaling can be projected.';
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

-- 4.3 get_expense_breakdown
CREATE OR REPLACE FUNCTION get_expense_breakdown(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  category TEXT,
  total_amount NUMERIC,
  transaction_count INTEGER,
  percentage_of_total NUMERIC
)
LANGUAGE SQL STABLE
SET search_path = public, pg_temp
AS $$
  WITH expense_totals AS (
    SELECT
      t.category,
      SUM(t.amount) as total_amount,
      COUNT(*)::INTEGER as transaction_count
    FROM transactions t
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
      AND t.transaction_type = 'expense'
      AND t.status = 'approved'
    GROUP BY t.category
  ),
  grand_total AS (
    SELECT COALESCE(SUM(et.total_amount), 1) as total
    FROM expense_totals et
  )
  SELECT
    e.category,
    e.total_amount,
    e.transaction_count,
    ROUND((e.total_amount / gt.total * 100)::NUMERIC, 2) as percentage_of_total
  FROM expense_totals e, grand_total gt
  ORDER BY e.total_amount DESC;
$$;

-- 4.4 calculate_profit_per_pig
CREATE OR REPLACE FUNCTION calculate_profit_per_pig(
  p_analytics_month DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_net_profit NUMERIC;
  v_avg_pig_count INTEGER;
  v_profit_per_pig NUMERIC;
BEGIN
  SELECT
    (total_revenue - total_expenses),
    average_pig_count
  INTO v_net_profit, v_avg_pig_count
  FROM monthly_analytics
  WHERE analytics_month = p_analytics_month;

  IF v_avg_pig_count IS NOT NULL AND v_avg_pig_count > 0 THEN
    v_profit_per_pig := ROUND(v_net_profit / v_avg_pig_count, 2);
  ELSE
    v_profit_per_pig := 0;
  END IF;

  RETURN v_profit_per_pig;
END;
$$;

-- 4.5 calculate_investor_profit
CREATE OR REPLACE FUNCTION calculate_investor_profit(
  p_investor_id UUID,
  p_net_profit NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profit_share_percentage NUMERIC;
  v_investor_profit NUMERIC;
BEGIN
  SELECT profit_share_percentage
  INTO v_profit_share_percentage
  FROM investors
  WHERE id = p_investor_id;

  IF v_profit_share_percentage IS NULL THEN
    RETURN 0;
  END IF;

  v_investor_profit := ROUND((p_net_profit * v_profit_share_percentage) / 100, 2);

  RETURN v_investor_profit;
END;
$$;

-- 4.6 get_dashboard_kpis
CREATE OR REPLACE FUNCTION get_dashboard_kpis(
  p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_revenue NUMERIC,
  total_expenses NUMERIC,
  net_profit NUMERIC,
  roi_percentage NUMERIC,
  active_pig_count BIGINT,
  mortality_count BIGINT,
  mortality_rate NUMERIC,
  pending_transactions BIGINT,
  total_capital NUMERIC
)
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)
  INTO total_revenue, total_expenses
  FROM transactions t
  WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.status = 'approved';

  net_profit := total_revenue - total_expenses;

  SELECT bp.total_capital INTO total_capital
  FROM business_profile bp LIMIT 1;

  roi_percentage := CASE
    WHEN COALESCE(total_capital, 0) > 0 THEN ROUND((net_profit / total_capital) * 100, 2)
    ELSE 0
  END;

  SELECT COUNT(*) INTO active_pig_count
  FROM animals a
  WHERE a.status = 'active';

  SELECT COUNT(*) INTO mortality_count
  FROM animals a
  WHERE a.status = 'deceased'
    AND a.updated_at >= p_start_date;

  mortality_rate := CASE
    WHEN (active_pig_count + mortality_count) > 0
    THEN ROUND((mortality_count::NUMERIC / (active_pig_count + mortality_count)) * 100, 2)
    ELSE 0
  END;

  SELECT COUNT(*) INTO pending_transactions
  FROM transactions t
  WHERE t.status = 'pending';

  RETURN NEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- STEP 5: Row-Level Security (RLS) Configuration (Clean & Recursion-Free)
-- -----------------------------------------------------------------------------
ALTER TABLE public.pens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pen_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;

-- Helper security definer function to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop existing policies
DO $$
DECLARE
    pol record;
    tab text;
BEGIN
    FOR tab IN SELECT unnest(ARRAY['pens', 'animals', 'users', 'transactions', 'pen_daily_logs', 'business_profile'])
    LOOP
        FOR pol IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = tab
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tab);
        END LOOP;
    END LOOP;
END
$$;

-- PENS
CREATE POLICY "Authenticated users can read pens" ON public.pens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pens" ON public.pens FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ANIMALS
CREATE POLICY "Authenticated users can read animals" ON public.animals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert animals" ON public.animals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update animals" ON public.animals FOR UPDATE TO authenticated USING (true);

-- USERS
CREATE POLICY "Users can read all users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- TRANSACTIONS
CREATE POLICY "Authenticated users can read transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.is_admin());

-- PEN DAILY LOGS
CREATE POLICY "Authenticated users can read pen_daily_logs" ON public.pen_daily_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pen_daily_logs" ON public.pen_daily_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = logged_by_user_id);

-- BUSINESS PROFILE
CREATE POLICY "Authenticated users can read business profile" ON public.business_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update business profile" ON public.business_profile FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert business profile" ON public.business_profile FOR INSERT TO authenticated WITH CHECK (public.is_admin());
