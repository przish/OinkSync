'use client';

import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import type { UserRole } from '@/types/database';

interface RoleCheckProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleCheck({ allowedRoles, children, fallback = null }: RoleCheckProps) {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;
  if (!allowedRoles.includes(user.role)) return <>{fallback}</>;

  return <>{children}</>;
}
