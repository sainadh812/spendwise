"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsStatsProps {
  totalSpend: number;
  totalTransactions: number;
  avgTransaction: number;
  maxSingleSpend: number;
  prevTotalSpend: number;
  prevTotalTransactions: number;
  prevAvgTransaction: number;
  prevMaxSingleSpend: number;
  periodLabel: string;
  prevPeriodLabel: string;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeIndicator({
  current,
  previous,
  invertColor,
}: {
  current: number;
  previous: number;
  invertColor?: boolean;
}) {
  if (previous === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No prior data
      </span>
    );
  }

  const pctChange = ((current - previous) / previous) * 100;
  const isUp = pctChange > 0;
  const isNeutral = Math.abs(pctChange) < 0.5;

  if (isNeutral) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const isGood = invertColor ? !isUp : isUp;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isGood ? "text-destructive" : "text-emerald-600"
      )}
    >
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isUp ? "+" : ""}
      {pctChange.toFixed(1)}%
    </span>
  );
}

export function AnalyticsStats({
  totalSpend,
  totalTransactions,
  avgTransaction,
  maxSingleSpend,
  prevTotalSpend,
  prevTotalTransactions,
  prevAvgTransaction,
  prevMaxSingleSpend,
  prevPeriodLabel,
}: AnalyticsStatsProps) {
  const stats = [
    {
      title: "Total Spend",
      value: formatINR(totalSpend),
      current: totalSpend,
      previous: prevTotalSpend,
      invertColor: true,
    },
    {
      title: "Transactions",
      value: String(totalTransactions),
      current: totalTransactions,
      previous: prevTotalTransactions,
      invertColor: true,
    },
    {
      title: "Avg Transaction",
      value: formatINR(avgTransaction),
      current: avgTransaction,
      previous: prevAvgTransaction,
      invertColor: true,
    },
    {
      title: "Largest Expense",
      value: formatINR(maxSingleSpend),
      current: maxSingleSpend,
      previous: prevMaxSingleSpend,
      invertColor: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
            <div className="mt-1 flex items-center gap-1">
              <ChangeIndicator
                current={stat.current}
                previous={stat.previous}
                invertColor={stat.invertColor}
              />
              <span className="text-xs text-muted-foreground">
                vs {prevPeriodLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
