'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';

interface DashboardLayoutShellProps {
  children: React.ReactNode;
}

export function DashboardLayoutShell({ children }: DashboardLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="app-shell">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="main-content" style={{ paddingBottom: 80 }}>
          {/* Mobile sidebar toggle — TopBar handles the button UI,
              this provides the toggle state via DOM dataset */}
          <div
            id="sidebar-toggle-trigger"
            data-open={sidebarOpen ? '1' : '0'}
            onClick={() => setSidebarOpen((o) => !o)}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
          {children}
        </main>

        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
