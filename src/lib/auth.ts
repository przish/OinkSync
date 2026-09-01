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
 * Includes role information needed for authorization checks.
 */
export async function getAuthUserProfile(): Promise<User> {
  const supabase = await createClient();
  const user = await getAuthUser();

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new UnauthorizedError('User profile not found. Please contact an administrator.');
  }

  return profile as unknown as User;
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
