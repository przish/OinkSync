'use client';

import { DashboardLayoutShell } from '@/components/Navigation/DashboardLayoutShell';

export default function ScalingPlanLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
