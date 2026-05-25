import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionTable } from "@/components/transaction-table";

vi.mock("@/app/actions", () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  createCategory: vi.fn(),
}));

const transactions = [
  {
    id: "t1",
    amount: 500,
    merchant: "Swiggy",
    date: "2026-03-01T00:00:00.000Z",
    category: "Food",
    subcategory: "Delivery",
    is_cc_payment: false,
    confidence_score: 0.95,
    needs_review: false,
    remarks: "Lunch",
  },
  {
    id: "t2",
    amount: 2500,
    merchant: "Amazon",
    date: "2026-03-02T00:00:00.000Z",
    category: "Shopping",
    subcategory: null,
    is_cc_payment: false,
    confidence_score: 0.6,
    needs_review: true,
    remarks: null,
  },
  {
    id: "t3",
    amount: 10000,
    merchant: "HDFC CC Payment",
    date: "2026-03-03T00:00:00.000Z",
    category: "Transfer",
    subcategory: null,
    is_cc_payment: true,
    confidence_score: 0.99,
    needs_review: false,
    remarks: null,
  },
];

const categories = [
  {
    name: "Food",
    subcategories: [
      { id: "s1", name: "Delivery" },
      { id: "s2", name: "Dining" },
    ],
  },
  { name: "Shopping", subcategories: [] },
  { name: "Transfer", subcategories: [] },
];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("TransactionTable filters", () => {
  it("shows all transactions and unfiltered total on mount", () => {
    render(
      <TransactionTable transactions={transactions} categories={categories} />
    );

    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("HDFC CC Payment")).toBeInTheDocument();

    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 3 of 3 transactions"
    );
    // Total excludes CC payment: 500 + 2500 = 3000
    expect(screen.getByText("₹3,000")).toBeInTheDocument();
  });

  it("filters by merchant search and updates the total", async () => {
    const user = userEvent.setup();
    render(
      <TransactionTable transactions={transactions} categories={categories} />
    );

    await user.type(
      screen.getByLabelText("Search transactions"),
      "swiggy"
    );

    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.queryByText("Amazon")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 1 of 3 transactions"
    );
    // ₹500 appears in both the row and the summary total
    expect(screen.getAllByText("₹500")).toHaveLength(2);
  });

  it("filters by amount range", async () => {
    const user = userEvent.setup();
    render(
      <TransactionTable transactions={transactions} categories={categories} />
    );

    await user.type(screen.getByLabelText("Minimum amount"), "1000");

    expect(screen.queryByText("Swiggy")).not.toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("HDFC CC Payment")).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 2 of 3 transactions"
    );
    // CC payment excluded from total: only Amazon 2500
    // Appears in both the Amazon row and the summary
    expect(screen.getAllByText("₹2,500")).toHaveLength(2);
  });

  it("clears all filters when Clear filters is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TransactionTable transactions={transactions} categories={categories} />
    );

    await user.type(screen.getByLabelText("Search transactions"), "swiggy");
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 1 of 3 transactions"
    );

    await user.click(screen.getByRole("button", { name: /Clear filters/i }));

    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 3 of 3 transactions"
    );
  });

  it("shows empty state message when filters match nothing", async () => {
    const user = userEvent.setup();
    render(
      <TransactionTable transactions={transactions} categories={categories} />
    );

    await user.type(
      screen.getByLabelText("Search transactions"),
      "nonexistent"
    );

    expect(
      screen.getByText(/No transactions match the current filters/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 0 of 3 transactions"
    );
  });
});
