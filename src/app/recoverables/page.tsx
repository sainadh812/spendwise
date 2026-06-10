import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRecoverables } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavBar } from "@/components/nav-bar";
import { RecoverableCounterpartyCard } from "@/components/recoverables-list";
import { HandCoins } from "lucide-react";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function RecoverablesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const groups = await getRecoverables();

  const totalOutstanding = groups.reduce((s, g) => s + g.outstanding, 0);
  const totalLent = groups.reduce((s, g) => s + g.total_lent, 0);
  const totalRepaid = groups.reduce((s, g) => s + g.total_repaid, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-6">
            <NavBar />
            <h1 className="text-lg font-bold sm:text-xl md:hidden">Expense Tracker</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <HandCoins className="h-6 w-6" /> Recoverables
          </h2>
          <p className="text-sm text-muted-foreground">
            Money lent or paid on behalf of others — tracked across all months
            and years. Mark transactions as recoverable from the dashboard.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatINR(totalOutstanding)}</p>
              <p className="text-xs text-muted-foreground">
                {groups.length} {groups.length === 1 ? "counterparty" : "counterparties"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Lent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatINR(totalLent)}</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Repaid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatINR(totalRepaid)}</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No recoverable transactions yet. Mark a transaction as recoverable
              from the dashboard to start tracking money owed to you.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <RecoverableCounterpartyCard key={group.counterparty} group={group} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
