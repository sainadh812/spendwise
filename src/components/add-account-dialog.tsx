"use client";

import { useState, useTransition } from "react";
import { createAccount } from "@/app/extra-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCOUNT_TYPES = ["bank", "cash", "credit_card", "investment", "wallet"];

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", type: "bank", balance: "", currency: "INR" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createAccount({
        name:     form.name,
        type:     form.type,
        balance:  parseFloat(form.balance) || 0,
        currency: form.currency || "INR",
      });
      setOpen(false);
      setForm({ name: "", type: "bank", balance: "", currency: "INR" });
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
          + Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0d0b1e] border border-violet-500/30 text-[#e8e4ff]">
        <DialogHeader>
          <DialogTitle className="gradient-text">New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">Account Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. HDFC Savings"
              required
              className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[#9381c4] text-xs font-mono uppercase">Type</Label>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-md bg-[#140f2a] border border-violet-500/30 text-[#e8e4ff] px-3 py-2 text-sm"
            >
              {ACCOUNT_TYPES.map(t => (
                <option key={t} value={t}>{t.replace("_", " ").toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Opening Balance</Label>
              <Input
                type="number"
                value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="0"
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[#9381c4] text-xs font-mono uppercase">Currency</Label>
              <Input
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                placeholder="INR"
                className="bg-[#140f2a] border-violet-500/30 text-[#e8e4ff] placeholder:text-[#9381c4]"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={pending || !form.name}
            className="w-full bg-violet-700 hover:bg-violet-600 text-white"
            style={{ boxShadow: "0 0 12px rgba(124,58,237,.4)" }}
          >
            {pending ? "Creating…" : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
