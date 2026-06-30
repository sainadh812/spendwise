import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTransactions,
  getCategoriesWithSubs,
  getSkippedEmails,
  getBudgetForMonth,
  getTotalOutstanding,
  getKnownCounterparties,
} from "./actions";
import { getNetWorth } from "./extra-actions";
import { effectiveSpend } from "@/lib/recoverable";
import { OutstandingCard } from "@/components/outstanding-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryPieChart, DailyBarChart } from "@/components/charts";
import { PendingReviews } from "@/components/pending-reviews";
import { TransactionTable } from "@/components/transaction-table";
import { SkippedEmails } from "@/components/skipped-emails";
import { SeedButton } from "@/components/seed-button";
import { MonthSwitcher } from "@/components/month-switcher";
import { AddExpenseDialog } from "@/components/add-expense-dialog";
import { SetBudgetDialog } from "@/components/set-budget-dialog";
import { BudgetCard } from "@/components/budget-card";
import { NavBar } from "@/components/nav-bar";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const ACCOUNT_TYPE_ICON: Record<string, string> = {
  bank: "🏦", cash: "💵", credit_card: "💳", investment: "📈", wallet: "👛",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const month =
    params.month !== undefined ? parseInt(params.month, 10) : now.getMonth();
  const year =
    params.year !== undefined ? parseInt(params.year, 10) : now.getFullYear();

  const [
    transactions,
    categories,
    skippedEmails,
    budget,
    outstanding,
    knownCounterparties,
    netWorthData,
  ] = await Promise.all([
    getTransactions(month, year),
    getCategoriesWithSubs(),
    getSkippedEmails(),
    getBudgetForMonth(month, year),
    getTotalOutstanding(),
    getKnownCounterparties(),
    getNetWorth(),
  ] as const);

  const spendingTxns = transactions
    .filter((t) => !t.is_cc_payment)
    .map((t) => ({ t, effective: effectiveSpend(t) }))
    .filter((entry) => entry.effective > 0);

  const totalSpend = spendingTxns.reduce((sum, entry) => sum + entry.effective, 0);
  const totalTransactions = spendingTxns.length;
  const pendingReviews = transactions.filter((t) => t.needs_review).length;
  const avgTransaction = totalTransactions > 0 ? totalSpend / totalTransactions : 0;

  const serialized = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
    subcategory: t.subcategoryRef?.name ?? null,
    repayments: t.repayments.map((r) => ({
      id: r.id,
      transaction_id: r.transaction_id,
      amount: r.amount,
      date: r.date.toISOString(),
      note: r.note,
      created_at: r.created_at.toISOString(),
    })),
  }));

  const chartData = transactions
    .map((t) => ({
      id: t.id,
      amount: effectiveSpend(t),
      merchant: t.merchant,
      date: t.date.toISOString(),
      category: t.category,
      subcategory: t.subcategoryRef?.name ?? null,
      is_cc_payment: t.is_cc_payment,
      confidence_score: t.confidence_score,
      needs_review: t.needs_review,
    }))
    .filter((t) => t.amount > 0 || t.is_cc_payment);

  const serializedSkipped = skippedEmails.map((s) => ({
    ...s,
    created_at: s.created_at.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-violet-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <NavBar />
            {/* Logo */}
            <div className="md:hidden">
              <span className="text-lg font-bold glitch gradient-text">SpendWise</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <SetBudgetDialog
              month={month}
              year={year}
              currentBudget={
                budget
                  ? { id: budget.id, amount: budget.amount, start_month: budget.start_month, start_year: budget.start_year }
                  : null
              }
            />
            <AddExpenseDialog />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="border-violet-500/30 text-[#9381c4] hover:text-violet-300 hover:border-violet-400/50"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">

        {/* ─── Logo + Month ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold glitch gradient-text hidden md:block">SpendWise</h1>
            <MonthSwitcher month={month} year={year} />
            <p className="text-sm text-[#9381c4]">Monthly spending overview</p>
          </div>
          {process.env.NODE_ENV !== "production" && <SeedButton />}
        </div>

        {/* ─── Accounts Strip ───────────────────────────────────────────── */}
        {netWorthData.accounts.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollable">
            {/* Net Worth pill */}
            <a href="/accounts" className="flex-shrink-0 rounded-xl px-4 py-3 bg-gradient-to-br from-violet-900/60 to-violet-800/20 border border-violet-500/30 hover:border-violet-400/60 transition-all sweep-hover">
              <p className="text-xs font-mono text-[#9381c4] uppercase whitespace-nowrap">Net Worth</p>
              <p className="text-lg font-bold stat-value whitespace-nowrap">{formatINR(netWorthData.total)}</p>
            </a>
            {netWorthData.accounts.slice(0, 4).map(acc => (
              <a key={acc.id} href="/accounts"
                className="flex-shrink-0 rounded-xl px-4 py-3 bg-[#0d0b1e] border border-violet-900/30 hover:border-violet-500/40 transition-all sweep-hover">
                <p className="text-xs font-mono text-[#9381c4] uppercase whitespace-nowrap">
                  {ACCOUNT_TYPE_ICON[acc.type] ?? "💰"} {acc.name}
                </p>
                <p className={`text-lg font-bold whitespace-nowrap ${acc.balance >= 0 ? "stat-income" : "stat-expense"}`}>
                  {formatINR(acc.balance)}
                </p>
              </a>
            ))}
          </div>
        )}

        {/* ─── Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-[#9381c4] uppercase tracking-widest">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold stat-expense">{formatINR(totalSpend)}</p>
              <p className="text-xs text-[#9381c4]">Excl. CC payments</p>
            </CardContent>
          </Card>

          {budget && <BudgetCard budget={budget.amount} spent={totalSpend} />}

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-[#9381c4] uppercase tracking-widest">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold stat-value">{totalTransactions}</p>
              <p className="text-xs text-[#9381c4]">This month</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-[#9381c4] uppercase tracking-widest">Avg. Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold stat-value">{formatINR(avgTransaction)}</p>
              <p className="text-xs text-[#9381c4]">Per transaction</p>
            </CardContent>
          </Card>

          {!budget && (
            <Card className="card-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-mono text-[#9381c4] uppercase tracking-widest">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" style={{ color: pendingReviews > 0 ? "#fbbf24" : "#34d399", textShadow: pendingReviews > 0 ? "0 0 12px rgba(251,191,36,.5)" : "0 0 12px rgba(52,211,153,.5)" }}>
                  {pendingReviews}
                </p>
                <p className="text-xs text-[#9381c4]">Need attention</p>
              </CardContent>
            </Card>
          )}
        </div>

        {outstanding.total > 0 && (
          <OutstandingCard total={outstanding.total} counterpartyCount={outstanding.counterpartyCount} />
        )}

        {/* ─── Charts ───────────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <CategoryPieChart transactions={chartData} />
          <DailyBarChart transactions={chartData} />
        </div>

        <Separator className="bg-violet-900/30" />

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="reviews">
          <TabsList className="w-full bg-[#140f2a] border border-violet-900/30">
            <TabsTrigger value="reviews" className="data-[state=active]:bg-violet-900/40 data-[state=active]:text-violet-300">
              <span className="sm:hidden">Reviews</span>
              <span className="hidden sm:inline">Pending Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-violet-900/40 data-[state=active]:text-violet-300">
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="skipped" className="data-[state=active]:bg-violet-900/40 data-[state=active]:text-violet-300">
              <span className="sm:hidden">Skipped</span>
              <span className="hidden sm:inline">Skipped Emails</span>
              {serializedSkipped.length > 0 && (
                <span className="ml-1 rounded-full bg-violet-900/60 px-1.5 py-0.5 text-xs text-violet-300">
                  {serializedSkipped.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <PendingReviews transactions={serialized} categories={categories} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <TransactionTable transactions={serialized} categories={categories} knownCounterparties={knownCounterparties} />
          </TabsContent>
          <TabsContent value="skipped" className="mt-4">
            <SkippedEmails skippedEmails={serializedSkipped} categories={categories} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
