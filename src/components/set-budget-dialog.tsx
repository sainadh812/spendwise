"use client";

import { useState, useTransition } from "react";
import { setBudget, deleteBudget } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Trash2, Info } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface SetBudgetDialogProps {
  month: number;
  year: number;
  currentBudget: { id: string; amount: number; start_month: number; start_year: number } | null;
}

export function SetBudgetDialog({
  month,
  year,
  currentBudget,
}: SetBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(
    currentBudget ? currentBudget.amount.toString() : ""
  );
  const [startMonth, setStartMonth] = useState(month);
  const [startYear, setStartYear] = useState(year);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isInherited = currentBudget
    ? currentBudget.start_month !== month || currentBudget.start_year !== year
    : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    startSaveTransition(async () => {
      try {
        await setBudget(startMonth, startYear, parsed);
        setOpen(false);
      } catch (error) {
        alert(
          `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  };

  const handleDelete = () => {
    if (!currentBudget) return;
    startDeleteTransition(async () => {
      try {
        await deleteBudget(currentBudget.id);
        setAmount("");
        setOpen(false);
      } catch (error) {
        alert(
          `Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setAmount(currentBudget ? currentBudget.amount.toString() : "");
          setStartMonth(month);
          setStartYear(year);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="mr-2 h-4 w-4" />
          {currentBudget ? "Edit Budget" : "Set Budget"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {currentBudget ? "Update" : "Set"} Monthly Budget
          </DialogTitle>
          <DialogDescription>
            Budget applies from the selected month until you set a new one.
          </DialogDescription>
        </DialogHeader>

        {isInherited && currentBudget && (
          <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Current budget of{" "}
              <strong>
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(currentBudget.amount)}
              </strong>{" "}
              was set in{" "}
              <strong>
                {MONTHS[currentBudget.start_month]} {currentBudget.start_year}
              </strong>{" "}
              and carries forward. Save a new amount here to override from the
              selected month.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Budget Amount (INR)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="100"
              min="0"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Effective From</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={String(startMonth)}
                onValueChange={(v) => setStartMonth(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(startYear)}
                onValueChange={(v) => setStartYear(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            {currentBudget && !isInherited && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSaving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || isDeleting}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
