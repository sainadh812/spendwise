import { describe, it, expect } from "vitest";
import {
  insightOutputSchema,
  clampInsightOutput,
  INSIGHT_LIMITS,
  transactionSchema,
} from "@/lib/schemas";

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

  it("accepts arrays longer than the soft limits (the schema does not enforce length)", () => {
    // Gemini sometimes ignores .max() in structured output; length is clamped
    // post-parse via clampInsightOutput, not rejected. The schema's job is
    // structural correctness only.
    const result = insightOutputSchema.safeParse({
      ...validInput,
      trends: ["a", "b", "c", "d", "e", "f", "g"],
      suggestions: ["a", "b", "c", "d", "e"],
    });
    expect(result.success).toBe(true);
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

describe("clampInsightOutput", () => {
  const longOutput = {
    summary: "test",
    trends: ["t1", "t2", "t3", "t4", "t5", "t6", "t7"],
    anomalies: Array.from({ length: 7 }, (_, i) => ({
      merchant: `M${i}`,
      amount: 100,
      reason: "x",
    })),
    suggestions: ["s1", "s2", "s3", "s4", "s5"],
  };

  it("clamps trends to the configured limit", () => {
    const clamped = clampInsightOutput(longOutput);
    expect(clamped.trends).toHaveLength(INSIGHT_LIMITS.trends);
    expect(clamped.trends).toEqual(longOutput.trends.slice(0, INSIGHT_LIMITS.trends));
  });

  it("clamps anomalies to the configured limit", () => {
    const clamped = clampInsightOutput(longOutput);
    expect(clamped.anomalies).toHaveLength(INSIGHT_LIMITS.anomalies);
  });

  it("clamps suggestions to the configured limit", () => {
    const clamped = clampInsightOutput(longOutput);
    expect(clamped.suggestions).toHaveLength(INSIGHT_LIMITS.suggestions);
  });

  it("preserves the summary unchanged", () => {
    const clamped = clampInsightOutput(longOutput);
    expect(clamped.summary).toBe(longOutput.summary);
  });

  it("is a no-op when input is already within limits", () => {
    const small = {
      summary: "test",
      trends: ["t1", "t2"],
      anomalies: [],
      suggestions: ["s1"],
    };
    const clamped = clampInsightOutput(small);
    expect(clamped).toEqual(small);
  });

  it("keeps the highest-priority items (model is instructed to sort by priority)", () => {
    const clamped = clampInsightOutput(longOutput);
    expect(clamped.trends[0]).toBe("t1");
    expect(clamped.suggestions[0]).toBe("s1");
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
