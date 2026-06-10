"use client";

import { useState, useTransition } from "react";
import {
  addRepayment,
  deleteRepayment,
  reopenRecoverable,
  unmarkRecoverable,
  writeOffRecoverable,
  type CounterpartyGroup,
  type RecoverableTransactionDTO,
} from "@/app/actions";
import { RECOVERY_STATUS } from "@/lib/recoverable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === RECOVERY_STATUS.RECOVERED) {
    return <Badge variant="secondary">Recovered</Badge>;
  }
  if (status === RECOVERY_STATUS.WRITTEN_OFF) {
    return <Badge variant="outline">Written off</Badge>;
  }
  if (status === RECOVERY_STATUS.PARTIAL) {
    return <Badge variant="default">Partial</Badge>;
  }
  return <Badge variant="default">Pending</Badge>;
}

export function RecoverableCounterpartyCard({
  group,
}: {
  group: CounterpartyGroup;
}) {
  const [open, setOpen] = useState(group.outstanding > 0);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="text-lg">{group.counterparty}</CardTitle>
              <span className="text-sm text-muted-foreground">
                ({group.transactions.length}{" "}
                {group.transactions.length === 1 ? "txn" : "txns"})
              </span>
            </CollapsibleTrigger>
            <div className="text-right">
              <p className="text-xl font-bold">
                {formatINR(group.outstanding)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatINR(group.total_repaid)} repaid of{" "}
                {formatINR(group.total_lent)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {group.transactions.map((tx) => (
              <RecoverableTransactionRow key={tx.id} tx={tx} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function RecoverableTransactionRow({ tx }: { tx: RecoverableTransactionDTO }) {
  const [addOpen, setAddOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayDate, setRepayDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [repayNote, setRepayNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const isClosed =
    tx.recovery_status === RECOVERY_STATUS.RECOVERED ||
    tx.recovery_status === RECOVERY_STATUS.WRITTEN_OFF;

  function handleAddRepayment() {
    const amt = parseFloat(repayAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    startTransition(async () => {
      await addRepayment(tx.id, {
        amount: amt,
        date: new Date(repayDate).toISOString(),
        note: repayNote.trim() || null,
      });
      setRepayAmount("");
      setRepayNote("");
      setRepayDate(new Date().toISOString().slice(0, 10));
      setAddOpen(false);
    });
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{tx.merchant}</span>
            <StatusBadge status={tx.recovery_status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(tx.date)} ·{" "}
            {tx.subcategory
              ? `${tx.category} / ${tx.subcategory}`
              : tx.category}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{formatINR(tx.outstanding)}</p>
          <p className="text-xs text-muted-foreground">
            {formatINR(tx.repaid)} of {formatINR(tx.recoverable_amount)} repaid
          </p>
        </div>
      </div>

      {tx.repayments.length > 0 && (
        <div className="mt-3 space-y-1 border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground">
            Repayments
          </p>
          {tx.repayments.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-muted-foreground">
                {formatDate(r.date)}
                {r.note ? ` · ${r.note}` : ""}
              </span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{formatINR(r.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteRepayment(r.id);
                    })
                  }
                  title="Delete repayment"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isClosed && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            disabled={isPending}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add repayment
          </Button>
        )}
        {tx.recovery_status === RECOVERY_STATUS.PENDING ||
        tx.recovery_status === RECOVERY_STATUS.PARTIAL ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              startTransition(async () => {
                await writeOffRecoverable(tx.id);
              })
            }
            disabled={isPending}
          >
            Write off
          </Button>
        ) : null}
        {isClosed && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              startTransition(async () => {
                await reopenRecoverable(tx.id);
              })
            }
            disabled={isPending}
          >
            Reopen
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-destructive"
              disabled={isPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Unmark
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unmark as recoverable?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the counterparty and all recorded repayments
                ({tx.repayments.length}) from this transaction. The original
                expense of {formatINR(tx.amount)} to {tx.merchant} stays in
                your records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  startTransition(async () => {
                    await unmarkRecoverable(tx.id);
                  })
                }
              >
                Unmark
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add repayment</DialogTitle>
            <DialogDescription>
              Record a payment received from {tx.counterparty} towards{" "}
              {tx.merchant} ({formatINR(tx.outstanding)} outstanding).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`repay-amount-${tx.id}`}>Amount (₹)</Label>
              <Input
                id={`repay-amount-${tx.id}`}
                type="number"
                step="0.01"
                min="0"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder={String(tx.outstanding)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`repay-date-${tx.id}`}>Date</Label>
              <Input
                id={`repay-date-${tx.id}`}
                type="date"
                value={repayDate}
                onChange={(e) => setRepayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`repay-note-${tx.id}`}>Note (optional)</Label>
              <Input
                id={`repay-note-${tx.id}`}
                value={repayNote}
                onChange={(e) => setRepayNote(e.target.value)}
                placeholder="UPI ref, cash, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRepayment}
              disabled={
                isPending ||
                !Number.isFinite(parseFloat(repayAmount)) ||
                parseFloat(repayAmount) <= 0
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
