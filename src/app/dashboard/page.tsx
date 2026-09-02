'use client';

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
import type { KpiData } from '@/types/api';

export default function DashboardPage() {
  const { user, isAdmin, canApprove } = useAuth();
  const { transactions, isLoading: txLoading, fetchTransactions, updateTransactionStatus } = useTransactions();
  const { kpi, isLoading: kpiLoading, fetchKpi } = useAnalytics();
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchKpi(),
      fetchTransactions({ limit: 10 }),
    ]);
  }, [fetchKpi, fetchTransactions]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    await updateTransactionStatus(id, { action: 'approve' });
    fetchTransactions({ limit: 10 });
  };

  const handleReject = async (id: string) => {
    await updateTransactionStatus(id, { action: 'reject', rejection_reason: 'Rejected by admin' });
    fetchTransactions({ limit: 10 });
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <TopBar
        title="Dashboard"
        actions={
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

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Welcome header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--secondary-green), #3d6b1f)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 120, opacity: 0.08, userSelect: 'none' }}>🐷</div>
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {greeting}, {user?.full_name?.split(' ')[0]} 👋
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: 'white' }}>
              Farm Overview
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              {formatDate(today.toISOString())}
            </p>
          </div>
          {kpi && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Net Profit</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: kpi.net_profit >= 0 ? '#bbf7d0' : '#fecaca' }}>
                {formatCurrency(kpi.net_profit)}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                ROI: {formatPercentage(kpi.roi_percentage)}
              </p>
            </div>
          )}
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
                icon={<Wallet size={18} />}
                variant="beige"
                trend={null}
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
                trend={null}
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
            <Button variant="outline-green" size="sm">Review Now</Button>
          </div>
        )}

        {/* Investor Summary (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader
              title="Capital Overview"
              subtitle="Investment contributions by role"
              icon={<Users size={18} color="var(--secondary-green)" />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {[
                { role: 'GM (Admin)', amount: kpi?.total_capital ? kpi.total_capital * 0.4 : null },
                { role: 'Logistics', amount: kpi?.total_capital ? kpi.total_capital * 0.3 : null },
                { role: 'Pen Manager', amount: kpi?.total_capital ? kpi.total_capital * 0.1 : null },
                { role: 'Investors', amount: kpi?.total_capital ? kpi.total_capital * 0.2 : null },
              ].map((item) => (
                <div key={item.role} style={{
                  padding: '14px 16px',
                  background: 'var(--primary-beige)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <p className="metric-label" style={{ marginBottom: 6 }}>{item.role}</p>
                  <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--secondary-green)' }}>
                    {item.amount !== null ? formatCurrency(item.amount) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader
            title="Recent Transactions"
            subtitle="Last 10 transactions"
            icon={<Receipt size={18} color="var(--secondary-green)" />}
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
    </>
  );
}
