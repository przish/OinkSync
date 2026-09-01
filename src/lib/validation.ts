/**
 * PigTrack Validation Helpers
 *
 * Input validation utilities for API route handlers.
 */

import { ValidationError } from '@/lib/errors';
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  ANIMAL_TYPES,
  HEALTH_STATUSES,
  ANIMAL_STATUSES,
  GENDERS,
  CLEANING_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/constants';

// ============================================================
// Generic Validators
// ============================================================

/**
 * Validate that a value is a non-empty string
 */
export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * Validate that a value is a positive number
 */
export function requirePositiveNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number. Received: ${value}`);
  }
  return num;
}

/**
 * Validate that a value is a non-negative number (≥ 0)
 */
export function requireNonNegativeNumber(value: unknown, fieldName: string): number {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a non-negative number. Received: ${value}`);
  }
  return num;
}

/**
 * Validate that a value is a valid date string (YYYY-MM-DD)
 */
export function requireDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a date string in YYYY-MM-DD format.`);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be in YYYY-MM-DD format. Received: ${value}`);
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date. Received: ${value}`);
  }

  return value;
}

/**
 * Validate that a value is a valid UUID
 */
export function requireUUID(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a valid UUID.`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} is not a valid UUID. Received: ${value}`);
  }

  return value;
}

/**
 * Validate that a value is one of the allowed options
 */
export function requireEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}. Received: ${value}`
    );
  }
  return value as T;
}

/**
 * Validate optional enum value (returns undefined if not provided)
 */
export function optionalEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return requireEnum(value, allowedValues, fieldName);
}

// ============================================================
// Domain-Specific Validators
// ============================================================

/**
 * Validate transaction category
 */
export function validateCategory(value: unknown) {
  return requireEnum(value, TRANSACTION_CATEGORIES, 'category');
}

/**
 * Validate transaction type
 */
export function validateTransactionType(value: unknown) {
  return requireEnum(value, TRANSACTION_TYPES, 'transaction_type');
}

/**
 * Validate transaction status
 */
export function validateTransactionStatus(value: unknown) {
  return requireEnum(value, TRANSACTION_STATUSES, 'status');
}

/**
 * Validate animal type
 */
export function validateAnimalType(value: unknown) {
  return requireEnum(value, ANIMAL_TYPES, 'animal_type');
}

/**
 * Validate health status
 */
export function validateHealthStatus(value: unknown) {
  return requireEnum(value, HEALTH_STATUSES, 'health_status');
}

/**
 * Validate animal status
 */
export function validateAnimalStatus(value: unknown) {
  return requireEnum(value, ANIMAL_STATUSES, 'status');
}

/**
 * Validate gender
 */
export function validateGender(value: unknown) {
  return requireEnum(value, GENDERS, 'gender');
}

/**
 * Validate cleaning status
 */
export function validateCleaningStatus(value: unknown) {
  return requireEnum(value, CLEANING_STATUSES, 'cleaning_status');
}

/**
 * Validate cleanliness score (1-10)
 */
export function validateCleanlinessScore(value: unknown): number {
  const score = Number(value);
  if (isNaN(score) || score < 1 || score > 10 || !Number.isInteger(score)) {
    throw new ValidationError(
      `Cleanliness score must be an integer between 1 and 10. Received: ${value}`
    );
  }
  return score;
}

// ============================================================
// Pagination Validators
// ============================================================

export interface ValidatedPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Parse and validate pagination parameters from URL search params
 */
export function validatePagination(searchParams: URLSearchParams): ValidatedPagination {
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  let page = pageParam ? parseInt(pageParam, 10) : 1;
  let limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_PAGE_SIZE;

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Parse date range from URL search params
 */
export function parseDateRange(searchParams: URLSearchParams): {
  start_date?: string;
  end_date?: string;
} {
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  return {
    start_date: startDate ? requireDate(startDate, 'start_date') : undefined,
    end_date: endDate ? requireDate(endDate, 'end_date') : undefined,
  };
}
