# AGENTS.md — Expense Tracker

## Project Overview

Next.js 16 (App Router) expense tracking dashboard. Parses Indian bank alert emails
via Gmail API + Gemini AI (`gemini-2.5-flash`) to extract debit transactions. Single-user
auth via password. Stack: TypeScript, React 19, Prisma 7 (PostgreSQL), Tailwind CSS 4,
shadcn/ui (new-york style), Vercel AI SDK, NextAuth v5 (beta), Recharts, date-fns, Zod 4.

## Build / Dev / Lint Commands

```bash
npm run dev            # Start dev server (next dev, port 3003, --inspect enabled)
npm run build          # prisma generate && prisma db push && next build
npm run lint           # eslint (flat config, next core-web-vitals + typescript)
npm run start          # next start (production, port 3003)
npm run db:migrate     # prisma migrate dev
npm run db:push        # prisma db push
npm run db:seed        # curl POST to localhost:3003/api/seed (dev only, server must be running)
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

Vitest 4 with happy-dom environment. Config: `vitest.config.mts`. Setup: `src/test-setup.ts`.

```bash
npm test                              # Run all tests (vitest run)
npm run test:watch                    # Watch mode (vitest)
npx vitest run src/lib/email.test.ts  # Run a single test file
npx vitest run -t "parses dd-Mon"     # Run tests matching a name pattern
```

Test files live next to their source: `src/**/*.test.ts` / `src/**/*.test.tsx`.
Tests use `describe`/`it`/`expect`/`vi` from `vitest`, `@testing-library/react` for component
tests, and `@testing-library/user-event` for interactions. Mock server actions with
`vi.mock("@/app/actions", ...)`. Use `beforeEach`/`afterEach` with `vi.clearAllMocks()`
and `cleanup()`. Use `vi.setSystemTime()` / `vi.useRealTimers()` for time mocking.

## Project Structure

```
src/
  app/
    layout.tsx              # Root layout (Geist font)
    page.tsx                # Main dashboard (RSC)
    actions.ts              # Server actions (CRUD for transactions/categories/skipped emails)
    globals.css             # Tailwind + shadcn theme variables
    login/page.tsx          # Login page (RSC)
    analytics/page.tsx      # Analytics page (monthly/yearly views)
    api/
      auth/[...nextauth]/   # NextAuth route handler
      process-emails/       # Cron endpoint (GET): Gmail -> AI -> DB
      seed/                 # Dev-only seed endpoint
  components/
    ui/                     # shadcn/ui primitives (DO NOT manually edit)
    *.tsx                   # App-specific client components (co-located tests)
  lib/
    auth.ts                 # NextAuth config (credentials provider)
    prisma.ts               # Prisma client singleton (supports Prisma Accelerate)
    schemas.ts              # Zod schemas for AI extraction
    categories.ts           # Default category list
    email.ts                # Email HTML-to-text helpers (html-to-text lib)
    date-extraction.ts      # Regex date extraction + AI date reconciliation
    utils.ts                # cn() helper (clsx + tailwind-merge)
  middleware.ts             # Auth guard (cookie check, redirect to /login)
  generated/prisma/         # Generated Prisma client (gitignored)
  test-setup.ts             # Vitest global setup (@testing-library/jest-dom)
prisma/
  schema.prisma             # DB schema (Category, Transaction, SkippedEmail)
```

## Code Style Guidelines

### TypeScript

- Strict mode (`"strict": true` in tsconfig)
- Use explicit types for function parameters; infer return types when obvious
- Use `interface` for component props, not `type`
- Path alias: `@/*` maps to `./src/*` — always use `@/` imports, never relative `../`

### Imports

Order:
1. React / Next.js framework imports
2. Third-party libraries (`ai`, `googleapis`, `zod`, `date-fns`, `recharts`, `lucide-react`)
3. Internal `@/lib/*` imports
4. Internal `@/components/ui/*` imports
5. Internal `@/components/*` imports
6. Side-effect imports (CSS)

Use named exports for components. Default exports only for Next.js pages/layouts.

### React / Next.js Patterns

- **Server Components by default** — pages and layouts are RSC (no `"use client"`)
- **Client components**: `"use client"` directive at top; used for interactivity
- **Server Actions**: Defined in `src/app/actions.ts` with `"use server"` directive
- Use `useTransition` for server action calls (not `useState` for loading)
- Use `revalidatePath("/")` after mutations in server actions
- Use `Promise<>` for `searchParams` type in page components (Next.js 16 async params)

### Styling

- Tailwind CSS 4 with CSS variables for theming (defined in `globals.css`)
- Use `cn()` from `@/lib/utils` for conditional class merging
- shadcn/ui components in `src/components/ui/` — add new ones via `npx shadcn add <name>`
- Do NOT manually edit files in `src/components/ui/`
- Mobile-first with Tailwind responsive prefixes (`sm:`, `lg:`)
- Color tokens: semantic names (`bg-background`, `text-muted-foreground`, `text-destructive`)

### Naming Conventions

- **Files**: kebab-case (`transaction-table.tsx`, `process-emails/`)
- **Components**: PascalCase (`TransactionTable`, `CategoryPieChart`)
- **Functions**: camelCase (`formatINR`, `handleSave`, `createTransaction`)
- **Server actions**: camelCase verbs (`getTransactions`, `approveTransaction`)
- **Interfaces**: PascalCase, no `I` prefix (`Transaction`, `CategorySelectProps`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_CATEGORIES`, `BANK_EMAIL_QUERY`)
- **Database fields**: snake_case (`is_cc_payment`, `confidence_score`, `needs_review`)
- **Test files**: same name as source with `.test.ts`/`.test.tsx` suffix, co-located

### Error Handling

- Server actions: throw errors (let Next.js error boundary handle)
- API routes: try/catch with `NextResponse.json({ error: ... }, { status: ... })`
- Use `error instanceof Error ? error.message : "Unknown error"` pattern
- Log errors with `console.error` in API routes only

### Database (Prisma)

- Schema at `prisma/schema.prisma` with 3 models: Category, Transaction, SkippedEmail
- Client generated to `src/generated/prisma/`, import from `@/generated/prisma/client`
- Import singleton from `@/lib/prisma` (supports both standard PG and Prisma Accelerate URLs)
- UUIDs for primary keys (`@id @default(uuid())`)
- Run `npx prisma generate` after schema changes, `npm run db:push` to sync DB

### Zod Schemas

- Defined in `src/lib/schemas.ts`
- Use `.describe()` on each field for AI SDK structured output
- Export both schema and inferred type: `export type TransactionInput = z.infer<typeof transactionSchema>`

### Environment Variables

- Never commit `.env` — use `.env.example` as reference
- Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_PASSWORD`
- Email processing: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- AI: `GOOGLE_GENERATIVE_AI_API_KEY`
- Security: `CRON_SECRET` (bearer token for `/api/process-emails` in production)
- Optional: `GMAIL_SEARCH_QUERY` (override default email search filter)
- Access via `process.env.VAR_NAME` (no runtime validation wrapper)

### Key Patterns

- Currency: `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`
- Date locale: `"en-IN"` throughout
- Serialization: Prisma `Date` objects serialized to ISO strings before passing to client components
- CC payments excluded from spend totals (`filter(t => !t.is_cc_payment)`)
- Transactions with `confidence_score < 0.8` auto-flagged `needs_review: true`

### Security

- Auth middleware in `src/middleware.ts` — protects all routes except `/login`, `/api/auth`, `/api/process-emails`, `/api/seed`
- Cron endpoint (`/api/process-emails`) protected by `CRON_SECRET` bearer token in production
- Seed endpoint disabled in production (`process.env.NODE_ENV === "production"`)
- Never expose or log secrets, API keys, or tokens
