/**
 * PigTrack Database Types
 *
 * Complete TypeScript type definitions matching the PostgreSQL schema.
 * These types are used for application-level type safety.
 */

// ============================================================
// Enum Types
// ============================================================

export type UserRole = 'admin' | 'logistics' | 'pen_manager' | 'investor';

export type TransactionCategory =
  | 'Feed'
  | 'Vitamins'
  | 'Infrastructure'
  | 'Veterinary'
  | 'Labor'
  | 'Transportation'
  | 'Sales'
  | 'Investment';

export type TransactionType = 'expense' | 'income';

export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export type AnimalType = 'breeding_sow' | 'piglet' | 'market_ready';

export type HealthStatus = 'healthy' | 'sick' | 'recovering' | 'dead';

export type AnimalStatus = 'active' | 'inactive' | 'sold' | 'deceased';

export type Gender = 'male' | 'female';

export type PenStatus = 'active' | 'maintenance' | 'inactive';

export type InvestorStatus = 'active' | 'inactive' | 'pending';

export type CleaningStatus = 'cleaned' | 'partially_cleaned' | 'not_cleaned';

export type SettingType = 'number' | 'text' | 'boolean' | 'json';

// ============================================================
// Table Row Types
// ============================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  avatar_updated_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  last_login: string | null;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  total_capital: number;
  gm_capital_contribution: number;
  logistics_capital_contribution: number;
  pen_manager_capital_contribution: number;
  investor_capital_total: number;
  target_monthly_profit: number;
  target_pig_count: number;
  cost_per_pig_rearing: number;
  expected_sale_price_per_pig: number;
  expected_roi_percentage: number;
  fiscal_year_start: number;
  monthly_payroll_budget: number;
  created_at: string;
  updated_at: string;
}

export interface Investor {
  id: string;
  user_id: string;
  capital_contributed: number;
  investment_date: string;
  profit_share_percentage: number;
  status: InvestorStatus;
  created_at: string;
  updated_at: string;
}

export interface Pen {
  id: string;
  pen_number: string;
  pen_name: string | null;
  capacity: number;
  location: string | null;
  status: PenStatus;
  current_temperature: number | null;
  current_humidity: number | null;
  last_cleaned_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  pen_id: string;
  animal_type: AnimalType;
  animal_code: string | null;
  birth_date: string;
  gender: Gender | null;
  health_status: HealthStatus;
  current_weight: number | null;
  last_weighed_date: string | null;
  is_breeding_sow: boolean;
  litter_count: number;
  last_litter_date: string | null;
  status: AnimalStatus;
  sale_date: string | null;
  sale_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number;
  category: TransactionCategory;
  transaction_type: TransactionType;
  description: string;
  receipt_url: string | null;
  receipt_filename: string | null;
  receipt_upload_date: string | null;
  receipt_storage_path: string | null;
  status: TransactionStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PenDailyLog {
  id: string;
  pen_id: string;
  logged_by_user_id: string;
  log_date: string;
  log_time: string;
  feed_type: string | null;
  feed_amount_kg: number;
  water_provided: boolean;
  health_observations: string | null;
  cleaning_status: CleaningStatus | null;
  cleanliness_score: number | null;
  animals_died: number;
  animals_sick: number;
  mortality_cause: string | null;
  general_notes: string | null;
  issues_reported: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAnalytics {
  id: string;
  analytics_month: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number; // Generated column
  feed_expenses: number;
  vitamin_expenses: number;
  infrastructure_expenses: number;
  veterinary_expenses: number;
  labor_expenses: number;
  transportation_expenses: number;
  average_pig_count: number;
  animals_sold: number;
  animals_died: number;
  mortality_rate: number | null;
  total_capital: number | null;
  roi_percentage: number; // Generated column
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface BusinessSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: SettingType | null;
  updated_at: string;
}

// ============================================================
// Insert Types (omit auto-generated fields)
// ============================================================

export type UserInsert = Omit<User, 'created_at' | 'updated_at' | 'last_login'>;

export type TransactionInsert = Omit<
  Transaction,
  'id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at' | 'rejection_reason' | 'status'
>;

export type AnimalInsert = Omit<Animal, 'id' | 'created_at' | 'updated_at'>;

export type PenInsert = Omit<Pen, 'id' | 'created_at' | 'updated_at'>;

export type PenDailyLogInsert = Omit<PenDailyLog, 'id' | 'created_at' | 'updated_at' | 'log_time'>;

export type InvestorInsert = Omit<Investor, 'id' | 'created_at' | 'updated_at'>;

// ============================================================
// Update Types (all fields optional except id)
// ============================================================

export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'created_at'>> & { id: string };

export type AnimalUpdate = Partial<Omit<Animal, 'id' | 'created_at'>> & { id: string };

export type PenUpdate = Partial<Omit<Pen, 'id' | 'created_at'>> & { id: string };

// ============================================================
// RPC Function Response Types
// ============================================================

export interface DashboardKpiResult {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  roi_percentage: number;
  active_pig_count: number;
  mortality_count: number;
  mortality_rate: number;
  pending_transactions: number;
  total_capital: number;
  active_members_count?: number;
}

export interface ScalingReadinessResult {
  gap_amount: number;
  is_ready: boolean;
  recommendation: string;
  projected_scale_date: string | null;
}

export interface ExpenseBreakdownResult {
  category: string;
  total_amount: number;
  transaction_count: number;
  percentage_of_total: number;
}

// ============================================================
// Supabase Database Type (for typed client)
// This is intentionally kept minimal to avoid type conflicts
// with the Supabase client. Use explicit type assertions where needed.
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}
