/**
 * PigTrack Auth Helpers
 *
 * Authentication and authorization utilities for API routes.
 */

import { createClient } from '@/lib/supabase/server';
import type { UserRole, User } from '@/types/database';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

/**
 * Get the authenticated user from the current request.
 * Throws UnauthorizedError if no valid session exists.
 */
export async function getAuthUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired session. Please log in again.');
  }

  return user;
}

/**
 * Get the authenticated user's profile from the users table.
 * If no profile row exists, constructs a minimal fallback from Auth metadata
 * so API routes remain functional before a DB profile is seeded.
 */
export async function getAuthUserProfile(): Promise<User> {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    return profile as unknown as User;
  }

  // Fallback: construct a minimal profile from Supabase Auth metadata.
  // This keeps API routes functional when public.users hasn't been seeded yet.
  // The admin should run the seed SQL to create a proper profile row.
  const fallback: User = {
    id: user.id,
    email: user.email ?? '',
    full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'User',
    phone_number: null,
    role: ((user.user_metadata?.role as UserRole) ?? 'admin'),
    is_active: true,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    last_login: null,
  };

  return fallback;
}

/**
 * Require a specific role (or set of roles) for the current user.
 * Throws ForbiddenError if the user doesn't have the required role.
 *
 * @param allowedRoles - One or more roles that are allowed to access the resource
 * @returns The user profile if authorized
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<User> {
  const profile = await getAuthUserProfile();

  if (!allowedRoles.includes(profile.role)) {
    throw new ForbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}. ` +
      `Your role: ${profile.role}.`
    );
  }

  return profile;
}

/**
 * Check if the current user is an admin.
 * Shorthand for requireRole('admin').
 */
export async function requireAdmin(): Promise<User> {
  return requireRole('admin');
}

/**
 * Check if a user has one of the specified roles.
 * Non-throwing version — returns true/false.
 */
export function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Check if a user is an admin.
 * Non-throwing version — returns true/false.
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'admin';
}
