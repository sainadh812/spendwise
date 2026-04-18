"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

export interface CategoryWithSubs {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

async function revalidateAppPaths() {
  revalidatePath("/");
  revalidatePath("/analytics");
  revalidatePath("/categories");
}

export async function getTransactions(month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();

  const startOfMonth = new Date(y, m, 1);
  const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);

  return prisma.transaction.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: "desc" },
    include: {
      categoryRef: true,
      subcategoryRef: true,
    },
  });
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
  });
  if (rows.length === 0) {
    return DEFAULT_CATEGORIES.map((c) => c.name);
  }
  return rows.map((r) => r.name);
}

export async function getCategoriesWithSubs(): Promise<CategoryWithSubs[]> {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      children: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (rows.length === 0) {
    return DEFAULT_CATEGORIES.map((c) => ({
      id: "",
      name: c.name,
      subcategories: (c.subcategories ?? []).map((s) => ({ id: "", name: s })),
    }));
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    subcategories: r.children.map((c) => ({ id: c.id, name: c.name })),
  }));
}

export async function getCategoryPromptData(): Promise<
  { name: string; subcategories: string[] }[]
> {
  const rows = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: {
      children: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (rows.length === 0) {
    return DEFAULT_CATEGORIES.map((c) => ({
      name: c.name,
      subcategories: c.subcategories ?? [],
    }));
  }

  return rows.map((r) => ({
    name: r.name,
    subcategories: r.children.map((c) => c.name),
  }));
}

export async function getSubcategories(
  categoryName: string
): Promise<string[]> {
  const parent = await prisma.category.findFirst({
    where: { name: categoryName, parentId: null },
    include: { children: { orderBy: { name: "asc" } } },
  });
  return parent?.children.map((c) => c.name) ?? [];
}

export async function createCategory(name: string, parentName?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  let parentId: string | null = null;
  if (parentName) {
    const parent = await prisma.category.findFirst({
      where: { name: parentName, parentId: null },
    });
    if (!parent) throw new Error(`Parent category "${parentName}" not found`);
    parentId = parent.id;
  }

  const existing = await prisma.category.findFirst({
    where: { name: trimmed, parentId },
  });

  if (existing) {
    revalidatePath("/");
    return trimmed;
  }

  await prisma.category.create({
    data: { name: trimmed, parentId },
  });
  await revalidateAppPaths();
  return trimmed;
}

export async function renameCategory(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  await prisma.category.update({
    where: { id },
    data: { name: trimmed },
  });
  await revalidateAppPaths();
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: true },
  });

  if (!category) throw new Error("Category not found");

  const idsToClear = [category.id, ...category.children.map((child) => child.id)];

  await prisma.transaction.updateMany({
    where: {
      OR: [
        { categoryId: { in: idsToClear } },
        { subcategoryId: { in: idsToClear } },
      ],
    },
    data: {
      subcategoryId: null,
      categoryId: null,
      category: "Other",
    },
  });

  await prisma.category.deleteMany({
    where: {
      OR: [{ id }, { parentId: id }],
    },
  });

  await revalidateAppPaths();
}

export async function seedCategories() {
  const existing = await prisma.category.count();
  if (existing === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      const created = await prisma.category.create({
        data: { name: cat.name, parentId: null },
      });
      if (cat.subcategories) {
        await prisma.category.createMany({
          data: cat.subcategories.map((sub) => ({
            name: sub,
            parentId: created.id,
          })),
        });
      }
    }
  }
}

export async function resolveCategoryIds(
  categoryName: string,
  subcategoryName: string | null
): Promise<{ categoryId: string | null; subcategoryId: string | null }> {
  const parent = await prisma.category.findFirst({
    where: { name: categoryName, parentId: null },
  });
  if (!parent) return { categoryId: null, subcategoryId: null };

  let subcategoryId: string | null = null;
  if (subcategoryName) {
    const sub = await prisma.category.findFirst({
      where: { name: subcategoryName, parentId: parent.id },
    });
    subcategoryId = sub?.id ?? null;
  }

  return { categoryId: parent.id, subcategoryId };
}

export async function createTransaction(data: {
  amount: number;
  merchant: string;
  date: string;
  category: string;
  subcategory?: string | null;
  is_cc_payment: boolean;
}) {
  const { categoryId, subcategoryId } = await resolveCategoryIds(
    data.category,
    data.subcategory ?? null
  );

  await prisma.transaction.create({
    data: {
      amount: data.amount,
      merchant: data.merchant,
      date: new Date(data.date),
      category: data.category,
      categoryId,
      subcategoryId,
      is_cc_payment: data.is_cc_payment,
      confidence_score: 1.0,
      needs_review: false,
      source: "manual",
    },
  });
  await revalidateAppPaths();
}

export async function approveTransaction(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { needs_review: false },
  });
  await revalidateAppPaths();
}

export async function updateTransaction(
  id: string,
  data: {
    category?: string;
    subcategory?: string | null;
    merchant?: string;
    amount?: number;
    is_cc_payment?: boolean;
    remarks?: string | null;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.merchant !== undefined) updateData.merchant = data.merchant;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.is_cc_payment !== undefined)
    updateData.is_cc_payment = data.is_cc_payment;
  if (data.remarks !== undefined) updateData.remarks = data.remarks;

  if (data.category !== undefined) {
    updateData.category = data.category;
    const { categoryId, subcategoryId } = await resolveCategoryIds(
      data.category,
      data.subcategory ?? null
    );
    updateData.categoryId = categoryId;
    updateData.subcategoryId = subcategoryId;
  } else if (data.subcategory !== undefined) {
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (existing) {
      const { subcategoryId } = await resolveCategoryIds(
        existing.category,
        data.subcategory
      );
      updateData.subcategoryId = subcategoryId;
    }
  }

  await prisma.transaction.update({
    where: { id },
    data: updateData,
  });
  await revalidateAppPaths();
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  await revalidateAppPaths();
}

export async function getSkippedEmails() {
  return prisma.skippedEmail.findMany({
    where: { dismissed: false },
    orderBy: { created_at: "desc" },
  });
}

export async function recoverSkippedEmail(
  id: string,
  data: {
    amount: number;
    merchant: string;
    date: string;
    category: string;
    subcategory?: string | null;
    is_cc_payment: boolean;
  }
) {
  const skipped = await prisma.skippedEmail.findUnique({ where: { id } });
  if (!skipped) throw new Error("Skipped email not found");

  const { categoryId, subcategoryId } = await resolveCategoryIds(
    data.category,
    data.subcategory ?? null
  );

  await prisma.transaction.create({
    data: {
      amount: data.amount,
      merchant: data.merchant,
      date: new Date(data.date),
      category: data.category,
      categoryId,
      subcategoryId,
      is_cc_payment: data.is_cc_payment,
      confidence_score: 1.0,
      needs_review: false,
      email_message_id: skipped.email_message_id,
      source: "email_recovered",
    },
  });

  await prisma.skippedEmail.delete({ where: { id } });
  await revalidateAppPaths();
}

export async function dismissSkippedEmail(id: string) {
  await prisma.skippedEmail.update({
    where: { id },
    data: { dismissed: true },
  });
  await revalidateAppPaths();
}

export async function getTransactionsForYear(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  return prisma.transaction.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
    include: {
      categoryRef: true,
      subcategoryRef: true,
    },
  });
}

export async function getTransactionsForRange(
  startDate: Date,
  endDate: Date
) {
  return prisma.transaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
    include: {
      categoryRef: true,
      subcategoryRef: true,
    },
  });
}

export async function getAvailableYears(): Promise<number[]> {
  const rows = await prisma.transaction.findMany({
    select: { date: true },
    orderBy: { date: "asc" },
  });

  const years = new Set<number>();
  for (const r of rows) {
    years.add(r.date.getFullYear());
  }

  if (years.size === 0) {
    years.add(new Date().getFullYear());
  }

  return Array.from(years).sort((a, b) => b - a);
}

export async function getBudgetForMonth(month: number, year: number) {
  return prisma.budget.findFirst({
    where: {
      OR: [
        { start_year: { lt: year } },
        { start_year: year, start_month: { lte: month } },
      ],
    },
    orderBy: [{ start_year: "desc" }, { start_month: "desc" }],
  });
}

export async function setBudget(
  startMonth: number,
  startYear: number,
  amount: number
) {
  if (amount <= 0) throw new Error("Budget amount must be positive");

  await prisma.budget.upsert({
    where: {
      start_month_start_year: { start_month: startMonth, start_year: startYear },
    },
    update: { amount },
    create: { start_month: startMonth, start_year: startYear, amount },
  });
  await revalidateAppPaths();
}

export async function deleteBudget(id: string) {
  await prisma.budget.delete({ where: { id } });
  await revalidateAppPaths();
}

export async function getAllBudgets() {
  return prisma.budget.findMany({
    orderBy: [{ start_year: "desc" }, { start_month: "desc" }],
  });
}

export async function parseExpenseText(text: string) {
  const { google } = await import("@ai-sdk/google");
  const { generateObject } = await import("ai");
  const { batchTransactionSchema } = await import("@/lib/schemas");
  const { buildCategoryPromptText } = await import("@/lib/categories");
  const { resolveTransactionDate } = await import("@/lib/date-extraction");

  const categoryData = await getCategoryPromptData();
  const categoryPromptText = buildCategoryPromptText(categoryData);

  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are a financial transaction parser for natural language expense text and bank alert emails.
Extract ALL DEBIT (money going out) transactions from the user's text.

IMPORTANT: The text may contain multiple transactions or multiple bank alert emails. Extract each one as a separate transaction in the array.
- The user may paste multiple bank alert emails (from HDFC, IDFC FIRST Bank, etc.) separated by blank lines or headers like "Dear Cardmember"
- Each email typically describes one transaction, but there could be multiple emails
- Also handle natural text with multiple expenses separated by newlines, semicolons, commas, or "and"
- Each distinct expense or email alert should be a separate transaction
- If only one expense is described, return an array with one transaction

Extraction rules for each transaction:
- amount: The amount in INR. Look for "Rs.", "INR", "Rs", or just a number.
- merchant: The merchant/payee name (e.g. "Swiggy", "Zomato", "Amazon").
- date: Transaction date in ISO 8601 format (YYYY-MM-DDT00:00:00Z, always UTC with Z suffix).
  Today's date is ${today} and the current year is ${currentYear}.
  If no date is mentioned, use today's date.
  Support formats like "today", "yesterday", "23 Feb", "23-02-2026", "23/02/2026".
  Indian formats use dd-mm-yyyy or dd-mm-yy (day first).
  For 2-digit years (e.g. "23-02-26"), interpret as dd-mm-yy — so "23-02-26" means 23 Feb 2026.
- category: Must be one of the categories below.
- subcategory: Must be one of the listed subcategories for the chosen category, or null.
- is_cc_payment: true ONLY if explicitly paying off a credit card bill. Regular purchases are false.
- confidence_score (0.0 to 1.0): Lower if amount/merchant/category is unclear or guessed.

Available categories and subcategories:
${categoryPromptText}

User text:
${text}`;

  const { object: result } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: batchTransactionSchema,
    prompt,
  });

  return result.transactions.map((transaction) => {
    const resolvedDate = resolveTransactionDate(transaction.date, text);
    return {
      amount: transaction.amount,
      merchant: transaction.merchant,
      date: resolvedDate.toISOString(),
      category: transaction.category,
      subcategory: transaction.subcategory,
      is_cc_payment: transaction.is_cc_payment,
      confidence_score: transaction.confidence_score,
    };
  });
}
