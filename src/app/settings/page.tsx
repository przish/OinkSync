'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Save, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import type { BusinessProfile } from '@/types/database';

export default function SettingsPage() {
  const { toasts, toast, remove } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
  });

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('business_profiles').select('*').single();
    if (data) {
      const p = data as unknown as BusinessProfile;
      setProfile(p);
      reset({
        total_capital: p.total_capital,
        target_pig_count: p.target_pig_count,
        cost_per_pig_rearing: p.cost_per_pig_rearing,
        expected_sale_price_per_pig: p.expected_sale_price_per_pig,
        expected_roi_percentage: p.expected_roi_percentage,
        monthly_payroll_budget: p.monthly_payroll_budget,
      });
    }
  }, [reset]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onSubmit = async (data: BusinessSettingsFormValues) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('business_profiles')
      .update({
        total_capital: data.total_capital,
        target_pig_count: data.target_pig_count,
        cost_per_pig_rearing: data.cost_per_pig_rearing,
        expected_sale_price_per_pig: data.expected_sale_price_per_pig,
        expected_roi_percentage: data.expected_roi_percentage,
        monthly_payroll_budget: data.monthly_payroll_budget,
      })
      .eq('id', profile?.id ?? '');

    if (error) toast.error('Failed to save settings');
    else { toast.success('Settings saved!'); fetchProfile(); }
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

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
        <Card>
          <CardHeader
            title="Business Profile"
            subtitle={profile?.business_name ?? 'PiggyTrack Farm'}
            icon={<Settings size={18} color="var(--secondary-green)" />}
          />

          <form style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
            <div className="form-grid form-grid-2">
              <FormField label="Total Capital (₱)" htmlFor="s-capital" error={errors.total_capital?.message} required>
                <input
                  id="s-capital"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.total_capital ? ' error' : ''}`}
                  {...register('total_capital', { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Monthly Payroll Budget (₱)" htmlFor="s-payroll" error={errors.monthly_payroll_budget?.message} required>
                <input
                  id="s-payroll"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.monthly_payroll_budget ? ' error' : ''}`}
                  {...register('monthly_payroll_budget', { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <div className="divider" />

            <h4 style={{ color: 'var(--secondary-green)' }}>Scaling Targets</h4>

            <div className="form-grid form-grid-2">
              <FormField label="Target Pig Count" htmlFor="s-pigs" error={errors.target_pig_count?.message} required>
                <input
                  id="s-pigs"
                  type="number"
                  className={`form-input${errors.target_pig_count ? ' error' : ''}`}
                  {...register('target_pig_count', { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Cost Per Pig Rearing (₱)" htmlFor="s-cost" error={errors.cost_per_pig_rearing?.message} required>
                <input
                  id="s-cost"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.cost_per_pig_rearing ? ' error' : ''}`}
                  {...register('cost_per_pig_rearing', { valueAsNumber: true })}
                />
              </FormField>
            </div>

            <div className="form-grid form-grid-2">
              <FormField label="Expected Sale Price Per Pig (₱)" htmlFor="s-sale" error={errors.expected_sale_price_per_pig?.message} required>
                <input
                  id="s-sale"
                  type="number"
                  step="0.01"
                  className={`form-input${errors.expected_sale_price_per_pig ? ' error' : ''}`}
                  {...register('expected_sale_price_per_pig', { valueAsNumber: true })}
                />
              </FormField>

              <FormField label="Expected ROI (%)" htmlFor="s-roi" error={errors.expected_roi_percentage?.message} required>
                <input
                  id="s-roi"
                  type="number"
                  step="0.1"
                  className={`form-input${errors.expected_roi_percentage ? ' error' : ''}`}
                  {...register('expected_roi_percentage', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </form>
        </Card>

        {/* Capital contributions breakdown */}
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
