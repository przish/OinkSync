/**
 * GET /api/reports/monthly-summary
 *
 * Returns comprehensive monthly financial summary report,
 * itemized transactions, and uploaded receipts for the requested month.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import { requireDate } from '@/lib/validation';

export const dynamic = 'force-dynamic';

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

    const monthEnd = new Date(month);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // 1. Query monthly analytics if available
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('monthly_analytics')
      .select('*')
      .eq('analytics_month', month)
      .maybeSingle();

    if (analyticsError && analyticsError.code !== 'PGRST116') {
      throw analyticsError;
    }

    // 2. Fetch all approved & pending transactions for this month with receipts
    const { data: monthTxData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', month)
      .lte('transaction_date', monthEndStr)
      .order('transaction_date', { ascending: false });

    if (txError) throw txError;

    // Exclude non-approved investment contributions from the statement and receipts until approved
    const monthTransactions = (monthTxData || []).filter((tx) => {
      const isInvestment =
        tx.category?.toLowerCase() === 'investment' ||
        tx.description?.toLowerCase().includes('member investment contribution') ||
        tx.description?.toLowerCase().includes('investment');
      if (isInvestment && tx.status !== 'approved') {
        return false;
      }
      return true;
    });

    // Calculate dynamic totals from transactions
    let dynamicRevenue = 0;
    let dynamicExpenses = 0;
    monthTransactions.forEach((tx) => {
      if (tx.status === 'approved') {
        const amt = Number(tx.amount) || 0;
        if (tx.transaction_type === 'income') dynamicRevenue += amt;
        else if (tx.transaction_type === 'expense') dynamicExpenses += amt;
      }
    });

    const netProfit = dynamicRevenue - dynamicExpenses;
    const roiPercentage = dynamicExpenses > 0
      ? Number(((netProfit / dynamicExpenses) * 100).toFixed(1))
      : 0;

    // Filter receipts uploaded during this month (only from included transactions)
    const receipts = monthTransactions
      .filter((tx) => tx.receipt_url && tx.receipt_url.trim().length > 0)
      .map((tx) => ({
        id: tx.id,
        url: tx.receipt_url,
        description: tx.description,
        amount: tx.amount,
        date: tx.transaction_date,
        category: tx.category,
        status: tx.status,
      }));

    // Get expense breakdown
    let breakdown: any[] = [];
    try {
      const { data: breakdownData } = await supabase.rpc('get_expense_breakdown', {
        p_start_date: month,
        p_end_date: monthEndStr,
      } as Record<string, unknown>);
      if (breakdownData) breakdown = breakdownData;
    } catch {
      // breakdown RPC fallback
    }

    const report = {
      month,
      analytics: {
        total_revenue: analyticsData?.total_revenue || dynamicRevenue,
        total_expenses: analyticsData?.total_expenses || dynamicExpenses,
        net_profit: analyticsData?.net_profit !== undefined ? analyticsData.net_profit : netProfit,
        roi_percentage: analyticsData?.roi_percentage || roiPercentage,
        animals_sold: analyticsData?.animals_sold || 0,
      },
      transactions: monthTransactions,
      receipts,
      expense_breakdown: breakdown,
    };

    return successResponse(report);
  } catch (error) {
    return handleError(error);
  }
}
