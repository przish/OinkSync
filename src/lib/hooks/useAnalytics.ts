'use client';

import { useState, useCallback } from 'react';
import type {
  KpiData,
  RevenueExpenseDataPoint,
  ExpenseBreakdownItem,
  RoiTrendDataPoint,
  ScalingReadiness,
} from '@/types/api';

export type TimeRange = '6mo' | '1yr' | '2yr';

function timeRangeToMonths(range: TimeRange): number {
  return range === '6mo' ? 6 : range === '1yr' ? 12 : 24;
}

export function useAnalytics() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [revenueExpense, setRevenueExpense] = useState<RevenueExpenseDataPoint[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdownItem[]>([]);
  const [roiTrend, setRoiTrend] = useState<RoiTrendDataPoint[]>([]);
  const [scalingReadiness, setScalingReadiness] = useState<ScalingReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKpi = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/kpi');
      if (!res.ok) throw new Error('Failed to fetch KPI');
      const json = await res.json();
      setKpi(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const fetchRevenueExpense = useCallback(async (timeRange: TimeRange = '1yr') => {
    setIsLoading(true);
    setError(null);
    try {
      const months = timeRangeToMonths(timeRange);
      const res = await fetch(`/api/analytics/revenue-expenses?months=${months}`);
      if (!res.ok) throw new Error('Failed to fetch revenue/expense data');
      const json = await res.json();
      setRevenueExpense(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchExpenseBreakdown = useCallback(async (timeRange: TimeRange = '1yr') => {
    try {
      const months = timeRangeToMonths(timeRange);
      const res = await fetch(`/api/analytics/expense-breakdown?months=${months}`);
      if (!res.ok) throw new Error('Failed to fetch expense breakdown');
      const json = await res.json();
      setExpenseBreakdown(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const fetchRoiTrend = useCallback(async (timeRange: TimeRange = '1yr') => {
    try {
      const months = timeRangeToMonths(timeRange);
      const res = await fetch(`/api/analytics/roi-trend?months=${months}`);
      if (!res.ok) throw new Error('Failed to fetch ROI trend');
      const json = await res.json();
      setRoiTrend(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const fetchScalingReadiness = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/scaling-readiness');
      if (!res.ok) throw new Error('Failed to fetch scaling readiness');
      const json = await res.json();
      setScalingReadiness(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }, []);

  const fetchAll = useCallback(async (timeRange: TimeRange = '1yr') => {
    setIsLoading(true);
    setError(null);
    await Promise.all([
      fetchKpi(),
      fetchRevenueExpense(timeRange),
      fetchExpenseBreakdown(timeRange),
      fetchRoiTrend(timeRange),
      fetchScalingReadiness(),
    ]);
    setIsLoading(false);
  }, [fetchKpi, fetchRevenueExpense, fetchExpenseBreakdown, fetchRoiTrend, fetchScalingReadiness]);

  return {
    kpi,
    revenueExpense,
    expenseBreakdown,
    roiTrend,
    scalingReadiness,
    isLoading,
    error,
    fetchKpi,
    fetchRevenueExpense,
    fetchExpenseBreakdown,
    fetchRoiTrend,
    fetchScalingReadiness,
    fetchAll,
  };
}
