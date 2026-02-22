# AGENTS.md — Expense Tracker

## Project Overview

Next.js 16 (App Router) expense tracking dashboard. Parses Indian bank alert emails
via Gmail API + Gemini AI to extract debit transactions. Single-user auth via password.
Stack: TypeScript, React 19, Prisma 7 (PostgreSQL), Tailwind CSS 4, shadcn/ui (new-york style),
Vercel AI SDK, NextAuth v5 (beta), Recharts, Zod 4.

## Build / Dev / Lint Commands

```bash
npm run dev            # Start dev server (next dev)
npm run build          # prisma generate && prisma db push && next build
npm run lint           # eslint (flat config, next core-web-vitals + typescript)
npm run start          # next start (production)
npm run db:migrate     # prisma migrate dev
npm run db:push        # prisma db push
npm run db:seed        # POST http://localhost:3000/api/seed (dev only)
npm run postinstall    # prisma generate
```

### After Making Changes

Always run these before considering work done:

```bash
npm run lint
npx tsc --noEmit       # Type checking (strict mode enabled)
npm run build          # Full build verification
```

### Testing

No test framework is configured. There are no test files or test scripts.
If adding tests, check with the user on their preferred framework first.

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout (Geist font)
    page.tsx                # Main dashboard (RSC, server component)
    actions.ts              # Server actions (CRUD for transactions/categories)
    globals.css             # Tailwind + shadcn theme variables
    login/page.tsx          # Login page (RSC)
    api/
      auth/[...nextauth]/   # NextAuth route handler
      process-emails/       # Cron endpoint: Gmail -> AI -> DB
      seed/                 # Dev-only seed endpoint
  components/
    ui/                     # shadcn/ui primitives (DO NOT manually edit)
    *.tsx                   # App-specific client components
  lib/
    auth.ts                 # NextAuth config (credentials provider)
    prisma.ts               # Prisma client singleton
    schemas.ts              # Zod schemas for AI extraction
    categories.ts           # Default category list
    utils.ts                # cn() helper (clsx + tailwind-merge)
  middleware.ts             # Auth guard (cookie check, redirect to /login)
  generated/prisma/         # Generated Prisma client (gitignored)
prisma/
  schema.prisma             # DB schema (Category, Transaction models)
```

## Code Style Guidelines

### TypeScript

- Strict mode is enabled (`"strict": true` in tsconfig)
- Use explicit types for function parameters; infer return types when obvious
- Use `interface` for component props, not `type` (see existing components)
- Path alias: `@/*` maps to `./src/*` — always use `@/` imports, never relative `../`

### Imports

Order (observed in codebase):
1. React / Next.js framework imports
2. Third-party libraries (`ai`, `googleapis`, `zod`, `recharts`, `lucide-react`)
3. Internal `@/lib/*` imports
4. Internal `@/components/ui/*` imports
5. Internal `@/components/*` imports
6. Side-effect imports (CSS)

Use named exports for components. Default exports only for Next.js pages/layouts.

### React / Next.js Patterns

- **Server Components by default** — pages and layouts are RSC (no `"use client"`)
- **Client components**: Add `"use client"` directive at top of file; used for interactivity
- **Server Actions**: Defined in `src/app/actions.ts` with `"use server"` directive
- Use `useTransition` for server action calls in client components (not `useState` for loading)
- Use `revalidatePath("/")` after mutations in server actions
- Use `Promise<>` for `searchParams` type in page components (Next.js 16 async params)

### Styling

- Tailwind CSS 4 with CSS variables for theming (defined in `globals.css`)
- Use `cn()` from `@/lib/utils` for conditional class merging
- shadcn/ui components live in `src/components/ui/` — add new ones via `npx shadcn add <name>`
- Do NOT manually edit files in `src/components/ui/`
- Use Tailwind responsive prefixes (`sm:`, `lg:`) — mobile-first design
- Color tokens: use semantic names (`bg-background`, `text-muted-foreground`, `text-destructive`)

### Naming Conventions

- **Files**: kebab-case (`transaction-table.tsx`, `process-emails/`)
- **Components**: PascalCase (`TransactionTable`, `CategoryPieChart`)
- **Functions**: camelCase (`formatINR`, `handleSave`, `createTransaction`)
- **Server actions**: camelCase verbs (`getTransactions`, `approveTransaction`, `deleteTransaction`)
- **Interfaces**: PascalCase, no `I` prefix (`Transaction`, `CategorySelectProps`)
- **Constants**: UPPER_SNAKE_CASE for module-level (`DEFAULT_CATEGORIES`, `BANK_EMAIL_QUERY`)
- **Database fields**: snake_case (`is_cc_payment`, `confidence_score`, `needs_review`)

### Error Handling

- Server actions: throw errors (let Next.js error boundary handle)
- API routes: try/catch with `NextResponse.json({ error: ... }, { status: ... })`
- Use `error instanceof Error ? error.message : "Unknown error"` pattern
- Log errors with `console.error` in API routes only

### Database (Prisma)

- Schema at `prisma/schema.prisma`, client generated to `src/generated/prisma/`
- Import Prisma client from `@/lib/prisma` (singleton with hot-reload support)
- Use `@prisma/adapter-pg` for PostgreSQL connection
- UUIDs for primary keys (`@id @default(uuid())`)
- Run `npx prisma generate` after schema changes
- Run `npm run db:push` to sync schema to database

### Zod Schemas

- Defined in `src/lib/schemas.ts`
- Use `.describe()` on each field for AI SDK structured output
- Export both schema and inferred type: `export type TransactionInput = z.infer<typeof transactionSchema>`

### Environment Variables

- Never commit `.env` — use `.env.example` as reference
- Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_PASSWORD`
- For email processing: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- For AI: `GOOGLE_GENERATIVE_AI_API_KEY`
- Access via `process.env.VAR_NAME` (no runtime validation wrapper)

### Key Patterns

- Currency formatting: `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`
- Date locale: `"en-IN"` throughout
- Serialization: Prisma `Date` objects are serialized to ISO strings before passing to client components
- CC payments excluded from spend totals (`filter(t => !t.is_cc_payment)`)
- Transactions with `confidence_score < 0.8` are auto-flagged `needs_review: true`

### Security

- Auth middleware in `src/middleware.ts` — protects all routes except `/login`, `/api/auth`, `/api/process-emails`, `/api/seed`
- Cron endpoint (`/api/process-emails`) protected by `CRON_SECRET` bearer token in production
- Seed endpoint disabled in production (`process.env.NODE_ENV === "production"`)
- Never expose or log secrets, API keys, or tokens
