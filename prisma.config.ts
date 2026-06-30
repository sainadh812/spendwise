import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Only include datasource when DATABASE_URL is available.
  // During `npm install` (Vercel install phase) it is not set,
  // so prisma generate runs without it — which is fine, generate
  // does not connect to the database.
  // During `npm run build` (Vercel build phase) it is set,
  // so prisma migrate deploy can connect and run migrations.
  ...(url ? { datasource: { url } } : {}),
});
