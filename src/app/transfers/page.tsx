import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTransfers, getAccounts } from "@/app/extra-actions";
import { AddTransferDialog } from "@/components/add-transfer-dialog";
import { DeleteTransferButton } from "@/components/delete-transfer-button";

export default async function TransfersPage({
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

  const [transfers, accounts] = await Promise.all([
    getTransfers(month, year),
    getAccounts(),
  ]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0);
  const monthLabel = new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

  const serialized = transfers.map(t => ({
    ...t,
    date: t.date.toISOString(),
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
    from: { id: t.from.id, name: t.from.name },
    to:   { id: t.to.id,   name: t.to.name },
  }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-violet-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="font-mono text-sm text-violet-400 hover:text-violet-300">← Back</a>
            <h1 className="text-lg font-bold gradient-text">Transfers — {monthLabel}</h1>
          </div>
          <AddTransferDialog accounts={accounts} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <div className="card-glow rounded-xl p-6 sweep-hover">
          <p className="text-xs font-mono text-[#9381c4] uppercase tracking-widest mb-1">Total Transferred</p>
          <p className="text-4xl font-bold" style={{ color: "#22d3ee", textShadow: "0 0 16px rgba(34,211,238,.5)" }}>
            {fmt(totalTransferred)}
          </p>
        </div>

        {serialized.length === 0 ? (
          <div className="text-center py-20 text-[#9381c4]">
            <p className="text-5xl mb-4 opacity-30">⇄</p>
            <p className="text-lg">No transfers this month</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serialized.map((t) => (
              <div key={t.id} className="card-glow rounded-xl p-4 flex items-center justify-between sweep-hover">
                <div className="flex items-center gap-4">
                  <div className="text-2xl select-none">⇄</div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-[#e8e4ff]">{t.from.name}</span>
                      <span className="font-mono text-violet-400">→</span>
                      <span className="font-medium text-[#e8e4ff]">{t.to.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-mono text-[#9381c4]">
                        {new Date(t.date).toLocaleDateString("en-IN")}
                      </p>
                      {t.notes && <p className="text-xs text-[#9381c4]">· {t.notes}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold" style={{ color: "#22d3ee", textShadow: "0 0 8px rgba(34,211,238,.4)" }}>
                    {fmt(t.amount)}
                  </p>
                  <DeleteTransferButton id={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
