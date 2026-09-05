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
    const authUsersMap: Record<string, boolean> = {};

    try {
      const adminClient = createAdminClient();
      supabase = adminClient;
      const { data: authData } = await adminClient.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach((u) => {
          const mustChange = u.user_metadata?.must_change_password === true;
          authUsersMap[u.id] = !mustChange;
        });
      }
    } catch {
      supabase = await createClient();
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const enrichedUsers = (users ?? []).map((u) => ({
      ...u,
      password_changed: authUsersMap[u.id] ?? true,
    }));

    return successResponse(enrichedUsers);
  } catch (error) {
    return handleError(error);
  }
}
