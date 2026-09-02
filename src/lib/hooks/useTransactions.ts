'use client';

import { useState, useCallback } from 'react';
import type {
  TransactionWithUser,
  TransactionFilters,
  CreateTransactionRequest,
  ApproveTransactionRequest,
  PaginatedResponse,
} from '@/types/api';

function buildQuery(filters: TransactionFilters & { page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.transaction_type) params.set('transaction_type', filters.transaction_type);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params.toString();
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<TransactionWithUser>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(
    async (filters: TransactionFilters & { page?: number; limit?: number } = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const query = buildQuery(filters);
        const res = await fetch(`/api/transactions${query ? `?${query}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch transactions');
        const json = await res.json();
        setTransactions(json.data?.data ?? []);
        setPagination(json.data?.pagination ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const addTransaction = useCallback(
    async (data: CreateTransactionRequest, receiptFile?: File | null) => {
      setError(null);
      try {
        // If there's a receipt, upload it first via storage API
        let receiptData: Partial<CreateTransactionRequest> = {};
        if (receiptFile) {
          const formData = new FormData();
          formData.append('file', receiptFile);
          const uploadRes = await fetch('/api/storage/receipt', {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const uploaded = await uploadRes.json();
            receiptData = {
              receipt_url: uploaded.data?.url,
              receipt_filename: uploaded.data?.filename,
              receipt_storage_path: uploaded.data?.path,
            };
          }
        }

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, ...receiptData }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? 'Failed to create transaction');
        }
        return { error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        return { error: msg };
      }
    },
    []
  );

  const updateTransactionStatus = useCallback(
    async (id: string, action: ApproveTransactionRequest) => {
      setError(null);
      try {
        const res = await fetch(`/api/transactions/${id}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message ?? 'Failed to update transaction');
        }
        return { error: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        return { error: msg };
      }
    },
    []
  );

  return {
    transactions,
    pagination,
    isLoading,
    error,
    fetchTransactions,
    addTransaction,
    updateTransactionStatus,
  };
}
