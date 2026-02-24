"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

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
  });
}

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
  if (rows.length === 0) {
    return DEFAULT_CATEGORIES;
  }
  return rows.map((r) => r.name);
}

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  await prisma.category.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  });
  revalidatePath("/");
  return trimmed;
}

export async function seedCategories() {
  const existing = await prisma.category.count();
  if (existing === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });
  }
}

export async function createTransaction(data: {
  amount: number;
  merchant: string;
  date: string;
  category: string;
  is_cc_payment: boolean;
}) {
  await prisma.transaction.create({
    data: {
      amount: data.amount,
      merchant: data.merchant,
      date: new Date(data.date),
      category: data.category,
      is_cc_payment: data.is_cc_payment,
      confidence_score: 1.0,
      needs_review: false,
      source: "manual",
    },
  });
  revalidatePath("/");
}

export async function approveTransaction(id: string) {
  await prisma.transaction.update({
    where: { id },
    data: { needs_review: false },
  });
  revalidatePath("/");
}

export async function updateTransaction(
  id: string,
  data: {
    category?: string;
    merchant?: string;
    amount?: number;
    is_cc_payment?: boolean;
  }
) {
  await prisma.transaction.update({
    where: { id },
    data,
  });
  revalidatePath("/");
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/");
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
    is_cc_payment: boolean;
  }
) {
  const skipped = await prisma.skippedEmail.findUnique({ where: { id } });
  if (!skipped) throw new Error("Skipped email not found");

  await prisma.transaction.create({
    data: {
      amount: data.amount,
      merchant: data.merchant,
      date: new Date(data.date),
      category: data.category,
      is_cc_payment: data.is_cc_payment,
      confidence_score: 1.0,
      needs_review: false,
      email_message_id: skipped.email_message_id,
      source: "email_recovered",
    },
  });

  await prisma.skippedEmail.delete({ where: { id } });
  revalidatePath("/");
}

export async function dismissSkippedEmail(id: string) {
  await prisma.skippedEmail.update({
    where: { id },
    data: { dismissed: true },
  });
  revalidatePath("/");
}
