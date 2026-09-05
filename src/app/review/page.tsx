'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckSquare, Search, CheckCircle, XCircle, FileText,
  ExternalLink, Clock, AlertTriangle, Filter, Eye, Download, X,
  ArrowUpRight, ArrowDownRight, RefreshCw, ShieldAlert, Lock
} from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Badge } from '@/components/UI/Badge';
import { Tabs } from '@/components/UI/Tabs';
import { SkeletonCard, Spinner } from '@/components/UI/Spinner';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/formatting';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/toast';
import type { TransactionWithUser } from '@/types/api';

type ReviewStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_TABS = [
  { label: 'Needs Review', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All Transactions', value: 'all' },
];

const REJECTION_PRESETS = [
  'Receipt is illegible or blurry',
  'Amount does not match uploaded receipt',
  'Missing official proof of payment',
  'Duplicate submission',
];

export default function AdminReviewPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReviewStatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal states
  const [inspectReceiptUrl, setInspectReceiptUrl] = useState<string | null>(null);
  const [inspectReceiptTitle, setInspectReceiptTitle] = useState<string>('');
  const [rejectingTx, setRejectingTx] = useState<TransactionWithUser | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionTxId, setActionTxId] = useState<string | null>(null);

  // Fetch transactions
  const fetchReviewTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions?limit=100&sort_by=created_at&sort_order=desc');
      if (!res.ok) throw new Error('Failed to fetch transactions for review');
      const json = await res.json();
      const rawList = json.data?.data ?? json.data ?? [];
      setTransactions(Array.isArray(rawList) ? rawList : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load review items'));
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    } else if (isAdmin) {
      fetchReviewTransactions();
    }
  }, [authLoading, isAdmin, router, fetchReviewTransactions]);

  // Approval handler
  const handleApprove = async (tx: TransactionWithUser) => {
    setActionTxId(tx.id);
    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to approve transaction');
      }
      toast.success(`Transaction of ${formatCurrency(tx.amount)} approved`);
      await fetchReviewTransactions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve'));
    } finally {
      setIsSubmittingAction(false);
      setActionTxId(null);
    }
  };

  // Reject confirmation
  const handleConfirmReject = async () => {
    if (!rejectingTx) return;
    if (!rejectionReason.trim()) {
      toast.error('Please specify a rejection reason');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/transactions/${rejectingTx.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reject transaction');
      }
      toast.success('Transaction rejected');
      setRejectingTx(null);
      setRejectionReason('');
      await fetchReviewTransactions();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to reject'));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper to check 3-hour edit status for member contributions
  const get3HourStatus = (createdAtStr?: string, category?: string, description?: string) => {
    const isInvestment =
      category?.toLowerCase() === 'investment' ||
      description?.toLowerCase().includes('investment') ||
      description?.toLowerCase().includes('capital');

    if (!isInvestment || !createdAtStr) return null;

    const createdAt = new Date(createdAtStr).getTime();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const msRemaining = createdAt + THREE_HOURS_MS - Date.now();
    if (msRemaining > 0) {
      const hours = Math.floor(msRemaining / (1000 * 60 * 60));
      const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
      return {
        isWithin3h: true,
        text: `Locked: Member 3h edit window active (${hours}h ${mins}m remaining)`,
      };
    }
    return {
      isWithin3h: false,
      text: 'Unlocked: 3h edit window passed (Ready for review)',
    };
  };

  // Filter transactions
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const filteredTransactions = safeTransactions.filter((tx) => {
    const matchesStatus = activeTab === 'all' ? true : tx.status === activeTab;
    const matchesCategory = selectedCategory === 'all' ? true : tx.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      tx.description?.toLowerCase().includes(query) ||
      tx.category?.toLowerCase().includes(query) ||
      tx.user?.full_name?.toLowerCase().includes(query) ||
      tx.user?.email?.toLowerCase().includes(query) ||
      String(tx.amount).includes(query);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Calculate top KPI aggregates
  const pendingItems = safeTransactions.filter((t) => t.status === 'pending');
  const pendingTotal = pendingItems.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const pendingIncome = pendingItems
    .filter((t) => t.transaction_type === 'income')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const pendingExpense = pendingItems
    .filter((t) => t.transaction_type === 'expense')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  if (authLoading) {
    return (
      <>
        <TopBar title="Review" />
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <TopBar title="Review" />
        <div className="page-body" style={{ padding: 40, textAlign: 'center' }}>
          <ShieldAlert size={48} color="var(--expense-red)" style={{ margin: '0 auto 16px' }} />
          <h3>Admin Access Required</h3>
          <p style={{ color: 'var(--muted-dark)' }}>Only General Managers and Farm Admins can access the Review Center.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Review" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-4)' }}>
          {/* Pending Reviews */}
          <div
            className="card"
            style={{
              background: 'var(--palette-cream)',
              border: '1.5px solid var(--palette-sage)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label" style={{ color: 'var(--neutral-dark)', fontWeight: 700 }}>
                Pending Verification
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--palette-sage)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--secondary-green)',
                }}
              >
                <CheckSquare size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--neutral-dark)' }}>
                {pendingItems.length}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted-dark)', fontWeight: 600 }}>
                item{pendingItems.length === 1 ? '' : 's'} awaiting
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--neutral-dark)', margin: 0, fontWeight: 600 }}>
              Total Value: <strong>{formatCurrency(pendingTotal)}</strong>
            </p>
          </div>

          {/* Pending Income / Capital */}
          <div
            className="card"
            style={{
              background: 'var(--palette-cream)',
              border: '1.5px solid var(--palette-sage)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label" style={{ color: 'var(--neutral-dark)', fontWeight: 700 }}>
                Pending Income & Capital
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--palette-sage)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--income-green)',
                }}
              >
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--income-green)' }}>
                +{formatCurrency(pendingIncome)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: 0 }}>
              Member investments & livestock sales
            </p>
          </div>

          {/* Pending Expenses */}
          <div
            className="card"
            style={{
              background: 'var(--palette-cream)',
              border: '1.5px solid var(--palette-blush)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-label" style={{ color: 'var(--neutral-dark)', fontWeight: 700 }}>
                Pending Expenses
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--palette-blush)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--expense-red)',
                }}
              >
                <ArrowDownRight size={16} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--expense-red)' }}>
                -{formatCurrency(pendingExpense)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-dark)', margin: 0 }}>
              Feed, vitamins, and operational costs
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Tabs
              tabs={STATUS_TABS.map((t) => ({
                label: t.value === 'pending' ? `${t.label} (${pendingItems.length})` : t.label,
                value: t.value,
              }))}
              value={activeTab}
              onChange={(v) => setActiveTab(v as ReviewStatusFilter)}
              size="sm"
              style={{ width: 'auto' }}
            />

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={13} className={isLoading ? 'spinner' : ''} />}
              onClick={fetchReviewTransactions}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              background: 'var(--card-bg)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--card-border)',
            }}
          >
            <Search size={16} color="var(--muted-dark)" />
            <input
              type="text"
              placeholder="Search by contributor, receipt, description, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--neutral-dark)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-dark)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Review Items List */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
              No transactions found
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted-dark)', marginTop: 6 }}>
              {activeTab === 'pending'
                ? 'All submitted transactions and investment receipts have been reviewed!'
                : 'No transactions match your current search and filters.'}
            </p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredTransactions.map((tx) => {
              const isIncome = tx.transaction_type === 'income';
              const timerStatus = get3HourStatus(tx.created_at, tx.category, tx.description);
              const isProcessing = actionTxId === tx.id && isSubmittingAction;

              return (
                <div
                  key={tx.id}
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1.5px solid var(--card-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Item Top: Contributor & Submission Info */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid rgba(24, 43, 29, 0.08)',
                      paddingBottom: 14,
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--palette-cream)',
                          border: '1px solid var(--palette-sage)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          color: 'var(--secondary-green)',
                        }}
                      >
                        {tx.user?.full_name?.charAt(0) || '👤'}
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 15, margin: 0, color: 'var(--neutral-dark)' }}>
                          {tx.user?.full_name || 'Member Contributor'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--muted-dark)', margin: 0 }}>
                          {tx.user?.email || 'Logged User'} • Submitted {formatDate(tx.transaction_date)} ({formatRelativeTime(tx.created_at || tx.transaction_date)})
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant={tx.transaction_type} />
                      <Badge variant={tx.status} />
                    </div>
                  </div>

                  {/* Item Middle: Financial Details + Receipt Preview */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'start' }}>
                    {/* Financial details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-dark)' }}>
                          Category: {tx.category}
                        </span>
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: isIncome ? 'var(--income-green)' : 'var(--expense-red)',
                            marginTop: 2,
                          }}
                        >
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '10px 12px',
                          background: 'var(--palette-cream)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--card-border)',
                        }}
                      >
                        <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: 'var(--neutral-dark)' }}>
                          Description / Note:
                        </p>
                        <p style={{ fontSize: 13, margin: 0, color: 'var(--neutral-dark)' }}>
                          {tx.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* 3-hour edit status banner for investment contributions */}
                      {timerStatus && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: timerStatus.isWithin3h ? '#854D0E' : 'var(--neutral-dark)',
                            padding: '6px 10px',
                            background: timerStatus.isWithin3h ? 'rgba(234, 179, 8, 0.12)' : 'var(--palette-cream)',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${timerStatus.isWithin3h ? 'rgba(234, 179, 8, 0.3)' : 'var(--palette-sage)'}`,
                          }}
                        >
                          <Clock size={13} />
                          {timerStatus.text}
                        </div>
                      )}

                      {/* Rejection reason if already rejected */}
                      {tx.status === 'rejected' && tx.rejection_reason && (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--palette-rose)',
                            border: '1px solid var(--palette-blush)',
                            fontSize: 12,
                            color: 'var(--expense-red)',
                          }}
                        >
                          <strong>Rejection Reason:</strong> {tx.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Receipt Verification Zone */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        background: 'var(--palette-cream)',
                        padding: 14,
                        borderRadius: 'var(--radius-lg)',
                        border: '1.5px solid var(--card-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--neutral-dark)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FileText size={14} color="var(--secondary-green)" /> Uploaded Receipt / Proof
                        </span>
                        {tx.receipt_url && (
                          <a
                            href={tx.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--secondary-green)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            Open Raw <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      {tx.receipt_url ? (() => {
                        const isPdf = tx.receipt_url?.toLowerCase().includes('.pdf') || tx.receipt_filename?.toLowerCase().endsWith('.pdf');
                        return isPdf ? (
                          <div
                            onClick={() => {
                              setInspectReceiptUrl(tx.receipt_url);
                              setInspectReceiptTitle(`${tx.user?.full_name || 'Member'} - ${formatCurrency(tx.amount)}`);
                            }}
                            style={{
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              border: '1.5px solid var(--palette-sage)',
                              position: 'relative',
                              cursor: 'pointer',
                              background: 'var(--palette-cream)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '24px 20px',
                              width: '100%',
                              maxWidth: 340,
                              gap: 10,
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--palette-rose)',
                              border: '1px solid var(--palette-blush)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <FileText size={24} color="var(--expense-red)" />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-dark)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.receipt_filename || 'PDF Receipt Document'}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--muted-dark)' }}>
                              Click to inspect or preview PDF
                            </span>
                            <div
                              style={{
                                marginTop: 4,
                                background: 'var(--palette-sage)',
                                color: 'var(--palette-cream)',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Eye size={12} /> Inspect PDF
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setInspectReceiptUrl(tx.receipt_url);
                              setInspectReceiptTitle(`${tx.user?.full_name || 'Member'} - ${formatCurrency(tx.amount)}`);
                            }}
                            style={{
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              border: '1px solid var(--palette-sage)',
                              position: 'relative',
                              cursor: 'pointer',
                              background: 'var(--palette-cream)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 8,
                              width: 'fit-content',
                              maxWidth: 360,
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tx.receipt_url}
                              alt="Receipt"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 260,
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: 'var(--radius-sm)',
                                display: 'block',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                background: 'rgba(24, 43, 29, 0.85)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 11,
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Eye size={12} /> Inspect Receipt
                            </div>
                          </div>
                        );
                      })() : (
                        <div
                          style={{
                            height: 120,
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--palette-blush)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            color: 'var(--expense-red)',
                            fontSize: 12,
                            fontWeight: 600,
                            background: 'var(--palette-rose)',
                          }}
                        >
                          <AlertTriangle size={20} />
                          No Receipt Attached
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Bottom: Verification Action Controls */}
                  {tx.status === 'pending' ? (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        borderTop: '1px solid rgba(24, 43, 29, 0.08)',
                        paddingTop: 14,
                      }}
                    >
                      {timerStatus?.isWithin3h ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#854D0E',
                            background: 'rgba(234, 179, 8, 0.12)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                          }}
                        >
                          <Lock size={13} />
                          Locked until 3-hour member edit window expires
                        </div>
                      ) : (
                        <div />
                      )}

                      <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<XCircle size={15} />}
                          onClick={() => {
                            setRejectingTx(tx);
                            setRejectionReason('');
                          }}
                          disabled={isProcessing || (timerStatus?.isWithin3h ?? false)}
                          style={{
                            color: 'var(--expense-red)',
                            borderColor: 'var(--palette-blush)',
                            background: 'var(--palette-rose)',
                            opacity: timerStatus?.isWithin3h ? 0.5 : 1,
                            cursor: timerStatus?.isWithin3h ? 'not-allowed' : 'pointer',
                          }}
                          title={timerStatus?.isWithin3h ? 'Locked during member 3-hour edit window' : undefined}
                        >
                          Reject Transaction
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle size={15} />}
                          onClick={() => handleApprove(tx)}
                          isLoading={isProcessing}
                          disabled={isProcessing || (timerStatus?.isWithin3h ?? false)}
                          style={{
                            opacity: timerStatus?.isWithin3h ? 0.5 : 1,
                            cursor: timerStatus?.isWithin3h ? 'not-allowed' : 'pointer',
                          }}
                          title={timerStatus?.isWithin3h ? 'Locked during member 3-hour edit window' : undefined}
                        >
                          Approve Transaction
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        borderTop: '1px solid rgba(24, 43, 29, 0.08)',
                        paddingTop: 10,
                        fontSize: 11,
                        color: 'var(--muted-dark)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        Status: <strong>{tx.status.toUpperCase()}</strong>
                      </span>
                      {tx.approved_at && (
                        <span>
                          Action recorded on {formatDate(tx.approved_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Receipt Inspection Modal */}
      {inspectReceiptUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 10020,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setInspectReceiptUrl(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: 800,
              maxHeight: '90vh',
              width: '100%',
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--card-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--palette-cream)',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--neutral-dark)' }}>
                Receipt Verification: {inspectReceiptTitle}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a
                  href={inspectReceiptUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--secondary-green)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download size={13} /> Open Full
                </a>
                <button
                  onClick={() => setInspectReceiptUrl(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--neutral-dark)' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Receipt Image / PDF Document View */}
            <div
              style={{
                padding: inspectReceiptUrl?.toLowerCase().includes('.pdf') ? 0 : 16,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: inspectReceiptUrl?.toLowerCase().includes('.pdf') ? '#fff' : '#1F2937',
                maxHeight: '75vh',
                height: inspectReceiptUrl?.toLowerCase().includes('.pdf') ? '75vh' : 'auto',
              }}
            >
              {inspectReceiptUrl?.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={inspectReceiptUrl}
                  title="PDF Receipt Preview"
                  style={{ width: '100%', height: '100%', border: 'none', minHeight: 480 }}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={inspectReceiptUrl}
                  alt="Receipt Full Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingTx && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 10020,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 440,
              width: '100%',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--expense-red)' }}>
                Reject Transaction
              </h3>
              <button
                onClick={() => setRejectingTx(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-dark)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--neutral-dark)', margin: 0, lineHeight: 1.4 }}>
              You are rejecting <strong>{formatCurrency(rejectingTx.amount)}</strong> submitted by{' '}
              <strong>{rejectingTx.user?.full_name || 'Member'}</strong>. Please provide a clear reason so they can submit a revised transaction.
            </p>

            {/* Quick Preset Chips */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-dark)', display: 'block', marginBottom: 6 }}>
                QUICK REASONS:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: rejectionReason === preset ? 'var(--palette-blush)' : 'var(--palette-cream)',
                      border: `1px solid ${rejectionReason === preset ? 'var(--palette-rose)' : 'var(--card-border)'}`,
                      cursor: 'pointer',
                      color: 'var(--neutral-dark)',
                      fontWeight: 600,
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Textarea */}
            <div className="form-group">
              <label className="form-label" htmlFor="reject-reason">
                Rejection Reason (Required)
              </label>
              <textarea
                id="reject-reason"
                className="form-input"
                rows={3}
                placeholder="Explain why the transaction cannot be approved..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectingTx(null)}
                disabled={isSubmittingAction}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                isLoading={isSubmittingAction}
                disabled={isSubmittingAction || !rejectionReason.trim()}
                style={{ flex: 1 }}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
