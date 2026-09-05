/**
 * PiggyTrack Zod Validation Schemas (Zod v4 compatible)
 */

import { z } from 'zod';

// ─── Transaction ──────────────────────────────────────────────────────────────

export const transactionSchema = z.object({
  transaction_date: z.string().min(1, 'Date is required'),
  amount: z.number({ error: 'Amount must be a number' }).positive('Amount must be greater than 0'),
  category: z.enum(
    ['Feed', 'Vitamins', 'Infrastructure', 'Veterinary', 'Labor', 'Transportation', 'Sales'],
    { error: 'Category is required' }
  ),
  transaction_type: z.enum(['expense', 'income'], { error: 'Type is required' }),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  receipt: z.instanceof(File).optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

// ─── Approval / Rejection ─────────────────────────────────────────────────────

export const approvalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().optional(),
});

export type ApprovalFormValues = z.infer<typeof approvalSchema>;

// ─── Animal ───────────────────────────────────────────────────────────────────

export const animalSchema = z.object({
  pen_id: z.string().min(1, 'Pen is required'),
  animal_type: z.enum(['breeding_sow', 'piglet', 'market_ready'], {
    error: 'Animal type is required',
  }),
  animal_code: z.string().optional(),
  birth_date: z.string().min(1, 'Birth date is required'),
  gender: z.enum(['male', 'female']).optional().nullable(),
  health_status: z.enum(['healthy', 'sick', 'recovering', 'dead']).default('healthy'),
  current_weight: z.number().positive().optional().nullable(),
  is_breeding_sow: z.boolean().default(false),
  notes: z.string().optional(),
});

export type AnimalFormValues = z.infer<typeof animalSchema>;

// ─── Pen Log ──────────────────────────────────────────────────────────────────

export const penLogSchema = z.object({
  pen_id: z.string().min(1, 'Pen is required'),
  log_date: z.string().min(1, 'Date is required'),
  feed_type: z.string().min(1, 'Feed type is required'),
  feed_amount_kg: z
    .number({ error: 'Feed amount must be a number' })
    .min(0, 'Feed amount cannot be negative'),
  water_provided: z.boolean().default(true),
  health_observations: z.string().optional(),
  cleaning_status: z.enum(['cleaned', 'partially_cleaned', 'not_cleaned']).optional().nullable(),
  cleanliness_score: z.number().min(1).max(10).optional().nullable(),
  animals_died: z.number().int().min(0).default(0),
  animals_sick: z.number().int().min(0).default(0),
  mortality_cause: z.string().optional(),
  general_notes: z.string().optional(),
  issues_reported: z.boolean().default(false),
});

export type PenLogFormValues = z.infer<typeof penLogSchema>;

// ─── User ─────────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone_number: z.string().optional(),
  role: z.enum(['admin', 'logistics', 'pen_manager', 'investor'], {
    error: 'Role is required',
  }),
});

export type UserFormValues = z.infer<typeof userSchema>;

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Business Settings ────────────────────────────────────────────────────────

export const businessSettingsSchema = z.object({
  total_capital: z.number().min(0, 'Total capital cannot be negative'),
  target_monthly_profit: z.number().min(0, 'Target profit cannot be negative'),
  target_pig_count: z.number().int().min(0).optional(),
  // Sacks count and cost breakdown
  pre_starter_sacks: z.number().min(0).default(0),
  pre_starter_cost: z.number().min(0).default(0),
  starter_sacks: z.number().min(0).default(0),
  starter_cost: z.number().min(0).default(0),
  grower_sacks: z.number().min(0).default(0),
  grower_cost: z.number().min(0).default(0),
  finisher_sacks: z.number().min(0).default(0),
  finisher_cost: z.number().min(0).default(0),
  vitamins_cost: z.number().min(0).default(0),
  // Price per kg and weight
  expected_price_per_kg: z.number().min(0).default(0),
  expected_market_weight_kg: z.number().min(0).default(0),
  // Derived / legacy compatibility
  cost_per_pig_rearing: z.number().min(0).optional(),
  expected_sale_price_per_pig: z.number().min(0).optional(),
  expected_roi_percentage: z.number().min(0).optional(),
  monthly_payroll_budget: z.number().min(0).default(0),
});

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>;
