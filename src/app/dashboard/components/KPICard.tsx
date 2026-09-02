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

  const textColor = variant === 'green' ? 'white' : variant === 'gold' ? 'var(--neutral-dark)' : undefined;
  const mutedColor = variant === 'green' ? 'rgba(255,255,255,0.7)' : '#6B7280';

  return (
    <Card variant={variant}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p className="metric-label" style={{ color: mutedColor }}>{label}</p>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: variant === 'green' ? 'rgba(255,255,255,0.15)' : 'rgba(45,80,22,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: variant === 'green' ? 'white' : 'var(--secondary-green)',
          }}>
            {icon}
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton height={32} width="75%" />
      ) : (
        <p
          className={`metric-value${variant === 'green' ? ' white' : variant === 'gold' ? ' dark' : ''}`}
          style={{ marginBottom: 8 }}
        >
          {prefix}{isCurrency && value !== null ? formatCurrency(value ?? 0) : (value ?? '—')}{suffix}
        </p>
      )}

      {trend !== undefined && trend !== null && !isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {trendPositive ? (
            <TrendingUp size={14} color={variant === 'green' ? '#bbf7d0' : '#2D7C2D'} />
          ) : trendNegative ? (
            <TrendingDown size={14} color={variant === 'green' ? '#fecaca' : '#C85C5C'} />
          ) : (
            <Minus size={14} color={variant === 'green' ? 'rgba(255,255,255,0.7)' : '#9CA3AF'} />
          )}
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: trendPositive
              ? (variant === 'green' ? '#bbf7d0' : '#2D7C2D')
              : trendNegative
                ? (variant === 'green' ? '#fecaca' : '#C85C5C')
                : (variant === 'green' ? 'rgba(255,255,255,0.7)' : '#9CA3AF'),
          }}>
            {formatTrendPercentage(trend)} vs last month
          </span>
        </div>
      )}
    </Card>
  );
}
