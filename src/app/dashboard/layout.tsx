'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
