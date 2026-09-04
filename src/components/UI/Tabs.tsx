'use client';

import React from 'react';
import clsx from 'clsx';

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({ tabs, value, onChange, size = 'md', className, style }: TabsProps) {
  return (
    <div className={clsx('tabs', { 'tabs-sm': size === 'sm' }, className)} role="tablist" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={clsx('tab', { active: value === tab.value })}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
