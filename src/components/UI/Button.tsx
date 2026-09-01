'use client';

import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-green';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  as: Tag = 'button',
  href,
  ...props
}: ButtonProps) {
  const cls = clsx(
    'btn',
    {
      'btn-primary': variant === 'primary',
      'btn-secondary': variant === 'secondary',
      'btn-ghost': variant === 'ghost',
      'btn-danger': variant === 'danger',
      'btn-outline-green': variant === 'outline-green',
      'btn-sm': size === 'sm',
      'btn-lg': size === 'lg',
      'btn-icon': size === 'icon',
    },
    className
  );

  const content = (
    <>
      {isLoading ? (
        <span className={clsx('spinner', { 'spinner-sm': size === 'sm', 'spinner-white': variant === 'primary' || variant === 'danger' })} />
      ) : leftIcon}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon}
    </>
  );

  if (Tag === 'a' && href) {
    return (
      <a href={href} className={cls} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  return (
    <button className={cls} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
}
