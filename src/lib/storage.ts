/**
 * PigTrack Storage Helpers
 *
 * Receipt upload/download utilities using Supabase Storage.
 */

import { createClient } from '@/lib/supabase/server';
import {
  RECEIPT_BUCKET,
  RECEIPT_MAX_SIZE_BYTES,
  RECEIPT_ALLOWED_TYPES,
} from '@/lib/constants';
import { ValidationError } from '@/lib/errors';

/**
 * Upload a receipt file to Supabase Storage.
 *
 * @param file - The file to upload
 * @param userId - The user ID (used to namespace the file path)
 * @param transactionId - The transaction ID (used in the file path)
 * @returns Object with storage_path and public URL
 */
export async function uploadReceipt(
  file: File,
  userId: string,
  transactionId: string
): Promise<{ storagePath: string; publicUrl: string }> {
  // Validate file type
  if (!RECEIPT_ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError(
      `File type "${file.type}" is not allowed. Allowed types: ${RECEIPT_ALLOWED_TYPES.join(', ')}`
    );
  }

  // Validate file size
  if (file.size > RECEIPT_MAX_SIZE_BYTES) {
    throw new ValidationError(
      `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed size of ${RECEIPT_MAX_SIZE_BYTES / 1024 / 1024} MB.`
    );
  }

  const supabase = await createClient();

  // Generate a unique file path
  const fileExt = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const storagePath = `${userId}/${transactionId}/${timestamp}.${fileExt}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload receipt: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(RECEIPT_BUCKET)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Generate a signed URL for secure receipt access.
 * Signed URLs expire after the specified duration.
 *
 * @param storagePath - The path in Supabase Storage
 * @param expiresInSeconds - URL expiration time (default: 1 hour)
 * @returns The signed URL
 */
export async function getSignedReceiptUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a receipt file from Supabase Storage.
 *
 * @param storagePath - The path of the file to delete
 */
export async function deleteReceipt(storagePath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete receipt: ${error.message}`);
  }
}

/**
 * List all receipts for a given user.
 *
 * @param userId - The user ID to list receipts for
 * @returns Array of file objects
 */
export async function listUserReceipts(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`Failed to list receipts: ${error.message}`);
  }

  return data ?? [];
}
