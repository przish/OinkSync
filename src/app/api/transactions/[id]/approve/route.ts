/**
 * PATCH /api/transactions/[id]/approve
 *
 * Approve or reject a transaction (admin only).
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { successResponse, handleError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireUUID, requireString } from '@/lib/validation';
import type { Transaction } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    // Use admin client to bypass RLS (since we already verified the user is an admin)
    // The transactions table does not have an UPDATE policy in RLS for normal clients.
    const supabase = createAdminClient();
    const { id } = await params;
    const transactionId = requireUUID(id, 'transaction_id');

    const body = await request.json();
    const action = body.action;

    if (!['approve', 'reject'].includes(action)) {
      throw new ValidationError('Action must be either "approve" or "reject".');
    }

    const { data: existingData, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !existingData) {
      throw new NotFoundError(`Transaction ${transactionId} not found.`);
    }

    const existing = existingData as unknown as Transaction;

    if (existing.status !== 'pending') {
      throw new ValidationError(
        `Transaction is already ${existing.status}. Only pending transactions can be approved or rejected.`
      );
    }

    // Protect 24-hour member edit window for investment contributions
    const isInvestment = existing.category?.toLowerCase() === 'investment' || existing.description?.toLowerCase().includes('investment');
    if (isInvestment && existing.created_at) {
      const createdAt = new Date(existing.created_at).getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - createdAt < ONE_DAY_MS) {
        throw new ValidationError('This investment contribution is currently in the 24-hour member edit window and cannot be reviewed yet.');
      }
    }

    const updateData: Record<string, unknown> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    };

    if (action === 'reject') {
      const reason = requireString(body.rejection_reason, 'rejection_reason');
      updateData.rejection_reason = reason;
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData as Record<string, unknown>)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;

    return successResponse(data as unknown as Transaction);
  } catch (error) {
    return handleError(error);
  }
}
