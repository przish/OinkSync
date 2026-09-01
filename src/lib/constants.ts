/**
 * PigTrack Constants
 *
 * All enum values and configuration constants used across the application.
 */

// ============================================================
// User Roles
// ============================================================
export const USER_ROLES = ['admin', 'logistics', 'pen_manager', 'investor'] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  logistics: 'Logistics',
  pen_manager: 'Pen Manager',
  investor: 'Investor',
};

// ============================================================
// Transaction Constants
// ============================================================
export const TRANSACTION_CATEGORIES = [
  'Feed',
  'Vitamins',
  'Infrastructure',
  'Veterinary',
  'Labor',
  'Transportation',
  'Sales',
] as const;

export const EXPENSE_CATEGORIES = [
  'Feed',
  'Vitamins',
  'Infrastructure',
  'Veterinary',
  'Labor',
  'Transportation',
] as const;

export const TRANSACTION_TYPES = ['expense', 'income'] as const;

export const TRANSACTION_STATUSES = ['pending', 'approved', 'rejected'] as const;

// ============================================================
// Animal Constants
// ============================================================
export const ANIMAL_TYPES = ['breeding_sow', 'piglet', 'market_ready'] as const;

export const ANIMAL_TYPE_LABELS: Record<string, string> = {
  breeding_sow: 'Breeding Sow',
  piglet: 'Piglet',
  market_ready: 'Market Ready',
};

export const HEALTH_STATUSES = ['healthy', 'sick', 'recovering', 'dead'] as const;

export const ANIMAL_STATUSES = ['active', 'inactive', 'sold', 'deceased'] as const;

export const GENDERS = ['male', 'female'] as const;

// ============================================================
// Pen Constants
// ============================================================
export const PEN_STATUSES = ['active', 'maintenance', 'inactive'] as const;

export const CLEANING_STATUSES = ['cleaned', 'partially_cleaned', 'not_cleaned'] as const;

export const CLEANING_STATUS_LABELS: Record<string, string> = {
  cleaned: 'Cleaned',
  partially_cleaned: 'Partially Cleaned',
  not_cleaned: 'Not Cleaned',
};

// ============================================================
// Investor Constants
// ============================================================
export const INVESTOR_STATUSES = ['active', 'inactive', 'pending'] as const;

// ============================================================
// Pagination Defaults
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================
// Currency & Locale
// ============================================================
export const CURRENCY = 'PHP';
export const CURRENCY_SYMBOL = '₱';
export const LOCALE = 'en-PH';
export const TIMEZONE = 'Asia/Manila';

/**
 * Format a number as Philippine Peso currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ============================================================
// Receipt/Storage Constants
// ============================================================
export const RECEIPT_BUCKET = 'receipts';
export const RECEIPT_MAX_SIZE_MB = 10;
export const RECEIPT_MAX_SIZE_BYTES = RECEIPT_MAX_SIZE_MB * 1024 * 1024;
export const RECEIPT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
