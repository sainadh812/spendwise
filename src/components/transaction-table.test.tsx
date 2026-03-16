import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionTable } from "@/components/transaction-table";

vi.mock("@/app/actions", () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

const mockTransaction = {
  id: "txn-1",
  amount: 1500,
  merchant: "Amazon",
  date: "2026-03-10T00:00:00.000Z",
  category: "Shopping",
  is_cc_payment: false,
  confidence_score: 0.95,
  needs_review: false,
  remarks: null,
};

const categories = ["Shopping", "Food", "Transport"];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

function getTriggerButton() {
  return document.querySelector(
    '[data-slot="alert-dialog-trigger"][title="Delete"]'
  ) as HTMLElement;
}

describe("TransactionTable delete confirmation", () => {
  it("does not call deleteTransaction immediately on delete button click", async () => {
    const { deleteTransaction } = await import("@/app/actions");
    const user = userEvent.setup();

    render(
      <TransactionTable
        transactions={[mockTransaction]}
        categories={categories}
      />
    );

    await user.click(getTriggerButton());

    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  it("shows confirmation dialog when delete button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <TransactionTable
        transactions={[mockTransaction]}
        categories={categories}
      />
    );

    await user.click(getTriggerButton());

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Delete Transaction")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/This will permanently delete/)
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Amazon/)).toBeInTheDocument();
  });

  it("does not delete when Cancel is clicked in the confirmation dialog", async () => {
    const { deleteTransaction } = await import("@/app/actions");
    const user = userEvent.setup();

    render(
      <TransactionTable
        transactions={[mockTransaction]}
        categories={categories}
      />
    );

    await user.click(getTriggerButton());

    const dialog = screen.getByRole("alertdialog");
    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    expect(deleteTransaction).not.toHaveBeenCalled();
  });

  it("calls deleteTransaction when Delete is confirmed", async () => {
    const { deleteTransaction } = await import("@/app/actions");
    const user = userEvent.setup();

    render(
      <TransactionTable
        transactions={[mockTransaction]}
        categories={categories}
      />
    );

    await user.click(getTriggerButton());

    const dialog = screen.getByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", { name: "Delete" });
    await user.click(confirmButton);

    expect(deleteTransaction).toHaveBeenCalledWith("txn-1");
  });
});
