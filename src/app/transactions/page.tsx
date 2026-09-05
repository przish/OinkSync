'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit3, Lock } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { TransactionFiltersPanel } from './components/TransactionFilters';
import { AddTransactionModal } from '@/components/Forms/AddTransactionModal';
import { EditTransactionModal } from '@/components/Forms/EditTransactionModal';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { SkeletonRow } from '@/components/UI/Spinner';
import { useTransactions } from '@/lib/hooks/useTransactions';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast, ToastContainer } from '@/components/UI/Toast';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import type { TransactionFilters, TransactionWithUser } from '@/types/api';
import type { TransactionFormValues } from '@/lib/utils/zod-schemas';

const EMPTY_FILTERS: TransactionFilters = {};

export default function TransactionsPage() {
  const { user, isAdmin, canAddTransactions } = useAuth();
  const { transactions, pagination, isLoading, fetchTransactions, addTransaction } = useTransactions();
  const { toasts, toast, remove } = useToast();
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithUser | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(() => {
    fetchTransactions({ ...filters, page, limit: 20 });
  }, [filters, page, fetchTransactions]);

  useEffect(() => { load(); }, [load]);

  const handleFiltersChange = (f: TransactionFilters) => {
    setFilters(f);
    setPage(1);
  };

  const handleAddTransaction = async (data: TransactionFormValues, receipt: File | null) => {
    const result = await addTransaction(
      {
        transaction_date: data.transaction_date,
        amount: data.amount,
        category: data.category,
        transaction_type: data.transaction_type,
        description: data.description,
      },
      receipt
    );
    if (!result.error) {
      toast.success('Transaction added successfully!');
      load();
    }
    return result;
  };

  const filtered = search
    ? transactions.filter((tx) =>
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase())
    )
    : transactions;

  return (
    <>
      <TopBar title="Transactions" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Filters */}
        <TransactionFiltersPanel
          filters={filters}
          onChange={handleFiltersChange}
          onReset={() => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1); }}
        />

        {/* Search */}
        <Card style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4B5563' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by description or category..."
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {/* Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: 16 }}>
              All Transactions
              {pagination && <span style={{ fontWeight: 400, color: '#4B5563', fontSize: 13, marginLeft: 8 }}>({pagination.total} total)</span>}
            </p>
            {canAddTransactions && (
              <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setShowAddModal(true)}>
                Add Transaction
              </Button>
            )}
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} columns={8} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon">💸</div>
                        <p style={{ fontWeight: 600, marginTop: 8 }}>No transactions found</p>
                        <p className="text-small text-muted">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => {
                    const createdMs = new Date(tx.created_at).getTime();
                    const remainingMs = Math.max(0, 5 * 60 * 1000 - (currentTime - createdMs));
                    const canEdit = tx.status === 'pending' && (isAdmin || (user && tx.user_id === user.id)) && remainingMs > 0;
                    const remM = Math.floor(remainingMs / 60000);
                    const remS = Math.floor((remainingMs % 60000) / 1000);

                    return (
                      <tr key={tx.id}>
                        <td className="text-small" style={{ whiteSpace: 'nowrap', color: '#4B5563' }}>
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <p style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.description}
                          </p>
                        </td>
                        <td><span style={{ fontWeight: 500 }}>{tx.category}</span></td>
                        <td><Badge variant={tx.transaction_type} /></td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: tx.transaction_type === 'income' ? 'var(--income-green)' : 'var(--expense-red)',
                          }}>
                            {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="text-small" style={{ color: '#4B5563' }}>
                          {tx.user?.full_name ?? '—'}
                        </td>
                        <td><Badge variant={tx.status} /></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {canEdit ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit3 size={13} />}
                              onClick={() => setEditingTransaction(tx)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 12,
                                borderColor: '#86A788',
                                color: '#14532D',
                                backgroundColor: '#FFFDEC',
                              }}
                            >
                              Edit ({remM}m {remS.toString().padStart(2, '0')}s)
                            </Button>
                          ) : tx.status === 'pending' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: '#9CA3AF',
                                fontSize: 12,
                              }}
                              title="5-minute edit window expired"
                            >
                              <Lock size={12} /> Locked
                            </span>
                          ) : (
                            <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={!pagination.has_prev}
                onClick={() => setPage(p => p - 1)}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`page-btn${p === page ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className="page-btn"
                disabled={!pagination.has_next}
                onClick={() => setPage(p => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </Card>
      </div>

      <AddTransactionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTransaction}
      />

      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          toast.success('Transaction updated successfully!');
          load();
        }}
      />

      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
}
