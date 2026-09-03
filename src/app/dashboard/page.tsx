'use client';

import { useRouter } from 'next/navigation';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet, TrendingUp, PiggyBank, Receipt,
  Plus, Users,
} from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { KPICard } from './components/KPICard';
import { TransactionPreview } from './components/TransactionPreview';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { SkeletonCard } from '@/components/UI/Spinner';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils/formatting';
import { AddTransactionModal } from '@/components/Forms/AddTransactionModal';
import type { KpiData } from '@/types/api';

export default function DashboardPage() {
  const { user, isAdmin, canApprove } = useAuth();
  const { transactions, isLoading: txLoading, fetchTransactions, updateTransactionStatus, addTransaction } = useTransactions();
  const { kpi, isLoading: kpiLoading, fetchKpi } = useAnalytics();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [period, setPeriod] = useState('all');

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchKpi(period),
      fetchTransactions({ limit: 10 }),
    ]);
  }, [fetchKpi, fetchTransactions, period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    await updateTransactionStatus(id, { action: 'approve' });
    fetchTransactions({ limit: 10 });
    fetchKpi(period);
  };

  const handleReject = async (id: string) => {
    await updateTransactionStatus(id, { action: 'reject', rejection_reason: 'Rejected by admin' });
    fetchTransactions({ limit: 10 });
    fetchKpi(period);
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  // Safely extract first name: full_name may be an email (fallback case)
  const displayName = (() => {
    const name = user?.full_name ?? '';
    let extracted = 'there';
    if (name.includes('@')) {
      extracted = name.split('@')[0];
    } else if (name) {
      extracted = name.split(' ')[0];
    }
    return extracted.charAt(0).toUpperCase() + extracted.slice(1);
  })();

  return (
    <>
      <TopBar title="Dashboard" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Welcome header */}
        <div style={{
          background: 'var(--palette-sage)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          color: 'var(--palette-cream)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.1, userSelect: 'none' }}>🐷</div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--palette-cream)', fontWeight: 600 }}>
              {greeting}, {displayName} 👋
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: 'var(--palette-cream)' }}>
              Farm Overview
            </h2>
            <p style={{ fontSize: 13, color: 'var(--palette-cream)', opacity: 0.9, marginTop: 4 }}>
              {formatDate(today.toISOString())}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <label htmlFor="period-select" style={{ display: 'block', fontSize: 11, color: 'var(--palette-cream)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 }}>
                Period View
              </label>
              <select
                id="period-select"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  fetchKpi(e.target.value);
                }}
                style={{
                  background: 'var(--palette-cream)',
                  color: 'var(--neutral-dark)',
                  border: '1.5px solid var(--palette-blush)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>

            {kpi && (
              <div style={{ textAlign: 'right', borderLeft: '1.5px solid rgba(255, 253, 236, 0.4)', paddingLeft: 20 }}>
                <p style={{ fontSize: 11, color: 'var(--palette-cream)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Net Profit</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--palette-cream)' }}>
                  {formatCurrency(kpi.net_profit)}
                </p>
                <p style={{ fontSize: 12, color: 'var(--palette-cream)', opacity: 0.9, marginTop: 2 }}>
                  ROI: {formatPercentage(kpi.roi_percentage)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid-kpi">
          {kpiLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KPICard
                label="Total Capital"
                value={kpi?.total_capital ?? 0}
                icon={<PiggyBank size={18} />}
                variant="beige"
              />
              <KPICard
                label="Total Revenue"
                value={kpi?.total_revenue ?? 0}
                icon={<TrendingUp size={18} />}
                variant="green"
                trend={kpi?.revenue_change_percent ?? null}
              />
              <KPICard
                label="Active Pigs"
                value={kpi?.active_pig_count ?? 0}
                icon={<PiggyBank size={18} />}
                variant="gold"
                isCurrency={false}
                suffix=" hd"
              />
              <KPICard
                label="Total Expenses"
                value={kpi?.total_expenses ?? 0}
                icon={<Receipt size={18} />}
                variant="default"
                trend={kpi?.expense_change_percent ?? null}
              />
            </>
          )}
        </div>

        {/* Alerts */}
        {kpi && kpi.pending_transactions > 0 && isAdmin && (
          <div className="alert-banner">
            <Receipt size={20} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, marginBottom: 2 }}>
                {kpi.pending_transactions} transaction{kpi.pending_transactions > 1 ? 's' : ''} awaiting approval
              </p>
              <p className="text-small">Review and approve or reject pending transactions below.</p>
            </div>
            <Button variant="outline-green" size="sm" onClick={() => router.push('/transactions')}>Review Now</Button>
          </div>
        )}

        {/* Distribution Summary (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader
              title="Profit & Capital Distribution Policy"
              subtitle="Capital is equally contributed; operations profit is distributed by role performance"
              icon={<Users size={18} color="var(--secondary-green)" />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-rose)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--palette-blush)',
              }}>
                <p className="metric-label" style={{ color: 'var(--neutral-dark)', marginBottom: 4 }}>Pen Manager Work</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--neutral-dark)' }}>50% Share</p>
                <p style={{ fontSize: 11, color: 'var(--palette-sage)', marginTop: 4, fontWeight: 600 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-cream)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--palette-sage)',
              }}>
                <p className="metric-label" style={{ color: 'var(--neutral-dark)', marginBottom: 4 }}>General Manager</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--palette-sage)' }}>25% Share</p>
                <p style={{ fontSize: 11, color: 'var(--neutral-dark)', marginTop: 4, fontWeight: 600 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-cream)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--palette-sage)',
              }}>
                <p className="metric-label" style={{ color: 'var(--neutral-dark)', marginBottom: 4 }}>Logistics Team</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--palette-sage)' }}>25% Share</p>
                <p style={{ fontSize: 11, color: 'var(--neutral-dark)', marginTop: 4, fontWeight: 600 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-blush)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--palette-rose)',
              }}>
                <p className="metric-label" style={{ color: 'var(--neutral-dark)', marginBottom: 4 }}>Investor Pool</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--neutral-dark)' }}>Equal Share</p>
                <p style={{ fontSize: 11, color: 'var(--palette-sage)', marginTop: 4, fontWeight: 600 }}>Evenly across all members/investors</p>
              </div>
            </div>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader
            title="Recent Transactions"
            subtitle="Last 10 transactions"
            icon={<Receipt size={18} color="var(--secondary-green)" />}
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={15} />}
                onClick={() => setShowAddModal(true)}
              >
                Add Transaction
              </Button>
            }
          />
          <TransactionPreview
            transactions={transactions}
            isLoading={txLoading}
            canApprove={canApprove}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </Card>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data, receipt) => {
          const res = await addTransaction(data, receipt);
          if (!res.error) {
            fetchTransactions({ limit: 10 });
            setShowAddModal(false);
          }
          return res;
        }}
      />
    </>
  );
}
