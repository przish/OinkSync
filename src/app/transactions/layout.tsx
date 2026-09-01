'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function TransactionsLayout({ children }: LayoutProps<'/'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
