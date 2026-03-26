import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AnalyticsStats } from "@/components/analytics-stats";

afterEach(() => {
  cleanup();
});

const baseProps = {
  totalSpend: 50000,
  totalTransactions: 20,
  avgTransaction: 2500,
  maxSingleSpend: 10000,
  prevTotalSpend: 40000,
  prevTotalTransactions: 15,
  prevAvgTransaction: 2667,
  prevMaxSingleSpend: 8000,
  periodLabel: "March 2026",
  prevPeriodLabel: "Feb 2026",
};

describe("AnalyticsStats", () => {
  it("renders all four stat cards", () => {
    render(<AnalyticsStats {...baseProps} />);

    expect(screen.getByText("Total Spend")).toBeInTheDocument();
    expect(screen.getByText("Transactions")).toBeInTheDocument();
    expect(screen.getByText("Avg Transaction")).toBeInTheDocument();
    expect(screen.getByText("Largest Expense")).toBeInTheDocument();
  });

  it("displays formatted values", () => {
    render(<AnalyticsStats {...baseProps} />);

    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows the previous period label", () => {
    render(<AnalyticsStats {...baseProps} />);

    const labels = screen.getAllByText(/vs Feb 2026/);
    expect(labels.length).toBe(4);
  });

  it("shows percentage change when previous data exists", () => {
    render(<AnalyticsStats {...baseProps} />);

    const changes = screen.getAllByText("+25.0%");
    expect(changes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No prior data' when previous values are zero", () => {
    render(
      <AnalyticsStats
        {...baseProps}
        prevTotalSpend={0}
        prevTotalTransactions={0}
        prevAvgTransaction={0}
        prevMaxSingleSpend={0}
      />
    );

    const noPriorLabels = screen.getAllByText("No prior data");
    expect(noPriorLabels.length).toBe(4);
  });

  it("shows 'No change' when values are effectively the same", () => {
    render(
      <AnalyticsStats
        {...baseProps}
        totalSpend={40000}
        prevTotalSpend={40000}
      />
    );

    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  it("shows negative percentage for decreased spending", () => {
    render(
      <AnalyticsStats
        {...baseProps}
        totalSpend={30000}
        prevTotalSpend={40000}
      />
    );

    expect(screen.getByText("-25.0%")).toBeInTheDocument();
  });
});
