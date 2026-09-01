'use client';

import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'beige' | 'green' | 'gold';
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className, variant = 'default', hover = false, onClick, style }: CardProps) {
  return (
    <div
      className={clsx(
        'card',
        {
          'card-beige': variant === 'beige',
          'card-green': variant === 'green',
          'card-gold': variant === 'gold',
        },
        hover && 'card-hover',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={onClick ? { cursor: 'pointer', ...style } : style}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4" style={{ marginBottom: 'var(--spacing-4)' }}>
      <div className="flex items-center gap-3">
        {icon && (
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(45,80,22,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <h3 style={{ fontSize: 'var(--font-h4)', fontWeight: 700, color: 'var(--neutral-dark)' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: 'var(--font-body-small)', color: '#6B7280', marginTop: 2 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
