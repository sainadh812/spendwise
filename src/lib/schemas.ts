import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().positive().describe("Transaction amount in INR"),
  merchant: z.string().describe("Name of the merchant or payee"),
  date: z.string().describe("Transaction date in ISO 8601 format"),
  category: z
    .string()
    .describe(
      "Category of the transaction. Common categories: Food & Dining, Groceries, Transportation, Shopping, Entertainment, Bills & Utilities, Health & Fitness, Travel, Education, Credit Card Payment, ATM Withdrawal, Transfer, Other"
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
