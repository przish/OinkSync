'use client';

import { useState, useCallback } from 'react';
import type {
  PenLogFilters,
  CreatePenLogRequest,
  PenLogWithDetails,
  PaginatedResponse,
} from '@/types/api';

export function usePenLogs() {
  const [logs, setLogs] = useState<PenLogWithDetails[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<PenLogWithDetails>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (filters: PenLogFilters & { page?: number; limit?: number } = {}) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.pen_id) params.set('pen_id', filters.pen_id);
        if (filters.start_date) params.set('start_date', filters.start_date);
        if (filters.end_date) params.set('end_date', filters.end_date);
        if (filters.page) params.set('page', String(filters.page));
        if (filters.limit) params.set('limit', String(filters.limit));

        const res = await fetch(`/api/pen-logs${params.toString() ? `?${params}` : ''}`);
        if (!res.ok) throw new Error('Failed to fetch pen logs');
        const json = await res.json();
        setLogs(json.data ?? []);
        setPagination(json.pagination ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const addLog = useCallback(async (data: CreatePenLogRequest) => {
    setError(null);
    try {
      const res = await fetch('/api/pen-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Failed to create pen log');
      }
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return { error: msg };
    }
  }, []);

  return {
    logs,
    pagination,
    isLoading,
    error,
    fetchLogs,
    addLog,
  };
}
