/**
 * GET /api/dashboard/kpi
 *
 * Returns KPI cards data for the dashboard with resilient fallback.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { parseDateRange } from '@/lib/validation';
import type { KpiData } from '@/types/api';
import type { DashboardKpiResult } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all'; // Default to 'all' so past approved transactions appear
    const { start_date, end_date } = parseDateRange(searchParams);

    const now = new Date();
    let computedStart: string | null = null;
    let computedEnd: string = end_date || now.toISOString().split('T')[0];

    if (start_date) {
      computedStart = start_date;
    } else if (period === 'this_month') {
      computedStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (period === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      computedStart = lm.toISOString().split('T')[0];
      computedEnd = lmEnd.toISOString().split('T')[0];
    } else if (period === 'ytd') {
      computedStart = `${now.getFullYear()}-01-01`;
    }

    let currentKpi: DashboardKpiResult | null = null;
    let prevKpi: DashboardKpiResult | null = null;

    // 1. Attempt RPC call
    try {
      const { data: kpiData, error: kpiError } = await supabase.rpc('get_dashboard_kpis', {
        p_start_date: computedStart || '1970-01-01',
        p_end_date: computedEnd,
      });

      if (!kpiError && kpiData && Array.isArray(kpiData) && kpiData.length > 0) {
        currentKpi = kpiData[0] as DashboardKpiResult;
      }
    } catch {
      // RPC might not exist or threw, fallback will handle
    }

    // 2. Direct Fallback if RPC didn't return data
    if (!currentKpi) {
      // Direct transactions query
      let txQuery = supabase
        .from('transactions')
        .select('transaction_type, amount, status, transaction_date')
        .eq('status', 'approved');

      if (computedStart) {
        txQuery = txQuery.gte('transaction_date', computedStart);
      }
      if (end_date) {
        txQuery = txQuery.lte('transaction_date', computedEnd);
      }

      const { data: approvedTx } = await txQuery;

      let rev = 0;
      let exp = 0;
      (approvedTx || []).forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.transaction_type === 'income') rev += amt;
        else if (t.transaction_type === 'expense') exp += amt;
      });

      // Capital from business profile + all approved member investments
      const { data: bp } = await supabase.from('business_profile').select('total_capital').maybeSingle();
      const baseCap = Number(bp?.total_capital) || 0;

      const { data: investTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'approved')
        .or('category.eq.investment,description.ilike.%investment%');

      const memberInvestments = (investTx || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const cap = baseCap + memberInvestments;
      const profit = rev - exp;
      const roi = cap > 0 ? Number(((profit / cap) * 100).toFixed(2)) : 0;

      // Active & mortality counts from animals
      const { count: activeCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: deadCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'deceased');

      // Pending transactions
      const { count: pendingCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Count active members for dynamic dividend distribution
      const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const totalAnimals = (activeCount ?? 0) + (deadCount ?? 0);
      const mortRate = totalAnimals > 0 ? Number((((deadCount ?? 0) / totalAnimals) * 100).toFixed(2)) : 0;

      currentKpi = {
        total_revenue: rev,
        total_expenses: exp,
        net_profit: profit,
        roi_percentage: roi,
        active_pig_count: activeCount ?? 0,
        mortality_count: deadCount ?? 0,
        mortality_rate: mortRate,
        pending_transactions: pendingCount ?? 0,
        total_capital: cap,
        active_members_count: memberCount && memberCount > 0 ? memberCount : 1,
      };
    }

    // Piglet-specific mortality rate
    let litterMortRate = 0;
    try {
      const { count: totalPiglets } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('animal_type', 'piglet');

      const { count: deadPiglets } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('animal_type', 'piglet')
        .eq('status', 'deceased');

      if ((totalPiglets ?? 0) > 0) {
        litterMortRate = Number((((deadPiglets ?? 0) / (totalPiglets ?? 1)) * 100).toFixed(2));
      }
    } catch {
      // Non-critical fallback
    }

    const calcChange = (current: number, previous: number | undefined): number | null => {
      if (!previous || previous === 0) return null;
      return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
    };

    const response: KpiData = {
      total_revenue: Number(currentKpi?.total_revenue) || 0,
      total_expenses: Number(currentKpi?.total_expenses) || 0,
      net_profit: Number(currentKpi?.net_profit) || 0,
      roi_percentage: Number(currentKpi?.roi_percentage) || 0,
      active_pig_count: Number(currentKpi?.active_pig_count) || 0,
      mortality_count: Number(currentKpi?.mortality_count) || 0,
      mortality_rate: Number(currentKpi?.mortality_rate) || 0,
      litter_mortality_rate: litterMortRate,
      pending_transactions: Number(currentKpi?.pending_transactions) || 0,
      total_capital: Number(currentKpi?.total_capital) || 0,
      active_members_count: currentKpi?.active_members_count,
      revenue_change_percent: calcChange(Number(currentKpi?.total_revenue) || 0, undefined),
      expense_change_percent: calcChange(Number(currentKpi?.total_expenses) || 0, undefined),
      profit_change_percent: calcChange(Number(currentKpi?.net_profit) || 0, undefined),
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
