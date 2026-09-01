'use client';

import React from 'react';
import { TrendingUp, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/UI/Button';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatting';
import type { ScalingReadiness } from '@/types/api';

interface ScalingRecommendationProps {
  data: ScalingReadiness;
}

export function ScalingRecommendation({ data }: ScalingRecommendationProps) {
  const isReady = data.is_ready;

  return (
    <div style={{
      background: isReady
        ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
        : 'linear-gradient(135deg, #FEF3C7, #fde68a)',
      borderRadius: 'var(--radius-xl)',
      padding: '24px 28px',
      border: `2px solid ${isReady ? 'var(--success)' : 'var(--tertiary-gold)'}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -10, top: -10,
        fontSize: 100, opacity: 0.08, userSelect: 'none',
      }}>
        {isReady ? '🚀' : '🐷'}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: isReady ? 'var(--success)' : 'var(--tertiary-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isReady
              ? <CheckCircle size={24} color="white" />
              : <Target size={24} color="var(--neutral-dark)" />
            }
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--neutral-dark)', marginBottom: 6 }}>
              {isReady ? '🎉 Ready to Scale!' : 'Scaling Plan'}
            </h3>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, maxWidth: 480 }}>
              {data.recommendation}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Target Pigs</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--secondary-green)' }}>{data.target_pig_count}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Required Capital</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--neutral-dark)' }}>{formatCurrency(data.required_capital)}</p>
              </div>
              {!isReady && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Gap Amount</p>
                  <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--error)' }}>{formatCurrency(data.gap_amount)}</p>
                </div>
              )}
              {data.projected_scale_date && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280' }}>Est. Scale Date</p>
                  <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--secondary-green)' }}>
                    {new Date(data.projected_scale_date).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button variant={isReady ? 'primary' : 'secondary'} leftIcon={<TrendingUp size={15} />}>
          {isReady ? 'Start Scaling' : 'View Plan'}
        </Button>
      </div>
    </div>
  );
}
