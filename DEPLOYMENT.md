# Deployment

## Vercel + Next.js deployment standard

This application uses Vercel for automatic application deployment, but database evolution is handled explicitly.

## Recommended Vercel build command

Set the Vercel build command to:

```bash
npm run build
```

That command runs:

1. `prisma generate`
2. `prisma migrate deploy`
3. `node scripts/sync-categories.mjs`
4. `next build`

This makes schema migrations and default category syncing automatic and idempotent on every deploy.

## What should not run on every deploy

Do not run historical backfills on every deployment.

These should be manual or explicitly triggered:

- `npm run db:backfill-categories:dry`
- `npm run db:backfill-categories`

Historical backfills are versioned upgrade steps for older installations.

## First production rollout for category hierarchy

After the deployment with the migration lands successfully:

```bash
npm run db:backfill-categories:dry
npm run db:backfill-categories
```

## Production checklist

- Use a dedicated production database or schema for this app
- Set all required env vars in Vercel
- Back up the database before significant upgrades
- Use `prisma migrate deploy`, not `prisma db push`, in production
- Keep migration files committed to the repo

## Existing users upgrading from older versions

Users on older versions should follow `UPGRADING.md`.

The repository supports upgrades by keeping:

- Prisma migrations in git
- idempotent default-data sync scripts
- upgrade scripts for historical backfills

Compatibility fields such as the legacy `Transaction.category` string are intentionally retained during the transition period to avoid data loss.
