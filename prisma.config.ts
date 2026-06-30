import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env (not Prisma's env()) — never throws, falls back to a
    // valid-format placeholder so prisma generate works during npm install
    // when DATABASE_URL is not yet available. The real URL is set via
    // Vercel environment variables and used at build/runtime.
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
