'use client';

import React from 'react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrencyCompact } from '@/lib/utils/formatting';

const CATEGORY_COLORS: Record<string, string> = {
  Feed: '#2D5016',
  Vitamins: '#3d6b1f',
  Infrastructure: '#C4A57B',
  Veterinary: '#C85C5C',
  Labor: '#6B7280',
  Transportation: '#3B82F6',
  Sales: '#2D7C2D',
};

interface BarChartProps {
  data: Array<{ category: string; total_amount: number; percentage_of_total?: number }>;
  height?: number;
  onBarClick?: (category: string) => void;
}

export function BarChart({ data, height = 280, onBarClick }: BarChartProps) {
  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrencyCompact(Number(value)), String(name)]}
            contentStyle={{
              borderRadius: 10, border: '1px solid var(--card-border)',
              fontSize: 13, fontWeight: 600,
            }}
            cursor={{ fill: 'rgba(245,230,211,0.5)' }}
          />
          <Bar
            dataKey="total_amount"
            name="Total Expenses"
            radius={[6, 6, 0, 0]}
            onClick={(d) => onBarClick?.((d as { category?: string }).category ?? '')}
            style={{ cursor: onBarClick ? 'pointer' : 'default' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.category}
                fill={CATEGORY_COLORS[entry.category] ?? '#C4A57B'}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
