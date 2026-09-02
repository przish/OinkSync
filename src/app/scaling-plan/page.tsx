'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Target, TrendingUp, ArrowLeft, CheckCircle } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { SkeletonCard } from '@/components/UI/Spinner';
import { formatCurrency } from '@/lib/utils/formatting';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { createClient } from '@/lib/supabase/client';

interface BusinessProfile {
  target_pig_count: number;
  expected_roi_percentage: number;
  monthly_payroll_budget: number;
}

export default function ScalingPlanPage() {
  const router = useRouter();
  const { scalingReadiness, isLoading, fetchScalingReadiness } = useAnalytics();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const supabase = createClient();
      const { data } = await supabase.from('business_profile').select('*').single();
      if (data) {
        setProfile(data as unknown as BusinessProfile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScalingReadiness();
    fetchProfile();
  }, [fetchScalingReadiness, fetchProfile]);

  const loading = isLoading || profileLoading;
  const isReady = scalingReadiness?.is_ready;

  return (
    <>
      <TopBar
        title="Scaling Plan"
        actions={
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={() => router.back()}>
            Back to Analytics
          </Button>
        }
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <SkeletonCard />
        ) : scalingReadiness && profile ? (
          <>
            <div style={{
              background: isReady
                ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                : 'linear-gradient(135deg, var(--secondary-green), #3d6b1f)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 40px',
              color: isReady ? 'var(--neutral-dark)' : 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 160, opacity: 0.1, userSelect: 'none' }}>
                {isReady ? '🎉' : '📈'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: isReady ? 'var(--success)' : 'var(--primary-beige)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isReady ? <CheckCircle size={24} color="white" /> : <Target size={24} color="var(--secondary-green)" />}
                </div>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800 }}>
                    {isReady ? 'Ready to Scale!' : 'Path to Expansion'}
                  </h2>
                  <p style={{ fontSize: 14, color: isReady ? '#374151' : 'rgba(255,255,255,0.85)' }}>
                    {scalingReadiness.recommendation}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid-cards">
              <Card>
                <CardHeader title="Target Metrics" icon={<Target size={18} color="var(--secondary-green)" />} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p className="metric-label">Target Capacity</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary-green)' }}>
                      {profile.target_pig_count} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted-dark)' }}>pigs</span>
                    </p>
                  </div>
                  <div>
                    <p className="metric-label">Target ROI</p>
                    <p style={{ fontSize: 28, fontWeight: 800 }}>
                      {profile.expected_roi_percentage}%
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Financial Requirements" icon={<TrendingUp size={18} color="var(--secondary-green)" />} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p className="metric-label">Required Capital</p>
                    <p style={{ fontSize: 28, fontWeight: 800 }}>
                      {formatCurrency(scalingReadiness.required_capital)}
                    </p>
                  </div>
                  {!isReady && (
                    <div>
                      <p className="metric-label">Current Gap</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--error)' }}>
                        {formatCurrency(scalingReadiness.gap_amount)}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader title="Timeline" icon={<TrendingUp size={18} color="var(--secondary-green)" />} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <p className="metric-label">Estimated Scale Date</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--secondary-green)' }}>
                      {scalingReadiness.projected_scale_date
                        ? new Date(scalingReadiness.projected_scale_date).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  {!isReady && (
                    <div>
                      <p className="metric-label">Status</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--warning)', marginTop: 4 }}>
                        Accumulating capital...
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Could not load scaling plan data.</p>
          </div>
        )}
      </div>
    </>
  );
}
