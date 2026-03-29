# Upgrading

This document describes how to safely upgrade existing installations of Expense Tracker.

## Upgrade policy

- Prisma schema migrations are kept in the repo permanently.
- Default category sync is idempotent and safe to re-run.
- Historical backfill scripts are upgrade tools for older installs and should be run when release notes say they are required.

## Upgrading to category hierarchy support

This release adds:

- parent/subcategory relationships in `Category`
- `Transaction.categoryId`
- `Transaction.subcategoryId`
- analytics and UI support for category modes

### Required steps

1. Deploy code that contains the Prisma migration files.
2. Run schema migrations:

```bash
npx prisma migrate deploy
```

3. Sync default categories and subcategories:

```bash
npm run db:sync-categories
```

4. Run a dry-run backfill for old transactions:

```bash
npm run db:backfill-categories:dry
```

5. Review any unmatched legacy category values.
6. Run the real backfill:

```bash
npm run db:backfill-categories
```

### Notes

- Existing `Transaction.category` values are preserved.
- Historical transactions are backfilled to `categoryId` when a safe mapping exists.
- Historical `subcategoryId` values are not inferred automatically.
- It is safe to re-run category sync and backfill scripts.

## Deployment sequencing

Use this order for upgrades:

1. Backup database
2. Apply Prisma migrations
3. Sync reference data
4. Run required backfills
5. Start or deploy the new application version

This repository follows an expand -> migrate data -> contract approach. Old fields remain in place until all active installs have crossed the upgrade boundary.
