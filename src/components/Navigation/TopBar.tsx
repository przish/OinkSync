'use client';

import React, { useState } from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/constants';
import { Badge } from '@/components/UI/Badge';
import { ProfileDrawer } from './ProfileDrawer';

interface TopBarProps {
  title: string;
  onMenuToggle?: () => void;
  actions?: React.ReactNode;
}

export function TopBar({ title, onMenuToggle, actions }: TopBarProps) {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
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
            onClick={() => alert('Notifications coming soon!')}
          >
            <Bell size={18} />
          </button>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                title="View Profile & Dashboard"
                id="topbar-profile-btn"
                style={{
                  width: 38,
                  height: 38,
                  minWidth: 38,
                  minHeight: 38,
                  aspectRatio: '1 / 1',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  padding: 0,
                  border: '2px solid var(--palette-sage)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--palette-blush)',
                  flexShrink: 0,
                  outline: 'none',
                }}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ color: 'var(--neutral-dark)', fontWeight: 800, fontSize: 14 }}>
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
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

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onProfileUpdated={() => {
          // Trigger reload or state refresh if needed
          window.location.reload();
        }}
      />
    </>
  );
}
