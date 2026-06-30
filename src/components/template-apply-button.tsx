"use client";
import { useTransition } from "react";
import { applyTemplate } from "@/app/extra-actions";

export function TemplateApplyButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await applyTemplate(id); })}
      className="text-xs font-mono px-3 py-1.5 rounded-md bg-violet-700/30 hover:bg-violet-700/60 border border-violet-500/30 text-violet-300 hover:text-violet-100 disabled:opacity-40 transition-all"
      style={{ boxShadow: pending ? "none" : "0 0 8px rgba(124,58,237,.3)" }}
      title={"Apply template: " + name}
    >
      {pending ? "…" : "▷ Use"}
    </button>
  );
}
