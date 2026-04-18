"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { read, utils } from "xlsx";
import {
  parseImportSheet,
  checkDuplicates,
  createTransactionsBatch,
  getCategoriesWithSubs,
} from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  Sparkles,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Trash2,
} from "lucide-react";

interface CategoryWithSubs {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface SheetData {
  name: string;
  rows: string[][];
  detectedMonth?: number;
  detectedYear?: number;
}

interface ParsedExpense {
  amount: number;
  merchant: string;
  date: string;
  category: string;
  subcategory: string | null;
  is_cc_payment: boolean;
  confidence_score: number;
  isDuplicate?: boolean;
  selected: boolean;
}

interface SheetParseState {
  status: "idle" | "parsing" | "parsed" | "saving" | "saved" | "error";
  expenses: ParsedExpense[];
  error?: string;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_ABBREVS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function detectMonthYear(sheetName: string): { month?: number; year?: number } {
  const normalized = sheetName.toLowerCase().trim();

  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  for (let i = 0; i < MONTHS.length; i++) {
    if (normalized.includes(MONTHS[i])) {
      return { month: i, year };
    }
  }

  for (const [abbrev, monthIdx] of Object.entries(MONTH_ABBREVS)) {
    const pattern = new RegExp(`\\b${abbrev}\\b`);
    if (pattern.test(normalized)) {
      return { month: monthIdx, year };
    }
  }

  return { year };
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

interface ImportUploaderProps {
  categories: CategoryWithSubs[];
}

export function ImportUploader({ categories: initialCategories }: ImportUploaderProps) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [parseStates, setParseStates] = useState<Record<string, SheetParseState>>({});
  const [categories, setCategories] = useState<CategoryWithSubs[]>(initialCategories);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isParsing, startParseTransition] = useTransition();
  const [, startSaveTransition] = useTransition();
  const [isCheckingDupes, startDupeTransition] = useTransition();

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: "array" });

        const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const rows: string[][] = utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
            raw: false,
          });
          const { month, year } = detectMonthYear(name);
          return { name, rows, detectedMonth: month, detectedYear: year };
        });

        setSheets(parsedSheets);
        setActiveSheet(parsedSheets[0]?.name ?? "");
        setParseStates({});
      };
      reader.readAsArrayBuffer(file);
    },
    []
  );

  const handleParse = (sheetName: string) => {
    const sheet = sheets.find((s) => s.name === sheetName);
    if (!sheet) return;

    setParseStates((prev) => ({
      ...prev,
      [sheetName]: { status: "parsing", expenses: [] },
    }));

    startParseTransition(async () => {
      try {
        const results = await parseImportSheet(
          sheet.rows,
          sheet.name,
          sheet.detectedMonth,
          sheet.detectedYear
        );

        const expenses: ParsedExpense[] = results.map((r) => ({
          ...r,
          selected: true,
        }));

        setParseStates((prev) => ({
          ...prev,
          [sheetName]: { status: "parsed", expenses },
        }));

        startDupeTransition(async () => {
          try {
            const dupeFlags = await checkDuplicates(
              expenses.map((exp) => ({
                amount: exp.amount,
                merchant: exp.merchant,
                date: exp.date,
              }))
            );

            setParseStates((prev) => {
              const state = prev[sheetName];
              if (!state || state.status !== "parsed") return prev;
              return {
                ...prev,
                [sheetName]: {
                  ...state,
                  expenses: state.expenses.map((exp, i) => ({
                    ...exp,
                    isDuplicate: dupeFlags[i],
                    selected: !dupeFlags[i],
                  })),
                },
              };
            });
          } catch {
            // Dupe check failed silently — non-critical
          }
        });

        getCategoriesWithSubs().then(setCategories);
      } catch (error) {
        setParseStates((prev) => ({
          ...prev,
          [sheetName]: {
            status: "error",
            expenses: [],
            error: error instanceof Error ? error.message : "Unknown error",
          },
        }));
      }
    });
  };

  const handleSave = (sheetName: string) => {
    const state = parseStates[sheetName];
    if (!state || state.status !== "parsed") return;

    const toSave = state.expenses
      .filter((e) => e.selected)
      .map((e) => ({
        amount: e.amount,
        merchant: e.merchant,
        date: e.date,
        category: e.category,
        subcategory: e.subcategory,
        is_cc_payment: e.is_cc_payment,
      }));

    if (toSave.length === 0) return;

    setParseStates((prev) => ({
      ...prev,
      [sheetName]: { ...prev[sheetName], status: "saving" },
    }));

    startSaveTransition(async () => {
      try {
        await createTransactionsBatch(toSave);
        setParseStates((prev) => ({
          ...prev,
          [sheetName]: { ...prev[sheetName], status: "saved" },
        }));
      } catch (error) {
        setParseStates((prev) => ({
          ...prev,
          [sheetName]: {
            ...prev[sheetName],
            status: "error",
            error: error instanceof Error ? error.message : "Save failed",
          },
        }));
      }
    });
  };

  const updateExpense = (
    sheetName: string,
    index: number,
    updates: Partial<ParsedExpense>
  ) => {
    setParseStates((prev) => {
      const state = prev[sheetName];
      if (!state) return prev;
      return {
        ...prev,
        [sheetName]: {
          ...state,
          expenses: state.expenses.map((exp, i) =>
            i === index ? { ...exp, ...updates } : exp
          ),
        },
      };
    });
  };

  const removeExpense = (sheetName: string, index: number) => {
    setParseStates((prev) => {
      const state = prev[sheetName];
      if (!state) return prev;
      return {
        ...prev,
        [sheetName]: {
          ...state,
          expenses: state.expenses.filter((_, i) => i !== index),
        },
      };
    });
  };

  const toggleSelectAll = (sheetName: string, selected: boolean) => {
    setParseStates((prev) => {
      const state = prev[sheetName];
      if (!state) return prev;
      return {
        ...prev,
        [sheetName]: {
          ...state,
          expenses: state.expenses.map((exp) => ({ ...exp, selected })),
        },
      };
    });
  };

  const updateSheetMonth = (
    sheetName: string,
    month: number,
    year: number
  ) => {
    setSheets((prev) =>
      prev.map((s) =>
        s.name === sheetName
          ? { ...s, detectedMonth: month, detectedYear: year }
          : s
      )
    );
  };

  if (sheets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary/50 hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx (multi-sheet) and .csv files
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {sheets.length} sheet{sheets.length > 1 ? "s" : ""} detected
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSheets([]);
            setParseStates({});
            setFileName("");
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <Tabs value={activeSheet} onValueChange={setActiveSheet}>
        <TabsList className="w-full justify-start">
          {sheets.map((sheet) => {
            const state = parseStates[sheet.name];
            return (
              <TabsTrigger key={sheet.name} value={sheet.name} className="gap-2">
                {sheet.name}
                {state?.status === "saved" && (
                  <Check className="h-3 w-3 text-emerald-600" />
                )}
                {state?.status === "error" && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sheets.map((sheet) => (
          <TabsContent key={sheet.name} value={sheet.name} className="mt-4">
            <SheetTab
              sheet={sheet}
              parseState={parseStates[sheet.name]}
              categories={categories}
              isParsing={isParsing && activeSheet === sheet.name}
              isCheckingDupes={isCheckingDupes && activeSheet === sheet.name}
              onParse={() => handleParse(sheet.name)}
              onSave={() => handleSave(sheet.name)}
              onUpdateExpense={(i, u) => updateExpense(sheet.name, i, u)}
              onRemoveExpense={(i) => removeExpense(sheet.name, i)}
              onToggleSelectAll={(s) => toggleSelectAll(sheet.name, s)}
              onUpdateMonth={(m, y) => updateSheetMonth(sheet.name, m, y)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface SheetTabProps {
  sheet: SheetData;
  parseState?: SheetParseState;
  categories: CategoryWithSubs[];
  isParsing: boolean;
  isCheckingDupes: boolean;
  onParse: () => void;
  onSave: () => void;
  onUpdateExpense: (index: number, updates: Partial<ParsedExpense>) => void;
  onRemoveExpense: (index: number) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onUpdateMonth: (month: number, year: number) => void;
}

function SheetTab({
  sheet,
  parseState,
  categories,
  isParsing,
  isCheckingDupes,
  onParse,
  onSave,
  onUpdateExpense,
  onRemoveExpense,
  onToggleSelectAll,
  onUpdateMonth,
}: SheetTabProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (parseState?.status === "saved") {
    const savedCount = parseState.expenses.filter((e) => e.selected).length;
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Check className="h-12 w-12 text-emerald-600" />
          <p className="text-lg font-medium">
            {savedCount} transaction{savedCount !== 1 ? "s" : ""} imported
          </p>
          <p className="text-sm text-muted-foreground">
            From sheet &quot;{sheet.name}&quot;
          </p>
        </CardContent>
      </Card>
    );
  }

  if (parseState?.status === "parsed" || parseState?.status === "saving") {
    const expenses = parseState.expenses;
    const selectedCount = expenses.filter((e) => e.selected).length;
    const dupeCount = expenses.filter((e) => e.isDuplicate).length;
    const totalAmount = expenses
      .filter((e) => e.selected && !e.is_cc_payment)
      .reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} found
            </h3>
            {dupeCount > 0 && (
              <Badge variant="secondary" className="text-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {dupeCount} potential duplicate{dupeCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {isCheckingDupes && (
              <Badge variant="secondary">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking duplicates...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleSelectAll(true)}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleSelectAll(false)}
            >
              Deselect All
            </Button>
          </div>
        </div>

        <div className="max-h-[500px] space-y-3 overflow-y-auto pr-2">
          {expenses.map((expense, index) => (
            <div
              key={index}
              className={`space-y-3 rounded-lg border p-3 ${
                expense.isDuplicate ? "border-amber-300 bg-amber-50/50" : ""
              } ${!expense.selected ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={expense.selected}
                  onCheckedChange={(checked) =>
                    onUpdateExpense(index, { selected: checked === true })
                  }
                />
                <span className="text-sm font-medium">#{index + 1}</span>
                <div className="flex items-center gap-2">
                  {expense.isDuplicate && (
                    <Badge variant="secondary" className="text-amber-600">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Possible duplicate
                    </Badge>
                  )}
                  {expense.confidence_score < 0.8 && (
                    <Badge variant="secondary" className="text-amber-600">
                      {Math.round(expense.confidence_score * 100)}%
                    </Badge>
                  )}
                </div>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveExpense(index)}
                    className="h-6 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    className="h-8"
                    value={expense.amount}
                    onChange={(e) =>
                      onUpdateExpense(index, {
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    className="h-8"
                    value={expense.date.slice(0, 10)}
                    onChange={(e) =>
                      onUpdateExpense(index, {
                        date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Merchant</Label>
                  <Input
                    className="h-8"
                    value={expense.merchant}
                    onChange={(e) =>
                      onUpdateExpense(index, { merchant: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={expense.category}
                    onValueChange={(category) =>
                      onUpdateExpense(index, { category, subcategory: null })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id || cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {categories.find((c) => c.name === expense.category)
                  ?.subcategories.length ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Subcategory</Label>
                    <Select
                      value={expense.subcategory ?? "__none__"}
                      onValueChange={(sub) =>
                        onUpdateExpense(index, {
                          subcategory: sub === "__none__" ? null : sub,
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {categories
                          .find((c) => c.name === expense.category)
                          ?.subcategories.map((sub) => (
                            <SelectItem key={sub.id || sub.name} value={sub.name}>
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
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <div className="text-sm">
            <span className="font-medium">{selectedCount}</span> of{" "}
            {expenses.length} selected &middot; Total:{" "}
            <span className="font-medium">{formatINR(totalAmount)}</span>
          </div>
          <Button
            onClick={onSave}
            disabled={
              parseState.status === "saving" || selectedCount === 0
            }
          >
            {parseState.status === "saving" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              `Import ${selectedCount} Transaction${selectedCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (parseState?.status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{parseState.error}</p>
          <Button variant="outline" onClick={onParse}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewRows = sheet.rows.slice(0, 20);
  const hasMoreRows = sheet.rows.length > 20;
  const dataRowCount = sheet.rows.length > 0 ? sheet.rows.length - 1 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Sheet Preview — {dataRowCount} data row{dataRowCount !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Month:</Label>
              <Select
                value={
                  sheet.detectedMonth !== undefined
                    ? String(sheet.detectedMonth)
                    : "__none__"
                }
                onValueChange={(v) => {
                  const m = v === "__none__" ? undefined : parseInt(v, 10);
                  onUpdateMonth(
                    m ?? new Date().getMonth(),
                    sheet.detectedYear ?? new Date().getFullYear()
                  );
                }}
              >
                <SelectTrigger className="h-7 w-[120px]">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={
                  sheet.detectedYear !== undefined
                    ? String(sheet.detectedYear)
                    : String(currentYear)
                }
                onValueChange={(v) =>
                  onUpdateMonth(
                    sheet.detectedMonth ?? new Date().getMonth(),
                    parseInt(v, 10)
                  )
                }
              >
                <SelectTrigger className="h-7 w-[80px]">
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
              {sheet.detectedMonth !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Auto-detected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              {previewRows[0] && (
                <TableHeader>
                  <TableRow>
                    {previewRows[0].map((header, i) => (
                      <TableHead key={i} className="whitespace-nowrap text-xs">
                        {header || `Column ${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
              )}
              <TableBody>
                {previewRows.slice(1).map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <TableCell
                        key={cellIdx}
                        className="max-w-[200px] truncate whitespace-nowrap text-xs"
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {hasMoreRows && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Showing 19 of {dataRowCount} rows
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onParse} disabled={isParsing || dataRowCount === 0}>
          {isParsing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Parsing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Parse with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
