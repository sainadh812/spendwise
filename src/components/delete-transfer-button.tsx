"use client";
import { useTransition } from "react";
import { deleteTransfer } from "@/app/extra-actions";

export function DeleteTransferButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteTransfer(id))}
      className="text-xs font-mono text-rose-500 hover:text-rose-300 disabled:opacity-40 transition-colors"
      title="Delete transfer (reverses balance changes)"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
