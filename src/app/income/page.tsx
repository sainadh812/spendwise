import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getIncome, getAccounts } from "@/app/extra-actions";
import Link from "next/link";
import { AddIncomeDialog } from "@/components/add-income-dialog";
import { DeleteIncomeButton } from "@/components/delete-income-button";

const SOURCE_ICONS: Record<string, string> = {
  salary:     "💼",
  freelance:  "🖥",
  investment: "📈",
  gift:       "🎁",
  other:      "✦",
};

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const month = params.month !== undefined ? parseInt(params.month, 10) : now.getMonth();
  const year  = params.year  !== undefined ? parseInt(params.year,  10) : now.getFullYear();

  const [incomes, accounts] = await Promise.all([
    getIncome(month, year),
    getAccounts(),
  ]);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const monthLabel = new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  const serialized = incomes.map(i => ({
    ...i,
    date: i.date.toISOString(),
    createdAt: i.created_at.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-violet-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-sm text-violet-400 hover:text-violet-300">← Back</Link>
            <h1 className="text-lg font-bold gradient-text">Income — {monthLabel}</h1>
          </div>
          <AddIncomeDialog accounts={accounts} month={month} year={year} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Total Income Banner */}
        <div className="card-glow rounded-xl p-6 sweep-hover">
          <p className="text-xs font-mono text-[#9381c4] uppercase tracking-widest mb-1">Total Income This Month</p>
          <p className="text-4xl font-bold stat-income">{fmt(totalIncome)}</p>
        </div>

        {/* Income list */}
        {serialized.length === 0 ? (
          <div className="text-center py-20 text-[#9381c4]">
            <p className="text-5xl mb-4 opacity-30">↑</p>
            <p className="text-lg">No income recorded this month</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serialized.map((inc) => {
              const icon = SOURCE_ICONS[inc.source] ?? "✦";
              return (
                <div
                  key={inc.id}
                  className="card-glow rounded-xl p-4 flex items-center justify-between sweep-hover"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-medium text-[#e8e4ff]">{inc.source.charAt(0).toUpperCase() + inc.source.slice(1)}</p>
                      {inc.description && (
                        <p className="text-xs text-[#9381c4]">{inc.description}</p>
                      )}
                      <p className="text-xs font-mono text-[#9381c4]">
                        {new Date(inc.date).toLocaleDateString("en-IN")}
                        {inc.account ? ` · ${inc.account.name}` : ""}
                        {inc.is_recurring ? " · 🔁 recurring" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold stat-income">{fmt(inc.amount)}</p>
                    <DeleteIncomeButton id={inc.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
