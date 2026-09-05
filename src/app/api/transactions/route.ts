/**
 * GET  /api/transactions - List transactions (paginated, filtered)
 * POST /api/transactions - Create a new transaction
 */

import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';
import {
  validatePagination,
  parseDateRange,
  requireString,
  requirePositiveNumber,
  requireDate,
  validateCategory,
  validateTransactionType,
  optionalEnum,
} from '@/lib/validation';
import { TRANSACTION_CATEGORIES, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/lib/constants';
import type { PaginatedResponse, TransactionWithUser } from '@/types/api';
import type { Transaction } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const profile = await getAuthUserProfile();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const { page, limit, offset } = validatePagination(searchParams);
    const { start_date, end_date } = parseDateRange(searchParams);

    const category = optionalEnum(searchParams.get('category'), TRANSACTION_CATEGORIES, 'category');
    const status = optionalEnum(searchParams.get('status'), TRANSACTION_STATUSES, 'status');
    const transactionType = optionalEnum(searchParams.get('transaction_type'), TRANSACTION_TYPES, 'transaction_type');

    let query = supabase
      .from('transactions')
      .select('*, user:users!transactions_user_id_fkey(full_name, email)', { count: 'exact' });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (transactionType) query = query.eq('transaction_type', transactionType);
    if (start_date) query = query.gte('transaction_date', start_date);
    if (end_date) query = query.lte('transaction_date', end_date);

    const sortBy = searchParams.get('sort_by') || 'transaction_date';
    const sortOrder = searchParams.get('sort_order') === 'asc';

    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<TransactionWithUser> = {
      data: (data as unknown as TransactionWithUser[]) ?? [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAuthUserProfile();
    const supabase = await createClient();
    const body = await request.json();

    const transactionDate = requireDate(body.transaction_date, 'transaction_date');
    const amount = requirePositiveNumber(body.amount, 'amount');
    const category = validateCategory(body.category);
    const transactionType = validateTransactionType(body.transaction_type);
    const description = requireString(body.description, 'description');

    if ((category === 'Sales' || category === 'Investment') && transactionType !== 'income') {
      throw new ValidationError(`${category} category must have transaction_type "income".`);
    }

    if (category !== 'Sales' && category !== 'Investment' && transactionType !== 'expense') {
      throw new ValidationError(`Category "${category}" should have transaction_type "expense".`);
    }

    if (!body.receipt_url) {
      throw new ValidationError('A receipt attachment or receipt upload is required for all transactions.');
    }

    const insertData = {
      user_id: profile.id,
      transaction_date: transactionDate,
      amount,
      category,
      transaction_type: transactionType,
      description,
      receipt_url: body.receipt_url || null,
      receipt_filename: body.receipt_filename || null,
      receipt_storage_path: body.receipt_storage_path || null,
      receipt_upload_date: body.receipt_url ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertData as Record<string, unknown>)
      .select()
      .single();

    if (error) {
      if (error.code === '23503') {
        throw new ValidationError('User profile not found. Please run the fix-rls.sql script in your Supabase SQL editor.');
      }
      throw error;
    }

    const transaction = data as unknown as Transaction;

    await supabase.from('activity_logs').insert({
      user_id: profile.id,
      action: 'created_transaction',
      table_name: 'transactions',
      record_id: transaction.id,
      new_values: { amount, category, description },
    } as Record<string, unknown>);

    return successResponse(transaction, 201);
  } catch (error) {
    return handleError(error);
  }
}
