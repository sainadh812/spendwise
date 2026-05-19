import { describe, it, expect } from "vitest";
import {
  computeStatsFromTransactions,
  type InsightStatsTransaction,
} from "@/lib/insights-stats-pure";
import type { Period } from "@/lib/insights-period";

function tx(
  partial: Partial<InsightStatsTransaction> & { amount: number }
): InsightStatsTransaction {
  return {
    merchant: "Test",
    category: "Other",
    date: new Date(2026, 3, 15),
    is_cc_payment: false,
    needs_review: false,
    ...partial,
  };
}

const monthPeriod: Period = { type: "month", year: 2026, month: 3 };
const yearPeriod: Period = { type: "year", year: 2026 };

describe("computeStatsFromTransactions", () => {
  it("excludes credit card payments and needs_review transactions", () => {
    const current = [
      tx({ amount: 100 }),
      tx({ amount: 200, is_cc_payment: true }),
      tx({ amount: 300, needs_review: true }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.totalSpend).toBe(100);
    expect(stats.txCount).toBe(1);
  });

  it("groups by category sorted by total desc", () => {
    const current = [
      tx({ amount: 100, category: "Food" }),
      tx({ amount: 300, category: "Transport" }),
      tx({ amount: 200, category: "Food" }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.byCategory).toEqual([
      { category: "Food", total: 300, count: 2 },
      { category: "Transport", total: 300, count: 1 },
    ]);
  });

  it("computes MoM delta percentages vs previous period", () => {
    const current = [tx({ amount: 1200, category: "Food" })];
    const previous = [tx({ amount: 1000, category: "Food" })];
    const stats = computeStatsFromTransactions(monthPeriod, current, previous);
    expect(stats.comparisonDeltas[0]).toEqual({
      category: "Food",
      current: 1200,
      previous: 1000,
      deltaPct: 20,
    });
  });

  it("handles zero previous total without dividing by zero", () => {
    const current = [tx({ amount: 500, category: "Food" })];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.comparisonDeltas[0].deltaPct).toBe(100);
  });

  it("flags transactions with z-score > 2 as anomalies", () => {
    const current = [
      tx({ amount: 100, category: "Food", merchant: "A" }),
      tx({ amount: 110, category: "Food", merchant: "B" }),
      tx({ amount: 105, category: "Food", merchant: "C" }),
      tx({ amount: 120, category: "Food", merchant: "D" }),
      tx({ amount: 115, category: "Food", merchant: "E" }),
      tx({ amount: 105, category: "Food", merchant: "F" }),
      tx({ amount: 800, category: "Food", merchant: "BIG" }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.anomalies.length).toBeGreaterThanOrEqual(1);
    expect(stats.anomalies[0].merchant).toBe("BIG");
    expect(stats.anomalies[0].zScore).toBeGreaterThan(2);
  });

  it("skips anomaly detection for categories with fewer than 4 transactions", () => {
    const current = [
      tx({ amount: 100, category: "Food" }),
      tx({ amount: 5000, category: "Food" }),
      tx({ amount: 110, category: "Food" }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.anomalies).toEqual([]);
  });

  it("detects recurring merchants with >= 3 occurrences", () => {
    const current = [
      tx({ amount: 400, merchant: "Swiggy" }),
      tx({ amount: 500, merchant: "Swiggy" }),
      tx({ amount: 300, merchant: "Swiggy" }),
      tx({ amount: 100, merchant: "OneOff" }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.recurringCandidates).toContainEqual({
      merchant: "Swiggy",
      occurrences: 3,
      avgAmount: 400,
    });
    expect(
      stats.recurringCandidates.find((r) => r.merchant === "OneOff")
    ).toBeUndefined();
  });

  it("returns top merchants sorted by total, max 10", () => {
    const current = Array.from({ length: 15 }, (_, i) =>
      tx({ amount: (i + 1) * 100, merchant: `M${i}` })
    );
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.topMerchants).toHaveLength(10);
    expect(stats.topMerchants[0].merchant).toBe("M14");
  });

  it("includes byMonth breakdown only for year period", () => {
    const current = [
      tx({ amount: 100, date: new Date(2026, 0, 15) }),
      tx({ amount: 200, date: new Date(2026, 0, 20) }),
      tx({ amount: 300, date: new Date(2026, 5, 10) }),
    ];
    const monthStats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(monthStats.byMonth).toBeUndefined();

    const yearStats = computeStatsFromTransactions(yearPeriod, current, []);
    expect(yearStats.byMonth).toEqual([
      { month: 0, total: 300, txCount: 2 },
      { month: 5, total: 300, txCount: 1 },
    ]);
  });

  it("populates period metadata", () => {
    const stats = computeStatsFromTransactions(
      { type: "month", year: 2026, month: 3 },
      [],
      []
    );
    expect(stats.period.type).toBe("month");
    expect(stats.period.key).toBe("2026-04");
    expect(stats.period.label).toMatch(/April/);
  });

  it("returns latestTxDate as ISO string of newest transaction", () => {
    const current = [
      tx({ amount: 100, date: new Date(2026, 3, 1) }),
      tx({ amount: 200, date: new Date(2026, 3, 15) }),
      tx({ amount: 300, date: new Date(2026, 3, 10) }),
    ];
    const stats = computeStatsFromTransactions(monthPeriod, current, []);
    expect(stats.latestTxDate).toBe(new Date(2026, 3, 15).toISOString());
  });

  it("returns null latestTxDate when no transactions", () => {
    const stats = computeStatsFromTransactions(monthPeriod, [], []);
    expect(stats.latestTxDate).toBeNull();
    expect(stats.totalSpend).toBe(0);
    expect(stats.txCount).toBe(0);
  });
});
