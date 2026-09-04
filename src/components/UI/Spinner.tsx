'use client';

import React from 'react';
import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  white?: boolean;
  className?: string;
}

export function Spinner({ size = 'md', white = false, className }: SpinnerProps) {
  return (
    <span
      className={clsx(
        'spinner',
        { 'spinner-sm': size === 'sm', 'spinner-lg': size === 'lg', 'spinner-white': white },
        className
      )}
      aria-label="Loading"
    />
  );
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ width, height = 16, className, rounded = false }: SkeletonProps) {
  return (
    <span
      className={clsx('skeleton', className)}
      style={{
        display: 'block',
        width: width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: rounded ? 'var(--radius-full)' : 'var(--radius-sm)',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton height={14} width="45%" />
        <Skeleton height={24} width={24} rounded />
      </div>
      <Skeleton height={32} width="75%" />
      <Skeleton height={12} width="35%" />
    </div>
  );
}

export function SkeletonRow({ columns = 6 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <Skeleton height={14} width={i === 0 ? '70%' : i === 1 ? '85%' : '50%'} />
        </td>
      ))}
    </tr>
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'var(--spacing-4)', padding: 'var(--spacing-12)',
      color: '#6B7280',
    }}>
      <Spinner size="lg" />
      <p style={{ fontSize: 'var(--font-body-small)' }}>{message}</p>
    </div>
  );
}
