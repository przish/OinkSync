'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} color="var(--success)" />,
  error: <XCircle size={18} color="var(--error)" />,
  warning: <AlertCircle size={18} color="var(--warning)" />,
  info: <Info size={18} color="#3B82F6" />,
};

interface ToastItemProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const remove = useCallback(() => onRemove(toast.id), [onRemove, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(remove, toast.duration ?? 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [remove, toast.duration]);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: 'white',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--card-border)',
        animation: 'slideUp 0.2s ease',
        minWidth: 280, maxWidth: 420,
      }}
    >
      {ICONS[toast.type]}
      <p style={{ flex: 1, fontSize: 'var(--font-body)', fontWeight: 500, color: 'var(--neutral-dark)' }}>
        {toast.message}
      </p>
      <button
        onClick={remove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24,
        zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ── Minimal standalone hook ─────────────────────────────────

import { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const add = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => add('success', msg),
    error: (msg: string) => add('error', msg),
    warning: (msg: string) => add('warning', msg),
    info: (msg: string) => add('info', msg),
  };

  return { toasts, toast, remove };
}
