/**
 * PATCH /api/users/[id] - Update user details (admin only)
 * DELETE /api/users/[id] - Delete a team member (admin only)
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { successResponse, handleError, NotFoundError, ValidationError } from '@/lib/errors';
import { requireUUID } from '@/lib/validation';
import { USER_ROLES } from '@/lib/constants';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { id } = await params;
    const targetUserId = requireUUID(id, 'user_id');

    const body = await request.json();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.full_name && typeof body.full_name === 'string') {
      updates.full_name = body.full_name.trim();
    }

    if (body.role) {
      if (!USER_ROLES.includes(body.role)) {
        throw new ValidationError(`Invalid role: ${body.role}`);
      }
      updates.role = body.role;
    }

    if (body.phone_number !== undefined) {
      updates.phone_number = body.phone_number ? body.phone_number.trim() : null;
    }

    if (typeof body.is_active === 'boolean') {
      updates.is_active = body.is_active;
    }

    // 1. Update public.users
    const { data, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', targetUserId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundError(`User ${targetUserId} not found.`);
    }

    // 2. Also sync role and name to auth.users user_metadata
    await adminClient.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
      },
    }).catch(() => {});

    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const adminClient = createAdminClient();
    const { id } = await params;
    const targetUserId = requireUUID(id, 'user_id');

    if (targetUserId === admin.id) {
      throw new ValidationError('Administrators cannot delete their own account.');
    }

    // 1. Delete transactions created by or referring to this user to maintain FK integrity if needed
    // or delete directly from public.users
    const { error: dbError } = await adminClient
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (dbError) throw dbError;

    // 2. Delete user from auth.users
    await adminClient.auth.admin.deleteUser(targetUserId).catch(() => {});

    return successResponse({ id: targetUserId, message: 'User deleted successfully' });
  } catch (error) {
    return handleError(error);
  }
}
