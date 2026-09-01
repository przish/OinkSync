/**
 * GET /api/dashboard/kpi
 *
 * Returns KPI cards data for the dashboard.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { parseDateRange } from '@/lib/validation';
import type { KpiData } from '@/types/api';
import type { DashboardKpiResult } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const { start_date, end_date } = parseDateRange(searchParams);

    const now = new Date();
    const currentMonthStart = start_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const currentMonthEnd = end_date || now.toISOString().split('T')[0];

    const { data: kpiData, error: kpiError } = await supabase.rpc('get_dashboard_kpis', {
      p_start_date: currentMonthStart,
      p_end_date: currentMonthEnd,
    });

    if (kpiError) throw kpiError;

    const kpiRows = kpiData as unknown as DashboardKpiResult[];
    const currentKpi = kpiRows?.[0];

    // Previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: prevKpiData } = await supabase.rpc('get_dashboard_kpis', {
      p_start_date: prevMonthStart.toISOString().split('T')[0],
      p_end_date: prevMonthEnd.toISOString().split('T')[0],
    });

    const prevKpiRows = prevKpiData as unknown as DashboardKpiResult[];
    const prevKpi = prevKpiRows?.[0];

    const calcChange = (current: number, previous: number | undefined): number | null => {
      if (!previous || previous === 0) return null;
      return Number(((current - previous) / Math.abs(previous) * 100).toFixed(2));
    };

    const response: KpiData = {
      total_revenue: currentKpi?.total_revenue ?? 0,
      total_expenses: currentKpi?.total_expenses ?? 0,
      net_profit: currentKpi?.net_profit ?? 0,
      roi_percentage: currentKpi?.roi_percentage ?? 0,
      active_pig_count: currentKpi?.active_pig_count ?? 0,
      mortality_count: currentKpi?.mortality_count ?? 0,
      mortality_rate: currentKpi?.mortality_rate ?? 0,
      pending_transactions: currentKpi?.pending_transactions ?? 0,
      total_capital: currentKpi?.total_capital ?? 0,
      revenue_change_percent: calcChange(currentKpi?.total_revenue ?? 0, prevKpi?.total_revenue),
      expense_change_percent: calcChange(currentKpi?.total_expenses ?? 0, prevKpi?.total_expenses),
      profit_change_percent: calcChange(currentKpi?.net_profit ?? 0, prevKpi?.net_profit),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
