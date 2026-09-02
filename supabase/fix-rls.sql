-- =============================================================
-- OinkSync (PiggyTrack) — Database Fix Script
-- Run each section in Supabase Dashboard → SQL Editor
-- =============================================================

-- =============================================================
-- SECTION 1: Seed your user profile row
-- This fixes "user profile not found" and data access issues.
-- 
-- HOW TO USE:
--   1. Run the first SELECT to find your Auth user ID
--   2. Copy the ID (a UUID like: abc123...)
--   3. Replace YOUR-UUID-HERE and your-email@example.com below
--   4. Run the INSERT
-- =============================================================

-- Step 1: Find your Auth user ID
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Insert your profile (run AFTER you get your UUID from Step 1)
INSERT INTO public.users (id, email, full_name, role, is_active, created_at, updated_at)
VALUES (
  '160e2e6c-beec-49f3-8cec-2772ac44a0d8',           -- ← paste your auth.users.id here
  'irishmaypureza@gmail.com',   -- ← paste your actual email
  'Irish Pureza',           -- ← your display name
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =============================================================
-- SECTION 2: RLS Policies — Fix data not loading
-- These policies ensure authenticated users can read pens, 
-- animals, and their own user records.
-- =============================================================

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.pens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pen_daily_logs ENABLE ROW LEVEL SECURITY;

-- Drop all old policies dynamically to prevent infinite recursion conflicts
DO $$
DECLARE
    pol record;
    tab text;
BEGIN
    FOR tab IN SELECT unnest(ARRAY['pens', 'animals', 'users', 'transactions', 'pen_daily_logs'])
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

-- Pens: all authenticated users can read
CREATE POLICY "Authenticated users can read pens"
  ON public.pens FOR SELECT
  TO authenticated
  USING (true);

-- Animals: all authenticated users can read
CREATE POLICY "Authenticated users can read animals"
  ON public.animals FOR SELECT
  TO authenticated
  USING (true);

-- Users: all authenticated users can read all user profiles
CREATE POLICY "Users can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Users: users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Transactions: authenticated users can read all transactions
CREATE POLICY "Authenticated users can read transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

-- Transactions: authenticated users can insert
CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Pen Daily Logs: authenticated users can read
CREATE POLICY "Authenticated users can read pen_daily_logs"
  ON public.pen_daily_logs FOR SELECT
  TO authenticated
  USING (true);

-- Pen Daily Logs: authenticated users can insert
CREATE POLICY "Authenticated users can insert pen_daily_logs"
  ON public.pen_daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = logged_by_user_id);

-- =============================================================
-- SECTION 3: Verify your data
-- Run these to confirm your data is visible
-- =============================================================

-- Check pens
SELECT id, pen_number, pen_name, capacity, status FROM public.pens ORDER BY pen_number;

-- Check animals
SELECT id, animal_code, animal_type, health_status, status FROM public.animals LIMIT 10;

-- Check your user profile
SELECT id, email, full_name, role, is_active FROM public.users;
