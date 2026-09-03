/**
 * POST /api/storage/receipt
 *
 * Uploads a transaction receipt to Supabase Storage.
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';
import {
  RECEIPT_BUCKET,
  RECEIPT_MAX_SIZE_BYTES,
  RECEIPT_ALLOWED_TYPES,
} from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new ValidationError('A receipt file is required.');
    }

    if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
      throw new ValidationError(
        `File type "${file.type}" is not allowed. Allowed types: ${RECEIPT_ALLOWED_TYPES.join(', ')}`
      );
    }

    if (file.size > RECEIPT_MAX_SIZE_BYTES) {
      throw new ValidationError(
        `File size exceeds the maximum limit of ${RECEIPT_MAX_SIZE_BYTES / 1024 / 1024}MB.`
      );
    }

    const supabase = createAdminClient();
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const storagePath = `${user.id}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(RECEIPT_BUCKET)
      .getPublicUrl(storagePath);

    return successResponse(
      {
        url: urlData.publicUrl,
        filename: file.name,
        path: storagePath,
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
