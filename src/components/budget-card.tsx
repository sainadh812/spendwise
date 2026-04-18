"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BudgetCardProps {
  budget: number;
  spent: number;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BudgetCard({ budget, spent }: BudgetCardProps) {
  const remaining = budget - spent;
  const percentage = Math.min((spent / budget) * 100, 100);
  const isOverBudget = spent > budget;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold">{formatINR(budget)}</p>
          <p
            className={cn(
              "text-sm font-medium",
              isOverBudget ? "text-destructive" : "text-emerald-600"
            )}
          >
            {isOverBudget
              ? `${formatINR(Math.abs(remaining))} over`
              : `${formatINR(remaining)} left`}
          </p>
        </div>
        <Progress
          value={percentage}
          className={cn(
            "h-2",
            isOverBudget && "[&>[data-slot=progress-indicator]]:bg-destructive"
          )}
        />
        <p className="text-xs text-muted-foreground">
          {formatINR(spent)} spent ({Math.round((spent / budget) * 100)}%)
        </p>
      </CardContent>
    </Card>
  );
}
