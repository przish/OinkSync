'use client';

import React from 'react';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrencyCompact, formatPercentage } from '@/lib/utils/formatting';

const COLORS = ['#2D5016', '#C4A57B', '#C85C5C', '#3B82F6', '#6B7280', '#3d6b1f', '#d4b890'];

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

export function PieChart({ data, height = 280 }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              `${formatCurrencyCompact(Number(value))} (${formatPercentage((Number(value) / total) * 100)})`,
              'Amount',
            ]}
            contentStyle={{
              borderRadius: 10, border: '1px solid var(--card-border)',
              fontSize: 13, fontWeight: 600,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}
