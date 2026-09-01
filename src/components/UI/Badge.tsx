'use client';

import React from 'react';
import clsx from 'clsx';
import type {
  TransactionStatus,
  HealthStatus,
  AnimalStatus,
} from '@/types/database';
import type { UserRole } from '@/types/database';

type BadgeVariant =
  | TransactionStatus
  | HealthStatus
  | AnimalStatus
  | UserRole
  | 'income'
  | 'expense'
  | 'active'
  | 'inactive'
  | string;

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
  dot?: boolean;
}

const LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  healthy: 'Healthy',
  sick: 'Sick',
  recovering: 'Recovering',
  dead: 'Dead',
  active: 'Active',
  inactive: 'Inactive',
  sold: 'Sold',
  deceased: 'Deceased',
  income: 'Income',
  expense: 'Expense',
  admin: 'Admin',
  logistics: 'Logistics',
  pen_manager: 'Pen Manager',
  investor: 'Investor',
};

export function Badge({ variant, children, dot = false }: BadgeProps) {
  return (
    <span className={clsx('badge', `badge-${variant}`)}>
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'currentColor', display: 'inline-block',
          }}
        />
      )}
      {children ?? LABELS[variant] ?? variant}
    </span>
  );
}
