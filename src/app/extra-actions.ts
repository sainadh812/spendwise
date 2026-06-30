// ─── SpendWise extra server actions ────────────────────────────────────────
// Appended to the base expense_tracker actions.ts — these add
// Account, Income, Template, and Transfer CRUD
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/income");
  revalidatePath("/templates");
  revalidatePath("/transfers");
  revalidatePath("/analytics");
  revalidatePath("/categories");
  revalidatePath("/recoverables");
}

// ─── Accounts ──────────────────────────────────────────────────────────────
export async function getAccounts() {
  return prisma.account.findMany({
    where: { is_hidden: false },
    orderBy: { name: "asc" },
  });
}

export async function getAllAccounts() {
  return prisma.account.findMany({ orderBy: { name: "asc" } });
}

export async function createAccount(data: {
  name: string;
  type: string;
  balance: number;
  currency?: string;
  color?: string;
}) {
  await prisma.account.create({ data });
  revalidateAll();
}

export async function updateAccountBalance(id: string, balance: number) {
  await prisma.account.update({ where: { id }, data: { balance } });
  revalidateAll();
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidateAll();
}

// ─── Income ────────────────────────────────────────────────────────────────
export async function getIncome(month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  const start = new Date(y, m, 1);
  const end   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return prisma.income.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
    include: { account: true, categoryRef: true },
  });
}

export async function createIncome(data: {
  amount: number;
  source: string;
  description?: string;
  date: string;
  accountId?: string;
  is_recurring?: boolean;
}) {
  await prisma.income.create({
    data: {
      ...data,
      date: new Date(data.date),
      is_recurring: data.is_recurring ?? false,
    },
  });
  revalidateAll();
}

export async function deleteIncome(id: string) {
  await prisma.income.delete({ where: { id } });
  revalidateAll();
}

// ─── Templates ────────────────────────────────────────────────────────────
export async function getTemplates() {
  return prisma.template.findMany({ orderBy: [{ shortcut_key: "asc" }, { use_count: "desc" }] });
}

export async function createTemplate(data: {
  name: string;
  amount: number;
  merchant: string;
  category: string;
  accountId?: string;
  type?: string;
  frequency?: string;
  notes?: string;
  shortcut_key?: string;
}) {
  await prisma.template.create({ data });
  revalidateAll();
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({ where: { id } });
  revalidateAll();
}

export async function applyTemplate(id: string) {
  const tpl = await prisma.template.findUniqueOrThrow({ where: { id } });
  await prisma.transaction.create({
    data: {
      amount:       tpl.amount,
      merchant:     tpl.merchant,
      category:     tpl.category,
      categoryId:   tpl.categoryId ?? undefined,
      subcategoryId:tpl.subcategoryId ?? undefined,
      accountId:    tpl.accountId ?? undefined,
      date:         new Date(),
      source:       "template",
      confidence_score: 1.0,
      needs_review: false,
    },
  });
  await prisma.template.update({ where: { id }, data: { use_count: { increment: 1 } } });
  revalidateAll();
  return { success: true };
}

// ─── Transfers ────────────────────────────────────────────────────────────
export async function getTransfers(month?: number, year?: number) {
  const now = new Date();
  const m = month ?? now.getMonth();
  const y = year ?? now.getFullYear();
  const start = new Date(y, m, 1);
  const end   = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return prisma.transfer.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: "desc" },
    include: { from: true, to: true },
  });
}

export async function createTransfer(data: {
  from_id: string;
  to_id:   string;
  amount:  number;
  date:    string;
  notes?:  string;
}) {
  await prisma.$transaction([
    prisma.transfer.create({
      data: { ...data, date: new Date(data.date) },
    }),
    // Debit from account
    prisma.account.update({
      where: { id: data.from_id },
      data: { balance: { decrement: data.amount } },
    }),
    // Credit to account
    prisma.account.update({
      where: { id: data.to_id },
      data: { balance: { increment: data.amount } },
    }),
  ]);
  revalidateAll();
}

export async function deleteTransfer(id: string) {
  const t = await prisma.transfer.findUniqueOrThrow({ where: { id }, include: { from: true, to: true } });
  await prisma.$transaction([
    prisma.transfer.delete({ where: { id } }),
    // Reverse the balance changes
    prisma.account.update({ where: { id: t.from_id }, data: { balance: { increment: t.amount } } }),
    prisma.account.update({ where: { id: t.to_id   }, data: { balance: { decrement: t.amount } } }),
  ]);
  revalidateAll();
}

// ─── Net-worth helper (used by dashboard) ─────────────────────────────────
export async function getNetWorth() {
  const accounts = await prisma.account.findMany({ where: { is_hidden: false } });
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  return { total, accounts };
}
