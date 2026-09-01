/**
 * PATCH /api/inventory/animals/[id]
 *
 * Update an animal's status, weight, health, or other fields.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { successResponse, handleError, NotFoundError } from '@/lib/errors';
import { requireUUID, optionalEnum } from '@/lib/validation';
import { HEALTH_STATUSES, ANIMAL_STATUSES } from '@/lib/constants';
import type { Animal } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await requireRole('admin', 'pen_manager');
    const supabase = await createClient();
    const { id } = await params;
    const animalId = requireUUID(id, 'animal_id');

    const body = await request.json();

    const { data: existingData, error: fetchError } = await supabase
      .from('animals')
      .select('*')
      .eq('id', animalId)
      .single();

    if (fetchError || !existingData) {
      throw new NotFoundError(`Animal ${animalId} not found.`);
    }

    const existing = existingData as unknown as Animal;

    const updateData: Record<string, unknown> = {};

    if (body.health_status !== undefined) {
      optionalEnum(body.health_status, HEALTH_STATUSES, 'health_status');
      updateData.health_status = body.health_status;
      if (body.health_status === 'dead') {
        updateData.status = 'deceased';
      }
    }

    if (body.status !== undefined) {
      optionalEnum(body.status, ANIMAL_STATUSES, 'status');
      updateData.status = body.status;
    }

    if (body.current_weight !== undefined) {
      updateData.current_weight = Number(body.current_weight);
      updateData.last_weighed_date = new Date().toISOString().split('T')[0];
    }

    if (body.pen_id !== undefined) {
      requireUUID(body.pen_id, 'pen_id');
      updateData.pen_id = body.pen_id;
    }

    if (body.sale_date !== undefined) {
      updateData.sale_date = body.sale_date;
      updateData.status = 'sold';
    }

    if (body.sale_price !== undefined) {
      updateData.sale_price = Number(body.sale_price);
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.litter_count !== undefined) {
      updateData.litter_count = Number(body.litter_count);
    }

    if (body.last_litter_date !== undefined) {
      updateData.last_litter_date = body.last_litter_date;
    }

    const { data, error } = await supabase
      .from('animals')
      .update(updateData as Record<string, unknown>)
      .eq('id', animalId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      user_id: profile.id,
      action: 'updated_animal',
      table_name: 'animals',
      record_id: animalId,
      old_values: { status: existing.status, health_status: existing.health_status },
      new_values: updateData,
    } as Record<string, unknown>);

    return successResponse(data as unknown as Animal);
  } catch (error) {
    return handleError(error);
  }
}
