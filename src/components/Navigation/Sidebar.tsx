'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  PiggyBank, ClipboardList, FileText,
  Users, Settings, LogOut, ChevronRight, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/transactions', label: 'Transactions', icon: <ArrowLeftRight size={18} />, roles: ['admin', 'logistics'] },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { href: '/scaling-plan', label: 'Scaling Plan', icon: <TrendingUp size={18} />, roles: ['admin', 'investor'] },
  { href: '/inventory', label: 'Inventory', icon: <PiggyBank size={18} /> },
  { href: '/pen-logs', label: 'Pen Logs', icon: <ClipboardList size={18} />, roles: ['admin', 'pen_manager'] },
  { href: '/reports', label: 'Reports', icon: <FileText size={18} /> },
  { href: '/users', label: 'Team', icon: <Users size={18} />, roles: ['admin'] },
  { href: '/settings', label: 'Settings', icon: <Settings size={18} />, roles: ['admin'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(24, 43, 29, 0.45)',
            zIndex: 49, display: 'none',
          }}
          className="sidebar-backdrop"
        />
      )}

      <aside className={clsx('sidebar', { open: isOpen })}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255, 253, 236, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--palette-blush)',
              border: '1px solid var(--palette-rose)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              🐷
            </div>
            <div>
              <p style={{ color: 'var(--palette-cream)', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>OinkSync</p>
              <p style={{ color: 'var(--palette-cream)', opacity: 0.8, fontSize: 11, fontWeight: 600 }}>Farm OS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--palette-cream)', opacity: 0.85, padding: '8px 8px 6px', textTransform: 'uppercase' }}>
            Menu
          </p>
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('nav-link', { active: isActive })}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 12px 20px', borderTop: '1px solid rgba(255, 253, 236, 0.25)' }}>
          {user && (
            <div style={{ padding: '8px 12px', marginBottom: 8 }}>
              <p style={{ color: 'var(--palette-cream)', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.full_name}
              </p>
              <p style={{ color: 'var(--palette-cream)', opacity: 0.8, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
          )}
          <button onClick={logout} className="nav-link signout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
