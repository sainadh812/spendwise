import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

const SAMPLE_TRANSACTIONS = [
  { amount: 450, merchant: "Swiggy", date: new Date("2026-02-01"), category: "Food & Dining", is_cc_payment: false, confidence_score: 0.95 },
  { amount: 1200, merchant: "BigBasket", date: new Date("2026-02-02"), category: "Groceries", is_cc_payment: false, confidence_score: 0.92 },
  { amount: 150, merchant: "Uber", date: new Date("2026-02-03"), category: "Transportation", is_cc_payment: false, confidence_score: 0.88 },
  { amount: 3500, merchant: "Amazon India", date: new Date("2026-02-04"), category: "Shopping", is_cc_payment: false, confidence_score: 0.91 },
  { amount: 599, merchant: "Netflix", date: new Date("2026-02-05"), category: "Entertainment", is_cc_payment: false, confidence_score: 0.97 },
  { amount: 2100, merchant: "Airtel", date: new Date("2026-02-06"), category: "Bills & Utilities", is_cc_payment: false, confidence_score: 0.93 },
  { amount: 800, merchant: "Cult.fit", date: new Date("2026-02-07"), category: "Health & Fitness", is_cc_payment: false, confidence_score: 0.85 },
  { amount: 15000, merchant: "HDFC Credit Card", date: new Date("2026-02-08"), category: "Credit Card Payment", is_cc_payment: true, confidence_score: 0.96 },
  { amount: 320, merchant: "Zomato", date: new Date("2026-02-09"), category: "Food & Dining", is_cc_payment: false, confidence_score: 0.90 },
  { amount: 5000, merchant: "MakeMyTrip", date: new Date("2026-02-10"), category: "Travel", is_cc_payment: false, confidence_score: 0.72 },
  { amount: 250, merchant: "Rapido", date: new Date("2026-02-11"), category: "Transportation", is_cc_payment: false, confidence_score: 0.65 },
  { amount: 1800, merchant: "DMart", date: new Date("2026-02-12"), category: "Groceries", is_cc_payment: false, confidence_score: 0.89 },
  { amount: 499, merchant: "Spotify", date: new Date("2026-02-13"), category: "Entertainment", is_cc_payment: false, confidence_score: 0.98 },
  { amount: 950, merchant: "Pharmeasy", date: new Date("2026-02-14"), category: "Health & Fitness", is_cc_payment: false, confidence_score: 0.78 },
  { amount: 200, merchant: "Unknown UPI", date: new Date("2026-02-15"), category: "Other", is_cc_payment: false, confidence_score: 0.45 },
  { amount: 1500, merchant: "Flipkart", date: new Date("2026-02-16"), category: "Shopping", is_cc_payment: false, confidence_score: 0.87 },
  { amount: 680, merchant: "Dominos", date: new Date("2026-02-17"), category: "Food & Dining", is_cc_payment: false, confidence_score: 0.93 },
  { amount: 4200, merchant: "Jio Fiber", date: new Date("2026-02-18"), category: "Bills & Utilities", is_cc_payment: false, confidence_score: 0.94 },
  { amount: 10000, merchant: "SBI Credit Card", date: new Date("2026-02-19"), category: "Credit Card Payment", is_cc_payment: true, confidence_score: 0.91 },
  { amount: 350, merchant: "Street Vendor", date: new Date("2026-02-20"), category: "Food & Dining", is_cc_payment: false, confidence_score: 0.55 },
  { amount: 2200, merchant: "Udemy", date: new Date("2026-02-20"), category: "Education", is_cc_payment: false, confidence_score: 0.92 },
  { amount: 5000, merchant: "ATM SBI Koramangala", date: new Date("2026-02-21"), category: "ATM Withdrawal", is_cc_payment: false, confidence_score: 0.88 },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed route is disabled in production" },
      { status: 403 }
    );
  }

  try {
    await prisma.transaction.deleteMany();

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name) => ({ name })),
      skipDuplicates: true,
    });

    const transactions = await prisma.transaction.createMany({
      data: SAMPLE_TRANSACTIONS.map((t) => ({
        ...t,
        needs_review: t.confidence_score < 0.8,
      })),
    });

    return NextResponse.json({
      message: `Seeded ${transactions.count} transactions`,
      count: transactions.count,
    });
  } catch (error) {
    console.error("Seed error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to seed data", details: message },
      { status: 500 }
    );
  }
}
