/**
 * GET  /api/inventory/animals - List all animals (paginated, filtered)
 * POST /api/inventory/animals - Add a new animal or batch piglets
 */

import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserProfile, requireRole } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';
import {
  validatePagination,
  requireDate,
  requireUUID,
  validateAnimalType,
  optionalEnum,
} from '@/lib/validation';
import { ANIMAL_TYPES, HEALTH_STATUSES, ANIMAL_STATUSES } from '@/lib/constants';
import type { PaginatedResponse } from '@/types/api';
import type { Animal } from '@/types/database';

interface PenCapacity { id: string; capacity: number }

export async function GET(request: NextRequest) {
  try {
    await getAuthUserProfile();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const { page, limit, offset } = validatePagination(searchParams);

    const animalType = optionalEnum(searchParams.get('animal_type'), ANIMAL_TYPES, 'animal_type');
    const healthStatus = optionalEnum(searchParams.get('health_status'), HEALTH_STATUSES, 'health_status');
    const status = optionalEnum(searchParams.get('status'), ANIMAL_STATUSES, 'status');
    const penId = searchParams.get('pen_id');

    let query = supabase
      .from('animals')
      .select('*, pen:pens!animals_pen_id_fkey(pen_number, pen_name)', { count: 'exact' });

    if (animalType) query = query.eq('animal_type', animalType);
    if (healthStatus) query = query.eq('health_status', healthStatus);
    if (status) query = query.eq('status', status);
    if (penId) query = query.eq('pen_id', penId);

    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') === 'asc';

    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<Animal> = {
      data: (data as unknown as Animal[]) ?? [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };

    return successResponse(response);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireRole('admin', 'pen_manager');
    const supabase = await createClient();
    const body = await request.json();

    const penId = requireUUID(body.pen_id, 'pen_id');
    const animalType = validateAnimalType(body.animal_type);
    const birthDate = requireDate(body.birth_date, 'birth_date');

    // 1. Fetch Pen Capacity
    const { data: penData, error: penError } = await supabase
      .from('pens')
      .select('id, capacity')
      .eq('id', penId)
      .single();

    if (penError || !penData) {
      throw new ValidationError(`Pen ${penId} not found.`);
    }

    const pen = penData as unknown as PenCapacity;

    const { count: currentCount } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('pen_id', penId)
      .eq('status', 'active');

    const quantity = Math.max(1, Number(body.quantity) || 1);

    if (((currentCount ?? 0) + quantity) > pen.capacity) {
      throw new ValidationError(
        `Pen capacity exceeded. Pen has ${currentCount ?? 0}/${pen.capacity} animals. Cannot add ${quantity} more.`
      );
    }

    // 2. Handle Batch Piglet Creation
    if (animalType === 'piglet') {
      const maleCount = Number(body.male_count) || 0;
      const femaleCount = Number(body.female_count) || 0;

      if (maleCount + femaleCount > quantity) {
        throw new ValidationError(
          `Total male count (${maleCount}) and female count (${femaleCount}) cannot exceed total piglet quantity (${quantity}).`
        );
      }
    }

    if (animalType === 'piglet' && quantity > 1) {
      const maleCount = Number(body.male_count) || 0;
      const femaleCount = Number(body.female_count) || 0;

      // Count existing piglets for sequential code generation
      const { count: existingPigletCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('animal_type', 'piglet');

      let nextIndex = (existingPigletCount ?? 0) + 1;
      const recordsToInsert = [];

      for (let i = 0; i < quantity; i++) {
        let gender: 'male' | 'female' | null = null;
        if (i < maleCount) gender = 'male';
        else if (i < (maleCount + femaleCount)) gender = 'female';

        recordsToInsert.push({
          pen_id: penId,
          animal_type: 'piglet',
          animal_code: `PIG-${String(nextIndex).padStart(3, '0')}`,
          birth_date: birthDate,
          gender: gender,
          health_status: body.health_status || 'healthy',
          current_weight: body.current_weight || null,
          last_weighed_date: body.current_weight ? new Date().toISOString().split('T')[0] : null,
          is_breeding_sow: false,
          notes: body.mother_id ? `Mother Sow ID: ${body.mother_id}${body.notes ? ` — ${body.notes}` : ''}` : body.notes || null,
        });
        nextIndex++;
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('animals')
        .insert(recordsToInsert)
        .select();

      if (insertError) throw insertError;

      // Update mother sow litter count if mother_id provided
      if (body.mother_id) {
        try {
          const { data: mother } = await supabase.from('animals').select('litter_count').eq('id', body.mother_id).single();
          if (mother) {
            await supabase.from('animals').update({
              litter_count: (Number(mother.litter_count) || 0) + 1,
              last_litter_date: birthDate,
            }).eq('id', body.mother_id);
          }
        } catch {
          // Ignore mother update error
        }
      }

      return successResponse(insertedData, 201);
    }

    // 3. Single Animal Creation (Breeding Sow or Single Piglet)
    let autoCode = body.animal_code?.trim();
    if (!autoCode) {
      if (animalType === 'breeding_sow') {
        const { count: sowCount } = await supabase
          .from('animals')
          .select('*', { count: 'exact', head: true })
          .eq('animal_type', 'breeding_sow');
        autoCode = `SOW-${String((sowCount ?? 0) + 1).padStart(3, '0')}`;
      } else {
        const { count: pigCount } = await supabase
          .from('animals')
          .select('*', { count: 'exact', head: true })
          .eq('animal_type', 'piglet');
        autoCode = `PIG-${String((pigCount ?? 0) + 1).padStart(3, '0')}`;
      }
    }

    let notesWithDetails = body.notes || '';
    if (body.breeding_stage && animalType === 'breeding_sow') {
      notesWithDetails = `Breeding Stage: ${body.breeding_stage}${notesWithDetails ? ` | ${notesWithDetails}` : ''}`;
    }
    if (body.mother_id && animalType === 'piglet') {
      notesWithDetails = `Mother Sow ID: ${body.mother_id}${notesWithDetails ? ` | ${notesWithDetails}` : ''}`;
    }

    const insertData = {
      pen_id: penId,
      animal_type: animalType,
      animal_code: autoCode,
      birth_date: birthDate,
      gender: animalType === 'breeding_sow' ? 'female' : body.gender || null,
      health_status: body.health_status || 'healthy',
      current_weight: body.current_weight || null,
      last_weighed_date: body.current_weight ? new Date().toISOString().split('T')[0] : null,
      is_breeding_sow: animalType === 'breeding_sow',
      notes: notesWithDetails || null,
    };

    const { data, error } = await supabase
      .from('animals')
      .insert(insertData as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    const animal = data as unknown as Animal;

    await supabase.from('activity_logs').insert({
      user_id: profile.id,
      action: 'added_animal',
      table_name: 'animals',
      record_id: animal.id,
      new_values: { animal_type: animalType, pen_id: penId, animal_code: autoCode },
    } as Record<string, unknown>);

    return successResponse(animal, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await requireRole('admin', 'pen_manager');
    const supabase = await createClient();
    const body = await request.json();
    const { animal_ids, status } = body;

    if (!Array.isArray(animal_ids) || animal_ids.length === 0) {
      throw new ValidationError('animal_ids must be a non-empty array of IDs');
    }
    optionalEnum(status, ANIMAL_STATUSES, 'status');

    const updateData: Record<string, unknown> = { status };
    if (status === 'sold') {
      updateData.sale_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('animals')
      .update(updateData)
      .in('id', animal_ids)
      .select();

    if (error) throw error;

    await supabase.from('activity_logs').insert({
      user_id: profile.id,
      action: `bulk_status_update_${status}`,
      table_name: 'animals',
      new_values: { animal_ids, status },
    } as Record<string, unknown>);

    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
}

