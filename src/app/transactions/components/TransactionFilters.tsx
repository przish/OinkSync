'use client';

import React from 'react';
import { FormField } from '@/components/Forms/FormField';
import { FormSelect } from '@/components/Forms/FormSelect';
import { Button } from '@/components/UI/Button';
import { TRANSACTION_CATEGORIES, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/lib/constants';
import type { TransactionFilters } from '@/types/api';

interface TransactionFiltersProps {
  filters: TransactionFilters & { start_date?: string; end_date?: string };
  onChange: (filters: TransactionFilters) => void;
  onReset: () => void;
}

const CATEGORY_OPTIONS = [
  { label: 'All Categories', value: '' },
  ...TRANSACTION_CATEGORIES.map((c) => ({ label: c, value: c })),
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: '' },
  ...TRANSACTION_STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })),
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
];

export function TransactionFiltersPanel({ filters, onChange, onReset }: TransactionFiltersProps) {
  const update = (key: string, value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  return (
    <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
      <div style={{ flex: '1 1 140px', minWidth: 140 }}>
        <FormField label="Category" htmlFor="filter-category">
          <FormSelect
            id="filter-category"
            options={CATEGORY_OPTIONS}
            value={filters.category ?? ''}
            onChange={(e) => update('category', e.target.value)}
          />
        </FormField>
      </div>
      <div style={{ flex: '1 1 140px', minWidth: 140 }}>
        <FormField label="Status" htmlFor="filter-status">
          <FormSelect
            id="filter-status"
            options={STATUS_OPTIONS}
            value={filters.status ?? ''}
            onChange={(e) => update('status', e.target.value)}
          />
        </FormField>
      </div>
      <div style={{ flex: '1 1 140px', minWidth: 140 }}>
        <FormField label="Type" htmlFor="filter-type">
          <FormSelect
            id="filter-type"
            options={TYPE_OPTIONS}
            value={filters.transaction_type ?? ''}
            onChange={(e) => update('transaction_type', e.target.value)}
          />
        </FormField>
      </div>
      <div style={{ flex: '1 1 160px', minWidth: 160 }}>
        <FormField label="From" htmlFor="filter-from">
          <input
            id="filter-from"
            type="date"
            className="form-input"
            value={filters.start_date ?? ''}
            onChange={(e) => update('start_date', e.target.value)}
          />
        </FormField>
      </div>
      <div style={{ flex: '1 1 160px', minWidth: 160 }}>
        <FormField label="To" htmlFor="filter-to">
          <input
            id="filter-to"
            type="date"
            className="form-input"
            value={filters.end_date ?? ''}
            onChange={(e) => update('end_date', e.target.value)}
          />
        </FormField>
      </div>
      <div style={{ paddingBottom: 1 }}>
        <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>
      </div>
    </div>
  );
}
