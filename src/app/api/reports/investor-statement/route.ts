/**
 * GET /api/reports/investor-statement
 *
 * Returns investor-specific ROI report.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { parseDateRange } from '@/lib/validation';
import type { InvestorStatement } from '@/types/api';
import type { Investor, MonthlyAnalytics } from '@/types/database';

interface InvestorWithUser extends Investor {
  user: { full_name: string; email: string };
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getAuthUserProfile();
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const { start_date, end_date } = parseDateRange(searchParams);
    const investorId = searchParams.get('investor_id');

    let targetInvestorUserId: string;

    if (profile.role === 'admin' && investorId) {
      targetInvestorUserId = investorId;
    } else if (profile.role === 'investor') {
      targetInvestorUserId = profile.id;
    } else if (profile.role === 'admin') {
      throw new NotFoundError('Please specify an investor_id parameter.');
    } else {
      throw new ForbiddenError('Only admins and investors can access investor statements.');
    }

    const { data: investorData, error: investorError } = await supabase
      .from('investors')
      .select('*, user:users!investors_user_id_fkey(full_name, email)')
      .eq('user_id', targetInvestorUserId)
      .single();

    if (investorError || !investorData) {
      throw new NotFoundError('Investor record not found.');
    }

    const investor = investorData as unknown as InvestorWithUser;

    // Default date range: last 6 months
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString().split('T')[0];
    const defaultEnd = now.toISOString().split('T')[0];

    const periodStart = start_date || defaultStart;
    const periodEnd = end_date || defaultEnd;

    const { data: monthlyData, error: monthlyError } = await supabase
      .from('monthly_analytics')
      .select('analytics_month, net_profit, total_capital')
      .gte('analytics_month', periodStart)
      .lte('analytics_month', periodEnd)
      .order('analytics_month', { ascending: true });

    if (monthlyError) throw monthlyError;

    const months = (monthlyData as unknown as Pick<MonthlyAnalytics, 'analytics_month' | 'net_profit' | 'total_capital'>[]) ?? [];

    const monthlyBreakdown = months.map((month) => {
      const investorShare = (month.net_profit * investor.profit_share_percentage) / 100;
      return {
        month: month.analytics_month,
        net_profit: month.net_profit,
        investor_share: Number(investorShare.toFixed(2)),
      };
    });

    const totalNetProfit = monthlyBreakdown.reduce((sum, m) => sum + m.net_profit, 0);
    const investorProfitShare = monthlyBreakdown.reduce((sum, m) => sum + m.investor_share, 0);
    const roiPercentage = investor.capital_contributed > 0
      ? Number(((investorProfitShare / investor.capital_contributed) * 100).toFixed(2))
      : 0;

    const statement: InvestorStatement = {
      investor_id: investor.id,
      investor_name: investor.user?.full_name ?? 'Unknown',
      capital_contributed: investor.capital_contributed,
      profit_share_percentage: investor.profit_share_percentage,
      period_start: periodStart,
      period_end: periodEnd,
      total_net_profit: totalNetProfit,
      investor_profit_share: Number(investorProfitShare.toFixed(2)),
      roi_percentage: roiPercentage,
      monthly_breakdown: monthlyBreakdown,
    };

    return successResponse(statement);
  } catch (error) {
    return handleError(error);
  }
}
