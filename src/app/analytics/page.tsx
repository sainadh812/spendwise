import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getTransactions,
  getTransactionsForYear,
  getAvailableYears,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NavBar } from "@/components/nav-bar";
import { AnalyticsPeriodSelector } from "@/components/analytics-period-selector";
import { AnalyticsStats } from "@/components/analytics-stats";
import {
  MonthlyTrendChart,
  AnalyticsPieChart,
  AnalyticsDailyBarChart,
  CategoryComparisonChart,
  StackedAreaChart,
  TopMerchantsChart,
  WeekdayHeatmap,
  YearOverYearChart,
} from "@/components/analytics-charts";

function computeStats(
  transactions: { amount: number; is_cc_payment: boolean }[]
) {
  const spending = transactions.filter((t) => !t.is_cc_payment);
  const totalSpend = spending.reduce((s, t) => s + t.amount, 0);
  const totalTransactions = spending.length;
  const avgTransaction = totalTransactions > 0 ? totalSpend / totalTransactions : 0;
  const maxSingleSpend = spending.length > 0
    ? Math.max(...spending.map((t) => t.amount))
    : 0;
  return { totalSpend, totalTransactions, avgTransaction, maxSingleSpend };
}

function serialize(
  transactions: { id: string; amount: number; merchant: string; date: Date; category: string; is_cc_payment: boolean; confidence_score: number; needs_review: boolean; email_message_id: string | null; remarks: string | null; source: string; created_at: Date; updated_at: Date }[]
) {
  return transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    merchant: t.merchant,
    date: t.date.toISOString(),
    category: t.category,
    is_cc_payment: t.is_cc_payment,
  }));
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    year?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const mode = params.view === "yearly" ? "yearly" : "monthly";
  const month =
    params.month !== undefined ? parseInt(params.month, 10) : now.getMonth();
  const year =
    params.year !== undefined ? parseInt(params.year, 10) : now.getFullYear();

  const availableYears = await getAvailableYears();

  if (mode === "monthly") {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    const [currentTxns, prevTxns, yearTxns, prevYearTxns] = await Promise.all([
      getTransactions(month, year),
      getTransactions(prevMonth, prevYear),
      getTransactionsForYear(year),
      getTransactionsForYear(year - 1),
    ]);

    const current = serialize(currentTxns);
    const yearSerialized = serialize(yearTxns);
    const prevYearSerialized = serialize(prevYearTxns);

    const stats = computeStats(currentTxns);
    const prevStats = computeStats(prevTxns);

    const prevLabel = new Date(prevYear, prevMonth).toLocaleDateString(
      "en-IN",
      { month: "short", year: "numeric" }
    );

    const periodLabel = new Date(year, month).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold">Expense Tracker</h1>
              <NavBar />
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Detailed spending insights and trends
            </p>
          </div>

          <AnalyticsPeriodSelector
            mode={mode}
            month={month}
            year={year}
            availableYears={availableYears}
          />

          <AnalyticsStats
            totalSpend={stats.totalSpend}
            totalTransactions={stats.totalTransactions}
            avgTransaction={stats.avgTransaction}
            maxSingleSpend={stats.maxSingleSpend}
            prevTotalSpend={prevStats.totalSpend}
            prevTotalTransactions={prevStats.totalTransactions}
            prevAvgTransaction={prevStats.avgTransaction}
            prevMaxSingleSpend={prevStats.maxSingleSpend}
            periodLabel={periodLabel}
            prevPeriodLabel={prevLabel}
          />

          <Separator />

          <MonthlyTrendChart transactions={yearSerialized} year={year} />

          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsPieChart transactions={current} />
            <TopMerchantsChart transactions={current} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsDailyBarChart transactions={current} />
            <WeekdayHeatmap transactions={current} />
          </div>

          <CategoryComparisonChart transactions={current} />

          <StackedAreaChart transactions={current} />

          <YearOverYearChart
            currentTransactions={yearSerialized}
            previousTransactions={prevYearSerialized}
            currentYear={year}
            previousYear={year - 1}
          />
        </main>
      </div>
    );
  }

  const [yearTxns, prevYearTxns] = await Promise.all([
    getTransactionsForYear(year),
    getTransactionsForYear(year - 1),
  ]);

  const yearSerialized = serialize(yearTxns);
  const prevYearSerialized = serialize(prevYearTxns);

  const stats = computeStats(yearTxns);
  const prevStats = computeStats(prevYearTxns);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Expense Tracker</h1>
            <NavBar />
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Detailed spending insights and trends
          </p>
        </div>

        <AnalyticsPeriodSelector
          mode={mode}
          month={month}
          year={year}
          availableYears={availableYears}
        />

        <AnalyticsStats
          totalSpend={stats.totalSpend}
          totalTransactions={stats.totalTransactions}
          avgTransaction={stats.avgTransaction}
          maxSingleSpend={stats.maxSingleSpend}
          prevTotalSpend={prevStats.totalSpend}
          prevTotalTransactions={prevStats.totalTransactions}
          prevAvgTransaction={prevStats.avgTransaction}
          prevMaxSingleSpend={prevStats.maxSingleSpend}
          periodLabel={String(year)}
          prevPeriodLabel={String(year - 1)}
        />

        <Separator />

        <MonthlyTrendChart transactions={yearSerialized} year={year} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsPieChart transactions={yearSerialized} />
          <TopMerchantsChart transactions={yearSerialized} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsDailyBarChart transactions={yearSerialized} />
          <WeekdayHeatmap transactions={yearSerialized} />
        </div>

        <CategoryComparisonChart transactions={yearSerialized} />

        <StackedAreaChart transactions={yearSerialized} />

        <YearOverYearChart
          currentTransactions={yearSerialized}
          previousTransactions={prevYearSerialized}
          currentYear={year}
          previousYear={year - 1}
        />
      </main>
    </div>
  );
}
