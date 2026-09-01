/**
 * GET  /api/pen-logs - Get pen daily logs (filtered by pen, date range)
 * POST /api/pen-logs - Create a new daily pen log
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUserProfile, requireRole } from '@/lib/auth';
import { successResponse, handleError, ValidationError } from '@/lib/errors';
import {
  validatePagination,
  parseDateRange,
  requireDate,
  requireUUID,
  requireNonNegativeNumber,
  optionalEnum,
} from '@/lib/validation';
import { CLEANING_STATUSES } from '@/lib/constants';
import type { PaginatedResponse, PenLogWithDetails } from '@/types/api';
import type { PenDailyLog } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    await getAuthUserProfile();
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const { page, limit, offset } = validatePagination(searchParams);
    const { start_date, end_date } = parseDateRange(searchParams);
    const penId = searchParams.get('pen_id');

    let query = supabase
      .from('pen_daily_logs')
      .select(
        '*, pen:pens!pen_daily_logs_pen_id_fkey(pen_number, pen_name), logged_by:users!pen_daily_logs_logged_by_user_id_fkey(full_name)',
        { count: 'exact' }
      );

    if (penId) query = query.eq('pen_id', penId);
    if (start_date) query = query.gte('log_date', start_date);
    if (end_date) query = query.lte('log_date', end_date);

    query = query
      .order('log_date', { ascending: false })
      .order('log_time', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<PenLogWithDetails> = {
      data: (data as unknown as PenLogWithDetails[]) ?? [],
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
    const logDate = requireDate(body.log_date, 'log_date');
    const feedAmountKg = requireNonNegativeNumber(body.feed_amount_kg, 'feed_amount_kg');

    const cleaningStatus = optionalEnum(body.cleaning_status, CLEANING_STATUSES, 'cleaning_status');

    let cleanlinessScore: number | null = null;
    if (body.cleanliness_score !== undefined && body.cleanliness_score !== null) {
      const score = Number(body.cleanliness_score);
      if (isNaN(score) || score < 1 || score > 10) {
        throw new ValidationError('Cleanliness score must be between 1 and 10.');
      }
      cleanlinessScore = score;
    }

    const { data: penData, error: penError } = await supabase
      .from('pens')
      .select('id')
      .eq('id', penId)
      .single();

    if (penError || !penData) {
      throw new ValidationError(`Pen ${penId} not found.`);
    }

    const insertData = {
      pen_id: penId,
      logged_by_user_id: profile.id,
      log_date: logDate,
      feed_type: body.feed_type || null,
      feed_amount_kg: feedAmountKg,
      water_provided: body.water_provided !== false,
      health_observations: body.health_observations || null,
      cleaning_status: cleaningStatus || null,
      cleanliness_score: cleanlinessScore,
      animals_died: body.animals_died ? Number(body.animals_died) : 0,
      animals_sick: body.animals_sick ? Number(body.animals_sick) : 0,
      mortality_cause: body.mortality_cause || null,
      general_notes: body.general_notes || null,
      issues_reported: body.issues_reported || false,
    };

    const { data, error } = await supabase
      .from('pen_daily_logs')
      .insert(insertData as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    if (cleaningStatus === 'cleaned') {
      await supabase
        .from('pens')
        .update({ last_cleaned_date: logDate } as Record<string, unknown>)
        .eq('id', penId);
    }

    return successResponse(data as unknown as PenDailyLog, 201);
  } catch (error) {
    return handleError(error);
  }
}
