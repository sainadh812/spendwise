"use client";

import { useState, useTransition } from "react";
import { recoverSkippedEmail, dismissSkippedEmail } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategorySelect } from "@/components/category-select";
import { RotateCcw, X } from "lucide-react";

interface SkippedEmail {
  id: string;
  email_message_id: string;
  subject: string;
  sender: string;
  body_snippet: string;
  ai_reason: string | null;
  created_at: string;
}

export function SkippedEmails({
  skippedEmails,
  categories,
}: {
  skippedEmails: SkippedEmail[];
  categories: string[];
}) {
  if (skippedEmails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skipped Emails</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No skipped emails to review.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Skipped Emails{" "}
          <Badge variant="secondary" className="ml-2">
            {skippedEmails.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          These emails were skipped by the AI as non-debit transactions. Review
          them and recover any that were incorrectly skipped.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skippedEmails.map((email) => (
              <SkippedEmailRow
                key={email.id}
                email={email}
                categories={categories}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SkippedEmailRow({
  email,
  categories,
}: {
  email: SkippedEmail;
  categories: string[];
}) {
  const [showRecover, setShowRecover] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("Other");
  const [isCcPayment] = useState(false);

  function handleDismiss() {
    startTransition(() => dismissSkippedEmail(email.id));
  }

  function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || !merchant.trim() || !date) return;

    startTransition(async () => {
      await recoverSkippedEmail(email.id, {
        amount: parsed,
        merchant: merchant.trim(),
        date,
        category,
        is_cc_payment: isCcPayment,
      });
      setShowRecover(false);
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="whitespace-nowrap">
          {new Date(email.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </TableCell>
        <TableCell className="max-w-[150px] truncate text-sm">
          {email.sender}
        </TableCell>
        <TableCell className="max-w-[250px] truncate" title={email.subject}>
          {email.subject}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs font-normal">
            {email.ai_reason || "Non-debit"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRecover(true)}
              disabled={isPending}
              title="Recover as transaction"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Recover
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={isPending}
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={showRecover} onOpenChange={setShowRecover}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recover as Transaction</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{email.subject}</span>
              <br />
              Enter the transaction details to add this email as an expense.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-32 overflow-y-auto rounded border bg-muted/50 p-3 text-xs">
            {email.body_snippet}
          </div>
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`amount-${email.id}`}>Amount (INR)</Label>
                <Input
                  id={`amount-${email.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`date-${email.id}`}>Date</Label>
                <Input
                  id={`date-${email.id}`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`merchant-${email.id}`}>Merchant</Label>
              <Input
                id={`merchant-${email.id}`}
                placeholder="e.g. Swiggy, Amazon"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect
                value={category}
                onChange={setCategory}
                categories={categories}
                className="h-9 w-full"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecover(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Add Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
