'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/UI/Badge';
import { Button } from '@/components/UI/Button';
import { SkeletonRow } from '@/components/UI/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
import type { TransactionWithUser } from '@/types/api';

interface TransactionPreviewProps {
  transactions: TransactionWithUser[];
  isLoading?: boolean;
  canApprove?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function TransactionPreview({
  transactions,
  isLoading = false,
  canApprove = false,
  onApprove,
  onReject,
}: TransactionPreviewProps) {
  const router = useRouter();

  return (
    <div>
      <div className="table-wrapper">
        <table className="table table-clickable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Status</th>
              {canApprove && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 7 : 6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💸</div>
                    <p style={{ fontWeight: 600, marginTop: 8 }}>No transactions yet</p>
                    <p className="text-small text-muted">Transactions will appear here</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => router.push('/transactions')}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-small" style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{tx.category}</span>
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {tx.description}
                    </p>
                    {tx.user && (
                      <p className="text-small text-muted">{tx.user.full_name}</p>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: tx.transaction_type === 'income' ? 'var(--income-green)' : 'var(--expense-red)',
                    }}>
                      {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td><Badge variant={tx.transaction_type} /></td>
                  <td><Badge variant={tx.status} /></td>
                  {canApprove && (
                    <td>
                      {tx.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<CheckCircle size={13} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove?.(tx.id);
                            }}
                            style={{ color: 'var(--income-green)', borderColor: 'var(--income-green)' }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<XCircle size={13} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onReject?.(tx.id);
                            }}
                            style={{ color: 'var(--expense-red)', borderColor: 'var(--expense-red)' }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-small text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {transactions.length > 0 && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <Link href="/transactions" style={{ fontSize: 13, color: 'var(--secondary-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            View all transactions <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
