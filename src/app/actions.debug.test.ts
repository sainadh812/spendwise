import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const transactionCreate = vi.fn();
const skippedEmailDeleteMany = vi.fn(async () => ({ count: 0 }));
const categoryFindFirst = vi.fn(async () => null);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findUnique,
      create: transactionCreate,
    },
    skippedEmail: {
      deleteMany: skippedEmailDeleteMany,
    },
    category: {
      findFirst: categoryFindFirst,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

beforeEach(() => {
  findUnique.mockReset();
  transactionCreate.mockReset();
  skippedEmailDeleteMany.mockReset();
  skippedEmailDeleteMany.mockResolvedValue({ count: 0 });
  categoryFindFirst.mockReset();
  categoryFindFirst.mockResolvedValue(null);
});

describe("manuallyAddFromDebug", () => {
  it("creates a transaction with source=email_recovered when email_message_id is provided", async () => {
    findUnique.mockResolvedValue(null);
    const { manuallyAddFromDebug } = await import("./actions");

    await manuallyAddFromDebug({
      amount: 250,
      merchant: "Swiggy",
      date: "2026-04-10",
      category: "Food",
      subcategory: null,
      is_cc_payment: false,
      email_message_id: "msg-123",
    });

    expect(transactionCreate).toHaveBeenCalledTimes(1);
    const call = transactionCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.source).toBe("email_recovered");
    expect(call.data.email_message_id).toBe("msg-123");
    expect(call.data.amount).toBe(250);
    expect(call.data.merchant).toBe("Swiggy");
    expect(call.data.needs_review).toBe(false);
    expect(call.data.confidence_score).toBe(1.0);
    expect(skippedEmailDeleteMany).toHaveBeenCalledWith({
      where: { email_message_id: "msg-123" },
    });
  });

  it("creates a manual transaction (source=manual) when no email_message_id", async () => {
    const { manuallyAddFromDebug } = await import("./actions");

    await manuallyAddFromDebug({
      amount: 99,
      merchant: "Cash",
      date: "2026-04-10",
      category: "Other",
      is_cc_payment: false,
    });

    expect(findUnique).not.toHaveBeenCalled();
    expect(skippedEmailDeleteMany).not.toHaveBeenCalled();
    const call = transactionCreate.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.source).toBe("manual");
    expect(call.data.email_message_id).toBeNull();
  });

  it("throws if a transaction already exists for the email_message_id", async () => {
    findUnique.mockResolvedValue({ id: "existing-tx" });
    const { manuallyAddFromDebug } = await import("./actions");

    await expect(
      manuallyAddFromDebug({
        amount: 100,
        merchant: "Test",
        date: "2026-04-10",
        category: "Other",
        is_cc_payment: false,
        email_message_id: "msg-dup",
      })
    ).rejects.toThrow(/already exists/i);
    expect(transactionCreate).not.toHaveBeenCalled();
  });

  it("rejects non-positive amounts", async () => {
    const { manuallyAddFromDebug } = await import("./actions");
    await expect(
      manuallyAddFromDebug({
        amount: 0,
        merchant: "Test",
        date: "2026-04-10",
        category: "Other",
        is_cc_payment: false,
      })
    ).rejects.toThrow(/positive/i);
  });

  it("rejects empty merchant", async () => {
    const { manuallyAddFromDebug } = await import("./actions");
    await expect(
      manuallyAddFromDebug({
        amount: 100,
        merchant: "   ",
        date: "2026-04-10",
        category: "Other",
        is_cc_payment: false,
      })
    ).rejects.toThrow(/merchant is required/i);
  });
});
