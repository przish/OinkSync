import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, handleError, UnauthorizedError, ValidationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError();
    }

    // Fetch user's pending investment transaction (support both user_id and created_by column)
    let pendingTx = null;
    const { data: byUser, error: errUser } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'investment')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!errUser) {
      pendingTx = byUser;
    } else {
      const { data: byCreator } = await supabase
        .from('transactions')
        .select('*')
        .eq('created_by', user.id)
        .eq('category', 'investment')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      pendingTx = byCreator;
    }

    return successResponse({
      pending: pendingTx || null,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new UnauthorizedError();
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const receiptUrl = body.receipt_url;

    if (!amount || amount <= 0) {
      throw new ValidationError('Valid investment amount is required');
    }

    if (!receiptUrl) {
      throw new ValidationError('Receipt upload is required for investment approval');
    }

    // Check if user already has a pending investment submission
    let existingPending: any = null;
    const { data: pendingByUser } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'investment')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingByUser) {
      existingPending = pendingByUser;
    } else {
      const { data: pendingByCreator } = await supabase
        .from('transactions')
        .select('*')
        .eq('created_by', user.id)
        .eq('category', 'investment')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      existingPending = pendingByCreator;
    }

    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (existingPending) {
      const createdAt = new Date(existingPending.created_at).getTime();
      const isWithin24Hours = (now - createdAt) <= ONE_DAY_MS;

      if (!isWithin24Hours) {
        throw new ValidationError(
          'Edit window expired. Your submission is locked after 24 hours. Please wait 1-2 business days for General Manager review.'
        );
      }

      // Update existing pending transaction
      const { data: updated, error: updateErr } = await supabase
        .from('transactions')
        .update({
          amount,
          receipt_url: receiptUrl,
          description: body.description || 'Member investment contribution',
        })
        .eq('id', existingPending.id)
        .select()
        .single();

      if (updateErr) {
        throw updateErr;
      }

      return successResponse({ transaction: updated, message: 'Investment submission updated successfully' });
    }

    // Create new pending investment transaction
    const today = new Date().toISOString().split('T')[0];
    
    // Attempt insert with user_id first (matching schema)
    let newTx = null;
    const { data: tx1, error: err1 } = await supabase
      .from('transactions')
      .insert({
        transaction_date: today,
        transaction_type: 'income',
        category: 'investment',
        amount,
        description: body.description || 'Member investment contribution',
        receipt_url: receiptUrl,
        status: 'pending',
        user_id: user.id,
      })
      .select()
      .maybeSingle();

    if (!err1 && tx1) {
      newTx = tx1;
    } else {
      // Fallback with created_by if schema used created_by
      const { data: tx2, error: err2 } = await supabase
        .from('transactions')
        .insert({
          transaction_date: today,
          transaction_type: 'capital',
          category: 'investment',
          amount,
          description: body.description || 'Member investment contribution',
          receipt_url: receiptUrl,
          status: 'pending',
          created_by: user.id,
        })
        .select()
        .single();

      if (err2) throw err2;
      newTx = tx2;
    }

    return successResponse({ transaction: newTx, message: 'Investment submitted for General Manager approval' }, 201);
  } catch (err) {
    return handleError(err);
  }
}
