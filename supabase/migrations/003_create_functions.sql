-- ============================================================
-- PigTrack Business Logic Functions
-- Migration 003: Create all calculation functions
-- ============================================================

-- ============================================================
-- FUNCTION 1: calculate_roi
-- Calculate real-time Return on Investment for a given period
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_roi(
  p_capital NUMERIC,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION 2: calculate_scaling_readiness
-- Determine if the business is ready to scale to target pig count
-- Returns gap amount, readiness status, recommendation, and projected date
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_scaling_readiness()
RETURNS TABLE(
  gap_amount NUMERIC,
  is_ready BOOLEAN,
  recommendation TEXT,
  projected_scale_date DATE
) AS $$
DECLARE
  v_current_capital NUMERIC;
  v_target_pigs INTEGER;
  v_cost_per_pig NUMERIC;
  v_required_capital NUMERIC;
  v_monthly_profit NUMERIC;
  v_months_needed INTEGER;
BEGIN
  -- Fetch business profile
  SELECT total_capital, target_pig_count, cost_per_pig_rearing
  INTO v_current_capital, v_target_pigs, v_cost_per_pig
  FROM business_profile LIMIT 1;

  -- Handle case where no business profile exists
  IF v_current_capital IS NULL THEN
    gap_amount := 0;
    is_ready := false;
    recommendation := 'No business profile configured. Please set up business profile first.';
    projected_scale_date := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  v_required_capital := v_target_pigs * v_cost_per_pig;

  -- Calculate average monthly profit from last 3 months
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION 3: get_expense_breakdown
-- Get expense categorization summary for a given date range
-- ============================================================
CREATE OR REPLACE FUNCTION get_expense_breakdown(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  category TEXT,
  total_amount NUMERIC,
  transaction_count INTEGER,
  percentage_of_total NUMERIC
) AS $$
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
    SELECT COALESCE(SUM(et.total_amount), 1) as total -- Avoid division by zero
    FROM expense_totals et
  )
  SELECT
    e.category,
    e.total_amount,
    e.transaction_count,
    ROUND((e.total_amount / gt.total * 100)::NUMERIC, 2) as percentage_of_total
  FROM expense_totals e, grand_total gt
  ORDER BY e.total_amount DESC;
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- FUNCTION 4: calculate_profit_per_pig
-- Calculate profitability per pig for a given month
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_profit_per_pig(
  p_analytics_month DATE
)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION 5: calculate_investor_profit
-- Calculate profit distribution to a specific investor
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_investor_profit(
  p_investor_id UUID,
  p_net_profit NUMERIC
)
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION 6: get_dashboard_kpis
-- Aggregate KPI data for the dashboard
-- ============================================================
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
) AS $$
BEGIN
  -- Financial metrics from approved transactions
  SELECT
    COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0)
  INTO total_revenue, total_expenses
  FROM transactions t
  WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.status = 'approved';

  net_profit := total_revenue - total_expenses;

  -- Capital from business profile
  SELECT bp.total_capital INTO total_capital
  FROM business_profile bp LIMIT 1;

  -- ROI
  roi_percentage := CASE
    WHEN COALESCE(total_capital, 0) > 0 THEN ROUND((net_profit / total_capital) * 100, 2)
    ELSE 0
  END;

  -- Active pig count
  SELECT COUNT(*) INTO active_pig_count
  FROM animals a
  WHERE a.status = 'active';

  -- Mortality in period
  SELECT COUNT(*) INTO mortality_count
  FROM animals a
  WHERE a.status = 'deceased'
    AND a.updated_at >= p_start_date;

  -- Mortality rate
  mortality_rate := CASE
    WHEN (active_pig_count + mortality_count) > 0
    THEN ROUND((mortality_count::NUMERIC / (active_pig_count + mortality_count)) * 100, 2)
    ELSE 0
  END;

  -- Pending transactions
  SELECT COUNT(*) INTO pending_transactions
  FROM transactions t
  WHERE t.status = 'pending';

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;
