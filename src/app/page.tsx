import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTransactions, getCategories, getSkippedEmails } from "./actions";
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
import { AddTransactionDialog } from "@/components/add-transaction-dialog";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

  const [transactions, categories, skippedEmails] = await Promise.all([
    getTransactions(month, year),
    getCategories(),
    getSkippedEmails(),
  ] as const);

  const totalSpend = transactions
    .filter((t) => !t.is_cc_payment)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransactions = transactions.filter(
    (t) => !t.is_cc_payment
  ).length;
  const pendingReviews = transactions.filter((t) => t.needs_review).length;
  const avgTransaction =
    totalTransactions > 0 ? totalSpend / totalTransactions : 0;

  const serialized = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
  }));

  const serializedSkipped = skippedEmails.map((s) => ({
    ...s,
    created_at: s.created_at.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-bold">Expense Tracker</h1>
          <div className="flex items-center gap-3">
            <AddTransactionDialog categories={categories} />
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <MonthSwitcher month={month} year={year} />
            <p className="text-sm text-muted-foreground">
              Monthly spending overview
            </p>
          </div>
          {process.env.NODE_ENV !== "production" && <SeedButton />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Monthly Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatINR(totalSpend)}</p>
              <p className="text-xs text-muted-foreground">
                Excludes credit card payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalTransactions}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatINR(avgTransaction)}</p>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingReviews}</p>
              <p className="text-xs text-muted-foreground">
                Need your attention
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <CategoryPieChart transactions={serialized} />
          <DailyBarChart transactions={serialized} />
        </div>

        <Separator />

        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">Pending Reviews</TabsTrigger>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="skipped">
              Skipped Emails
              {serializedSkipped.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {serializedSkipped.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            <PendingReviews
              transactions={serialized}
              categories={categories}
            />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <TransactionTable
              transactions={serialized}
              categories={categories}
            />
          </TabsContent>
          <TabsContent value="skipped" className="mt-4">
            <SkippedEmails
              skippedEmails={serializedSkipped}
              categories={categories}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
