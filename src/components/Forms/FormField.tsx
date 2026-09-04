'use client';

import React from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  required = false,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={clsx('form-group', className)}>
      <label className="form-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-muted" style={{ fontSize: 'var(--font-body-small)' }}>{hint}</p>
      )}
      {error && (
        <p className="form-error">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
