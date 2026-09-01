/**
 * GET /api/inventory/summary
 *
 * Returns pig counts grouped by type.
 */

import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';
import type { InventorySummary } from '@/types/api';

interface AnimalRow {
  animal_type: string;
  health_status: string;
  status: string;
}

export async function GET() {
  try {
    await getAuthUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('animals')
      .select('animal_type, health_status, status');

    if (error) throw error;

    const animals = (data as unknown as AnimalRow[]) ?? [];
    const activeAnimals = animals.filter(a => a.status === 'active');

    // Get deceased count for current month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

    const { count: deceasedCount } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deceased')
      .gte('updated_at', monthStart);

    const summary: InventorySummary = {
      total_active: activeAnimals.length,
      breeding_sows: activeAnimals.filter(a => a.animal_type === 'breeding_sow').length,
      piglets: activeAnimals.filter(a => a.animal_type === 'piglet').length,
      market_ready: activeAnimals.filter(a => a.animal_type === 'market_ready').length,
      sick_count: activeAnimals.filter(a => a.health_status === 'sick').length,
      deceased_this_month: deceasedCount ?? 0,
    };

    return successResponse(summary);
  } catch (error) {
    return handleError(error);
  }
}
