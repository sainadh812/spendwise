import { Client } from "pg";

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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const categoryRows = await client.query(
      'SELECT id, name FROM "Category" WHERE "parentId" IS NULL'
    );
    const categoryMap = new Map(
      categoryRows.rows.map((category) => [normalize(category.name), category])
    );

    const transactionRows = await client.query(
      'SELECT id, category FROM "Transaction" WHERE "categoryId" IS NULL'
    );

    const unmatched = new Map();
    const matchedUpdates = [];

    for (const transaction of transactionRows.rows) {
      const normalized = normalize(transaction.category);
      const aliased = CATEGORY_ALIASES[normalized] ?? transaction.category;
      const category = categoryMap.get(normalize(aliased));

      if (!category) {
        unmatched.set(transaction.category, (unmatched.get(transaction.category) ?? 0) + 1);
        continue;
      }

      matchedUpdates.push({ id: transaction.id, categoryId: category.id });
    }

    console.log(`Backfill mode: ${isDryRun ? "dry-run" : "write"}`);
    console.log(`Transactions without categoryId: ${transactionRows.rowCount}`);
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
      await client.query("BEGIN");
      try {
        for (const item of batch) {
          await client.query(
            'UPDATE "Transaction" SET "categoryId" = $1 WHERE id = $2',
            [item.categoryId, item.id]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(`Updated ${matchedUpdates.length} transactions.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
