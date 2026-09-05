'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, ExternalLink, FileText, X } from 'lucide-react';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { FormTextarea } from '@/components/Forms/FormTextarea';
import { FormFileUpload } from '@/components/Forms/FormFileUpload';
import { transactionSchema, type TransactionFormValues } from '@/lib/utils/zod-schemas';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import type { TransactionWithUser } from '@/types/api';

const CATEGORY_OPTIONS = TRANSACTION_CATEGORIES.map((c) => ({ label: c, value: c }));
const TYPE_OPTIONS = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithUser | null;
  onSuccess: () => void;
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: EditTransactionModalProps) {
  const [newReceipt, setNewReceipt] = useState<File | null>(null);
  const [hasExistingReceipt, setHasExistingReceipt] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [timeRemainingMs, setTimeRemainingMs] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_date: '',
      transaction_type: 'expense',
      amount: 0,
      category: 'Feeds',
      description: '',
    },
  });

  // Calculate 5-minute countdown
  useEffect(() => {
    if (!isOpen || !transaction) return;

    reset({
      transaction_date: transaction.transaction_date?.slice(0, 10) || '',
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
    });
    setNewReceipt(null);
    setHasExistingReceipt(Boolean(transaction.receipt_url));
    setServerError(null);

    const checkTime = () => {
      const createdMs = new Date(transaction.created_at).getTime();
      const diff = 5 * 60 * 1000 - (Date.now() - createdMs);
      setTimeRemainingMs(Math.max(0, diff));
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [isOpen, transaction, reset]);

  const handleClose = () => {
    reset();
    setNewReceipt(null);
    setServerError(null);
    onClose();
  };

  const isExpired = timeRemainingMs <= 0;
  const minutes = Math.floor(timeRemainingMs / 60000);
  const seconds = Math.floor((timeRemainingMs % 60000) / 1000);

  const onFormSubmit = async (data: TransactionFormValues) => {
    if (!transaction) return;
    if (isExpired) {
      setServerError('The 5-minute edit window has expired. This transaction is locked.');
      return;
    }

    setServerError(null);

    try {
      let receiptData: Record<string, string | null> = {};

      if (newReceipt) {
        const formData = new FormData();
        formData.append('file', newReceipt);
        const uploadRes = await fetch('/api/storage/receipt', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(uploadErr.error?.message ?? 'Failed to upload receipt');
        }

        const uploaded = await uploadRes.json();
        receiptData = {
          receipt_url: uploaded.data?.url,
          receipt_filename: uploaded.data?.filename,
          receipt_storage_path: uploaded.data?.path,
        };
      }

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_date: data.transaction_date,
          amount: data.amount,
          category: data.category,
          transaction_type: data.transaction_type,
          description: data.description,
          ...receiptData,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Failed to update transaction');
      }

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error updating transaction';
      setServerError(message);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Transaction"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onFormSubmit)}
            isLoading={isSubmitting}
            disabled={isExpired}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
        {/* Timer notification */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: isExpired ? '#FFE2E2' : '#FFFDEC',
            border: `1px solid ${isExpired ? '#FFCFCF' : '#86A788'}`,
            color: isExpired ? '#991B1B' : '#14532D',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Clock size={16} />
          <span>
            {isExpired
              ? '5-minute edit window has expired. Transaction changes are locked.'
              : `Time remaining to edit: ${minutes}m ${seconds.toString().padStart(2, '0')}s`}
          </span>
        </div>

        <div className="form-grid form-grid-2">
          <FormField label="Date" htmlFor="edit-tx-date" error={errors.transaction_date?.message} required>
            <input
              id="edit-tx-date"
              type="date"
              className={`form-input${errors.transaction_date ? ' error' : ''}`}
              disabled={isExpired}
              {...register('transaction_date')}
            />
          </FormField>

          <FormField label="Type" htmlFor="edit-tx-type" error={errors.transaction_type?.message} required>
            <FormSelect
              id="edit-tx-type"
              options={TYPE_OPTIONS}
              disabled={isExpired}
              error={!!errors.transaction_type}
              {...register('transaction_type')}
            />
          </FormField>
        </div>

        <div className="form-grid form-grid-2">
          <FormField label="Category" htmlFor="edit-tx-category" error={errors.category?.message} required>
            <FormSelect
              id="edit-tx-category"
              options={CATEGORY_OPTIONS}
              placeholder="Select category"
              disabled={isExpired}
              error={!!errors.category}
              {...register('category')}
            />
          </FormField>

          <FormField label="Amount (₱)" htmlFor="edit-tx-amount" error={errors.amount?.message} required>
            <input
              id="edit-tx-amount"
              type="number"
              step="0.01"
              min="0"
              disabled={isExpired}
              className={`form-input${errors.amount ? ' error' : ''}`}
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="edit-tx-desc" error={errors.description?.message} required>
          <FormTextarea
            id="edit-tx-desc"
            placeholder="Brief description of this transaction..."
            rows={3}
            disabled={isExpired}
            error={!!errors.description}
            {...register('description')}
          />
        </FormField>

        {/* Existing receipt or file uploader */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-dark)', marginBottom: 6, display: 'block' }}>
            Receipt
          </label>
          {hasExistingReceipt && transaction.receipt_url && !newReceipt ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(134, 167, 136, 0.1)',
                border: '1.5px solid #86A788',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <FileText size={20} color="#2D4433" />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#14532D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {transaction.receipt_filename || 'Current Receipt'}
                  </p>
                  <a
                    href={transaction.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#2D4433', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline' }}
                  >
                    View receipt <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              {!isExpired && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHasExistingReceipt(false)}
                >
                  Replace Receipt
                </Button>
              )}
            </div>
          ) : (
            <div>
              <FormFileUpload
                value={newReceipt}
                onChange={(f) => {
                  setNewReceipt(f);
                  setServerError(null);
                }}
              />
              {transaction.receipt_url && (
                <button
                  type="button"
                  onClick={() => {
                    setNewReceipt(null);
                    setHasExistingReceipt(true);
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: '#2D4433',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Cancel replacing and keep existing receipt
                </button>
              )}
            </div>
          )}
        </div>

        {serverError && (
          <div
            className="alert-banner"
            style={{ borderLeftColor: '#991B1B', background: '#FFE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 6 }}
          >
            <p style={{ fontSize: 14, margin: 0 }}>{serverError}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
