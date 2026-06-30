"use client";

import { useState, useTransition } from "react";
import { createTemplate } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FREQUENCIES = ["", "daily", "weekly", "monthly", "yearly"];
interface Account { id: string; name: string; }

export function AddTemplateDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "", amount: "", merchant: "", category: "",
    accountId: "", type: "expense", frequency: "", notes: "", shortcut_key: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createTemplate({
        name:         form.name,
        amount:       parseFloat(form.amount),
        merchant:     form.merchant,
        category:     form.category,
        accountId:    form.accountId || undefined,
        type:         form.type,
        frequency:    form.frequency || undefined,
        notes:        form.notes || undefined,
        shortcut_key: form.shortcut_key || undefined,
      });
      setOpen(false);
      setForm({ name: "", amount: "", merchant: "", category: "", accountId: "", type: "expense", frequency: "", notes: "", shortcut_key: "" });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-violet-700 hover:bg-violet-600 text-white border border-violet-500/50"
          style={{ boxShadow: "0 0 12px rgba(124,58,237,.4)" }}
        >
          + New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d0b1e] border border-violet-500/30 text-[#e8e4ff] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">New Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Template Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Netflix" required className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0" required className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Merchant</Label>
              <Input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                placeholder="e.g. Netflix" required className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Entertainment" required className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Type</Label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Frequency</Label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm">
                {FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>{freq ? freq.charAt(0).toUpperCase() + freq.slice(1) : "Manual only"}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Account</Label>
              <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm">
                <option value="">— None —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Shortcut Key (1–9)</Label>
              <Input value={form.shortcut_key} onChange={e => setForm(f => ({ ...f, shortcut_key: e.target.value }))}
                placeholder="e.g. 1" maxLength={1}
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes" className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
          </div>
          <Button type="submit" disabled={pending || !form.name || !form.amount}
            className="w-full bg-violet-700 hover:bg-violet-600 text-white"
            style={{ boxShadow: "0 0 12px rgba(124,58,237,.4)" }}>
            {pending ? "Creating…" : "Create Template"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
