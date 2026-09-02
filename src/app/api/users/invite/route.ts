import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthUserProfile } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';

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
    
    // 1. Create the user in auth.users
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name, role }
    });
    
    if (authError) {
      // If user already exists in auth, Supabase returns an error, which is fine
      // We will surface it to the frontend
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
    
    return successResponse(userData, 201);
  } catch (error) {
    return handleError(error);
  }
}
