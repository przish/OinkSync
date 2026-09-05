'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Target, TrendingUp, CheckCircle, AlertCircle, Calendar, ArrowRight, DollarSign, Clock, Layers, ShieldAlert } from 'lucide-react';
import { TopBar } from '@/components/Navigation/TopBar';
import { Card, CardHeader } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { SkeletonCard } from '@/components/UI/Spinner';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatting';
import { createClient } from '@/lib/supabase/client';

interface ScalingData {
  is_ready: boolean;
  current_capital: number;
  required_capital: number;
  gap_amount: number;
  recommendation: string;
  projected_scale_date: string;
  target_sows: number;
  target_pig_count: number;
  target_monthly_profit?: number;
  sow_cost: number;
  cost_per_pig_rearing: number;
  cycle_months: number;
}

export default function ScalingPlanPage() {
  const [data, setData] = useState<ScalingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // User-configurable scaling parameters
  const [targetSows, setTargetSows] = useState<number>(3);
  const [sowCost, setSowCost] = useState<number>(25000);
  const [pigletsPerSow, setPigletsPerSow] = useState<number>(10);
  const [litterMortalityRate, setLitterMortalityRate] = useState<number>(5);
  const [rearingCostPerPig, setRearingCostPerPig] = useState<number>(4760);
  const [salePricePerKg, setSalePricePerKg] = useState<number>(220);
  const [targetMarketKg, setTargetMarketKg] = useState<number>(90);
  const [startDate, setStartDate] = useState<string>(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth.toISOString().split('T')[0];
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/scaling-readiness');
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        if (json.data.target_sows) setTargetSows(json.data.target_sows);
        if (json.data.sow_cost) setSowCost(json.data.sow_cost);
        if (json.data.cost_per_pig_rearing) setRearingCostPerPig(json.data.cost_per_pig_rearing);
      }

      // Also get live business profile market numbers
      const supabase = createClient();
      const { data: bp } = await supabase.from('business_profile').select('*').maybeSingle();
      if (bp) {
        if (bp.expected_sale_price_per_pig && bp.target_market_weight_kg) {
          setTargetMarketKg(bp.target_market_weight_kg || 90);
          setSalePricePerKg(Math.round(bp.expected_sale_price_per_pig / (bp.target_market_weight_kg || 90)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Total Piglets Expected & Mortality Loss
  const totalBornPiglets = targetSows * pigletsPerSow;
  const deceasedPiglets = Math.round(totalBornPiglets * (litterMortalityRate / 100));
  const marketableFatteners = Math.max(0, totalBornPiglets - deceasedPiglets);

  // Capital Calculations: Sow Purchase + Feed/Medication up to Fattener Stage
  const sowAcquisitionTotal = targetSows * sowCost;
  const rearingExpensesTotal = marketableFatteners * rearingCostPerPig;
  const requiredCapital = sowAcquisitionTotal + rearingExpensesTotal;

  const currentCapital = data?.current_capital || 0;
  const capitalGap = Math.max(0, requiredCapital - currentCapital);
  const isReady = currentCapital >= requiredCapital;

  // Expected Revenue at Month 9 Sales
  const expectedRevenuePerPig = salePricePerKg * targetMarketKg;
  const projectedTotalHarvestRevenue = marketableFatteners * expectedRevenuePerPig;
  const projectedNetHarvestProfit = projectedTotalHarvestRevenue - rearingExpensesTotal;
  const projectedCycleRoi = requiredCapital > 0 ? (projectedNetHarvestProfit / requiredCapital) * 100 : 0;

  // Ideal (0% mortality) baseline calculations for Margin of Error:
  const idealHarvestRevenue = totalBornPiglets * expectedRevenuePerPig;
  const idealRearingExpenses = totalBornPiglets * rearingCostPerPig;
  const idealNetHarvestProfit = idealHarvestRevenue - idealRearingExpenses;

  // Profit Margin of Error (variance between 0% mortality benchmark and realistic expectation)
  const profitMarginOfErrorAmount = Math.max(0, idealNetHarvestProfit - projectedNetHarvestProfit);
  const profitMarginOfErrorPercent = idealNetHarvestProfit > 0
    ? (profitMarginOfErrorAmount / idealNetHarvestProfit) * 100
    : 0;

  // 9-Month Staggered Cashflow Plan
  const staggeredCashflow = useMemo(() => {
    const baseDate = new Date(startDate || Date.now());
    const stages = [
      {
        month: 1,
        name: 'Sow Procurement & Breeding Prep',
        description: `Procure ${targetSows} breeding sows and setup initial mating & breeding rations.`,
        outflow: sowAcquisitionTotal + rearingExpensesTotal * 0.05,
        inflow: 0,
      },
      {
        month: 2,
        name: 'Gestation Month 1',
        description: 'First 30 days of pregnancy; pregnancy ultrasound verification.',
        outflow: rearingExpensesTotal * 0.05,
        inflow: 0,
      },
      {
        month: 3,
        name: 'Gestation Month 2',
        description: 'Mid-gestation maintenance feeding and sow vaccination.',
        outflow: rearingExpensesTotal * 0.05,
        inflow: 0,
      },
      {
        month: 4,
        name: 'Gestation Month 3',
        description: 'Late gestation fetal development; transfer to clean farrowing pens.',
        outflow: rearingExpensesTotal * 0.08,
        inflow: 0,
      },
      {
        month: 5,
        name: 'Farrowing & Lactation',
        description: `Birth of approx. ${totalBornPiglets} piglets (${deceasedPiglets > 0 ? `${deceasedPiglets} estimated loss from ${litterMortalityRate}% mortality, yielding ${marketableFatteners} surviving piglets` : 'zero expected mortality'}). Colostrum feeding & initial creep feed.`,
        outflow: rearingExpensesTotal * 0.12,
        inflow: 0,
      },
      {
        month: 6,
        name: 'Nursery Weaning',
        description: 'Piglets weaned from sows; full transition to starter feeds in nursery pens.',
        outflow: rearingExpensesTotal * 0.15,
        inflow: 0,
      },
      {
        month: 7,
        name: 'Grower Stage 1',
        description: 'Transition from starter to grower pellets; peak frame growth phase.',
        outflow: rearingExpensesTotal * 0.20,
        inflow: 0,
      },
      {
        month: 8,
        name: 'Grower Stage 2 & Finisher',
        description: 'Transition to finisher sacks; weight reaching 70–80kg.',
        outflow: rearingExpensesTotal * 0.20,
        inflow: 0,
      },
      {
        month: 9,
        name: 'Final Finishing & Market Harvest!',
        description: `${marketableFatteners} animals achieve ~${targetMarketKg}kg target weight. Harvest and market dispatch to buyers.`,
        outflow: rearingExpensesTotal * 0.10,
        inflow: projectedTotalHarvestRevenue,
      },
    ];

    return stages.map((st) => {
      const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (st.month - 1), 1);
      const formattedMonth = monthDate.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      const net = st.inflow - st.outflow;
      return {
        ...st,
        dateLabel: formattedMonth,
        netCashflow: net,
      };
    });
  }, [startDate, targetSows, sowAcquisitionTotal, rearingExpensesTotal, totalBornPiglets, deceasedPiglets, litterMortalityRate, marketableFatteners, targetMarketKg, projectedTotalHarvestRevenue]);

  return (
    <>
      <TopBar title="Scaling Plan" />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {isLoading ? (
          <SkeletonCard />
        ) : (
          <>
            {/* Status Header Banner */}
            <div
              style={{
                background: 'var(--palette-sage)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px 32px',
                color: 'var(--palette-cream)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 130, opacity: 0.1, userSelect: 'none' }}>
                {isReady ? '🎉' : '📈'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--palette-blush)',
                    border: '1px solid var(--palette-rose)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isReady ? <CheckCircle size={28} color="var(--neutral-dark)" /> : <Target size={28} color="var(--neutral-dark)" />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--palette-cream)' }}>
                      {isReady ? 'Ready to Scale!' : 'Upscale Capital Planning'}
                    </h2>
                    <span
                      style={{
                        padding: '3px 10px',
                        background: 'var(--palette-blush)',
                        color: 'var(--neutral-dark)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      9 Months Per Cycle
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--palette-cream)', opacity: 0.9, marginTop: 4 }}>
                    {isReady
                      ? `Farm capital of ${formatCurrency(currentCapital)} is ready to fund ${targetSows} sows. Revenue before mortality: ${formatCurrency(idealHarvestRevenue)} (${totalBornPiglets} born); Revenue after ${litterMortalityRate}% mortality: ${formatCurrency(projectedTotalHarvestRevenue)} (${marketableFatteners} harvest pigs).`
                      : `Capital gap of ${formatCurrency(capitalGap)} required to fund ${targetSows} sows. Revenue before mortality: ${formatCurrency(idealHarvestRevenue)} (${totalBornPiglets} born); Revenue after ${litterMortalityRate}% mortality: ${formatCurrency(projectedTotalHarvestRevenue)} (${marketableFatteners} harvest pigs).`}
                  </p>
                </div>
              </div>
            </div>

            {/* Core Upscale Parameters & Financial Requirements */}
            <div className="grid-cards">
              {/* Card 1: Upscale Parameters */}
              <Card>
                <CardHeader
                  title="Upscale Sizing"
                  subtitle="Sows & piglet targets"
                  icon={<Target size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="target-sows">Target Breeding Sows to Add</label>
                    <input
                      id="target-sows"
                      type="number"
                      min="1"
                      className="form-input"
                      value={targetSows}
                      onChange={(e) => setTargetSows(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: '#14532D', background: '#FFFDEC', border: '1px solid #86A788', padding: '3px 8px', borderRadius: 4, display: 'inline-block' }}>
                        Referenced from Target Monthly Profit: {formatCurrency(data?.target_monthly_profit || 50000)}
                      </span>
                    </div>
                  </div>

                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="sow-cost">Cost per Sow (₱)</label>
                      <input
                        id="sow-cost"
                        type="number"
                        step="500"
                        min="0"
                        className="form-input"
                        value={sowCost}
                        onChange={(e) => setSowCost(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="piglets-sow">Piglets per Sow</label>
                      <input
                        id="piglets-sow"
                        type="number"
                        min="1"
                        className="form-input"
                        value={pigletsPerSow}
                        onChange={(e) => setPigletsPerSow(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" htmlFor="litter-mortality" style={{ margin: 0 }}>
                        Litter Mortality Rate (%)
                      </label>
                      <span style={{ fontSize: 13, fontWeight: 800, color: litterMortalityRate > 10 ? 'var(--error)' : 'var(--secondary-green)' }}>
                        {litterMortalityRate}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <input
                        id="litter-mortality"
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        style={{ flex: 1, accentColor: 'var(--secondary-green)' }}
                        value={litterMortalityRate}
                        onChange={(e) => setLitterMortalityRate(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                      />
                      <input
                        type="number"
                        min="0"
                        max="30"
                        style={{ width: 64, textAlign: 'center' }}
                        className="form-input"
                        value={litterMortalityRate}
                        onChange={(e) => setLitterMortalityRate(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'var(--palette-cream)', borderRadius: 'var(--radius-sm)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Total Born Piglets:</span>
                      <strong>{totalBornPiglets} piglets</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Mortality Allowance ({litterMortalityRate}%):</span>
                      <strong style={{ color: deceasedPiglets > 0 ? 'var(--error)' : 'inherit' }}>
                        {deceasedPiglets > 0 ? `-${deceasedPiglets} deceased` : '0 loss'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--card-border)', paddingTop: 6, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--neutral-dark)' }}>Marketable Fatteners:</span>
                      <strong style={{ fontWeight: 800, color: 'var(--secondary-green)', fontSize: 13 }}>{marketableFatteners} pigs</strong>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: Required Capital Breakdown */}
              <Card>
                <CardHeader
                  title="Required Capital"
                  subtitle="Sows + full rearing to fattener"
                  icon={<DollarSign size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted-dark)' }}>Sow Purchase Capital:</span>
                    <strong style={{ fontSize: 14 }}>{formatCurrency(sowAcquisitionTotal)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted-dark)' }}>
                      Fattener Rearing ({marketableFatteners} × {formatCurrency(rearingCostPerPig)}):
                    </span>
                    <strong style={{ fontSize: 14 }}>{formatCurrency(rearingExpensesTotal)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Total Required Capital:</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--secondary-green)' }}>
                      {formatCurrency(requiredCapital)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px dashed var(--card-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--neutral-dark)', fontWeight: 600 }}>Current Farm Capital:</span>
                    <strong style={{ fontSize: 14, color: 'var(--income-green)' }}>{formatCurrency(currentCapital)}</strong>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      padding: '10px 12px',
                      background: isReady ? 'var(--palette-cream)' : 'var(--palette-rose)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isReady ? 'var(--palette-sage)' : 'var(--palette-blush)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: isReady ? 'var(--income-green)' : 'var(--expense-red)' }}>
                      {isReady ? 'Surplus Capital:' : 'Capital Gap:'}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: isReady ? 'var(--income-green)' : 'var(--expense-red)' }}>
                      {isReady ? `+${formatCurrency(currentCapital - requiredCapital)}` : formatCurrency(capitalGap)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 3: Cycle Timeline & Start Date */}
              <Card>
                <CardHeader
                  title="Cycle Timeline"
                  subtitle="Start date & projected harvest"
                  icon={<Calendar size={18} color="var(--secondary-green)" />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-date">Estimated Start Date</label>
                    <input
                      id="start-date"
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted-dark)' }}>Cycle Duration:</span>
                    <strong>9 Months</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--muted-dark)' }}>Projected Sales Harvest:</span>
                    <strong>{staggeredCashflow[8]?.dateLabel || '—'}</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--card-border)', paddingTop: 10, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Revenue (Before Mortality Rate):</span>
                      <strong style={{ color: 'var(--neutral-dark)' }}>{formatCurrency(idealHarvestRevenue)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--muted-dark)' }}>Revenue (After {litterMortalityRate}% Mortality):</span>
                      <strong style={{ color: 'var(--success)' }}>{formatCurrency(projectedTotalHarvestRevenue)}</strong>
                    </div>

                    {deceasedPiglets > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--error)' }}>
                        <span>Mortality Deduction (-{deceasedPiglets} pigs):</span>
                        <strong>-{formatCurrency(idealHarvestRevenue - projectedTotalHarvestRevenue)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Profit Margin of Error & Sensitivity Analysis */}
            <Card>
              <CardHeader
                title="Profit Margin of Error & Risk Sensitivity"
                subtitle="Calculates the variance between 0% optimal benchmark and configured mortality risk"
                icon={<ShieldAlert size={18} color="var(--secondary-green)" />}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 4 }}>
                <div style={{
                  padding: '16px',
                  background: 'var(--palette-cream)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-dark)' }}>Optimal Benchmark (0% Mortality)</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--palette-rose)', borderRadius: 12, fontWeight: 700 }}>Optimal</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-dark)' }}>
                    All {totalBornPiglets} piglets reared to ~{targetMarketKg}kg market weight
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Gross Revenue:</span>
                    <strong style={{ fontSize: 13 }}>{formatCurrency(idealHarvestRevenue)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Net Harvest Profit:</span>
                    <strong style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(idealNetHarvestProfit)}</strong>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: 'var(--palette-cream)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-dark)' }}>Realized Projection ({litterMortalityRate}% Mortality)</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--palette-blush)', borderRadius: 12, fontWeight: 700 }}>Realistic</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-dark)' }}>
                    {marketableFatteners} surviving fatteners marketed (-{deceasedPiglets} deceased)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Gross Revenue:</span>
                    <strong style={{ fontSize: 13 }}>{formatCurrency(projectedTotalHarvestRevenue)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-dark)' }}>Net Harvest Profit:</span>
                    <strong style={{ fontSize: 15, fontWeight: 800, color: 'var(--secondary-green)' }}>{formatCurrency(projectedNetHarvestProfit)}</strong>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: 'var(--palette-rose)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--palette-blush)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-dark)' }}>Profit Margin of Error</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(0,0,0,0.06)', borderRadius: 12, fontWeight: 700 }}>Risk Buffer</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted-dark)' }}>
                    Expected profit reduction due to piglet mortality
                  </div>
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--neutral-dark)' }}>
                      ± {formatCurrency(profitMarginOfErrorAmount)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-dark)' }}>
                      {formatPercentage(profitMarginOfErrorPercent)} margin of error from optimal profit
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Staggered 9-Month Cashflow Plan */}
            <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--neutral-dark)' }}>
                    Staggered 9-Month Cashflow Plan
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--muted-dark)', marginTop: 2 }}>
                    Optimizes operational liquidity by distributing feed and care expenditures across each growth phase
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-dark)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Projected Cycle ROI
                  </span>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--secondary-green)', margin: 0 }}>
                    {formatPercentage(projectedCycleRoi)}
                  </p>
                </div>
              </div>

              <div
                className="table-wrapper"
                style={{
                  border: 'none',
                  borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
                  overflow: 'hidden',
                }}
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Month</th>
                      <th style={{ width: 110 }}>Date</th>
                      <th>Stage & Growth Milestone</th>
                      <th>Operational Activities</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Outflow (₱)</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Inflow (₱)</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Net Cashflow (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staggeredCashflow.map((row) => (
                      <tr key={row.month}>
                        <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>M{row.month}</td>
                        <td style={{ fontWeight: 600, color: 'var(--muted-dark)', whiteSpace: 'nowrap' }}>{row.dateLabel}</td>
                        <td style={{ fontWeight: 700, color: 'var(--neutral-dark)' }}>{row.name}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted-dark)' }}>{row.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--expense-red)', whiteSpace: 'nowrap' }}>
                          {row.outflow > 0 ? `-${formatCurrency(row.outflow)}` : '₱0.00'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--income-green)', whiteSpace: 'nowrap' }}>
                          {row.inflow > 0 ? `+${formatCurrency(row.inflow)}` : '₱0.00'}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          fontWeight: 800,
                          color: row.netCashflow >= 0 ? 'var(--income-green)' : 'var(--expense-red)',
                          whiteSpace: 'nowrap',
                        }}>
                          {`${row.netCashflow >= 0 ? '+' : ''}${formatCurrency(row.netCashflow)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
