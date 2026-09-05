'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function ReviewLayout({ children }: LayoutProps<'/'>) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
