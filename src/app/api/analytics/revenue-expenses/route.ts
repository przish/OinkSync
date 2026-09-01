/**
 * GET /api/analytics/revenue-expenses
 *
 * Returns time-series data for revenue vs expenses chart.
 * Data points are monthly aggregates from monthly_analytics.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { parseDateRange } from '@/lib/validation';
import type { RevenueExpenseDataPoint } from '@/types/api';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const { start_date, end_date } = parseDateRange(searchParams);

    // Default to last 12 months
    const now = new Date();
    const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      .toISOString().split('T')[0];

    let query = supabase
      .from('monthly_analytics')
      .select('analytics_month, total_revenue, total_expenses, net_profit')
      .order('analytics_month', { ascending: true });

    if (start_date) {
      query = query.gte('analytics_month', start_date);
    } else {
      query = query.gte('analytics_month', defaultStart);
    }

    if (end_date) {
      query = query.lte('analytics_month', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    const chartData: RevenueExpenseDataPoint[] = (data ?? []).map((row) => ({
      month: row.analytics_month,
      revenue: row.total_revenue,
      expenses: row.total_expenses,
      net_profit: row.net_profit,
    }));

    return successResponse(chartData);
  } catch (error) {
    return handleError(error);
  }
}
