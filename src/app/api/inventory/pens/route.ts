/**
 * GET /api/inventory/pens - List all pens with animal counts & dynamic status
 * POST /api/inventory/pens - Add a new pen to inventory
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError, ValidationError, ConflictError } from '@/lib/errors';
import type { Pen, Animal } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PenWithAnimalsResponse extends Pen {
  animals: Animal[];
  current_count: number;
  occupancy_percentage: number;
}

export async function GET() {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const { data: pensData, error: pensError } = await supabase
      .from('pens')
      .select('*')
      .order('pen_number', { ascending: true });

    if (pensError) throw pensError;

    const pens = (pensData as unknown as Pen[]) ?? [];

    const { data: animalsData, error: animalsError } = await supabase
      .from('animals')
      .select('pen_id, id, animal_type, health_status, status')
      .eq('status', 'active');

    if (animalsError) throw animalsError;

    const animals = (animalsData as unknown as Animal[]) ?? [];

    const pensWithAnimals: PenWithAnimalsResponse[] = pens.map((pen) => {
      const penAnimals = animals.filter(a => a.pen_id === pen.id);
      const currentCount = penAnimals.length;
      const dynamicStatus = currentCount > 0 ? 'active' : 'inactive';

      return {
        ...pen,
        status: dynamicStatus,
        animals: penAnimals,
        current_count: currentCount,
        occupancy_percentage: pen.capacity > 0
          ? Number(((currentCount / pen.capacity) * 100).toFixed(1))
          : 0,
      };
    });

    return successResponse(pensWithAnimals);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const body = await request.json();
    const penNumber = String(body.pen_number || '').trim();
    const penName = String(body.pen_name || '').trim();
    const capacity = Number(body.capacity);
    const location = body.location ? String(body.location).trim() : null;

    if (!penNumber) {
      throw new ValidationError('Pen number is required');
    }
    if (!capacity || capacity <= 0) {
      throw new ValidationError('Capacity must be greater than 0');
    }

    const resolvedName = penName || `Pen ${penNumber}`;

    // 1. Uniqueness check on pen_number
    const { data: existingNum } = await supabase
      .from('pens')
      .select('id, pen_number')
      .ilike('pen_number', penNumber)
      .maybeSingle();

    if (existingNum) {
      throw new ConflictError(`Pen ID "${penNumber}" already exists. PEN IDs must be unique.`);
    }

    // 2. Uniqueness check on pen_name
    const { data: existingName } = await supabase
      .from('pens')
      .select('id, pen_name')
      .ilike('pen_name', resolvedName)
      .maybeSingle();

    if (existingName) {
      throw new ConflictError(`A pen named "${resolvedName}" already exists. Pen names must be unique.`);
    }

    const { data: newPen, error: insertError } = await supabase
      .from('pens')
      .insert({
        pen_number: penNumber,
        pen_name: resolvedName,
        capacity,
        location: location || null,
        status: 'inactive',
      })
      .select()
      .single();

    if (insertError) {
      if ((insertError as any).code === '23505') {
        throw new ConflictError(`A pen with number "${penNumber}" already exists. PEN IDs must be unique.`);
      }
      throw insertError;
    }

    return successResponse(newPen, 201);
  } catch (error) {
    return handleError(error);
  }
}
