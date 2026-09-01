'use client';

import React from 'react';
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrencyCompact, formatPercentage } from '@/lib/utils/formatting';

interface AreaChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
  areaKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  formatAsPercent?: boolean;
}

export function AreaChart({
  data,
  areaKey,
  xKey = 'month',
  color = '#2D5016',
  height = 280,
  formatAsPercent = false,
}: AreaChartProps) {
  const gradientId = `area-gradient-${areaKey}`;

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReAreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatAsPercent ? formatPercentage(v) : formatCurrencyCompact(v)}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) =>
              formatAsPercent ? formatPercentage(Number(value)) : formatCurrencyCompact(Number(value))
            }
            contentStyle={{
              borderRadius: 10, border: '1px solid var(--card-border)',
              fontSize: 13, fontWeight: 600,
            }}
          />
          <Area
            type="monotone"
            dataKey={areaKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
