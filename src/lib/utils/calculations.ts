/**
 * PiggyTrack Calculation Utilities
 * ROI, scaling gap, break-even, and other financial calculations
 */

// ─── ROI ──────────────────────────────────────────────────────────────────────

/**
 * Calculate Return on Investment percentage
 * @param capital - Total capital invested
 * @param profit  - Net profit earned
 * @returns ROI as a percentage (e.g. 12.5 for 12.5%)
 */
export function calculateROI(capital: number, profit: number): number {
  if (capital <= 0) return 0;
  return (profit / capital) * 100;
}

// ─── Scaling ──────────────────────────────────────────────────────────────────

/**
 * Calculate how much more capital is needed to reach the target pig count
 * @param currentCapital - Current available capital
 * @param targetPigCount - Target number of pigs for scale
 * @param costPerPig     - Cost to rear one pig
 */
export function calculateScalingGap(
  currentCapital: number,
  targetPigCount: number,
  costPerPig: number
): number {
  const requiredCapital = targetPigCount * costPerPig;
  const gap = requiredCapital - currentCapital;
  return Math.max(0, gap);
}

/**
 * Check if current capital is enough to scale
 */
export function isReadyToScale(
  currentCapital: number,
  targetPigCount: number,
  costPerPig: number
): boolean {
  return calculateScalingGap(currentCapital, targetPigCount, costPerPig) === 0;
}

/**
 * Estimate how many months until scaling gap is closed
 * @param gap           - Remaining gap amount
 * @param monthlyProfit - Average monthly net profit
 */
export function estimateMonthsToScale(gap: number, monthlyProfit: number): number | null {
  if (monthlyProfit <= 0) return null;
  return Math.ceil(gap / monthlyProfit);
}

// ─── Break-even ───────────────────────────────────────────────────────────────

/**
 * Calculate break-even point (months)
 * @param totalCost       - Total fixed + variable costs
 * @param monthlyRevenue  - Average monthly revenue
 * @param monthlyExpenses - Average monthly expenses
 */
export function calculateBreakEvenMonths(
  totalCost: number,
  monthlyRevenue: number,
  monthlyExpenses: number
): number | null {
  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  if (monthlyProfit <= 0) return null;
  return Math.ceil(totalCost / monthlyProfit);
}

// ─── Cost per pig ─────────────────────────────────────────────────────────────

/**
 * Average cost per pig based on total expenses and active pig count
 */
export function calculateCostPerPig(
  totalExpenses: number,
  pigCount: number
): number {
  if (pigCount <= 0) return 0;
  return totalExpenses / pigCount;
}

// ─── Profit margin ────────────────────────────────────────────────────────────

export function calculateProfitMargin(revenue: number, expenses: number): number {
  if (revenue <= 0) return 0;
  return ((revenue - expenses) / revenue) * 100;
}

// ─── Investor share ───────────────────────────────────────────────────────────

/**
 * Calculate an investor's profit share
 * @param netProfit - Total net profit
 * @param sharePercent - Investor's profit share percentage (e.g. 25 for 25%)
 */
export function calculateInvestorShare(netProfit: number, sharePercent: number): number {
  return (netProfit * sharePercent) / 100;
}
