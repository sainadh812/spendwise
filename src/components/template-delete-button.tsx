"use client";
import { useTransition } from "react";
import { deleteTemplate } from "@/app/extra-actions";

export function TemplateDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteTemplate(id))}
      className="text-xs font-mono text-rose-500 hover:text-rose-300 disabled:opacity-40 transition-colors px-1"
      title="Delete template"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
