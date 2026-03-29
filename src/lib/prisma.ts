import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL!;
  if (url.startsWith("prisma+")) {
    return new PrismaClient({ accelerateUrl: url });
  }

  const parsedUrl = new URL(url);
  const schema = parsedUrl.searchParams.get("schema");

  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: parsedUrl.toString() },
      schema ? { schema } : undefined
    ),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
