"use client";

import { useMemo, useState, useTransition } from "react";
import { updateTransaction, deleteTransaction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Trash2, X } from "lucide-react";

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

type StatusFilter = "all" | "verified" | "needs_review" | "cc_payment";

const ALL_VALUE = "__all__";
const NONE_VALUE = "__none__";

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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_VALUE);
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>(ALL_VALUE);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const availableSubcategories = useMemo(() => {
    if (categoryFilter === ALL_VALUE) return [];
    return (
      categories.find((c) => c.name === categoryFilter)?.subcategories ?? []
    );
  }, [categories, categoryFilter]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minAmount.trim() === "" ? null : Number(minAmount);
    const max = maxAmount.trim() === "" ? null : Number(maxAmount);

    return transactions.filter((t) => {
      if (query) {
        const haystack = `${t.merchant} ${t.remarks ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (categoryFilter !== ALL_VALUE && t.category !== categoryFilter) {
        return false;
      }
      if (subcategoryFilter !== ALL_VALUE) {
        if (subcategoryFilter === NONE_VALUE) {
          if (t.subcategory) return false;
        } else if (t.subcategory !== subcategoryFilter) {
          return false;
        }
      }
      if (status === "verified" && (t.needs_review || t.is_cc_payment)) {
        return false;
      }
      if (status === "needs_review" && !t.needs_review) return false;
      if (status === "cc_payment" && !t.is_cc_payment) return false;
      if (min !== null && Number.isFinite(min) && t.amount < min) return false;
      if (max !== null && Number.isFinite(max) && t.amount > max) return false;
      return true;
    });
  }, [
    transactions,
    search,
    categoryFilter,
    subcategoryFilter,
    status,
    minAmount,
    maxAmount,
  ]);

  const filteredTotal = useMemo(
    () =>
      filtered
        .filter((t) => !t.is_cc_payment)
        .reduce((sum, t) => sum + t.amount, 0),
    [filtered]
  );

  const monthTotal = useMemo(
    () =>
      transactions
        .filter((t) => !t.is_cc_payment)
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    categoryFilter !== ALL_VALUE ||
    subcategoryFilter !== ALL_VALUE ||
    status !== "all" ||
    minAmount.trim() !== "" ||
    maxAmount.trim() !== "";

  const percentOfMonth =
    monthTotal > 0 ? (filteredTotal / monthTotal) * 100 : 0;

  function clearFilters() {
    setSearch("");
    setCategoryFilter(ALL_VALUE);
    setSubcategoryFilter(ALL_VALUE);
    setStatus("all");
    setMinAmount("");
    setMaxAmount("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search merchant or remarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              aria-label="Search transactions"
            />
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setSubcategoryFilter(ALL_VALUE);
              }}
            >
              <SelectTrigger className="h-9" aria-label="Filter by category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={subcategoryFilter}
              onValueChange={setSubcategoryFilter}
              disabled={categoryFilter === ALL_VALUE}
            >
              <SelectTrigger
                className="h-9"
                aria-label="Filter by subcategory"
              >
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All subcategories</SelectItem>
                <SelectItem value={NONE_VALUE}>No subcategory</SelectItem>
                {availableSubcategories.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as StatusFilter)}
            >
              <SelectTrigger className="h-9" aria-label="Filter by status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="cc_payment">CC Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Min ₹"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-9 w-28"
              aria-label="Minimum amount"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-9 w-28"
              aria-label="Maximum amount"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto h-9"
              >
                <X className="mr-1 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {transactions.length}
              </span>{" "}
              transactions
            </span>
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="text-base font-semibold text-foreground">
                {formatINR(filteredTotal)}
              </span>
              {hasActiveFilters && monthTotal > 0 && (
                <span className="ml-1">
                  ({percentOfMonth.toFixed(1)}% of month)
                </span>
              )}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {transactions.length === 0
              ? "No transactions found for this month."
              : "No transactions match the current filters."}
          </p>
        ) : (
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
              {filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  categories={categories}
                />
              ))}
            </TableBody>
          </Table>
        )}
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
