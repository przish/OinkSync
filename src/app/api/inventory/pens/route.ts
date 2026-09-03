/**
 * GET /api/inventory/pens
 *
 * List all pens with current animal counts and capacity info.
 */

import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
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
