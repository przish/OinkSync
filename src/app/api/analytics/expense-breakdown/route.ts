/**
 * GET /api/analytics/expense-breakdown
 *
 * Returns expense categorization breakdown for a given period.
 * Calls the get_expense_breakdown database function.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { parseDateRange } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const { start_date, end_date } = parseDateRange(searchParams);

    // Support months query parameter (e.g. months=1, months=6, months=12, months=24)
    const now = new Date();
    const monthsParam = searchParams.get('months');
    const monthsCount = monthsParam ? Math.max(1, parseInt(monthsParam, 10)) : 1;
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1)
      .toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_expense_breakdown', {
      p_start_date: start_date || defaultStart,
      p_end_date: end_date || defaultEnd,
    });

    if (error) throw error;

    return successResponse(data ?? []);
  } catch (error) {
    return handleError(error);
  }
}
