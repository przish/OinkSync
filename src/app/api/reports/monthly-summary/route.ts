/**
 * GET /api/reports/monthly-summary
 *
 * Returns monthly financial summary report.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { requireDate } from '@/lib/validation';
import type { MonthlySummaryReport } from '@/types/api';
import type { MonthlyAnalytics, ExpenseBreakdownResult } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get('month');

    const now = new Date();
    const month = monthParam
      ? requireDate(monthParam, 'month')
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: analyticsData, error: analyticsError } = await supabase
      .from('monthly_analytics')
      .select('*')
      .eq('analytics_month', month)
      .single();

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      throw analyticsError;
    }

    const analytics = analyticsData as unknown as MonthlyAnalytics | null;

    // Calculate profit per pig
    let profitPerPig = 0;
    if (analytics) {
      const { data: profitData } = await supabase.rpc('calculate_profit_per_pig', {
        p_analytics_month: month,
      } as Record<string, unknown>);
      profitPerPig = (profitData as unknown as number) ?? 0;
    }

    // Get expense breakdown
    const monthEnd = new Date(month);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    const { data: breakdownData } = await supabase.rpc('get_expense_breakdown', {
      p_start_date: month,
      p_end_date: monthEnd.toISOString().split('T')[0],
    } as Record<string, unknown>);

    const breakdown = (breakdownData as unknown as ExpenseBreakdownResult[]) ?? [];

    const topCategory = breakdown.length > 0 ? breakdown[0].category : 'N/A';

    const report: MonthlySummaryReport = {
      month,
      analytics: analytics ?? {
        id: '',
        analytics_month: month,
        total_revenue: 0,
        total_expenses: 0,
        net_profit: 0,
        feed_expenses: 0,
        vitamin_expenses: 0,
        infrastructure_expenses: 0,
        veterinary_expenses: 0,
        labor_expenses: 0,
        transportation_expenses: 0,
        average_pig_count: 0,
        animals_sold: 0,
        animals_died: 0,
        mortality_rate: null,
        total_capital: null,
        roi_percentage: 0,
        created_at: '',
        updated_at: '',
      },
      profit_per_pig: profitPerPig,
      top_expense_category: topCategory,
      expense_breakdown: breakdown,
    };

    return successResponse(report);
  } catch (error) {
    return handleError(error);
  }
}
