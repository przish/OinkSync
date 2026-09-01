/**
 * GET /api/analytics/scaling-readiness
 *
 * Returns scaling readiness assessment including gap amount,
 * recommendation, and projected scale date.
 * Calls the calculate_scaling_readiness database function.
 */

import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import type { ScalingReadiness } from '@/types/api';

export async function GET() {
  try {
    await getAuthUser();
    const supabase = await createClient();

    // Call the database function
    const { data: scalingData, error: scalingError } = await supabase.rpc(
      'calculate_scaling_readiness'
    );

    if (scalingError) throw scalingError;

    // Get business profile for additional context
    const { data: profile } = await supabase
      .from('business_profile')
      .select('total_capital, target_pig_count, cost_per_pig_rearing')
      .single();

    const result = scalingData?.[0];

    const response: ScalingReadiness = {
      gap_amount: result?.gap_amount ?? 0,
      is_ready: result?.is_ready ?? false,
      recommendation: result?.recommendation ?? 'No data available.',
      projected_scale_date: result?.projected_scale_date ?? null,
      current_capital: profile?.total_capital ?? 0,
      required_capital: (profile?.target_pig_count ?? 0) * (profile?.cost_per_pig_rearing ?? 0),
      target_pig_count: profile?.target_pig_count ?? 0,
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}
