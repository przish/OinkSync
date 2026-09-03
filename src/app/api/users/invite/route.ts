import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getAuthUser, getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';

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

export async function POST(request: NextRequest) {
  try {
    const profile = await getAuthUserProfile();
    
    // Only admins can invite new members
    if (profile.role !== 'admin') {
      throw new ValidationError('Only administrators can invite new members.');
    }
    
    const body = await request.json();
    const { email, full_name, role, phone_number } = body;
    
    if (!email || !full_name || !role) {
      throw new ValidationError('Email, full name, and role are required.');
    }
    
    const adminClient = createAdminClient();
    
    const password = body.password?.trim();
    if (!password) {
      throw new ValidationError('A password is required for member account creation.');
    }

    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, must_change_password: true }
    });
    
    if (authError) {
      // If user already exists in auth, Supabase returns an error
      throw authError;
    }
    
    const userId = authData.user.id;
    
    // 2. Insert into public.users bypassing RLS
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email,
        full_name,
        role,
        phone_number: phone_number || null,
        is_active: true,
      })
      .select()
      .single();
      
    if (userError) {
      // Cleanup auth user if public table insert fails
      await adminClient.auth.admin.deleteUser(userId);
      throw userError;
    }
    
    return successResponse({ ...userData, initial_password: password }, 201);
  } catch (error) {
    return handleError(error);
  }
}
