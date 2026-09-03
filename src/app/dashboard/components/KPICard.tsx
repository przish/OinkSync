'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/UI/Card';
import { Skeleton } from '@/components/UI/Spinner';
import { formatCurrency, formatTrendPercentage } from '@/lib/utils/formatting';

interface KPICardProps {
  label: string;
  value: number | null;
  trend?: number | null;
  icon?: React.ReactNode;
  variant?: 'default' | 'green' | 'gold' | 'beige';
  isLoading?: boolean;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
}

export function KPICard({
  label,
  value,
  trend,
  icon,
  variant = 'default',
  isLoading = false,
  prefix,
  suffix,
  isCurrency = true,
}: KPICardProps) {
  const trendPositive = trend !== null && trend !== undefined && trend > 0;
  const trendNegative = trend !== null && trend !== undefined && trend < 0;

  const isGreen = variant === 'green';
  const mutedColor = isGreen ? 'var(--palette-cream)' : 'var(--palette-sage)';
  const trendColor = isGreen
    ? 'var(--palette-cream)'
    : trendPositive
      ? 'var(--palette-sage)'
      : 'var(--palette-blush)';

  return (
    <Card variant={variant}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p className="metric-label" style={{ color: mutedColor, fontWeight: 700 }}>{label}</p>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: isGreen ? 'rgba(255, 253, 236, 0.25)' : 'var(--palette-blush)',
            border: `1px solid ${isGreen ? 'rgba(255, 253, 236, 0.4)' : 'var(--palette-rose)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isGreen ? 'var(--palette-cream)' : 'var(--palette-sage)',
          }}>
            {icon}
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton height={32} width="75%" />
      ) : (
        <p
          className={`metric-value${isGreen ? ' white' : ''}`}
          style={{ marginBottom: 8, color: isGreen ? 'var(--palette-cream)' : 'var(--neutral-dark)' }}
        >
          {prefix}{isCurrency && value !== null ? formatCurrency(value ?? 0) : (value ?? '—')}{suffix}
        </p>
      )}

      {trend !== undefined && trend !== null && !isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {trendPositive ? (
            <TrendingUp size={14} color={trendColor} />
          ) : trendNegative ? (
            <TrendingDown size={14} color={trendColor} />
          ) : (
            <Minus size={14} color={trendColor} />
          )}
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: trendColor,
          }}>
            {formatTrendPercentage(trend)} vs last month
          </span>
        </div>
      )}
    </Card>
  );
}
