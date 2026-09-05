/**
 * GET   /api/transactions/[id] - Get a single transaction
 * PATCH /api/transactions/[id] - Update a transaction (enforcing 5-minute edit window for members)
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import {
  requirePositiveNumber,
  requireDate,
  validateCategory,
  validateTransactionType,
} from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthUserProfile();
    const supabase = await createClient();
    const { id } = await params;

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('*, user:users!transactions_user_id_fkey(full_name, email)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!tx) throw new NotFoundError('Transaction not found');

    return successResponse(tx);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getAuthUserProfile();
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    // 1. Fetch current transaction
    const { data: existing, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!existing) throw new NotFoundError('Transaction not found');

    // 2. Role and 5-minute edit window verification
    const isAdmin = profile.role === 'admin';
    const isOwner = existing.user_id === profile.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenError('You can only edit transactions that you submitted.');
    }

    if (existing.status !== 'pending') {
      throw new ValidationError(`Cannot edit a transaction that has already been ${existing.status}.`);
    }

    // Check 5-minute edit window for non-admin members
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const createdAt = new Date(existing.created_at).getTime();
    const elapsed = Date.now() - createdAt;

    if (!isAdmin && elapsed > FIVE_MINUTES_MS) {
      throw new ValidationError('This transaction is locked. Edits are only permitted within 5 minutes of submission.');
    }

    // 3. Build updates
    const updates: Record<string, unknown> = {};

    if (body.amount !== undefined) {
      updates.amount = requirePositiveNumber(body.amount, 'amount');
    }
    if (body.description !== undefined) {
      updates.description = String(body.description).trim();
    }
    if (body.transaction_date !== undefined) {
      updates.transaction_date = requireDate(body.transaction_date, 'transaction_date');
    }
    if (body.category !== undefined) {
      updates.category = validateCategory(body.category);
    }
    if (body.transaction_type !== undefined) {
      updates.transaction_type = validateTransactionType(body.transaction_type);
    }
    if (body.receipt_url !== undefined) {
      updates.receipt_url = body.receipt_url;
    }
    if (body.receipt_filename !== undefined) {
      updates.receipt_filename = body.receipt_filename;
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select('*, user:users!transactions_user_id_fkey(full_name, email)')
      .single();

    if (updateErr) throw updateErr;

    return successResponse(updated);
  } catch (error) {
    return handleError(error);
  }
}
