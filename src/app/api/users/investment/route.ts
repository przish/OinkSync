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

    // Fetch user's pending investment transaction (support category 'investment' or description matching investment)
    const { data: pendingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .or('category.eq.investment,description.ilike.%investment%')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch user's latest investment submission (for status card even after 24h or when approved/rejected)
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .or('category.eq.investment,description.ilike.%investment%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return successResponse({
      pending: pendingTx || null,
      latest: latestTx || null,
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

    // Check if user has an existing investment submission (one submission at a time)
    const { data: latestTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .or('category.eq.investment,description.ilike.%investment%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

    if (latestTx) {
      const createdAt = new Date(latestTx.created_at).getTime();
      const isWithin3Hours = (now - createdAt) <= THREE_HOURS_MS;

      if (isWithin3Hours) {
        // User can edit files, receipt, or amount within the 3-hour window
        const { data: updated, error: updateErr } = await supabase
          .from('transactions')
          .update({
            amount,
            receipt_url: receiptUrl,
            description: body.description || 'Member investment contribution',
            status: 'pending', // reset to pending so GM reviews the updated files
            updated_at: new Date().toISOString(),
          })
          .eq('id', latestTx.id)
          .select()
          .single();

        if (updateErr) {
          throw updateErr;
        }

        return successResponse({ transaction: updated, message: 'Investment submission updated successfully' });
      }

      // If beyond 24 hours and still pending: block additional submissions
      if (latestTx.status === 'pending') {
        throw new ValidationError(
          'Your investment submission is locked after 24 hours and is awaiting General Manager review. Only one submission is permitted at a time.'
        );
      }
    }

    // Create new pending investment transaction
    const today = new Date().toISOString().split('T')[0];
    
    // Insert with user_id (matching transactions schema)
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
    } else if (err1 && (err1.message?.includes('category') || err1.code === '23514')) {
      // If transactions_category_check requires a standard category
      const { data: txSales, error: errSales } = await supabase
        .from('transactions')
        .insert({
          transaction_date: today,
          transaction_type: 'income',
          category: 'Sales',
          amount,
          description: body.description || 'Member investment contribution',
          receipt_url: receiptUrl,
          status: 'pending',
          user_id: user.id,
        })
        .select()
        .single();

      if (errSales) throw errSales;
      newTx = txSales;
    } else if (err1) {
      throw err1;
    }

    return successResponse({ transaction: newTx, message: 'Investment submitted for General Manager approval' }, 201);
  } catch (err) {
    return handleError(err);
  }
}
