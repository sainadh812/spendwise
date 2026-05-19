import type { InsightStats } from "@/lib/insights-stats-pure";
import type { InsightOutput } from "@/lib/schemas";

export const INSIGHTS_MODEL = "gemini-2.5-pro";
export const MIN_TRANSACTIONS_FOR_INSIGHTS = 5;

export interface InsightResult {
  status: "ok" | "not_enough_data";
  cached: boolean;
  stats: InsightStats;
  insight: (InsightOutput & { model: string; generatedAt: string }) | null;
  reason?: "not_enough_data";
}
