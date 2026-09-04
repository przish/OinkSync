'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Download, TrendingUp, TrendingDown, Calendar, Eye } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { SkeletonCard } from '@/components/UI/Spinner';
import { formatCurrency, formatPercentage, formatMonthYear, formatDate } from '@/lib/utils/formatting';
import { MonthlyDetailModal } from './components/MonthlyDetailModal';
import { createClient } from '@/lib/supabase/client';

interface MonthlyReport {
  month: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  roi_percentage: number;
  animals_sold: number;
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Comprehensive Month Detail Modal State
  const [selectedMonthData, setSelectedMonthData] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Discover all years with actual recorded transactions or activity
  useEffect(() => {
    async function loadYears() {
      try {
        const supabase = createClient();
        const { data: txList } = await supabase
          .from('transactions')
          .select('transaction_date')
          .eq('status', 'approved');

        const yearsSet = new Set<number>();
        (txList || []).forEach((tx) => {
          if (tx.transaction_date) {
            const yr = new Date(tx.transaction_date).getFullYear();
            if (!isNaN(yr)) yearsSet.add(yr);
          }
        });

        // Also check if any monthly_analytics have recorded activity
        const { data: analyticsList } = await supabase
          .from('monthly_analytics')
          .select('analytics_month, total_revenue, total_expenses');

        (analyticsList || []).forEach((row) => {
          if (row.analytics_month && (Number(row.total_revenue) > 0 || Number(row.total_expenses) > 0)) {
            const yr = new Date(row.analytics_month).getFullYear();
            if (!isNaN(yr)) yearsSet.add(yr);
          }
        });

        const sorted = Array.from(yearsSet).sort((a, b) => b - a);
        const resolvedYears = sorted.length > 0 ? sorted : [currentYear];
        setAvailableYears(resolvedYears);

        if (!yearsSet.has(selectedYear) && sorted.length > 0) {
          setSelectedYear(sorted[0]);
        }
      } catch {
        setAvailableYears([currentYear]);
      }
    }
    loadYears();
  }, [currentYear, selectedYear]);

  // Fetch only months that have actual logged reports/data for selectedYear
  const fetchReports = useCallback(async (year: number) => {
    setIsLoading(true);
    try {
      const promises = Array.from({ length: 12 }).map(async (_, i) => {
        const monthNum = String(i + 1).padStart(2, '0');
        const monthStr = `${year}-${monthNum}-01`;
        const res = await fetch(`/api/reports/monthly-summary?month=${monthStr}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.analytics) {
            const rev = Number(json.data.analytics?.total_revenue) || 0;
            const exp = Number(json.data.analytics?.total_expenses) || 0;
            const txCount = json.data.transactions?.length || 0;

            // Only return month if there is actual logged activity (transactions or financial numbers)
            if (rev > 0 || exp > 0 || txCount > 0) {
              return {
                month: json.data.month,
                total_revenue: rev,
                total_expenses: exp,
                net_profit: json.data.analytics?.net_profit ?? (rev - exp),
                roi_percentage: json.data.analytics?.roi_percentage ?? 0,
                animals_sold: json.data.analytics?.animals_sold ?? 0,
              };
            }
          }
        }
        return null;
      });

      const results = await Promise.all(promises);
      const validReports = results.filter((r): r is MonthlyReport => r !== null);
      // Sort newest month first
      validReports.sort((a, b) => b.month.localeCompare(a.month));
      setReports(validReports);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(selectedYear);
  }, [fetchReports, selectedYear]);

  // Open detailed monthly view
  const handleCardClick = async (monthStr: string) => {
    setShowDetailModal(true);
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly-summary?month=${monthStr}`);
      const json = await res.json();
      if (json.data) {
        setSelectedMonthData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Download 1-month PDF directly
  const handleDownloadMonthPDF = (e: React.MouseEvent, report: MonthlyReport) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Financial Report — ${formatMonthYear(report.month)}</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 36px; color: #182B1D; }
            h1 { font-size: 24px; color: #3D5C40; margin-bottom: 6px; }
            .badge { display: inline-block; padding: 4px 10px; background: #86A788; color: white; border-radius: 4px; font-weight: bold; }
            .grid { display: flex; gap: 16px; margin: 24px 0; }
            .card { flex: 1; padding: 16px; background: #FFFDEC; border: 1.5px solid #86A788; border-radius: 8px; }
            .label { font-size: 11px; text-transform: uppercase; color: #555; }
            .value { font-size: 20px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          <h1>Monthly Performance Statement</h1>
          <p class="badge">${formatMonthYear(report.month)}</p>
          <div class="grid">
            <div class="card">
              <div class="label">Total Revenue</div>
              <div class="value" style="color: #166534;">${formatCurrency(report.total_revenue)}</div>
            </div>
            <div class="card">
              <div class="label">Total Expenses</div>
              <div class="value" style="color: #991B1B;">${formatCurrency(report.total_expenses)}</div>
            </div>
            <div class="card">
              <div class="label">Net Profit</div>
              <div class="value" style="color: ${report.net_profit >= 0 ? '#166534' : '#991B1B'};">
                ${formatCurrency(report.net_profit)}
              </div>
            </div>
            <div class="card">
              <div class="label">Monthly ROI</div>
              <div class="value">${formatPercentage(report.roi_percentage)}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Download Consolidated 12-Month Annual Report PDF
  const handleDownloadAnnualPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const totalRev = reports.reduce((acc, r) => acc + r.total_revenue, 0);
    const totalExp = reports.reduce((acc, r) => acc + r.total_expenses, 0);
    const totalProfit = totalRev - totalExp;
    const avgRoi = totalExp > 0 ? ((totalProfit / totalExp) * 100) : 0;

    const rows = [...reports].reverse().map((r) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; font-weight: bold;">${formatMonthYear(r.month)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: right; color: #166534;">${formatCurrency(r.total_revenue)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: right; color: #991B1B;">${formatCurrency(r.total_expenses)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: ${r.net_profit >= 0 ? '#166534' : '#991B1B'};">
          ${formatCurrency(r.net_profit)}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: right;">${formatPercentage(r.roi_percentage)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Annual Financial Report — ${selectedYear}</title>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 36px; color: #182B1D; }
            h1 { font-size: 24px; color: #3D5C40; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
            th { background: #86A788; color: white; padding: 10px 12px; text-align: left; }
            .annual-summary { display: flex; gap: 16px; margin: 20px 0; }
            .box { flex: 1; padding: 14px; background: #FFFDEC; border: 1.5px solid #86A788; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>12-Month Annual Financial Statement — Year ${selectedYear}</h1>
          <p style="color: #666; font-size: 13px;">OinkSync Farm Operational Analytics</p>

          <div class="annual-summary">
            <div class="box">
              <div style="font-size: 11px; text-transform: uppercase;">Annual Revenue</div>
              <div style="font-size: 20px; font-weight: bold; color: #166534; margin-top: 4px;">${formatCurrency(totalRev)}</div>
            </div>
            <div class="box">
              <div style="font-size: 11px; text-transform: uppercase;">Annual Expenses</div>
              <div style="font-size: 20px; font-weight: bold; color: #991B1B; margin-top: 4px;">${formatCurrency(totalExp)}</div>
            </div>
            <div class="box">
              <div style="font-size: 11px; text-transform: uppercase;">Annual Net Profit</div>
              <div style="font-size: 20px; font-weight: bold; color: ${totalProfit >= 0 ? '#166534' : '#991B1B'}; margin-top: 4px;">${formatCurrency(totalProfit)}</div>
            </div>
            <div class="box">
              <div style="font-size: 11px; text-transform: uppercase;">Average ROI</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 4px;">${formatPercentage(avgRoi)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: right;">Revenue</th>
                <th style="text-align: right;">Expenses</th>
                <th style="text-align: right;">Net Profit</th>
                <th style="text-align: right;">ROI</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      <TopBar title="Reports" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header with Year Selector & 12-Month Annual Export */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--palette-cream)',
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20, margin: 0, color: 'var(--neutral-dark)' }}>
                Financial Reports — Year {selectedYear}
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  background: 'var(--palette-rose)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#883333',
                }}
              >
                Viewing Year {selectedYear}
              </span>
            </div>
            <p style={{ color: 'var(--muted-dark)', fontSize: 13, marginTop: 4, margin: '4px 0 0' }}>
              Click any month card to inspect detailed itemized transactions and uploaded receipts.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Year Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="var(--secondary-green)" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  background: 'white',
                  border: '1.5px solid var(--card-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--neutral-dark)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* 12-Month Annual Report Button */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleDownloadAnnualPDF}
            >
              Download 12-Month PDF
            </Button>
          </div>
        </div>

        {/* Monthly Report Cards Grid */}
        <div className="grid-cards">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : reports.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '56px 24px',
                background: 'var(--palette-cream)',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px dashed var(--palette-sage)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--palette-rose)',
                  border: '1.5px solid var(--palette-blush)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  color: 'var(--secondary-green)',
                }}
              >
                <FileText size={26} color="var(--secondary-green)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-dark)', margin: 0 }}>
                No Reports Logged Yet
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted-dark)', maxWidth: 400, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                There are no financial statements or transactions recorded for {selectedYear}. Once transactions are logged and approved, monthly summaries will automatically generate here.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const isProfit = report.net_profit >= 0;
              return (
                <div
                  key={report.month}
                  className="card"
                  onClick={() => handleCardClick(report.month)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-xl)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--neutral-dark)' }}>
                        {formatMonthYear(report.month)}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 2 }}>
                        Click to view full breakdown & receipts
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '4px 10px',
                        background: isProfit ? 'rgba(42, 104, 48, 0.1)' : 'rgba(186, 60, 60, 0.1)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                        {formatPercentage(report.roi_percentage)} ROI
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: 12, background: 'rgba(42, 104, 48, 0.07)', borderRadius: 'var(--radius-md)' }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Revenue</p>
                      <p style={{ fontWeight: 800, color: 'var(--success)', fontSize: 15 }}>
                        {formatCurrency(report.total_revenue)}
                      </p>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(186, 60, 60, 0.07)', borderRadius: 'var(--radius-md)' }}>
                      <p className="metric-label" style={{ marginBottom: 4 }}>Expenses</p>
                      <p style={{ fontWeight: 800, color: 'var(--error)', fontSize: 15 }}>
                        {formatCurrency(report.total_expenses)}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      background: isProfit ? 'var(--palette-cream)' : 'rgba(186, 60, 60, 0.08)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isProfit ? 'rgba(134, 167, 136, 0.4)' : 'rgba(186, 60, 60, 0.2)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isProfit ? <TrendingUp size={15} color="var(--success)" /> : <TrendingDown size={15} color="var(--error)" />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-dark)' }}>Net Profit</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                      {isProfit ? '+' : ''}{formatCurrency(report.net_profit)}
                    </span>
                  </div>

                  {/* Actions: View Details & Working PDF Download */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Eye size={13} />}
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(report.month);
                      }}
                    >
                      View Report
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Download size={13} />}
                      style={{ flex: 1 }}
                      onClick={(e) => handleDownloadMonthPDF(e, report)}
                    >
                      PDF
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comprehensive Monthly Statement & Receipts Modal */}
      <MonthlyDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={selectedMonthData}
        isLoading={isDetailLoading}
      />
    </>
  );
}
