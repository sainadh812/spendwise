import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  MonthlyTrendChart,
  AnalyticsPieChart,
  AnalyticsDailyBarChart,
  CategoryComparisonChart,
  StackedAreaChart,
  TopMerchantsChart,
  WeekdayHeatmap,
  YearOverYearChart,
  type AnalyticsTransaction,
} from "@/components/analytics-charts";

afterEach(() => {
  cleanup();
});

const makeTxn = (
  overrides: Partial<AnalyticsTransaction> = {}
): AnalyticsTransaction => ({
  id: "txn-1",
  amount: 1000,
  merchant: "Amazon",
  date: "2026-03-10T00:00:00.000Z",
  category: "Shopping",
  is_cc_payment: false,
  ...overrides,
});

const sampleTransactions: AnalyticsTransaction[] = [
  makeTxn({ id: "1", amount: 5000, merchant: "Amazon", category: "Shopping", date: "2026-03-10T00:00:00.000Z" }),
  makeTxn({ id: "2", amount: 3000, merchant: "Swiggy", category: "Food", date: "2026-03-12T00:00:00.000Z" }),
  makeTxn({ id: "3", amount: 2000, merchant: "Uber", category: "Transport", date: "2026-03-14T00:00:00.000Z" }),
  makeTxn({ id: "4", amount: 1500, merchant: "Swiggy", category: "Food", date: "2026-03-15T00:00:00.000Z" }),
  makeTxn({ id: "5", amount: 8000, merchant: "Amazon", category: "Shopping", date: "2026-03-18T00:00:00.000Z" }),
];

const ccOnlyTransactions: AnalyticsTransaction[] = [
  makeTxn({ id: "cc-1", amount: 50000, is_cc_payment: true }),
];

describe("MonthlyTrendChart", () => {
  it("renders the title with year", () => {
    render(<MonthlyTrendChart transactions={sampleTransactions} year={2026} />);
    expect(screen.getByText(/Monthly Spending Trend — 2026/)).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<MonthlyTrendChart transactions={[]} year={2026} />);
    expect(screen.getByText("No spending data for this year")).toBeInTheDocument();
  });

  it("shows empty state when only CC payments exist", () => {
    render(<MonthlyTrendChart transactions={ccOnlyTransactions} year={2026} />);
    expect(screen.getByText("No spending data for this year")).toBeInTheDocument();
  });

  it("does not show empty state when valid transactions exist", () => {
    render(<MonthlyTrendChart transactions={sampleTransactions} year={2026} />);
    expect(screen.queryByText("No spending data for this year")).not.toBeInTheDocument();
  });
});

describe("AnalyticsPieChart", () => {
  it("renders the title", () => {
    render(<AnalyticsPieChart transactions={sampleTransactions} />);
    expect(screen.getByText("Category Breakdown")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<AnalyticsPieChart transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("shows empty state for CC-only transactions", () => {
    render(<AnalyticsPieChart transactions={ccOnlyTransactions} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("renders category legend items with percentages", () => {
    render(<AnalyticsPieChart transactions={sampleTransactions} />);
    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });
});

describe("AnalyticsDailyBarChart", () => {
  it("renders the title", () => {
    render(<AnalyticsDailyBarChart transactions={sampleTransactions} />);
    expect(screen.getByText("Daily Spending")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<AnalyticsDailyBarChart transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });
});

describe("CategoryComparisonChart", () => {
  it("renders the title", () => {
    render(<CategoryComparisonChart transactions={sampleTransactions} />);
    expect(screen.getByText("Spending by Category")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<CategoryComparisonChart transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });
});

describe("StackedAreaChart", () => {
  it("renders the title", () => {
    render(<StackedAreaChart transactions={sampleTransactions} />);
    expect(screen.getByText("Category Spending Over Time")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<StackedAreaChart transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });
});

describe("TopMerchantsChart", () => {
  it("renders the title", () => {
    render(<TopMerchantsChart transactions={sampleTransactions} />);
    expect(screen.getByText("Top Merchants")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<TopMerchantsChart transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("shows empty state for CC-only transactions", () => {
    render(<TopMerchantsChart transactions={ccOnlyTransactions} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("renders merchants ranked by total spend", () => {
    render(<TopMerchantsChart transactions={sampleTransactions} />);

    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("Uber")).toBeInTheDocument();
  });

  it("shows transaction count for each merchant", () => {
    render(<TopMerchantsChart transactions={sampleTransactions} />);

    expect(screen.getAllByText("(2x)").length).toBe(2);
    expect(screen.getByText("(1x)")).toBeInTheDocument();
  });

  it("ranks merchants with highest spend first", () => {
    render(<TopMerchantsChart transactions={sampleTransactions} />);

    const rankings = screen.getAllByText(/^\d+\.$/);
    expect(rankings[0]).toHaveTextContent("1.");
    expect(rankings[1]).toHaveTextContent("2.");
    expect(rankings[2]).toHaveTextContent("3.");

    const merchantItems = screen.getAllByText(/^(Amazon|Swiggy|Uber)$/);
    expect(merchantItems[0]).toHaveTextContent("Amazon");
    expect(merchantItems[1]).toHaveTextContent("Swiggy");
    expect(merchantItems[2]).toHaveTextContent("Uber");
  });

  it("respects the limit prop", () => {
    const manyMerchants = [
      makeTxn({ id: "a", merchant: "M1", amount: 100 }),
      makeTxn({ id: "b", merchant: "M2", amount: 200 }),
      makeTxn({ id: "c", merchant: "M3", amount: 300 }),
    ];

    render(<TopMerchantsChart transactions={manyMerchants} limit={2} />);

    expect(screen.getByText("M3")).toBeInTheDocument();
    expect(screen.getByText("M2")).toBeInTheDocument();
    expect(screen.queryByText("M1")).not.toBeInTheDocument();
  });
});

describe("WeekdayHeatmap", () => {
  it("renders the title", () => {
    render(<WeekdayHeatmap transactions={sampleTransactions} />);
    expect(screen.getByText("Spending by Day of Week")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    render(<WeekdayHeatmap transactions={[]} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("shows empty state for CC-only transactions", () => {
    render(<WeekdayHeatmap transactions={ccOnlyTransactions} />);
    expect(screen.getByText("No spending data")).toBeInTheDocument();
  });

  it("renders all seven weekday labels", () => {
    render(<WeekdayHeatmap transactions={sampleTransactions} />);

    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("shows weekday and weekend totals", () => {
    render(<WeekdayHeatmap transactions={sampleTransactions} />);

    expect(screen.getByText("Weekdays:")).toBeInTheDocument();
    expect(screen.getByText("Weekends:")).toBeInTheDocument();
  });

  it("shows transaction count labels", () => {
    render(<WeekdayHeatmap transactions={sampleTransactions} />);

    const txnLabels = screen.getAllByText(/\d+ txns?/);
    expect(txnLabels.length).toBe(7);
  });
});

describe("YearOverYearChart", () => {
  it("renders the title with both years", () => {
    render(
      <YearOverYearChart
        currentTransactions={sampleTransactions}
        previousTransactions={[]}
        currentYear={2026}
        previousYear={2025}
      />
    );
    expect(
      screen.getByText(/Year-over-Year Comparison — 2025 vs 2026/)
    ).toBeInTheDocument();
  });

  it("shows empty state when no transactions in either year", () => {
    render(
      <YearOverYearChart
        currentTransactions={[]}
        previousTransactions={[]}
        currentYear={2026}
        previousYear={2025}
      />
    );
    expect(screen.getByText("No data available for comparison")).toBeInTheDocument();
  });

  it("shows empty state when only CC payments exist", () => {
    render(
      <YearOverYearChart
        currentTransactions={ccOnlyTransactions}
        previousTransactions={ccOnlyTransactions}
        currentYear={2026}
        previousYear={2025}
      />
    );
    expect(screen.getByText("No data available for comparison")).toBeInTheDocument();
  });

  it("does not show empty state when one year has data", () => {
    render(
      <YearOverYearChart
        currentTransactions={sampleTransactions}
        previousTransactions={[]}
        currentYear={2026}
        previousYear={2025}
      />
    );
    expect(screen.queryByText("No data available for comparison")).not.toBeInTheDocument();
  });
});
