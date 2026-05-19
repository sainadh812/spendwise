"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getInsights } from "@/app/actions";
import type { Period } from "@/lib/insights-period";
import type { InsightResult } from "@/lib/insights-config";

interface InsightsCardProps {
  period: Period;
  initial: InsightResult | null;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function InsightsCard({ period, initial }: InsightsCardProps) {
  const [result, setResult] = useState<InsightResult | null>(initial);
  const [showRaw, setShowRaw] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const generate = (force = false) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await getInsights(period, force);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate insights");
      }
    });
  };

  const hasInsight = result?.insight !== null && result?.insight !== undefined;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h3 className="text-base font-semibold">AI Insights</h3>
              <Badge variant="secondary" className="text-[10px]">
                beta
              </Badge>
            </div>
            {hasInsight && result?.insight ? (
              <p className="text-xs text-muted-foreground">
                {result.cached ? "Cached" : "Just generated"} ·{" "}
                {result.stats.txCount} transactions ·{" "}
                {formatRelative(result.insight.generatedAt)} ·{" "}
                <span className="font-mono">{result.insight.model}</span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                On-demand spending analysis for {period.type === "month" ? "this month" : "this year"}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            {hasInsight && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generate(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Regenerate</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!hasInsight && result?.status !== "not_enough_data" && (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Generate an AI-written analysis of your spending for this period. The
              numbers are computed locally; the LLM only narrates over them.
            </p>
            <Button onClick={() => generate(false)} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1.5">Analyzing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="ml-1.5">Generate insights</span>
                </>
              )}
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {result?.status === "not_enough_data" && (
          <p className="text-sm text-muted-foreground">
            Not enough transactions in this period to generate insights yet (need at
            least 5).
          </p>
        )}

        {hasInsight && result?.insight && (
          <div className="space-y-6">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Summary
              </div>
              <p className="mt-2 text-sm leading-relaxed">{result.insight.summary}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <InsightList
                title="Trends"
                items={result.insight.trends}
                emptyText="No notable trends."
              />

              <div className="rounded-md border p-4">
                <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Anomalies
                </div>
                {result.insight.anomalies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No anomalies detected.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.insight.anomalies.map((a, i) => (
                      <li
                        key={i}
                        className="rounded border bg-muted/30 p-2.5 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{a.merchant}</span>
                          <span className="font-mono text-xs">
                            {formatINR(a.amount)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {a.reason}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <InsightList
                title="Observations"
                items={result.insight.suggestions}
                emptyText="No specific observations."
              />
            </div>

            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showRaw ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              What was analyzed?
            </button>

            {showRaw && <RawStats stats={result.stats} />}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RawStats({ stats }: { stats: InsightResult["stats"] }) {
  return (
    <div className="grid gap-4 rounded-md border bg-muted/30 p-4 text-xs lg:grid-cols-3">
      <div>
        <div className="mb-2 font-medium">By category</div>
        <table className="w-full font-mono">
          <tbody>
            {stats.byCategory.slice(0, 6).map((c) => (
              <tr key={c.category}>
                <td className="py-0.5">{c.category}</td>
                <td className="text-right">{formatINR(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="mb-2 font-medium">Top merchants</div>
        <table className="w-full font-mono">
          <tbody>
            {stats.topMerchants.slice(0, 6).map((m) => (
              <tr key={m.merchant}>
                <td className="py-0.5 truncate pr-2">{m.merchant}</td>
                <td className="text-right">{formatINR(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="mb-2 font-medium">Overall</div>
        <table className="w-full font-mono">
          <tbody>
            <tr>
              <td className="py-0.5">Total spend</td>
              <td className="text-right">{formatINR(stats.totalSpend)}</td>
            </tr>
            <tr>
              <td className="py-0.5">Transactions</td>
              <td className="text-right">{stats.txCount}</td>
            </tr>
            <tr>
              <td className="py-0.5">Anomalies (z&gt;2)</td>
              <td className="text-right">{stats.anomalies.length}</td>
            </tr>
            <tr>
              <td className="py-0.5">Recurring</td>
              <td className="text-right">{stats.recurringCandidates.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
