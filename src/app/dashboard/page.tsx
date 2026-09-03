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
          background: 'linear-gradient(135deg, #4E6E50, #86A788)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.1, userSelect: 'none' }}>🐷</div>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              {greeting}, {displayName} 👋
            </p>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: 'white' }}>
              Farm Overview
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
              {formatDate(today.toISOString())}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'right' }}>
              <label htmlFor="period-select" style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 600 }}>
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
                  background: 'rgba(0, 0, 0, 0.25)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all" style={{ background: '#223726', color: '#fff' }}>All Time</option>
                <option value="this_month" style={{ background: '#223726', color: '#fff' }}>This Month</option>
                <option value="last_month" style={{ background: '#223726', color: '#fff' }}>Last Month</option>
                <option value="ytd" style={{ background: '#223726', color: '#fff' }}>Year to Date</option>
              </select>
            </div>

            {kpi && (
              <div style={{ textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Net Profit</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: kpi.net_profit >= 0 ? '#bbf7d0' : '#fecaca' }}>
                  {formatCurrency(kpi.net_profit)}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
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
                border: '1px solid rgba(255, 207, 207, 0.8)',
              }}>
                <p className="metric-label" style={{ color: '#883333', marginBottom: 4 }}>Pen Manager Work</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--neutral-dark)' }}>50% Share</p>
                <p style={{ fontSize: 11, color: '#6B4444', marginTop: 4 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-cream)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(134, 167, 136, 0.4)',
              }}>
                <p className="metric-label" style={{ marginBottom: 4 }}>General Manager</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--secondary-green)' }}>25% Share</p>
                <p style={{ fontSize: 11, color: '#4A584E', marginTop: 4 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-cream)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(134, 167, 136, 0.4)',
              }}>
                <p className="metric-label" style={{ marginBottom: 4 }}>Logistics Team</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--secondary-green)' }}>25% Share</p>
                <p style={{ fontSize: 11, color: '#4A584E', marginTop: 4 }}>From operational profit share</p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'var(--palette-blush)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(235, 175, 175, 0.7)',
              }}>
                <p className="metric-label" style={{ color: '#883333', marginBottom: 4 }}>Investor Pool</p>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--neutral-dark)' }}>Equal Share</p>
                <p style={{ fontSize: 11, color: '#6B4444', marginTop: 4 }}>Evenly across all members/investors</p>
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
