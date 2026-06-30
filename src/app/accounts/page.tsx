import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAccounts, getNetWorth } from "@/app/extra-actions";
import { AddAccountDialog } from "@/components/add-account-dialog";

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  bank:         "🏦",
  cash:         "💵",
  credit_card:  "💳",
  investment:   "📈",
  wallet:       "👛",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  bank:         "from-violet-900/60 to-violet-800/30 border-violet-500/30",
  cash:         "from-emerald-900/60 to-emerald-800/30 border-emerald-500/30",
  credit_card:  "from-rose-900/60 to-rose-800/30 border-rose-500/30",
  investment:   "from-amber-900/60 to-amber-800/30 border-amber-500/30",
  wallet:       "from-cyan-900/60 to-cyan-800/30 border-cyan-500/30",
};

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [accounts, { total }] = await Promise.all([
    getAccounts(),
    getNetWorth(),
  ]);

  const formatINR = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen">
      <header className="border-b border-violet-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="font-mono text-sm text-violet-400 hover:text-violet-300">← Back</a>
            <h1 className="text-lg font-bold gradient-text">Accounts</h1>
          </div>
          <AddAccountDialog />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Net Worth Banner */}
        <div className="card-glow rounded-xl p-6 flex items-center justify-between sweep-hover">
          <div>
            <p className="text-xs font-mono text-[#9381c4] uppercase tracking-widest mb-1">Net Worth</p>
            <p className={`text-4xl font-bold stat-value`}>{formatINR(total)}</p>
          </div>
          <div className="text-6xl opacity-20 font-mono select-none">◈</div>
        </div>

        {/* Account Cards */}
        {accounts.length === 0 ? (
          <div className="text-center py-20 text-[#9381c4]">
            <p className="text-5xl mb-4 opacity-30">◈</p>
            <p className="text-lg">No accounts yet</p>
            <p className="text-sm mt-1">Add your bank, wallet, or investment accounts</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => {
              const colorClass = ACCOUNT_TYPE_COLORS[acc.type] ?? ACCOUNT_TYPE_COLORS.bank;
              const icon = ACCOUNT_TYPE_ICONS[acc.type] ?? "💰";
              const isPositive = acc.balance >= 0;
              return (
                <div
                  key={acc.id}
                  className={"rounded-xl p-5 bg-gradient-to-br border sweep-hover transition-all duration-200 hover:scale-[1.02] " + colorClass}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-2xl mb-1">{icon}</p>
                      <p className="font-semibold text-[#e8e4ff]">{acc.name}</p>
                      <p className="text-xs font-mono text-[#9381c4] uppercase">{acc.type.replace("_", " ")}</p>
                    </div>
                    <div className={`text-right ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      <p className="text-2xl font-bold" style={{ textShadow: isPositive ? "0 0 12px rgba(52,211,153,.5)" : "0 0 12px rgba(248,113,113,.5)" }}>
                        {formatINR(acc.balance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#9381c4]">{acc.currency}</span>
                    <span className="text-xs font-mono text-[#9381c4]">
                      {isPositive ? "CREDIT ↑" : "DEBIT ↓"}
                    </span>
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
