'use client';

import { useState, useCallback } from 'react';
import type {
  InventorySummary,
  AnimalFilters,
  CreateAnimalRequest,
  UpdateAnimalRequest,
  PenWithAnimals,
} from '@/types/api';
import type { Animal } from '@/types/database';

export function useInventory() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [pens, setPens] = useState<PenWithAnimals[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/summary');
      if (!res.ok) throw new Error('Failed to fetch inventory summary');
      const json = await res.json();
      setSummary(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const fetchAnimals = useCallback(async (filters: AnimalFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.animal_type) params.set('animal_type', filters.animal_type);
      if (filters.health_status) params.set('health_status', filters.health_status);
      if (filters.status) params.set('status', filters.status);
      if (filters.pen_id) params.set('pen_id', filters.pen_id);

      const res = await fetch(`/api/inventory/animals${params.toString() ? `?${params}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch animals');
      const json = await res.json();
      setAnimals(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPens = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/pens');
      if (!res.ok) throw new Error('Failed to fetch pens');
      const json = await res.json();
      setPens(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const addAnimal = useCallback(async (data: CreateAnimalRequest) => {
    setError(null);
    try {
      const res = await fetch('/api/inventory/animals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Failed to add animal');
      }
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return { error: msg };
    }
  }, []);

  const updateAnimal = useCallback(async (id: string, data: UpdateAnimalRequest) => {
    setError(null);
    try {
      const res = await fetch(`/api/inventory/animals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Failed to update animal');
      }
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return { error: msg };
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchSummary(), fetchAnimals(), fetchPens()]);
    setIsLoading(false);
  }, [fetchSummary, fetchAnimals, fetchPens]);

  return {
    summary,
    animals,
    pens,
    isLoading,
    error,
    fetchSummary,
    fetchAnimals,
    fetchPens,
    addAnimal,
    updateAnimal,
    fetchAll,
  };
}
