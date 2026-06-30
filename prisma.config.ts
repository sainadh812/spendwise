import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env fallback lets `prisma generate` run during `npm install`
    // even when DATABASE_URL isn't set (CI / Vercel install phase).
    // The real URL is injected at build/runtime via the DATABASE_URL env var.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
