-- ============================================================
-- PigTrack Database Triggers
-- Migration 004: Create all automation triggers
-- Idempotent script: Uses DROP TRIGGER IF EXISTS to allow safe re-execution
-- Includes explicit search_path setting to address security linter
-- ============================================================

-- ============================================================
-- TRIGGER 1: update_monthly_analytics
-- Automatically recalculate monthly_analytics when a transaction
-- is approved (INSERT or UPDATE with status = 'approved')
-- ============================================================
CREATE OR REPLACE FUNCTION update_monthly_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_month_date DATE;
  v_total_capital NUMERIC;
  v_revenue NUMERIC;
  v_expenses NUMERIC;
  v_feed NUMERIC;
  v_vitamins NUMERIC;
  v_infrastructure NUMERIC;
  v_veterinary NUMERIC;
  v_labor NUMERIC;
  v_transportation NUMERIC;
  v_animals_sold INTEGER;
BEGIN
  v_month_date := DATE_TRUNC('month', COALESCE(NEW.transaction_date, OLD.transaction_date))::DATE;

  -- Get current total capital
  SELECT COALESCE(bp.total_capital, 0)
  INTO v_total_capital
  FROM business_profile bp
  LIMIT 1;

  -- Calculate all metrics for the month
  SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Feed' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Vitamins' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Infrastructure' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Veterinary' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Labor' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Transportation' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'Sales' AND transaction_type = 'income' THEN 1 ELSE 0 END), 0)::INTEGER
  INTO v_revenue, v_expenses, v_feed, v_vitamins, v_infrastructure,
       v_veterinary, v_labor, v_transportation, v_animals_sold
  FROM transactions
  WHERE transaction_date >= v_month_date
    AND transaction_date < v_month_date + INTERVAL '1 month'
    AND status = 'approved';

  -- Upsert into monthly_analytics
  INSERT INTO monthly_analytics (
    analytics_month,
    total_revenue,
    total_expenses,
    feed_expenses,
    vitamin_expenses,
    infrastructure_expenses,
    veterinary_expenses,
    labor_expenses,
    transportation_expenses,
    animals_sold,
    total_capital,
    updated_at
  ) VALUES (
    v_month_date,
    v_revenue,
    v_expenses,
    v_feed,
    v_vitamins,
    v_infrastructure,
    v_veterinary,
    v_labor,
    v_transportation,
    v_animals_sold,
    v_total_capital,
    NOW()
  )
  ON CONFLICT (analytics_month) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_expenses = EXCLUDED.total_expenses,
    feed_expenses = EXCLUDED.feed_expenses,
    vitamin_expenses = EXCLUDED.vitamin_expenses,
    infrastructure_expenses = EXCLUDED.infrastructure_expenses,
    veterinary_expenses = EXCLUDED.veterinary_expenses,
    labor_expenses = EXCLUDED.labor_expenses,
    transportation_expenses = EXCLUDED.transportation_expenses,
    animals_sold = EXCLUDED.animals_sold,
    total_capital = EXCLUDED.total_capital,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_analytics ON transactions;
CREATE TRIGGER trigger_update_analytics
AFTER INSERT OR UPDATE ON transactions
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION update_monthly_analytics();

-- ============================================================
-- TRIGGER 2: log_transaction_approval
-- Log an audit trail entry when a transaction is approved
-- ============================================================
CREATE OR REPLACE FUNCTION log_transaction_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      NEW.approved_by,
      'approved_transaction',
      'transactions',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status,
        'amount', OLD.amount,
        'category', OLD.category
      ),
      jsonb_build_object(
        'status', NEW.status,
        'amount', NEW.amount,
        'category', NEW.category,
        'approved_at', NEW.approved_at
      )
    );
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      NEW.approved_by,
      'rejected_transaction',
      'transactions',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object(
        'status', NEW.status,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_approval ON transactions;
CREATE TRIGGER trigger_log_approval
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_approval();

-- ============================================================
-- TRIGGER 3: update_animal_count
-- Auto-update the average_pig_count in monthly_analytics
-- whenever animals table changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_animal_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active_count INTEGER;
  v_dead_count INTEGER;
  v_mortality_rate NUMERIC;
  v_month_date DATE;
BEGIN
  v_month_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Count active animals
  SELECT COUNT(*) INTO v_active_count
  FROM animals WHERE status = 'active';

  -- Count deceased animals this month
  SELECT COUNT(*) INTO v_dead_count
  FROM animals
  WHERE status = 'deceased'
    AND updated_at >= v_month_date;

  -- Calculate mortality rate
  v_mortality_rate := CASE
    WHEN (v_active_count + v_dead_count) > 0
    THEN ROUND((v_dead_count::NUMERIC / (v_active_count + v_dead_count)) * 100, 2)
    ELSE 0
  END;

  -- Upsert the current month's analytics
  INSERT INTO monthly_analytics (
    analytics_month,
    average_pig_count,
    animals_died,
    mortality_rate,
    updated_at
  ) VALUES (
    v_month_date,
    v_active_count,
    v_dead_count,
    v_mortality_rate,
    NOW()
  )
  ON CONFLICT (analytics_month) DO UPDATE SET
    average_pig_count = EXCLUDED.average_pig_count,
    animals_died = EXCLUDED.animals_died,
    mortality_rate = EXCLUDED.mortality_rate,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_animal_count ON animals;
CREATE TRIGGER trigger_update_animal_count
AFTER INSERT OR UPDATE OR DELETE ON animals
FOR EACH ROW
EXECUTE FUNCTION update_animal_count();

-- ============================================================
-- TRIGGER 4: auto_update_updated_at
-- Automatically set updated_at timestamp on row modification
-- ============================================================
CREATE OR REPLACE FUNCTION auto_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to all tables that have the column
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_business_profile_updated_at ON business_profile;
CREATE TRIGGER trigger_business_profile_updated_at
  BEFORE UPDATE ON business_profile
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_investors_updated_at ON investors;
CREATE TRIGGER trigger_investors_updated_at
  BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_pens_updated_at ON pens;
CREATE TRIGGER trigger_pens_updated_at
  BEFORE UPDATE ON pens
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_animals_updated_at ON animals;
CREATE TRIGGER trigger_animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();

DROP TRIGGER IF EXISTS trigger_pen_daily_logs_updated_at ON pen_daily_logs;
CREATE TRIGGER trigger_pen_daily_logs_updated_at
  BEFORE UPDATE ON pen_daily_logs
  FOR EACH ROW EXECUTE FUNCTION auto_update_updated_at();
