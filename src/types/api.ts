/**
 * PigTrack API Types
 *
 * Request/response types for all API endpoints.
 */

import type {
  Transaction,
  Animal,
  Pen,
  PenDailyLog,
  MonthlyAnalytics,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  AnimalType,
  HealthStatus,
  AnimalStatus,
} from './database';

// ============================================================
// Common Types
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code: string;
    status: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============================================================
// Dashboard KPI Types
// ============================================================

export interface KpiData {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  roi_percentage: number;
  active_pig_count: number;
  mortality_count: number;
  mortality_rate: number;
  pending_transactions: number;
  total_capital: number;
  // Month-over-month comparison
  revenue_change_percent: number | null;
  expense_change_percent: number | null;
  profit_change_percent: number | null;
}

// ============================================================
// Transaction Types
// ============================================================

export interface TransactionFilters {
  category?: TransactionCategory;
  status?: TransactionStatus;
  transaction_type?: TransactionType;
  start_date?: string;
  end_date?: string;
}

export interface CreateTransactionRequest {
  transaction_date: string;
  amount: number;
  category: TransactionCategory;
  transaction_type: TransactionType;
  description: string;
  receipt_url?: string;
  receipt_filename?: string;
  receipt_storage_path?: string;
}

export interface ApproveTransactionRequest {
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

export type TransactionWithUser = Transaction & {
  user: {
    full_name: string;
    email: string;
  };
  approver?: {
    full_name: string;
  } | null;
};

// ============================================================
// Analytics Types
// ============================================================

export interface RevenueExpenseDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  total_amount: number;
  transaction_count: number;
  percentage_of_total: number;
}

export interface RoiTrendDataPoint {
  month: string;
  roi_percentage: number;
  total_capital: number;
  net_profit: number;
}

export interface ScalingReadiness {
  gap_amount: number;
  is_ready: boolean;
  recommendation: string;
  projected_scale_date: string | null;
  current_capital: number;
  required_capital: number;
  target_pig_count: number;
}

// ============================================================
// Inventory Types
// ============================================================

export interface InventorySummary {
  total_active: number;
  breeding_sows: number;
  piglets: number;
  market_ready: number;
  sick_count: number;
  deceased_this_month: number;
}

export interface AnimalFilters {
  animal_type?: AnimalType;
  health_status?: HealthStatus;
  status?: AnimalStatus;
  pen_id?: string;
}

export interface CreateAnimalRequest {
  pen_id: string;
  animal_type: AnimalType;
  animal_code?: string;
  birth_date: string;
  gender?: 'male' | 'female';
  health_status?: HealthStatus;
  current_weight?: number;
  is_breeding_sow?: boolean;
  notes?: string;
  breeding_stage?: 'ready' | 'breeding' | 'not_yet';
  quantity?: number;
  male_count?: number;
  female_count?: number;
  mother_id?: string;
}

export interface UpdateAnimalRequest {
  health_status?: HealthStatus;
  status?: AnimalStatus;
  current_weight?: number;
  pen_id?: string;
  sale_date?: string;
  sale_price?: number;
  notes?: string;
}

export interface PenWithAnimals extends Pen {
  animals: Animal[];
  current_count: number;
  occupancy_percentage: number;
}

// ============================================================
// Pen Log Types
// ============================================================

export interface PenLogFilters {
  pen_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreatePenLogRequest {
  pen_id: string;
  log_date: string;
  feed_type?: string;
  feed_amount_kg: number;
  water_provided?: boolean;
  health_observations?: string;
  cleaning_status?: 'cleaned' | 'partially_cleaned' | 'not_cleaned';
  cleanliness_score?: number;
  animals_died?: number;
  animals_sick?: number;
  mortality_cause?: string;
  general_notes?: string;
  issues_reported?: boolean;
}

export type PenLogWithDetails = PenDailyLog & {
  pen: {
    pen_number: string;
    pen_name: string | null;
  };
  logged_by: {
    full_name: string;
  };
};

// ============================================================
// Report Types
// ============================================================

export interface MonthlySummaryReport {
  month: string;
  analytics: MonthlyAnalytics;
  profit_per_pig: number;
  top_expense_category: string;
  expense_breakdown: ExpenseBreakdownItem[];
}

export interface InvestorStatement {
  investor_id: string;
  investor_name: string;
  capital_contributed: number;
  profit_share_percentage: number;
  period_start: string;
  period_end: string;
  total_net_profit: number;
  investor_profit_share: number;
  roi_percentage: number;
  monthly_breakdown: {
    month: string;
    net_profit: number;
    investor_share: number;
  }[];
}
