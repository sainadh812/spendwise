// prisma.config.js — plain CJS, evaluated by Prisma CLI directly
// process.env here is Node's real process.env, NOT Prisma's env() validator.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require("prisma/config");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[prisma.config.js] DATABASE_URL is not set. " +
    "Add it to Vercel → Project Settings → Environment Variables " +
    "(scope: Production + Preview + Development)."
  );
}

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
