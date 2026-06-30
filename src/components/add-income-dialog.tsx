"use client";

import { useState, useTransition } from "react";
import { createIncome } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INCOME_SOURCES = ["salary", "freelance", "investment", "gift", "other"];

interface Account { id: string; name: string; type: string; }

export function AddIncomeDialog({ accounts, month, year }: { accounts: Account[]; month: number; year: number; }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = new Date(year, month, new Date().getDate());
  const todayStr = today.toISOString().split("T")[0];
  const [form, setForm] = useState({
    amount: "",
    source: "salary",
    description: "",
    date: todayStr,
    accountId: "",
    is_recurring: false,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createIncome({
        amount:       parseFloat(form.amount),
        source:       form.source,
        description:  form.description || undefined,
        date:         form.date,
        accountId:    form.accountId || undefined,
        is_recurring: form.is_recurring,
      });
      setOpen(false);
      setForm(f => ({ ...f, amount: "", description: "" }));
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/50"
          style={{ boxShadow: "0 0 12px rgba(52,211,153,.4)" }}
        >
          + Add Income
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d0b1e] border border-violet-500/30 text-[#e8e4ff]">
        <DialogHeader>
          <DialogTitle className="gradient-text">Record Income</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Amount (₹)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                required
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Source</Label>
              <select
                value={form.source}
                onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm"
              >
                {INCOME_SOURCES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">Description (optional)</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. June salary"
              className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Account</Label>
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm"
              >
                <option value="">— None —</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#9381c4] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
              className="accent-violet-500"
            />
            Recurring monthly income
          </label>
          <Button
            type="submit"
            disabled={pending || !form.amount}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white"
            style={{ boxShadow: "0 0 12px rgba(52,211,153,.4)" }}
          >
            {pending ? "Saving…" : "Save Income"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
