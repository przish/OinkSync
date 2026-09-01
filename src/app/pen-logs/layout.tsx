'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function PenLogsLayout({ children }: LayoutProps<'/'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
