'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';
import type { UserRole } from '@/types/database';

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

  const supabase = createClient();

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
      setState({ user: null, isLoading: false, error: 'Profile not found' });
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
