/**
 * GET /api/analytics/scaling-readiness
 *
 * Returns scaling readiness assessment based on the 9-month cycle model:
 * Required Capital = (Target Sows * Sow Purchase Cost) + (Target Piglets * Rearing Cost to Fattener Stage)
 */

import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getAuthUser();
    const supabase = await createClient();

    // Get business profile for parameters
    const { data: profile } = await supabase
      .from('business_profile')
      .select('*')
      .maybeSingle();

    const targetPigCount = profile?.target_pig_count || 30;
    const costPerPigRearing = profile?.cost_per_pig_rearing || 4760;

    // Fetch approved member investment transactions
    const { data: approvedInvestments } = await supabase
      .from('transactions')
      .select('amount, category, description')
      .eq('status', 'approved');

    const totalApprovedInvestments = (approvedInvestments ?? []).reduce((sum, tx) => {
      const isInv =
        tx.category?.toLowerCase() === 'investment' ||
        tx.description?.toLowerCase().includes('member investment contribution') ||
        tx.description?.toLowerCase().includes('investment');
      return isInv ? sum + (Number(tx.amount) || 0) : sum;
    }, 0);

    const baseCapital = Number(profile?.total_capital) || 0;
    const currentCapital = baseCapital + totalApprovedInvestments;

    // A sow typically yields 8 to 10 piglets per cycle.
    const pigletsPerSow = 10;
    const targetSows = Math.max(1, Math.ceil(targetPigCount / pigletsPerSow));
    const sowCost = profile?.sow_cost || 25000; // Estimated sow purchase cost

    // Capital required accounts for buying the sows AND raising piglets to fattener stage (9 months)
    const sowCapital = targetSows * sowCost;
    const rearingCapital = targetPigCount * costPerPigRearing;
    const totalRequiredCapital = sowCapital + rearingCapital;

    const gapAmount = Math.max(0, totalRequiredCapital - currentCapital);
    const isReady = currentCapital >= totalRequiredCapital;

    // Projected scale date: if ready, next month; else estimated based on monthly profit
    const today = new Date();
    const projectedScaleDate = isReady
      ? new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0]
      : new Date(today.getFullYear(), today.getMonth() + 4, 1).toISOString().split('T')[0];

    const recommendation = isReady
      ? `Capital is sufficient to procure ${targetSows} breeding sows and fully finance ${targetPigCount} piglets to fattener stage over 9 months.`
      : `Additional capital of ₱${gapAmount.toLocaleString()} needed to procure ${targetSows} sows and fund feed through the 9-month fattener cycle.`;

    return successResponse({
      is_ready: isReady,
      current_capital: currentCapital,
      required_capital: totalRequiredCapital,
      gap_amount: gapAmount,
      recommendation,
      projected_scale_date: projectedScaleDate,
      target_sows: targetSows,
      target_pig_count: targetPigCount,
      sow_cost: sowCost,
      cost_per_pig_rearing: costPerPigRearing,
      cycle_months: 9,
    });
  } catch (error) {
    return handleError(error);
  }
}
