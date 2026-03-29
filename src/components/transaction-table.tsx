"use client";

import { useState, useTransition } from "react";
import { updateTransaction, deleteTransaction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { CategorySelect } from "@/components/category-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  date: string | Date;
  category: string;
  subcategory?: string | null;
  is_cc_payment: boolean;
  confidence_score: number;
  needs_review: boolean;
  remarks: string | null;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TransactionTable({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: { name: string; subcategories: { id: string; name: string }[] }[];
}) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No transactions found for this month.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TransactionRow({
  transaction: t,
  categories,
}: {
  transaction: Transaction;
  categories: { name: string; subcategories: { id: string; name: string }[] }[];
}) {
  const [editing, setEditing] = useState(false);
  const [merchant, setMerchant] = useState(t.merchant);
  const [amount, setAmount] = useState(String(t.amount));
  const [category, setCategory] = useState(t.category);
  const [subcategory, setSubcategory] = useState<string | null>(t.subcategory ?? null);
  const [remarks, setRemarks] = useState(t.remarks ?? "");
  const [isCcPayment, setIsCcPayment] = useState(t.is_cc_payment);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateTransaction(t.id, {
        merchant,
        amount: parseFloat(amount),
        category,
        subcategory,
        remarks: remarks.trim() || null,
        is_cc_payment: isCcPayment,
      });
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(() => deleteTransaction(t.id));
  }

  function handleCancel() {
    setMerchant(t.merchant);
    setAmount(String(t.amount));
    setCategory(t.category);
    setSubcategory(t.subcategory ?? null);
    setRemarks(t.remarks ?? "");
    setIsCcPayment(t.is_cc_payment);
    setEditing(false);
  }

  return (
    <TableRow className={t.is_cc_payment ? "opacity-50" : ""}>
      <TableCell>
        {new Date(t.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="h-8 w-40"
          />
        ) : (
          t.merchant
        )}
      </TableCell>
      <TableCell className="font-medium">
        {editing ? (
          <div className="space-y-1">
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 w-28"
            />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={isCcPayment}
                onCheckedChange={(checked) => setIsCcPayment(checked === true)}
                className="h-3.5 w-3.5"
              />
              CC Payment
            </label>
          </div>
        ) : (
          <>
            {formatINR(t.amount)}
            {t.is_cc_payment && (
              <Badge variant="secondary" className="ml-2 text-xs">
                CC Payment
              </Badge>
            )}
          </>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
            <CategorySelect
              value={category}
              onChange={setCategory}
              subcategory={subcategory}
              onSubcategoryChange={setSubcategory}
              categories={categories.map((categoryItem) => ({
                name: categoryItem.name,
                subcategories: categoryItem.subcategories.map((item) => item.name),
              }))}
              className="h-8 w-44"
            />
        ) : (
          <Badge variant="outline">
            {t.subcategory ? `${t.category} / ${t.subcategory}` : t.category}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add a note..."
            className="h-8 w-44"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {t.remarks || "—"}
          </span>
        )}
      </TableCell>
      <TableCell>
        {t.needs_review ? (
          <Badge variant="destructive">Needs Review</Badge>
        ) : (
          <Badge variant="default">Verified</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the {formatINR(t.amount)} transaction to {t.merchant}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
