'use client';

import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/constants';
import { Badge } from '@/components/UI/Badge';

interface TopBarProps {
  title: string;
  onMenuToggle?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({ title, onMenuToggle, actions }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      {/* Mobile menu button */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        style={{
          display: 'none',
          marginRight: 8,
        }}
        id="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--neutral-dark)' }}>{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {actions}

        <button
          className="btn btn-ghost btn-icon"
          aria-label="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--secondary-green), #3d6b1f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 13,
                flexShrink: 0,
              }}
            >
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'none' }} className="topbar-user-info">
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user.full_name}</p>
              <Badge variant={user.role}>{ROLE_LABELS[user.role]}</Badge>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          #mobile-menu-btn { display: flex !important; }
          .topbar-user-info { display: block !important; }
        }
      `}</style>
    </header>
  );
}
