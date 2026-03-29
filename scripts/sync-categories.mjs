import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "ATM Withdrawal" },
  { name: "Bills & Utilities", subcategories: ["Electricity", "Water", "Gas", "Internet", "Mobile Recharge", "DTH", "Rent"] },
  { name: "Credit Card Payment" },
  { name: "Education", subcategories: ["Courses", "Books", "Tuition", "Certifications"] },
  { name: "Entertainment", subcategories: ["Streaming", "Movies", "Gaming", "Events"] },
  { name: "Food & Dining", subcategories: ["Restaurants", "Delivery", "Cafe", "Street Food"] },
  { name: "Groceries", subcategories: ["Supermarket", "Vegetables", "Dairy", "Meat"] },
  { name: "Health & Fitness", subcategories: ["Gym", "Medicine", "Doctor", "Lab Tests", "Sports"] },
  { name: "Insurance", subcategories: ["Health", "Life", "Vehicle", "Home"] },
  { name: "Other" },
  { name: "Savings & Investments", subcategories: ["Equity", "Mutual Funds", "Gold", "Fixed Deposit", "PPF", "NPS", "Bonds", "Crypto", "Real Estate"] },
  { name: "Shopping", subcategories: ["Clothing", "Electronics", "Home & Kitchen", "Personal Care"] },
  { name: "Transfer", subcategories: ["Family", "Friends", "Self"] },
  { name: "Transportation", subcategories: ["Cab", "Auto", "Metro", "Bus", "Fuel", "Parking", "Toll"] },
  { name: "Travel", subcategories: ["Flights", "Hotels", "Trains", "Buses", "Packages"] },
];

async function main() {
  let createdParents = 0;
  let createdSubcategories = 0;

  for (const category of DEFAULT_CATEGORIES) {
    let parent = await prisma.category.findFirst({
      where: { name: category.name, parentId: null },
    });

    if (!parent) {
      parent = await prisma.category.create({
        data: { name: category.name, parentId: null },
      });
      createdParents += 1;
    }

    for (const subcategory of category.subcategories ?? []) {
      const existing = await prisma.category.findFirst({
        where: { name: subcategory, parentId: parent.id },
      });

      if (!existing) {
        await prisma.category.create({
          data: { name: subcategory, parentId: parent.id },
        });
        createdSubcategories += 1;
      }
    }
  }

  console.log(
    `Category sync complete. Created ${createdParents} parent categories and ${createdSubcategories} subcategories.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
