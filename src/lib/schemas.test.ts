import { describe, it, expect } from "vitest";
import { insightOutputSchema, transactionSchema } from "@/lib/schemas";

describe("insightOutputSchema", () => {
  const validInput = {
    summary: "April spending totalled ₹68,420.",
    trends: ["Food up 34%", "Transport up 22%"],
    anomalies: [
      { merchant: "Apollo", amount: 4820, reason: "3.1σ above mean" },
    ],
    suggestions: ["Swiggy appears 14 times"],
  };

  it("accepts a fully-populated valid object", () => {
    const result = insightOutputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts empty arrays for trends, anomalies, suggestions", () => {
    const result = insightOutputSchema.safeParse({
      summary: "Nothing notable.",
      trends: [],
      anomalies: [],
      suggestions: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing summary", () => {
    const { summary: _summary, ...rest } = validInput;
    void _summary;
    const result = insightOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 trends", () => {
    const result = insightOutputSchema.safeParse({
      ...validInput,
      trends: ["a", "b", "c", "d", "e", "f"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 anomalies", () => {
    const result = insightOutputSchema.safeParse({
      ...validInput,
      anomalies: Array.from({ length: 6 }, (_, i) => ({
        merchant: `M${i}`,
        amount: 100,
        reason: "x",
      })),
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 suggestions", () => {
    const result = insightOutputSchema.safeParse({
      ...validInput,
      suggestions: ["a", "b", "c", "d"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects anomalies missing required fields", () => {
    const result = insightOutputSchema.safeParse({
      ...validInput,
      anomalies: [{ merchant: "Apollo", amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects anomaly amount as a string", () => {
    const result = insightOutputSchema.safeParse({
      ...validInput,
      anomalies: [{ merchant: "Apollo", amount: "100", reason: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("infers correct TypeScript type for the parsed result", () => {
    const parsed = insightOutputSchema.parse(validInput);
    expect(typeof parsed.summary).toBe("string");
    expect(Array.isArray(parsed.trends)).toBe(true);
    expect(Array.isArray(parsed.anomalies)).toBe(true);
    expect(parsed.anomalies[0].merchant).toBe("Apollo");
  });
});

describe("transactionSchema (regression — pre-existing)", () => {
  it("still validates a known good transaction object", () => {
    const result = transactionSchema.safeParse({
      amount: 100,
      merchant: "Swiggy",
      date: "2026-04-15",
      category: "Food & Dining",
      subcategory: "Food Delivery",
      is_cc_payment: false,
      confidence_score: 0.95,
    });
    expect(result.success).toBe(true);
  });
});
