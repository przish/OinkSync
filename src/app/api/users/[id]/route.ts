/**
 * PATCH /api/users/[id]
 *
 * Update a team member's details (admin only).
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
    try {
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...(body.full_name ? { full_name: body.full_name } : {}),
          ...(body.role ? { role: body.role } : {}),
        },
      });
    } catch {
      // Ignore if auth user doesn't exist or fails metadata sync
    }

    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
}
