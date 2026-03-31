"use client";

import { useState, useTransition, useEffect } from "react";
import {
  parseExpenseText,
  createTransaction,
  getCategoriesWithSubs,
} from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "@/components/category-select";
import { PlusCircle, Loader2, Sparkles, Info } from "lucide-react";

interface ParsedExpense {
  amount: number;
  merchant: string;
  date: string;
  category: string;
  subcategory: string | null;
  is_cc_payment: boolean;
  confidence_score: number;
}

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  
  const [text, setText] = useState("");
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; subcategories: { id: string; name: string }[] }[]
  >([]);
  const [isParsing, startParseTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("Food & Dining");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [isCcPayment, setIsCcPayment] = useState(false);

  useEffect(() => {
    if (open) {
      getCategoriesWithSubs().then(setCategories);
    }
  }, [open]);

  const handleParse = () => {
    if (!text.trim()) return;
    startParseTransition(async () => {
      try {
        const results = await parseExpenseText(text);
        setParsedExpenses(results);
      } catch (error) {
        console.error("Parse error:", error);
        alert(
          `Failed to parse: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  };

  const handleSaveAll = () => {
    if (parsedExpenses.length === 0) return;
    startSaveTransition(async () => {
      try {
        for (const expense of parsedExpenses) {
          await createTransaction({
            amount: expense.amount,
            merchant: expense.merchant,
            date: expense.date,
            category: expense.category,
            subcategory: expense.subcategory,
            is_cc_payment: expense.is_cc_payment,
          });
        }
        setOpen(false);
        setText("");
        setParsedExpenses([]);
      } catch (error) {
        console.error("Save error:", error);
        alert(
          `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  };

  const handleCancel = () => {
    setParsedExpenses([]);
    setText("");
  };

  const updateExpense = (index: number, updates: Partial<ParsedExpense>) => {
    setParsedExpenses((prev) =>
      prev.map((expense, i) => (i === index ? { ...expense, ...updates } : expense))
    );
  };

  const removeExpense = (index: number) => {
    setParsedExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const resetManualForm = () => {
    setAmount("");
    setMerchant("");
    setDate(today);
    setCategory("Food & Dining");
    setSubcategory(null);
    setIsCcPayment(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || !merchant.trim() || !date) return;

    startSaveTransition(async () => {
      try {
        await createTransaction({
          amount: parsed,
          merchant: merchant.trim(),
          date,
          category,
          subcategory,
          is_cc_payment: isCcPayment,
        });
        resetManualForm();
        setOpen(false);
      } catch (error) {
        console.error("Save error:", error);
        alert(
          `Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Add single or multiple expenses using AI parsing or manual entry
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ai" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Parse
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">{parsedExpenses.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-text">Expense Text</Label>
              <Textarea
                id="expense-text"
                placeholder="Paste one or more bank alert emails, or describe expenses naturally.&#10;&#10;Examples:&#10;• Multiple emails (paste directly, separated by blank lines)&#10;• Natural text: &quot;Spent Rs.100 at Swiggy, Rs.200 at BigBasket&quot;"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong>Tip:</strong> You can paste multiple bank alert emails
                  at once. Just copy all of them from your email/SMS and paste
                  here. AI will extract each transaction separately.
                </p>
              </div>
            </div>
            <Button
              onClick={handleParse}
              disabled={!text.trim() || isParsing}
              className="w-full"
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Parse with AI
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {parsedExpenses.length} Expense{parsedExpenses.length > 1 ? "s" : ""} Found
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Back
              </Button>
            </div>

            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
              {parsedExpenses.map((expense, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Expense {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {expense.confidence_score < 0.8 && (
                        <Badge variant="secondary" className="text-amber-600">
                          {Math.round(expense.confidence_score * 100)}%
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExpense(index)}
                        className="h-6 px-2 text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`amount-${index}`} className="text-xs">
                        Amount
                      </Label>
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        className="h-8"
                        value={expense.amount}
                        onChange={(e) =>
                          updateExpense(index, {
                            amount: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`date-${index}`} className="text-xs">
                        Date
                      </Label>
                      <Input
                        id={`date-${index}`}
                        type="date"
                        className="h-8"
                        value={expense.date.slice(0, 10)}
                        onChange={(e) =>
                          updateExpense(index, {
                            date: new Date(e.target.value).toISOString(),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`merchant-${index}`} className="text-xs">
                      Merchant
                    </Label>
                    <Input
                      id={`merchant-${index}`}
                      className="h-8"
                      value={expense.merchant}
                      onChange={(e) =>
                        updateExpense(index, { merchant: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`category-${index}`} className="text-xs">
                        Category
                      </Label>
                      <Select
                        value={expense.category}
                        onValueChange={(category) =>
                          updateExpense(index, { category, subcategory: null })
                        }
                      >
                        <SelectTrigger id={`category-${index}`} className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {categories.find((c) => c.name === expense.category)
                      ?.subcategories.length ? (
                      <div className="space-y-1">
                        <Label
                          htmlFor={`subcategory-${index}`}
                          className="text-xs"
                        >
                          Subcategory
                        </Label>
                        <Select
                          value={expense.subcategory ?? "__none__"}
                          onValueChange={(sub) =>
                            updateExpense(index, {
                              subcategory: sub === "__none__" ? null : sub,
                            })
                          }
                        >
                          <SelectTrigger
                            id={`subcategory-${index}`}
                            className="h-8"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {categories
                              .find((c) => c.name === expense.category)
                              ?.subcategories.map((sub) => (
                                <SelectItem key={sub.id} value={sub.name}>
                                  {sub.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cc-${index}`}
                      checked={expense.is_cc_payment}
                      onCheckedChange={(checked) =>
                        updateExpense(index, { is_cc_payment: checked === true })
                      }
                    />
                    <Label
                      htmlFor={`cc-${index}`}
                      className="text-xs font-normal"
                    >
                      CC Payment
                    </Label>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={handleSaveAll} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving {parsedExpenses.length} Expense{parsedExpenses.length > 1 ? "s" : ""}...
                  </>
                ) : (
                  `Save All ${parsedExpenses.length} Expense${parsedExpenses.length > 1 ? "s" : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        )}</TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-amount">Amount (INR)</Label>
                  <Input
                    id="manual-amount"
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
                  <Label htmlFor="manual-date">Date</Label>
                  <Input
                    id="manual-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-merchant">Merchant</Label>
                <Input
                  id="manual-merchant"
                  placeholder="e.g. Street vendor, Auto rickshaw"
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
                  subcategory={subcategory}
                  onSubcategoryChange={setSubcategory}
                  categories={categories.map((cat) => ({
                    name: cat.name,
                    subcategories: cat.subcategories.map((sub) => sub.name),
                  }))}
                  className="h-9 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="manual-is_cc_payment"
                  checked={isCcPayment}
                  onCheckedChange={(checked) => setIsCcPayment(checked === true)}
                />
                <Label htmlFor="manual-is_cc_payment" className="font-normal">
                  This is a credit card bill payment
                </Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
