import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTemplates, getAccounts } from "@/app/extra-actions";
import { AddTemplateDialog } from "@/components/add-template-dialog";
import { TemplateApplyButton } from "@/components/template-apply-button";
import { TemplateDeleteButton } from "@/components/template-delete-button";

const FREQ_LABELS: Record<string, string> = {
  daily:   "Daily",
  weekly:  "Weekly",
  monthly: "Monthly",
  yearly:  "Yearly",
};

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [templates, accounts] = await Promise.all([getTemplates(), getAccounts()]);
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen">
      <header className="border-b border-violet-900/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="/" className="font-mono text-sm text-violet-400 hover:text-violet-300">← Back</a>
            <h1 className="text-lg font-bold gradient-text">Templates</h1>
          </div>
          <AddTemplateDialog accounts={accounts} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <p className="text-sm text-[#9381c4]">
          Templates let you log recurring expenses in one click. Assign a shortcut key (1–9) for keyboard quick-add.
        </p>

        {templates.length === 0 ? (
          <div className="text-center py-20 text-[#9381c4]">
            <p className="text-5xl mb-4 opacity-30">◻</p>
            <p className="text-lg">No templates yet</p>
            <p className="text-sm mt-1">Create templates for recurring transactions like rent or subscriptions</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="card-glow rounded-xl p-5 sweep-hover flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {tpl.shortcut_key && (
                        <span className="text-xs font-mono bg-violet-900/50 border border-violet-500/30 px-2 py-0.5 rounded text-violet-300">
                          [{tpl.shortcut_key}]
                        </span>
                      )}
                      <p className="font-semibold text-[#e8e4ff]">{tpl.name}</p>
                    </div>
                    <p className="text-xs text-[#9381c4]">{tpl.merchant} · {tpl.category}</p>
                    {tpl.frequency && (
                      <p className="text-xs font-mono text-cyan-400 mt-1">
                        🔁 {FREQ_LABELS[tpl.frequency] ?? tpl.frequency}
                      </p>
                    )}
                    {tpl.notes && (
                      <p className="text-xs text-[#9381c4] mt-1 italic">{tpl.notes}</p>
                    )}
                  </div>
                  <p className="text-xl font-bold text-rose-400" style={{ textShadow: "0 0 8px rgba(248,113,113,.4)" }}>
                    {fmt(tpl.amount)}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-violet-900/30">
                  <span className="text-xs font-mono text-[#9381c4]">
                    used {tpl.use_count}×
                  </span>
                  <div className="flex items-center gap-2">
                    <TemplateDeleteButton id={tpl.id} />
                    <TemplateApplyButton id={tpl.id} name={tpl.name} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
