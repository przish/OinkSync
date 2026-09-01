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
  className?: string;
  style?: React.CSSProperties;
}

export function Tabs({ tabs, value, onChange, className, style }: TabsProps) {
  return (
    <div className={clsx('tabs', className)} role="tablist" style={style}>
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
