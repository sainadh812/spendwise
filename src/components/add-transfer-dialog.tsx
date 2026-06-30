"use client";
import { useState, useTransition } from "react";
import { createTransfer } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Account { id: string; name: string; type: string; }

export function AddTransferDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const todayStr = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ from_id: "", to_id: "", amount: "", date: todayStr, notes: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.from_id || !form.to_id || form.from_id === form.to_id) return;
    startTransition(async () => {
      await createTransfer({
        from_id: form.from_id,
        to_id:   form.to_id,
        amount:  parseFloat(form.amount),
        date:    form.date,
        notes:   form.notes || undefined,
      });
      setOpen(false);
      setForm(f => ({ ...f, amount: "", notes: "" }));
    });
  }

  const isValid = form.from_id && form.to_id && form.from_id !== form.to_id && !!form.amount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"
          className="bg-cyan-800 hover:bg-cyan-700 text-white border border-cyan-500/50"
          style={{ boxShadow: "0 0 12px rgba(34,211,238,.3)" }}>
          + Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d0b1e] border border-violet-500/30 text-[#e8e4ff]">
        <DialogHeader>
          <DialogTitle className="gradient-text">Transfer Between Accounts</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">From</Label>
            <select value={form.from_id} onChange={e => setForm(f => ({ ...f, from_id: e.target.value }))}
              required className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm">
              <option value="">— Select account —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">To</Label>
            <select value={form.to_id} onChange={e => setForm(f => ({ ...f, to_id: e.target.value }))}
              required className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm">
              <option value="">— Select account —</option>
              {accounts.filter(a => a.id !== form.from_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Amount (₹)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0" required className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff]" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">Notes (optional)</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Move to savings" className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]" />
          </div>
          {form.from_id && form.to_id && form.from_id === form.to_id && (
            <p className="text-xs text-rose-400">From and To accounts must be different</p>
          )}
          <Button type="submit" disabled={pending || !isValid}
            className="w-full bg-cyan-800 hover:bg-cyan-700 text-white"
            style={{ boxShadow: "0 0 12px rgba(34,211,238,.3)" }}>
            {pending ? "Transferring…" : "Execute Transfer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
