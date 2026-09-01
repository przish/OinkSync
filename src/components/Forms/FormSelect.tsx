'use client';

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  placeholder?: string;
  error?: boolean;
}

export function FormSelect({
  options,
  placeholder,
  error,
  className,
  ...props
}: FormSelectProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        className={clsx('form-select', { error }, className)}
        style={{ paddingRight: 36 }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)',
          color: '#6B7280', pointerEvents: 'none',
        }}
      />
    </div>
  );
}
