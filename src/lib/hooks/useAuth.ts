'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole } from '@/types/database';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setState({ user: null, isLoading: false, error: null });
      return;
    }
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) {
      // No row in public.users — build a minimal fallback from Auth metadata
      // so the user isn't kicked back to login by ProtectedRoute.
      // This handles new users whose profile hasn't been seeded yet.
      const fallback: User = {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: authUser.user_metadata?.full_name ?? authUser.email ?? 'User',
        phone_number: null,
        role: (authUser.user_metadata?.role as UserRole) ?? 'admin',
        is_active: true,
        created_at: authUser.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        last_login: null,
      };
      setState({ user: fallback, isLoading: false, error: null });
    } else {
      setState({ user: profile as unknown as User, isLoading: false, error: null });
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, isLoading: false, error: null });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, supabase.auth]);

  const login = useCallback(async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(s => ({ ...s, isLoading: false, error: error.message }));
      return { error: error.message };
    }
    setState(s => ({ ...s, isLoading: false }));
    return { error: null };
  }, [supabase.auth]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }, [supabase.auth]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!state.user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(state.user.role);
  }, [state.user]);

  const isAdmin = state.user?.role === 'admin';
  const canApprove = state.user ? ['admin'].includes(state.user.role) : false;
  const canAddTransactions = state.user
    ? ['admin', 'logistics'].includes(state.user.role)
    : false;

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAdmin,
    canApprove,
    canAddTransactions,
    hasRole,
    login,
    logout,
    refetch: fetchProfile,
  };
}
