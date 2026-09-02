/**
 * PigTrack Error Handling
 *
 * Standardized error response factory and custom error types.
 */

import { NextResponse } from 'next/server';

// ============================================================
// Error Codes
// ============================================================

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================
// Custom Error Classes
// ============================================================

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(message: string, code: ErrorCode, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, ERROR_CODES.UNAUTHORIZED, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, ERROR_CODES.CONFLICT, 409);
    this.name = 'ConflictError';
  }
}

// ============================================================
// Response Helpers
// ============================================================

/**
 * Create a standardized success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { data, error: null },
    { status }
  );
}

/**
 * Create a standardized error response from an AppError
 */
export function errorResponse(error: AppError) {
  return NextResponse.json(
    {
      data: null,
      error: {
        message: error.message,
        code: error.code,
        status: error.statusCode,
      },
    },
    { status: error.statusCode }
  );
}

/**
 * Handle unknown errors and return a standardized response.
 * Logs the error for debugging but returns a generic message to the client.
 */
export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return errorResponse(error);
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);

  let message = 'An unexpected error occurred';
  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    message = (error as any).message;
  }

  return NextResponse.json(
    {
      data: null,
      error: {
        message,
        code: ERROR_CODES.INTERNAL_ERROR,
        status: 500,
      },
    },
    { status: 500 }
  );
}
