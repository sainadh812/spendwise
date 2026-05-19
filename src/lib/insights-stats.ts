import { prisma } from "@/lib/prisma";
import { type Period, periodBounds } from "@/lib/insights-period";
import {
  computeStatsFromTransactions,
  type InsightStats,
} from "@/lib/insights-stats-pure";

export type {
  InsightStats,
  InsightStatsTransaction,
  CategoryTotal,
  MerchantTotal,
  PeriodDelta,
  Anomaly,
  RecurringCandidate,
  MonthBreakdown,
} from "@/lib/insights-stats-pure";
export { computeStatsFromTransactions } from "@/lib/insights-stats-pure";

export async function computeInsightStats(
  period: Period
): Promise<InsightStats> {
  const { start, end, previousStart, previousEnd } = periodBounds(period);

  const [current, previous] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
      select: {
        amount: true,
        merchant: true,
        category: true,
        date: true,
        is_cc_payment: true,
        needs_review: true,
      },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: previousStart, lte: previousEnd } },
      select: {
        amount: true,
        merchant: true,
        category: true,
        date: true,
        is_cc_payment: true,
        needs_review: true,
      },
    }),
  ]);

  return computeStatsFromTransactions(period, current, previous);
}
