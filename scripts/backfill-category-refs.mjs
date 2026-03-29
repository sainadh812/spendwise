import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

const CATEGORY_ALIASES = {
  investment: "Savings & Investments",
  investments: "Savings & Investments",
  savings: "Savings & Investments",
  bills: "Bills & Utilities",
  "bills and utilities": "Bills & Utilities",
  food: "Food & Dining",
  transport: "Transportation",
  healthcare: "Health & Fitness",
};

function normalize(value) {
  return value.trim().toLowerCase();
}

async function main() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
  });

  const categoryMap = new Map(
    categories.map((category) => [normalize(category.name), category])
  );

  const transactions = await prisma.transaction.findMany({
    where: { categoryId: null },
    select: { id: true, category: true },
  });

  const unmatched = new Map();
  const matchedUpdates = [];

  for (const transaction of transactions) {
    const normalized = normalize(transaction.category);
    const aliased = CATEGORY_ALIASES[normalized] ?? transaction.category;
    const category = categoryMap.get(normalize(aliased));

    if (!category) {
      unmatched.set(transaction.category, (unmatched.get(transaction.category) ?? 0) + 1);
      continue;
    }

    matchedUpdates.push({ id: transaction.id, categoryId: category.id, category: transaction.category, resolved: category.name });
  }

  console.log(`Backfill mode: ${isDryRun ? "dry-run" : "write"}`);
  console.log(`Transactions without categoryId: ${transactions.length}`);
  console.log(`Matched transactions: ${matchedUpdates.length}`);
  console.log(`Unmatched category values: ${unmatched.size}`);

  if (unmatched.size > 0) {
    console.log("Unmatched legacy category values:");
    for (const [name, count] of Array.from(unmatched.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${name}: ${count}`);
    }
  }

  if (isDryRun) {
    console.log("Dry run complete. No rows were modified.");
    return;
  }

  const BATCH_SIZE = 200;
  for (let index = 0; index < matchedUpdates.length; index += BATCH_SIZE) {
    const batch = matchedUpdates.slice(index, index + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((item) =>
        prisma.transaction.update({
          where: { id: item.id },
          data: { categoryId: item.categoryId },
        })
      )
    );
  }

  console.log(`Updated ${matchedUpdates.length} transactions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
