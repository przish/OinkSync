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

    // 4. Count active members (all members are investors)
    const { count: memberCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const activeMembers = memberCount && memberCount > 0 ? memberCount : 1;

    // 5. Fetch user's approved investment transactions
    const { data: userInvestTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('created_by', profile.id)
      .eq('category', 'investment')
      .eq('status', 'approved');

    const sumUserInvest = (userInvestTx || []).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    let totalInvestment = 0;
    if (sumUserInvest > 0) {
      totalInvestment = sumUserInvest;
    } else if (investorData?.total_investment) {
      totalInvestment = Number(investorData.total_investment) || 0;
    } else if (bpData?.total_capital) {
      // Capital is equally distributed among members
      totalInvestment = Math.round(Number(bpData.total_capital) / activeMembers);
    }

    // 6. Compute Profit Distribution
    // - Operational work percentage (default 50% operations, 50% investor pool)
    // - From operations share: 50% Pen Manager, 25% GM (Admin), 25% Logistics
    // - Remainder is distributed equally to ALL investors (since all members contributed capital)
    let totalProfit = 0;
    if (totalFarmNetProfit > 0) {
      const operationsPercent = 50; // 50% work share, 50% investor capital share
      const operationsPool = (totalFarmNetProfit * operationsPercent) / 100;
      const investorPool = totalFarmNetProfit - operationsPool;

      // Equal dividend from investor pool
      const investorShare = investorPool / activeMembers;

      // Work-based share from operations pool
      let workShare = 0;
      if (profile.role === 'pen_manager') {
        workShare = operationsPool * 0.50; // 50%
      } else if (profile.role === 'admin') {
        workShare = operationsPool * 0.25; // 25%
      } else if (profile.role === 'logistics') {
        workShare = operationsPool * 0.25; // 25%
      }

      totalProfit = Math.round(workShare + investorShare);
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
