/**
 * GET  /api/inventory/animals - List all animals (paginated, filtered)
 * POST /api/inventory/animals - Add a new animal
 */

import { NextRequest } from 'next/server';
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

    if ((currentCount ?? 0) >= pen.capacity) {
      throw new ValidationError(
        `Pen is at full capacity (${pen.capacity}). Cannot add more animals.`
      );
    }

    const insertData = {
      pen_id: penId,
      animal_type: animalType,
      animal_code: body.animal_code || null,
      birth_date: birthDate,
      gender: body.gender || null,
      health_status: body.health_status || 'healthy',
      current_weight: body.current_weight || null,
      last_weighed_date: body.current_weight ? new Date().toISOString().split('T')[0] : null,
      is_breeding_sow: body.is_breeding_sow || false,
      notes: body.notes || null,
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
      new_values: { animal_type: animalType, pen_id: penId, animal_code: body.animal_code },
    } as Record<string, unknown>);

    return successResponse(animal, 201);
  } catch (error) {
    return handleError(error);
  }
}
