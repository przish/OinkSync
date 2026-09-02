-- Run this in your Supabase Dashboard -> SQL Editor

ALTER TABLE public.business_profile 
ADD COLUMN IF NOT EXISTS target_monthly_profit NUMERIC DEFAULT 0 NOT NULL;
