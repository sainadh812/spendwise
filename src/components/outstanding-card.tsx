import Link from "next/link";
import { ArrowRight, HandCoins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function OutstandingCard({
  total,
  counterpartyCount,
}: {
  total: number;
  counterpartyCount: number;
}) {
  return (
    <Link href="/recoverables" className="block">
      <Card className="border-amber-500/40 bg-amber-50/40 transition-colors hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/15 p-2 text-amber-700 dark:text-amber-300">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Outstanding (owed to you)
              </p>
              <p className="text-xl font-bold">{formatINR(total)}</p>
              <p className="text-xs text-muted-foreground">
                Across {counterpartyCount}{" "}
                {counterpartyCount === 1 ? "person" : "people"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
