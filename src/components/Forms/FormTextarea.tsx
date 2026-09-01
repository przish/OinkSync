'use client';

import React from 'react';
import clsx from 'clsx';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={clsx('form-textarea', { error }, className)}
      {...props}
    />
  );
}
