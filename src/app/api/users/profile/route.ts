/**
 * GET  /api/users/profile - Get current user profile and personal investment/profit stats
 * PATCH /api/users/profile - Update display name and avatar with 14-day limit
 */

import { NextRequest } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await getAuthUserProfile();
    const supabase = await createClient();

    // 1. Fetch user's investment record if they exist in investors table
    const { data: investorData } = await supabase
      .from('investors')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    // 2. Fetch business profile for farm-level capital contributions
    const { data: bpData } = await supabase
      .from('business_profile')
      .select('*')
      .maybeSingle();

    // 3. Fetch all approved transactions to compute net profit
    const { data: txData } = await supabase
      .from('transactions')
      .select('transaction_type, amount')
      .eq('status', 'approved');

    let totalRevenue = 0;
    let totalExpense = 0;
    (txData || []).forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.transaction_type === 'income') totalRevenue += amt;
      else if (tx.transaction_type === 'expense') totalExpense += amt;
    });
    const totalFarmNetProfit = totalRevenue - totalExpense;

    let totalInvestment = 0;
    let totalProfit = 0;

    if (investorData) {
      totalInvestment = Number(investorData.total_investment) || 0;
      const sharePct = Number(investorData.profit_share_percentage) || 0;
      const calculatedShare = totalFarmNetProfit > 0 ? (totalFarmNetProfit * sharePct) / 100 : 0;
      totalProfit = Number(investorData.total_profit_paid) || calculatedShare;
    } else if (bpData) {
      // Determine contribution based on role
      if (profile.role === 'admin') {
        totalInvestment = Number(bpData.gm_capital_contribution) || 0;
      } else if (profile.role === 'logistics') {
        totalInvestment = Number(bpData.logistics_capital_contribution) || 0;
      } else if (profile.role === 'pen_manager') {
        totalInvestment = Number(bpData.pen_manager_capital_contribution) || 0;
      }

      const totalCap = Number(bpData.total_capital) || 1;
      const ratio = totalInvestment > 0 && totalCap > 0 ? totalInvestment / totalCap : 0;
      totalProfit = totalFarmNetProfit > 0 ? Math.round(totalFarmNetProfit * ratio) : 0;
    }

    return successResponse({
      profile,
      metrics: {
        total_investment: totalInvestment,
        total_profit: totalProfit,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await getAuthUserProfile();
    const body = await request.json();
    const adminClient = createAdminClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Update Display Name
    if (typeof body.full_name === 'string' && body.full_name.trim().length > 0) {
      updates.full_name = body.full_name.trim();

      // Update auth user metadata
      await adminClient.auth.admin.updateUserById(profile.id, {
        user_metadata: { full_name: body.full_name.trim() },
      });
    }

    // Update Avatar (14-day rule)
    if (body.avatar_url && typeof body.avatar_url === 'string') {
      const now = new Date();
      if (profile.avatar_updated_at) {
        const lastUpdated = new Date(profile.avatar_updated_at);
        const daysSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 14) {
          const daysRemaining = Math.ceil(14 - daysSince);
          throw new ValidationError(
            `You can only change your profile picture once every 14 days. Please wait ${daysRemaining} more day${daysRemaining > 1 ? 's' : ''}.`
          );
        }
      }

      updates.avatar_url = body.avatar_url;
      updates.avatar_updated_at = now.toISOString();
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return successResponse(updatedProfile);
  } catch (error) {
    return handleError(error);
  }
}
