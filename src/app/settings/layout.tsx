'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function SettingsLayout({ children }: LayoutProps<'/'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
