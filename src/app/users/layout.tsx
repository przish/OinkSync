'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function UsersLayout({ children }: LayoutProps<'/'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
