'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Settings, Calculator, Wheat, Activity, TrendingUp } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { useToast, ToastContainer } from '@/components/UI/Toast';
import { createClient } from '@/lib/supabase/client';
import { businessSettingsSchema, type BusinessSettingsFormValues } from '@/lib/utils/zod-schemas';
import { formatCurrency } from '@/lib/utils/formatting';
import { SkeletonCard } from '@/components/UI/Spinner';
import type { BusinessProfile } from '@/types/database';

export default function SettingsPage() {
  const { toasts, toast, remove } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting, isDirty } } = useForm<BusinessSettingsFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(businessSettingsSchema) as any,
    defaultValues: {
      total_capital: 0,
      target_monthly_profit: 0,
      pre_starter_sacks: 0,
      pre_starter_cost: 0,
      starter_sacks: 0,
      starter_cost: 0,
      grower_sacks: 0,
      grower_cost: 0,
      finisher_sacks: 0,
      finisher_cost: 0,
      vitamins_cost: 0,
      expected_price_per_kg: 0,
      expected_market_weight_kg: 0,
      monthly_payroll_budget: 0,
    },
  });

  // Watch values for real-time calculation with 0 as initial fallback
  const targetProfit = useWatch({ control, name: 'target_monthly_profit', defaultValue: 0 }) || 0;
  const preSacks = useWatch({ control, name: 'pre_starter_sacks', defaultValue: 0 }) || 0;
  const preCost = useWatch({ control, name: 'pre_starter_cost', defaultValue: 0 }) || 0;
  const starterSacks = useWatch({ control, name: 'starter_sacks', defaultValue: 0 }) || 0;
  const starterCost = useWatch({ control, name: 'starter_cost', defaultValue: 0 }) || 0;
  const growerSacks = useWatch({ control, name: 'grower_sacks', defaultValue: 0 }) || 0;
  const growerCost = useWatch({ control, name: 'grower_cost', defaultValue: 0 }) || 0;
  const finisherSacks = useWatch({ control, name: 'finisher_sacks', defaultValue: 0 }) || 0;
  const finisherCost = useWatch({ control, name: 'finisher_cost', defaultValue: 0 }) || 0;
  const vitaminsCost = useWatch({ control, name: 'vitamins_cost', defaultValue: 0 }) || 0;

  const pricePerKg = useWatch({ control, name: 'expected_price_per_kg', defaultValue: 0 }) || 0;
  const marketWeight = useWatch({ control, name: 'expected_market_weight_kg', defaultValue: 0 }) || 0;
  const totalCapital = useWatch({ control, name: 'total_capital', defaultValue: 0 }) || 0;

  // Real-time calculated figures
  const totalFeedCost = (preSacks * preCost) + (starterSacks * starterCost) + (growerSacks * growerCost) + (finisherSacks * finisherCost);
  const totalRearingCostPerPig = totalFeedCost + vitaminsCost;
  const expectedSalePricePerPig = pricePerKg * marketWeight;
  const profitPerPig = expectedSalePricePerPig - totalRearingCostPerPig;
  const pigsNeededPerMonth = profitPerPig > 0 ? Math.ceil(targetProfit / profitPerPig) : 0;
  const sowsNeeded = Math.ceil(pigsNeededPerMonth / 2); // 2 pigs per month per sow average
  const dynamicMarginPct = totalRearingCostPerPig > 0 && profitPerPig > 0
    ? Number(((profitPerPig / totalRearingCostPerPig) * 100).toFixed(1))
    : 0;

  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    const supabase = createClient();
    const { data } = await supabase.from('business_profile').select('*').single();
    if (data) {
      const p = data as unknown as BusinessProfile & {
        feed_breakdown?: Record<string, number>;
      };
      setProfile(p as unknown as BusinessProfile);

      const fb = p.feed_breakdown || {};
      reset({
        total_capital: Number(p.total_capital) || 0,
        target_monthly_profit: Number(p.target_monthly_profit) || 0,
        target_pig_count: p.target_pig_count ?? 0,
        pre_starter_sacks: fb.pre_starter_sacks ?? 0,
        pre_starter_cost: fb.pre_starter_cost ?? 0,
        starter_sacks: fb.starter_sacks ?? 0,
        starter_cost: fb.starter_cost ?? 0,
        grower_sacks: fb.grower_sacks ?? 0,
        grower_cost: fb.grower_cost ?? 0,
        finisher_sacks: fb.finisher_sacks ?? 0,
        finisher_cost: fb.finisher_cost ?? 0,
        vitamins_cost: fb.vitamins_cost ?? 0,
        expected_price_per_kg: fb.expected_price_per_kg ?? 0,
        expected_market_weight_kg: fb.expected_market_weight_kg ?? 0,
        cost_per_pig_rearing: Number(p.cost_per_pig_rearing) || 0,
        expected_sale_price_per_pig: Number(p.expected_sale_price_per_pig) || 0,
        expected_roi_percentage: Number(p.expected_roi_percentage) || 0,
        monthly_payroll_budget: Number(p.monthly_payroll_budget) || 0,
      });
    }
    setIsLoadingProfile(false);
  }, [reset]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (data: any) => {
    const supabase = createClient();

    const feedBreakdown = {
      pre_starter_sacks: data.pre_starter_sacks,
      pre_starter_cost: data.pre_starter_cost,
      starter_sacks: data.starter_sacks,
      starter_cost: data.starter_cost,
      grower_sacks: data.grower_sacks,
      grower_cost: data.grower_cost,
      finisher_sacks: data.finisher_sacks,
      finisher_cost: data.finisher_cost,
      vitamins_cost: data.vitamins_cost,
      expected_price_per_kg: data.expected_price_per_kg,
      expected_market_weight_kg: data.expected_market_weight_kg,
    };

    const { error } = await supabase
      .from('business_profile')
      .update({
        total_capital: data.total_capital,
        target_monthly_profit: data.target_monthly_profit,
        target_pig_count: pigsNeededPerMonth,
        cost_per_pig_rearing: totalRearingCostPerPig,
        expected_sale_price_per_pig: expectedSalePricePerPig,
        expected_roi_percentage: dynamicMarginPct,
        monthly_payroll_budget: data.monthly_payroll_budget,
        // Save feed breakdown if column exists
        feed_breakdown: feedBreakdown,
      })
      .eq('id', profile?.id ?? '');

    if (error) {
      toast.error('Failed to save settings: ' + error.message);
    } else {
      toast.success('Settings and calculations saved!');
      fetchProfile();
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <TopBar
        title="Settings"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Save size={15} />}
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        }
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* Farm & Capital Overview */}
        <Card style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <CardHeader
            title="Business Profile"
            subtitle={profile?.business_name ?? 'PiggyTrack Farm'}
            icon={<Settings size={18} color="var(--secondary-green)" />}
          />

          {isLoadingProfile ? (
            <div style={{ padding: 24 }}>
              <SkeletonCard />
            </div>
          ) : (
            <form style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <div className="form-grid form-grid-2">
              <FormField label="Total Capital (₱)" htmlFor="s-capital" error={errors.total_capital?.message} required>
                <input
                  id="s-capital"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.total_capital ? ' error' : ''}`}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                  {...register('total_capital', { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Monthly Payroll Budget (₱)" htmlFor="s-payroll" error={errors.monthly_payroll_budget?.message} required>
                <input
                  id="s-payroll"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.monthly_payroll_budget ? ' error' : ''}`}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                  {...register('monthly_payroll_budget', { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-1">
              <FormField label="Target Monthly Profit (₱)" htmlFor="s-profit" error={errors.target_monthly_profit?.message} required>
                <input
                  id="s-profit"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.target_monthly_profit ? ' error' : ''}`}
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                  {...register('target_monthly_profit', { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <div className="divider" />

            {/* Rearing Cost Breakdown Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ color: 'var(--secondary-green)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wheat size={18} />
                  Feed & Rearing Cost Breakdown (Per Pig)
                </h4>
                <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                  Total: <strong style={{ color: '#fff' }}>{formatCurrency(totalRearingCostPerPig)}</strong> / pig
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Pre-starter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Pre-Starter (Sacks)" htmlFor="s-pre-sacks">
                    <input
                      id="s-pre-sacks"
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('pre_starter_sacks', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Cost per Sack (₱)" htmlFor="s-pre-cost">
                    <input
                      id="s-pre-cost"
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('pre_starter_cost', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                {/* Starter */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Starter (Sacks)" htmlFor="s-starter-sacks">
                    <input
                      id="s-starter-sacks"
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('starter_sacks', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Cost per Sack (₱)" htmlFor="s-starter-cost">
                    <input
                      id="s-starter-cost"
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('starter_cost', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                {/* Grower */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Grower (Sacks)" htmlFor="s-grower-sacks">
                    <input
                      id="s-grower-sacks"
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('grower_sacks', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Cost per Sack (₱)" htmlFor="s-grower-cost">
                    <input
                      id="s-grower-cost"
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('grower_cost', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                {/* Finisher */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <FormField label="Finisher (Sacks)" htmlFor="s-finisher-sacks">
                    <input
                      id="s-finisher-sacks"
                      type="number"
                      step="0.1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('finisher_sacks', { valueAsNumber: true })}
                    />
                  </FormField>
                  <FormField label="Cost per Sack (₱)" htmlFor="s-finisher-cost">
                    <input
                      id="s-finisher-cost"
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('finisher_cost', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>

                {/* Vitamins Overall Cost */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                  <FormField label="Vitamins & Healthcare Overall Expected Cost (₱ / Pig)" htmlFor="s-vitamins">
                    <input
                      id="s-vitamins"
                      type="number"
                      step="1"
                      className="form-input"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                      {...register('vitamins_cost', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="divider" />

            {/* Expected Sale Price per Kg */}
            <div>
              <h4 style={{ color: 'var(--secondary-green)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Activity size={18} />
                Market Sale Assumptions
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FormField label="Expected Price per Kilogram (₱ / kg)" htmlFor="s-price-kg">
                  <input
                    id="s-price-kg"
                    type="number"
                    step="1"
                    className="form-input"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                    {...register('expected_price_per_kg', { valueAsNumber: true })}
                  />
                </FormField>

                <FormField label="Average Market Weight (kg / Pig)" htmlFor="s-weight">
                  <input
                    id="s-weight"
                    type="number"
                    step="1"
                    className="form-input"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}
                    {...register('expected_market_weight_kg', { valueAsNumber: true })}
                  />
                </FormField>
              </div>

              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                Expected Revenue: <strong>{formatCurrency(expectedSalePricePerPig)}</strong> per pig ({marketWeight} kg @ ₱{pricePerKg}/kg)
              </p>
            </div>

            {/* Calculated Results Box */}
            <div style={{
              marginTop: 12, padding: 22, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.12), rgba(76, 175, 80, 0.04))',
              border: '1px solid rgba(76, 175, 80, 0.25)',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Profit / Pig</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: profitPerPig > 0 ? '#bbf7d0' : '#fecaca', marginTop: 4 }}>
                  {formatCurrency(profitPerPig)}
                </p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Margin: {dynamicMarginPct}%</span>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Pigs Needed / Mo</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 4 }}>
                  {pigsNeededPerMonth} <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>hd</span>
                </p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>To reach monthly target</span>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Sows to Breed</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--secondary-green)', marginTop: 4 }}>
                  {sowsNeeded} <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>hd</span>
                </p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>~2 pigs/mo/sow</span>
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Calculated ROI</p>
                <p style={{ fontSize: 24, fontWeight: 800, color: '#6ee7b7', marginTop: 4 }}>
                  {dynamicMarginPct}%
                </p>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Auto-analyzed from parameters</span>
              </div>
              </div>
            </form>
          )}
        </Card>

        {/* Capital distribution breakdown */}
        {profile && (
          <Card variant="beige">
            <CardHeader title="Capital Distribution" subtitle="Current investment breakdown" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {[
                { role: 'GM', amount: profile.gm_capital_contribution },
                { role: 'Logistics', amount: profile.logistics_capital_contribution },
                { role: 'Pen Manager', amount: profile.pen_manager_capital_contribution },
                { role: 'Investors Total', amount: profile.investor_capital_total },
              ].map((item) => (
                <div key={item.role} style={{ padding: '12px 14px', background: 'white', borderRadius: 10 }}>
                  <p className="metric-label" style={{ marginBottom: 4 }}>{item.role}</p>
                  <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--secondary-green)' }}>
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </ProtectedRoute>
  );
}
