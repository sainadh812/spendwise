// prisma.config.js — plain CJS, evaluated by Prisma CLI directly
// process.env here is Node's real process.env, NOT Prisma's env() validator.
// Falls back to a valid-format placeholder when DATABASE_URL is absent
// (e.g. during `npm install` on Vercel where env vars are not yet injected).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
