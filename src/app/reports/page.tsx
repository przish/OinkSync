'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { SkeletonCard } from '@/components/UI/Spinner';
import { formatCurrency, formatPercentage, formatMonthYear } from '@/lib/utils/formatting';

interface MonthlyReport {
  month: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  roi_percentage: number;
  animals_sold: number;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      // The API only accepts a single month, so we fetch the last 12 months individually
      const reportsList: MonthlyReport[] = [];
      const now = new Date();
      
      const promises = Array.from({ length: 12 }).map(async (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const res = await fetch(`/api/reports/monthly-summary?month=${monthStr}`);
        if (res.ok) {
          const json = await res.json();
          // The API returns the report wrapped in a MonthlySummaryReport object
          if (json.data && json.data.analytics) {
            return {
              month: json.data.month,
              total_revenue: json.data.analytics.total_revenue,
              total_expenses: json.data.analytics.total_expenses,
              net_profit: json.data.analytics.net_profit,
              roi_percentage: json.data.analytics.roi_percentage,
              animals_sold: json.data.analytics.animals_sold,
            };
          }
        }
        return null;
      });

      const results = await Promise.all(promises);
      const validReports = results.filter((r): r is MonthlyReport => r !== null && (r.total_revenue > 0 || r.total_expenses > 0));
      setReports(validReports);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <>
      <TopBar title="Reports" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700 }}>Monthly Reports</h2>
            <p style={{ color: '#4B5563', fontSize: 14, marginTop: 4 }}>Last 12 months financial summary</p>
          </div>
        </div>

        <div className="grid-cards">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : reports.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon"><FileText size={28} color="#4B5563" /></div>
              <p style={{ fontWeight: 600, marginTop: 8 }}>No reports yet</p>
              <p className="text-small text-muted">Monthly analytics will appear here as data accumulates</p>
            </div>
          ) : (
            reports.map((report) => {
              const isProfit = report.net_profit >= 0;
              return (
                <div key={report.month} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--neutral-dark)' }}>
                        {formatMonthYear(report.month)}
                      </p>
                      <p style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }}>
                        {report.animals_sold ?? 0} animals sold
                      </p>
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      background: isProfit ? 'rgba(45,124,45,0.1)' : 'rgba(200,92,92,0.1)',
                      borderRadius: 'var(--radius-full)',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                        {formatPercentage(report.roi_percentage)} ROI
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 12, background: 'rgba(45,124,45,0.06)', borderRadius: 8 }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Revenue</p>
                      <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>{formatCurrency(report.total_revenue)}</p>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(200,92,92,0.06)', borderRadius: 8 }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Expenses</p>
                      <p style={{ fontWeight: 700, color: 'var(--error)', fontSize: 15 }}>{formatCurrency(report.total_expenses)}</p>
                    </div>
                  </div>

                  <div style={{
                    padding: '12px 14px',
                    background: isProfit ? 'rgba(45,80,22,0.06)' : 'rgba(200,92,92,0.06)',
                    borderRadius: 10, border: `1px solid ${isProfit ? 'rgba(45,80,22,0.15)' : 'rgba(200,92,92,0.15)'}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isProfit ? <TrendingUp size={14} color="var(--success)" /> : <TrendingDown size={14} color="var(--error)" />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>Net Profit</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                      {isProfit ? '+' : ''}{formatCurrency(report.net_profit)}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download size={13} />}
                    style={{ width: '100%' }}
                  >
                    Download PDF
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
