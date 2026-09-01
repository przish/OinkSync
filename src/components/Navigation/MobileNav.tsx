'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  PiggyBank, ClipboardList, FileText,
} from 'lucide-react';

const MOBILE_NAV = [
  { href: '/dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { href: '/transactions', label: 'Tx', icon: <ArrowLeftRight size={20} /> },
  { href: '/analytics', label: 'Stats', icon: <BarChart3 size={20} /> },
  { href: '/inventory', label: 'Animals', icon: <PiggyBank size={20} /> },
  { href: '/pen-logs', label: 'Logs', icon: <ClipboardList size={20} /> },
  { href: '/reports', label: 'Reports', icon: <FileText size={20} /> },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', borderTop: '1px solid var(--card-border)',
      display: 'none', zIndex: 48,
      padding: '4px 0 max(env(safe-area-inset-bottom), 4px)',
    }} className="mobile-nav">
      {MOBILE_NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, padding: '6px 4px',
              color: isActive ? 'var(--secondary-green)' : '#9CA3AF',
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              transition: 'color 150ms ease',
              textDecoration: 'none',
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
      <style>{`
        @media (max-width: 1024px) {
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
