'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/UI/Modal';
import { Button } from '@/components/UI/Button';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { FormTextarea } from '@/components/Forms/FormTextarea';
import { FormFileUpload } from '@/components/Forms/FormFileUpload';
import { transactionSchema, type TransactionFormValues } from '@/lib/utils/zod-schemas';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { todayISO } from '@/lib/utils/formatting';

const CATEGORY_OPTIONS = TRANSACTION_CATEGORIES.map((c) => ({ label: c, value: c }));
const TYPE_OPTIONS = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormValues, receipt: File | null) => Promise<{ error: string | null }>;
}

export function AddTransactionModal({ isOpen, onClose, onSubmit }: AddTransactionModalProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_date: todayISO(),
      transaction_type: 'expense',
    },
  });

  const [receipt, setReceipt] = React.useState<File | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleClose = () => {
    reset();
    setReceipt(null);
    setServerError(null);
    onClose();
  };

  const onFormSubmit = async (data: TransactionFormValues) => {
    setServerError(null);
    const { error } = await onSubmit(data, receipt);
    if (error) {
      setServerError(error);
    } else {
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Transaction"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onFormSubmit)}
            isLoading={isSubmitting}
          >
            Submit Transaction
          </Button>
        </>
      }
    >
      <form style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
        <div className="form-grid form-grid-2">
          <FormField label="Date" htmlFor="tx-date" error={errors.transaction_date?.message} required>
            <input
              id="tx-date"
              type="date"
              className={`form-input${errors.transaction_date ? ' error' : ''}`}
              {...register('transaction_date')}
            />
          </FormField>

          <FormField label="Type" htmlFor="tx-type" error={errors.transaction_type?.message} required>
            <FormSelect
              id="tx-type"
              options={TYPE_OPTIONS}
              error={!!errors.transaction_type}
              {...register('transaction_type')}
            />
          </FormField>
        </div>

        <div className="form-grid form-grid-2">
          <FormField label="Category" htmlFor="tx-category" error={errors.category?.message} required>
            <FormSelect
              id="tx-category"
              options={CATEGORY_OPTIONS}
              placeholder="Select category"
              error={!!errors.category}
              {...register('category')}
            />
          </FormField>

          <FormField label="Amount (₱)" htmlFor="tx-amount" error={errors.amount?.message} required>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0"
              className={`form-input${errors.amount ? ' error' : ''}`}
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
          </FormField>
        </div>

        <FormField label="Description" htmlFor="tx-desc" error={errors.description?.message} required>
          <FormTextarea
            id="tx-desc"
            placeholder="Brief description of this transaction..."
            rows={3}
            error={!!errors.description}
            {...register('description')}
          />
        </FormField>

        <FormField label="Receipt (Optional)" htmlFor="tx-receipt">
          <FormFileUpload value={receipt} onChange={setReceipt} />
        </FormField>

        {serverError && (
          <div className="alert-banner" style={{ borderLeftColor: 'var(--error)', background: 'linear-gradient(135deg, #fde8e8, #f5c6c6)' }}>
            <p style={{ fontSize: 14 }}>{serverError}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
