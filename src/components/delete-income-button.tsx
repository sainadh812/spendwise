"use client";
import { useTransition } from "react";
import { deleteIncome } from "@/app/extra-actions";

export function DeleteIncomeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteIncome(id))}
      className="text-xs font-mono text-rose-500 hover:text-rose-300 disabled:opacity-40 transition-colors"
      title="Delete"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
