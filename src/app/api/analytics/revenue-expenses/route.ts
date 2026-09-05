/**
 * GET /api/analytics/revenue-expenses
 *
 * Returns time-series data for revenue vs expenses chart.
 * Supports dynamic granularity:
 * - 30d: 30 (or 31) daily base points for the current month
 * - 3mo: 3 monthly aggregate base points
 * - 6mo: 6 monthly aggregate base points
 * - 1yr: 12 monthly aggregate base points
 * - max: all monthly aggregate base points
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import type { RevenueExpenseDataPoint } from '@/types/api';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range');
    const monthsParam = searchParams.get('months');
    const now = new Date();

    // 1. 30-Day Range: Daily granularity (30 or 31 daily points depending on month)
    if (range === '30d' || (!range && monthsParam === '1')) {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthAbbr = monthNames[month];

      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      // Query approved transactions for this calendar month
      const { data: txList } = await supabase
        .from('transactions')
        .select('amount, transaction_type, transaction_date')
        .eq('status', 'approved')
        .gte('transaction_date', startDateStr)
        .lte('transaction_date', endDateStr);

      const dailyMap: Record<number, { revenue: number; expenses: number }> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = { revenue: 0, expenses: 0 };
      }

      (txList ?? []).forEach((tx) => {
        const parts = tx.transaction_date.split('-');
        const d = parseInt(parts[2], 10);
        if (dailyMap[d]) {
          if (tx.transaction_type === 'income') {
            dailyMap[d].revenue += Number(tx.amount) || 0;
          } else if (tx.transaction_type === 'expense') {
            dailyMap[d].expenses += Number(tx.amount) || 0;
          }
        }
      });

      const chartData: RevenueExpenseDataPoint[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const rev = dailyMap[d].revenue;
        const exp = dailyMap[d].expenses;
        chartData.push({
          month: `${monthAbbr} ${d}`,
          revenue: rev,
          expenses: exp,
          net_profit: rev - exp,
        });
      }

      return successResponse(chartData);
    }

    // 2. Monthly Ranges: 3mo (3 points), 6mo (6 points), 1yr (12 points), max (all months)
    let monthsCount = 12;
    if (range === '3mo') {
      monthsCount = 3;
    } else if (range === '6mo') {
      monthsCount = 6;
    } else if (range === '1yr') {
      monthsCount = 12;
    } else if (range === 'max') {
      // Find earliest transaction to determine historical months starting strictly from when records started
      const { data: earliestTx } = await supabase
        .from('transactions')
        .select('transaction_date')
        .order('transaction_date', { ascending: true })
        .limit(1);

      if (earliestTx && earliestTx.length > 0 && earliestTx[0].transaction_date) {
        const parsed = new Date(earliestTx[0].transaction_date);
        const earliestDate = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        monthsCount = Math.max(
          1,
          (now.getFullYear() - earliestDate.getFullYear()) * 12 + (now.getMonth() - earliestDate.getMonth()) + 1
        );
      } else {
        monthsCount = 1;
      }
    } else if (monthsParam) {
      monthsCount = Math.max(1, parseInt(monthsParam, 10));
    }

    const monthSlots: Array<{ yearMonth: string; label: string }> = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' }) + ' ' + d.getFullYear();
      monthSlots.push({ yearMonth: ym, label });
    }

    const startMonth = monthSlots[0].yearMonth + '-01';
    const endDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(endDays).padStart(2, '0')}`;

    // Query approved transactions in range
    const { data: txList } = await supabase
      .from('transactions')
      .select('amount, transaction_type, transaction_date')
      .eq('status', 'approved')
      .gte('transaction_date', startMonth)
      .lte('transaction_date', endMonth);

    // Query monthly_analytics for pre-aggregated rows
    const { data: maList } = await supabase
      .from('monthly_analytics')
      .select('analytics_month, total_revenue, total_expenses, net_profit')
      .gte('analytics_month', startMonth)
      .lte('analytics_month', endMonth);

    const monthlyTotals: Record<string, { revenue: number; expenses: number }> = {};
    monthSlots.forEach((slot) => {
      monthlyTotals[slot.yearMonth] = { revenue: 0, expenses: 0 };
    });

    (txList ?? []).forEach((tx) => {
      const ym = tx.transaction_date.slice(0, 7);
      if (monthlyTotals[ym]) {
        if (tx.transaction_type === 'income') {
          monthlyTotals[ym].revenue += Number(tx.amount) || 0;
        } else if (tx.transaction_type === 'expense') {
          monthlyTotals[ym].expenses += Number(tx.amount) || 0;
        }
      }
    });

    (maList ?? []).forEach((ma) => {
      const ym = ma.analytics_month.slice(0, 7);
      if (monthlyTotals[ym]) {
        monthlyTotals[ym].revenue = Math.max(monthlyTotals[ym].revenue, Number(ma.total_revenue) || 0);
        monthlyTotals[ym].expenses = Math.max(monthlyTotals[ym].expenses, Number(ma.total_expenses) || 0);
      }
    });

    const chartData: RevenueExpenseDataPoint[] = monthSlots.map((slot) => {
      const rev = monthlyTotals[slot.yearMonth].revenue;
      const exp = monthlyTotals[slot.yearMonth].expenses;
      return {
        month: slot.label,
        revenue: rev,
        expenses: exp,
        net_profit: rev - exp,
      };
    });

    return successResponse(chartData);
  } catch (error) {
    return handleError(error);
  }
}
