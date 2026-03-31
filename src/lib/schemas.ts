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
