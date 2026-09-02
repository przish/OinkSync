'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Tabs } from '@/components/UI/Tabs';
import { SkeletonCard } from '@/components/UI/Spinner';
import { ScalingRecommendation } from './components/ScalingRecommendation';
import { LineChart } from '@/components/Charts/LineChart';
import { BarChart } from '@/components/Charts/BarChart';
import { AreaChart } from '@/components/Charts/AreaChart';
import { useAnalytics, type TimeRange } from '@/lib/hooks/useAnalytics';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatting';
import { BarChart3, TrendingUp, DollarSign, PiggyBank } from 'lucide-react';

const TIME_RANGE_TABS = [
  { label: '6 Months', value: '6mo' },
  { label: '1 Year', value: '1yr' },
  { label: '2 Years', value: '2yr' },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1yr');
  const { kpi, revenueExpense, expenseBreakdown, roiTrend, scalingReadiness, isLoading, fetchAll } = useAnalytics();

  const load = useCallback(() => fetchAll(timeRange), [fetchAll, timeRange]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <TopBar title="Analytics" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Time range selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Tabs
            tabs={TIME_RANGE_TABS}
            value={timeRange}
            onChange={(v) => setTimeRange(v as TimeRange)}
            style={{ width: 'auto' }}
          />
        </div>

        {/* Scaling Recommendation */}
        {isLoading ? (
          <SkeletonCard />
        ) : scalingReadiness ? (
          <ScalingRecommendation data={scalingReadiness} />
        ) : null}

        {/* Key Metrics */}
        <div className="grid-kpi">
          {[
            {
              label: 'Profit Margin',
              value: kpi ? formatPercentage(kpi.roi_percentage) : '—',
              icon: <TrendingUp size={18} />,
              color: 'var(--success)',
            },
            {
              label: 'Total Revenue',
              value: kpi ? formatCurrency(kpi.total_revenue) : '—',
              icon: <DollarSign size={18} />,
              color: 'var(--secondary-green)',
            },
            {
              label: 'Total Expenses',
              value: kpi ? formatCurrency(kpi.total_expenses) : '—',
              icon: <BarChart3 size={18} />,
              color: 'var(--error)',
            },
            {
              label: 'Mortality Rate',
              value: kpi ? formatPercentage(kpi.mortality_rate) : '—',
              icon: <PiggyBank size={18} />,
              color: kpi && kpi.mortality_rate > 5 ? 'var(--error)' : 'var(--success)',
            },
          ].map((metric) => (
            <div key={metric.label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="metric-label">{metric.label}</p>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${metric.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: metric.color,
                }}>
                  {metric.icon}
                </div>
              </div>
              {isLoading
                ? <div className="skeleton" style={{ height: 28, width: '70%' }} />
                : <p style={{ fontSize: 24, fontWeight: 800, color: metric.color }}>{metric.value}</p>
              }
            </div>
          ))}
        </div>

        {/* Revenue vs Expenses Chart */}
        <Card>
          <CardHeader
            title="Revenue vs Expenses"
            subtitle="Monthly comparison"
            icon={<TrendingUp size={18} color="var(--secondary-green)" />}
          />
          {isLoading ? (
            <div className="skeleton" style={{ height: 280 }} />
          ) : (
            <LineChart
              data={revenueExpense}
              xKey="month"
              lines={[
                { key: 'revenue', label: 'Revenue', color: '#2D7C2D' },
                { key: 'expenses', label: 'Expenses', color: '#C85C5C' },
                { key: 'net_profit', label: 'Net Profit', color: '#C4A57B' },
              ]}
            />
          )}
        </Card>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Expense Breakdown */}
          <Card>
            <CardHeader
              title="Expense Breakdown"
              subtitle="By category"
              icon={<BarChart3 size={18} color="var(--secondary-green)" />}
            />
            {isLoading ? (
              <div className="skeleton" style={{ height: 280 }} />
            ) : (
              <BarChart data={expenseBreakdown} />
            )}
          </Card>

          {/* ROI Trend */}
          <Card>
            <CardHeader
              title="ROI Trend"
              subtitle="Return on investment over time"
              icon={<TrendingUp size={18} color="var(--secondary-green)" />}
            />
            {isLoading ? (
              <div className="skeleton" style={{ height: 280 }} />
            ) : (
              <AreaChart
                data={roiTrend}
                areaKey="roi_percentage"
                xKey="month"
                color="#2D5016"
                formatAsPercent
              />
            )}
          </Card>
        </div>

        {/* Expense table */}
        {expenseBreakdown.length > 0 && (
          <Card>
            <CardHeader title="Expense Category Breakdown" subtitle="Detailed view" />
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Total Amount</th>
                    <th># Transactions</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseBreakdown.map((item) => (
                    <tr key={item.category}>
                      <td style={{ fontWeight: 600 }}>{item.category}</td>
                      <td style={{ fontWeight: 700, color: 'var(--error)' }}>
                        {formatCurrency(item.total_amount)}
                      </td>
                      <td style={{ color: '#4B5563' }}>{item.transaction_count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            flex: 1, height: 6, background: 'var(--primary-beige)',
                            borderRadius: 'var(--radius-full)', overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${item.percentage_of_total}%`,
                              background: 'var(--secondary-green)',
                              borderRadius: 'var(--radius-full)',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>
                            {formatPercentage(item.percentage_of_total)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
