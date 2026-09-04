'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Settings, Calculator, Wheat, Activity, TrendingUp, DollarSign, Scale } from 'lucide-react';
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

  const onSubmit = async (values: BusinessSettingsFormValues) => {
    try {
      const supabase = createClient();

      // Recalculate based on current form inputs
      const compFeedCost = (values.pre_starter_sacks * values.pre_starter_cost) +
        (values.starter_sacks * values.starter_cost) +
        (values.grower_sacks * values.grower_cost) +
        (values.finisher_sacks * values.finisher_cost);

      const compRearing = compFeedCost + values.vitamins_cost;
      const compSalePrice = values.expected_price_per_kg * values.expected_market_weight_kg;
      const compProfitPerPig = compSalePrice - compRearing;
      const compRoi = compRearing > 0 && compProfitPerPig > 0
        ? Number(((compProfitPerPig / compRearing) * 100).toFixed(1))
        : 0;

      const feedBreakdownPayload = {
        pre_starter_sacks: values.pre_starter_sacks,
        pre_starter_cost: values.pre_starter_cost,
        starter_sacks: values.starter_sacks,
        starter_cost: values.starter_cost,
        grower_sacks: values.grower_sacks,
        grower_cost: values.grower_cost,
        finisher_sacks: values.finisher_sacks,
        finisher_cost: values.finisher_cost,
        vitamins_cost: values.vitamins_cost,
        expected_price_per_kg: values.expected_price_per_kg,
        expected_market_weight_kg: values.expected_market_weight_kg,
      };

      const payload = {
        total_capital: values.total_capital,
        target_monthly_profit: values.target_monthly_profit,
        cost_per_pig_rearing: compRearing,
        expected_sale_price_per_pig: compSalePrice,
        expected_roi_percentage: compRoi,
        monthly_payroll_budget: values.monthly_payroll_budget,
        feed_breakdown: feedBreakdownPayload,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await supabase
        .from('business_profile')
        .update(payload)
        .eq('id', profile?.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updated as unknown as BusinessProfile);
      reset(values);
      toast.success('Farm settings & cost breakdown saved!');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <TopBar title="Settings" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
        {isLoadingProfile ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--palette-cream)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--card-border)' }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
                  Farm Operating Configuration
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: '2px 0 0' }}>
                  {profile?.business_name ?? 'PiggyTrack Farm'} • Categorized parameter settings
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                type="submit"
                leftIcon={<Save size={15} />}
                isLoading={isSubmitting}
                disabled={!isDirty}
              >
                Save All Changes
              </Button>
            </div>

            {/* 4 Categorized Cards Grid (2x2 on desktop) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 24 }}>
              {/* Category Card 1: Farm Profile & Financial Targets */}
              <Card>
                <CardHeader
                  title="Capital & Financial Targets"
                  subtitle="Working capital, payroll, and targets"
                  icon={<DollarSign size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormField label="Total Farm Capital (₱)" htmlFor="s-capital" error={errors.total_capital?.message} required>
                    <input
                      id="s-capital"
                      type="number"
                      step="100"
                      className={`form-input${errors.total_capital ? ' error' : ''}`}
                      {...register('total_capital', { valueAsNumber: true })}
                    />
                  </FormField>

                  <FormField label="Monthly Payroll Budget (₱)" htmlFor="s-payroll" error={errors.monthly_payroll_budget?.message} required>
                    <input
                      id="s-payroll"
                      type="number"
                      step="100"
                      className={`form-input${errors.monthly_payroll_budget ? ' error' : ''}`}
                      {...register('monthly_payroll_budget', { valueAsNumber: true })}
                    />
                  </FormField>

                  <FormField label="Target Monthly Profit (₱)" htmlFor="s-profit" error={errors.target_monthly_profit?.message} required>
                    <input
                      id="s-profit"
                      type="number"
                      step="100"
                      className={`form-input${errors.target_monthly_profit ? ' error' : ''}`}
                      {...register('target_monthly_profit', { valueAsNumber: true })}
                    />
                  </FormField>
                </div>
              </Card>

              {/* Category Card 2: Feed Breakdown (Per Pig) */}
              <Card>
                <CardHeader
                  title="Feed Breakdown (Per Pig)"
                  subtitle={`Total Feed: ${formatCurrency(totalFeedCost)} / pig`}
                  icon={<Wheat size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Pre-Starter */}
                  <div className="form-grid form-grid-2">
                    <FormField label="Pre-Starter (Sacks)" htmlFor="s-pre-sacks">
                      <input
                        id="s-pre-sacks"
                        type="number"
                        step="0.1"
                        className="form-input"
                        {...register('pre_starter_sacks', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Cost / Sack (₱)" htmlFor="s-pre-cost">
                      <input
                        id="s-pre-cost"
                        type="number"
                        step="10"
                        className="form-input"
                        {...register('pre_starter_cost', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>

                  {/* Starter */}
                  <div className="form-grid form-grid-2">
                    <FormField label="Starter (Sacks)" htmlFor="s-starter-sacks">
                      <input
                        id="s-starter-sacks"
                        type="number"
                        step="0.1"
                        className="form-input"
                        {...register('starter_sacks', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Cost / Sack (₱)" htmlFor="s-starter-cost">
                      <input
                        id="s-starter-cost"
                        type="number"
                        step="10"
                        className="form-input"
                        {...register('starter_cost', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>

                  {/* Grower */}
                  <div className="form-grid form-grid-2">
                    <FormField label="Grower (Sacks)" htmlFor="s-grower-sacks">
                      <input
                        id="s-grower-sacks"
                        type="number"
                        step="0.1"
                        className="form-input"
                        {...register('grower_sacks', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Cost / Sack (₱)" htmlFor="s-grower-cost">
                      <input
                        id="s-grower-cost"
                        type="number"
                        step="10"
                        className="form-input"
                        {...register('grower_cost', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>

                  {/* Finisher */}
                  <div className="form-grid form-grid-2">
                    <FormField label="Finisher (Sacks)" htmlFor="s-finisher-sacks">
                      <input
                        id="s-finisher-sacks"
                        type="number"
                        step="0.1"
                        className="form-input"
                        {...register('finisher_sacks', { valueAsNumber: true })}
                      />
                    </FormField>
                    <FormField label="Cost / Sack (₱)" htmlFor="s-finisher-cost">
                      <input
                        id="s-finisher-cost"
                        type="number"
                        step="10"
                        className="form-input"
                        {...register('finisher_cost', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>
                </div>
              </Card>

              {/* Category Card 3: Healthcare & Market Pricing */}
              <Card>
                <CardHeader
                  title="Healthcare & Market Pricing"
                  subtitle="Vitamins, price per kg, and market weight"
                  icon={<Scale size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormField label="Vitamins & Medication Cost / Pig (₱)" htmlFor="s-vitamins">
                    <input
                      id="s-vitamins"
                      type="number"
                      step="10"
                      className="form-input"
                      {...register('vitamins_cost', { valueAsNumber: true })}
                    />
                  </FormField>

                  <div className="form-grid form-grid-2">
                    <FormField label="Expected Price / kg (₱)" htmlFor="s-price-kg">
                      <input
                        id="s-price-kg"
                        type="number"
                        step="1"
                        className="form-input"
                        {...register('expected_price_per_kg', { valueAsNumber: true })}
                      />
                    </FormField>

                    <FormField label="Target Market Weight (kg)" htmlFor="s-weight">
                      <input
                        id="s-weight"
                        type="number"
                        step="1"
                        className="form-input"
                        {...register('expected_market_weight_kg', { valueAsNumber: true })}
                      />
                    </FormField>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Total Rearing Cost / Pig:</span>
                      <strong>{formatCurrency(totalRearingCostPerPig)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Expected Sale Price / Pig:</span>
                      <strong style={{ color: 'var(--success)' }}>{formatCurrency(expectedSalePricePerPig)}</strong>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Category Card 4: Dynamic ROI & Live Calculator */}
              <Card>
                <CardHeader
                  title="Scaling Calculator & Dynamic ROI"
                  subtitle="Live analyzed projections based on your inputs"
                  icon={<Calculator size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 14, background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--palette-sage)' }}>
                      <p className="metric-label" style={{ color: 'var(--neutral-dark)', marginBottom: 4, fontWeight: 700 }}>Profit / Pig</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: profitPerPig > 0 ? 'var(--income-green)' : 'var(--expense-red)' }}>
                        {formatCurrency(profitPerPig)}
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--muted-dark)' }}>Margin: {dynamicMarginPct}%</span>
                    </div>

                    <div style={{ padding: 14, background: 'var(--palette-blush)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(235,175,175,0.7)' }}>
                      <p className="metric-label" style={{ color: '#883333', marginBottom: 4 }}>Calculated ROI</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-dark)' }}>
                        {dynamicMarginPct}%
                      </p>
                      <span style={{ fontSize: 11, color: '#6B4444' }}>Return on rearing cost</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 14, background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Pigs Needed / Mo</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--secondary-green)' }}>
                        {pigsNeededPerMonth} <span style={{ fontSize: 13, fontWeight: 500 }}>hd</span>
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--muted-dark)' }}>To hit monthly target</span>
                    </div>

                    <div style={{ padding: 14, background: 'var(--palette-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Sows to Breed</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--secondary-green)' }}>
                        {sowsNeeded} <span style={{ fontSize: 13, fontWeight: 500 }}>hd</span>
                      </p>
                      <span style={{ fontSize: 11, color: 'var(--muted-dark)' }}>~2 pigs/mo/sow</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    leftIcon={<Save size={15} />}
                    isLoading={isSubmitting}
                    disabled={!isDirty}
                    style={{ marginTop: 4, width: '100%' }}
                  >
                    Save Changes
                  </Button>
                </div>
              </Card>
            </div>
          </form>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={remove} />
    </ProtectedRoute>
  );
}
