import { type Period, periodKey, periodLabel } from "@/lib/insights-period";
import { effectiveSpend } from "@/lib/recoverable";

export interface InsightStatsTransaction {
  amount: number;
  merchant: string;
  category: string;
  date: Date;
  is_cc_payment: boolean;
  needs_review: boolean;
  recoverable_amount?: number | null;
  recovery_status?: string | null;
  repayments?: { amount: number }[];
}

interface SpendingTransaction extends InsightStatsTransaction {
  amount: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
}

export interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
}

export interface PeriodDelta {
  category: string;
  current: number;
  previous: number;
  deltaPct: number;
}

export interface Anomaly {
  merchant: string;
  amount: number;
  category: string;
  date: string;
  zScore: number;
}

export interface RecurringCandidate {
  merchant: string;
  occurrences: number;
  avgAmount: number;
}

export interface MonthBreakdown {
  month: number;
  total: number;
  txCount: number;
}

export interface InsightStats {
  period: { type: Period["type"]; key: string; label: string };
  totalSpend: number;
  txCount: number;
  byCategory: CategoryTotal[];
  topMerchants: MerchantTotal[];
  comparisonDeltas: PeriodDelta[];
  anomalies: Anomaly[];
  recurringCandidates: RecurringCandidate[];
  byMonth?: MonthBreakdown[];
  latestTxDate: string | null;
}

function groupBy<T extends { amount: number }>(
  rows: T[],
  key: (r: T) => string
): Map<string, { total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const k = key(r);
    const e = map.get(k) ?? { total: 0, count: 0 };
    e.total += r.amount;
    e.count += 1;
    map.set(k, e);
  }
  return map;
}

function filterSpending(
  rows: InsightStatsTransaction[]
): SpendingTransaction[] {
  return rows
    .filter((t) => !t.is_cc_payment && !t.needs_review)
    .map((t) => ({
      ...t,
      amount: effectiveSpend({
        amount: t.amount,
        recoverable_amount: t.recoverable_amount ?? null,
        recovery_status: t.recovery_status ?? null,
        repayments: t.repayments,
      }),
    }))
    .filter((t) => t.amount > 0);
}

export function computeStatsFromTransactions(
  period: Period,
  current: InsightStatsTransaction[],
  previous: InsightStatsTransaction[]
): InsightStats {
  const cur = filterSpending(current);
  const prev = filterSpending(previous);

  const totalSpend = cur.reduce((s, t) => s + t.amount, 0);

  const curByCat = groupBy(cur, (t) => t.category);
  const prevByCat = groupBy(prev, (t) => t.category);

  const byCategory: CategoryTotal[] = [...curByCat.entries()]
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  const topMerchants: MerchantTotal[] = [
    ...groupBy(cur, (t) => t.merchant).entries(),
  ]
    .map(([merchant, v]) => ({ merchant, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const comparisonDeltas: PeriodDelta[] = byCategory.map(
    ({ category, total }) => {
      const prevTotal = prevByCat.get(category)?.total ?? 0;
      const deltaPct =
        prevTotal === 0
          ? total > 0
            ? 100
            : 0
          : ((total - prevTotal) / prevTotal) * 100;
      return {
        category,
        current: total,
        previous: prevTotal,
        deltaPct: Number(deltaPct.toFixed(1)),
      };
    }
  );

  const anomalies: Anomaly[] = [];
  for (const [category] of curByCat) {
    const txs = cur.filter((t) => t.category === category);
    if (txs.length < 4) continue;
    const mean = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
    const variance =
      txs.reduce((s, t) => s + (t.amount - mean) ** 2, 0) / txs.length;
    const std = Math.sqrt(variance);
    if (std === 0) continue;
    for (const t of txs) {
      const z = (t.amount - mean) / std;
      if (z > 2) {
        anomalies.push({
          merchant: t.merchant,
          amount: t.amount,
          category,
          date: t.date.toISOString(),
          zScore: Number(z.toFixed(2)),
        });
      }
    }
  }
  anomalies.sort((a, b) => b.zScore - a.zScore);

  const merchantCounts = groupBy(cur, (t) => t.merchant);
  const recurringCandidates: RecurringCandidate[] = [
    ...merchantCounts.entries(),
  ]
    .filter(([, v]) => v.count >= 3)
    .map(([merchant, v]) => ({
      merchant,
      occurrences: v.count,
      avgAmount: Number((v.total / v.count).toFixed(2)),
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const latestTx = cur.reduce<Date | null>(
    (acc, t) => (!acc || t.date > acc ? t.date : acc),
    null
  );

  const stats: InsightStats = {
    period: {
      type: period.type,
      key: periodKey(period),
      label: periodLabel(period),
    },
    totalSpend: Number(totalSpend.toFixed(2)),
    txCount: cur.length,
    byCategory,
    topMerchants,
    comparisonDeltas: comparisonDeltas.slice(0, 10),
    anomalies: anomalies.slice(0, 5),
    recurringCandidates,
    latestTxDate: latestTx?.toISOString() ?? null,
  };

  if (period.type === "year") {
    const byMonth = new Map<number, { total: number; count: number }>();
    for (const t of cur) {
      const m = t.date.getMonth();
      const e = byMonth.get(m) ?? { total: 0, count: 0 };
      e.total += t.amount;
      e.count += 1;
      byMonth.set(m, e);
    }
    stats.byMonth = [...byMonth.entries()]
      .map(([month, v]) => ({
        month,
        total: Number(v.total.toFixed(2)),
        txCount: v.count,
      }))
      .sort((a, b) => a.month - b.month);
  }

  return stats;
}
