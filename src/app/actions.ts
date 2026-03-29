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
