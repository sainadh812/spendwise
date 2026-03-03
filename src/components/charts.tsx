"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 81%, 60%)",
  "hsl(25, 95%, 53%)",
  "hsl(173, 80%, 40%)",
  "hsl(47, 96%, 53%)",
  "hsl(280, 65%, 60%)",
  "hsl(210, 40%, 50%)",
];

interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  date: string | Date;
  category: string;
  is_cc_payment: boolean;
  confidence_score: number;
  needs_review: boolean;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function CategoryPieChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const spending = transactions.filter((t) => !t.is_cc_payment);
  const categoryMap = new Map<string, number>();

  for (const t of spending) {
    categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.amount);
  }

  const data = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No spending data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) => {
                const pct = (percent ?? 0) * 100;
                return `${name ?? ""} ${pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%`;
              }}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatINR(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DailyBarChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const spending = transactions.filter((t) => !t.is_cc_payment);
  const dailyMap = new Map<string, number>();

  for (const t of spending) {
    const day = new Date(t.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
    dailyMap.set(day, (dailyMap.get(day) || 0) + t.amount);
  }

  const data = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .reverse();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
          No spending data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" fontSize={12} tickLine={false} />
            <YAxis
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatINR(Number(value)), "Spent"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Legend />
            <Bar
              dataKey="amount"
              name="Amount"
              fill="hsl(221, 83%, 53%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
