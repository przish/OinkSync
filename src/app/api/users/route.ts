/**
 * GET /api/users
 *
 * List all team members from public.users database table.
 */

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getAuthUser();
    let supabase;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = await createClient();
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return successResponse(users ?? []);
  } catch (error) {
    return handleError(error);
  }
}
