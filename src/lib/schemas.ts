import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().positive().describe("Transaction amount in INR"),
  merchant: z.string().describe("Name of the merchant or payee"),
  date: z
    .string()
    .describe(
      "Transaction date in ISO 8601 format. Indian bank emails use dd-mm-yyyy or dd-mm-yy (day-month-year). For 2-digit years, interpret as dd-mm-yy (e.g. 23-02-26 = 2026-02-23). Always prefer the most recent valid date that is not in the future."
    ),
  category: z
    .string()
    .describe(
      "Category of the transaction. Must be one of the categories provided in the prompt."
    ),
  subcategory: z
    .string()
    .nullable()
    .describe(
      "Subcategory of the transaction. Must be one of the subcategories for the chosen category as provided in the prompt, or null if no subcategories exist for that category."
    ),
  is_cc_payment: z
    .boolean()
    .describe(
      "True if this is a credit card bill payment (to avoid double-counting)"
    ),
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence score between 0.0 and 1.0 for how certain the extraction is"
    ),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const batchTransactionSchema = z.object({
  transactions: z
    .array(transactionSchema)
    .describe(
      "Array of transactions extracted from the text. Each line or sentence describing an expense should be a separate transaction."
    ),
});

export type BatchTransactionInput = z.infer<typeof batchTransactionSchema>;

export const INSIGHT_LIMITS = {
  trends: 5,
  anomalies: 5,
  suggestions: 3,
} as const;

export const insightOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "2-3 sentence neutral summary of the period's spending. Descriptive, not prescriptive. No financial advice. Reference specific INR figures and the comparison period from the provided stats."
    ),
  trends: z
    .array(z.string())
    .describe(
      `Notable comparison patterns vs the previous period. Return at most ${INSIGHT_LIMITS.trends} entries, most important first. Reference ONLY numbers present in the provided stats. Do not invent figures. Each entry should be a single sentence.`
    ),
  anomalies: z
    .array(
      z.object({
        merchant: z.string().describe("Merchant name from the stats anomalies list"),
        amount: z.number().describe("Amount in INR from the stats anomalies list"),
        reason: z
          .string()
          .describe(
            "Why this is unusual. Reference the category mean / z-score from the provided stats. One sentence."
          ),
      })
    )
    .describe(
      `Anomalous transactions. Return at most ${INSIGHT_LIMITS.anomalies} entries, highest z-score first. Only include items present in stats.anomalies — do not invent new ones.`
    ),
  suggestions: z
    .array(z.string())
    .describe(
      `Specific, data-tied observations. Return at most ${INSIGHT_LIMITS.suggestions} entries, most actionable first. Examples: 'Swiggy appears 14 times — consider a cap', 'Two Netflix charges on consecutive days look like duplicates'. Avoid generic advice like 'spend less on dining'. No investment or financial advice.`
    ),
});

export type InsightOutput = z.infer<typeof insightOutputSchema>;

export function clampInsightOutput(output: InsightOutput): InsightOutput {
  return {
    summary: output.summary,
    trends: output.trends.slice(0, INSIGHT_LIMITS.trends),
    anomalies: output.anomalies.slice(0, INSIGHT_LIMITS.anomalies),
    suggestions: output.suggestions.slice(0, INSIGHT_LIMITS.suggestions),
  };
}
