# 🌌 SpendWise — Alien Finance Dashboard

> A next-gen personal expense tracker combining the best of **Bagels** (TUI powerhouse) and **expense_tracker** (AI-powered web dashboard) — now in a dark alien-tech aesthetic, deployable to Vercel.

![SpendWise Screenshot](docs/screenshot.png)

## ✨ What's Combined

| Feature | From | SpendWise |
|---|---|---|
| Multi-account tracking | Bagels | ✅ Bank / Cash / CC / Wallet / Investment |
| Income tracking | Bagels | ✅ Salary, freelance, investments |
| Recurring templates | Bagels | ✅ One-click apply + shortcut keys 1–9 |
| Account-to-account transfers | Bagels | ✅ Auto-updates both balances |
| Net worth dashboard | Bagels | ✅ Accounts strip on main dashboard |
| AI Gmail parsing | expense_tracker | ✅ Auto-parse HDFC/IDFC emails |
| Gemini categorization | expense_tracker | ✅ 15+ categories with confidence |
| Review workflow | expense_tracker | ✅ Flag & approve low-confidence txns |
| Budget tracking | expense_tracker | ✅ Monthly budget + progress bar |
| Recoverables / debt | expense_tracker | ✅ Track who owes you |
| Analytics charts | expense_tracker | ✅ Pie + daily bar charts |
| XLSX import | expense_tracker | ✅ Bulk import transactions |
| Dark alien-tech UI | — | 🆕 Violet/neon, starfield, glitch logo |

## 🏗 Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components, Server Actions)  
- **Database**: PostgreSQL via Prisma 7  
- **AI**: Google Gemini 2.5 Flash (email parsing + categorization)  
- **Email**: Gmail API (OAuth 2.0)  
- **Auth**: NextAuth v5 (single password)  
- **UI**: Tailwind CSS 4 + shadcn/ui (dark alien theme)  
- **Charts**: Recharts  
- **Language**: TypeScript strict

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone <your-repo>
cd spendwise
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL URL |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `AUTH_PASSWORD` | ✅ | Dashboard login password |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | Gemini key for AI features |
| `GMAIL_CLIENT_ID` | Optional | Gmail OAuth for email parsing |
| `GMAIL_CLIENT_SECRET` | Optional | Gmail OAuth |
| `GMAIL_REFRESH_TOKEN` | Optional | Gmail OAuth |
| `CRON_SECRET` | Optional | Protects `/api/process-emails` |

### 3. Set up database

```bash
npx prisma generate
npx prisma db push        # dev only
npm run db:sync-categories
```

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3003
```

## 🌐 Deploying to Vercel

1. Push to GitHub
2. Import repo in Vercel → set env vars → Deploy
3. Add a cron job for email processing:
   ```
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain.vercel.app/api/process-emails
   ```

## 📁 New Pages

| Route | Description |
|---|---|
| `/accounts` | All accounts + net worth |
| `/income` | Monthly income tracking |
| `/templates` | Recurring transaction templates |
| `/transfers` | Account-to-account transfers |
| `/analytics` | Spending analytics |
| `/categories` | Category management |
| `/recoverables` | Track who owes you |

## 🎨 Design

SpendWise uses a bespoke **alien-tech** dark theme:
- Near-black background (`#03020d`)
- Violet/purple primary (`#7C3AED`)  
- Neon cyan, pink, gold accents
- Animated starfield + scanline overlay
- Glitch animation on logo
- Neon glow on interactive elements
- Space Mono for code/label accents
