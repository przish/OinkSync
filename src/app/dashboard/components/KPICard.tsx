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
  variant?: 'default' | 'green' | 'gold' | 'beige' | 'income' | 'expense';
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

  const isIncome = variant === 'income' || label.toLowerCase().includes('revenue') || label.toLowerCase().includes('income');
  const isExpense = variant === 'expense' || label.toLowerCase().includes('expense');
  const isGreen = variant === 'green' && !isIncome;

  const cardVariant = isIncome || isExpense ? 'beige' : variant;

  const valueColor = isIncome
    ? 'var(--income-green)'
    : isExpense
      ? 'var(--expense-red)'
      : isGreen
        ? 'var(--palette-cream)'
        : 'var(--neutral-dark)';

  const labelColor = isGreen ? 'var(--palette-cream)' : 'var(--neutral-dark)';

  const trendColor = isGreen
    ? 'var(--palette-cream)'
    : trendPositive
      ? (isExpense ? 'var(--expense-red)' : 'var(--income-green)')
      : (isExpense ? 'var(--income-green)' : 'var(--expense-red)');

  const iconBg = isIncome
    ? 'var(--palette-cream)'
    : isExpense
      ? 'var(--palette-cream)'
      : isGreen
        ? 'rgba(255, 253, 236, 0.25)'
        : 'var(--palette-blush)';

  const iconBorder = isIncome
    ? '1px solid var(--palette-sage)'
    : isExpense
      ? '1px solid var(--palette-blush)'
      : isGreen
        ? '1px solid rgba(255, 253, 236, 0.4)'
        : '1px solid var(--palette-rose)';

  const iconColor = isIncome
    ? 'var(--income-green)'
    : isExpense
      ? 'var(--expense-red)'
      : isGreen
        ? 'var(--palette-cream)'
        : 'var(--palette-sage)';

  const cardStyle: React.CSSProperties = isIncome
    ? { border: '1.5px solid var(--palette-sage)', background: 'var(--palette-cream)' }
    : isExpense
      ? { border: '1.5px solid var(--palette-blush)', background: 'var(--palette-cream)' }
      : {};

  return (
    <Card variant={cardVariant} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p className="metric-label" style={{ color: labelColor, fontWeight: 700 }}>{label}</p>
        {icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: iconBg,
            border: iconBorder,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: iconColor,
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
          style={{ marginBottom: 8, color: valueColor }}
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
