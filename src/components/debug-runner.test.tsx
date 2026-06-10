import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebugRunner } from "@/components/debug-runner";

vi.mock("@/app/actions", () => ({
  manuallyAddFromDebug: vi.fn(),
  createCategory: vi.fn(),
}));

const categories = [
  { name: "Food", subcategories: [{ id: "1", name: "Restaurants" }] },
  { name: "Other", subcategories: [] },
];

const FETCH_RESPONSE_OK = {
  message: "[DRY RUN] Would process 1 emails",
  dry_run: true,
  processed: 1,
  skipped_duplicates: 0,
  skipped_junk: 0,
  total_emails_found: 1,
  query_used: "is:unread newer_than:2d",
  transactions: [
    {
      email_id: "msg-1",
      email_url: "https://mail.google.com/mail/u/0/#inbox/msg-1",
      from: "alerts@hdfcbank.net",
      subject: "Alert: Debit",
      body_snippet: "Rs. 250 spent at SWIGGY",
      parsed: {
        amount: 250,
        merchant: "Swiggy",
        date: "2026-04-10T00:00:00.000Z",
        category: "Food",
        subcategory: "Restaurants",
        is_cc_payment: false,
        confidence_score: 0.92,
      },
      status: "would_save",
    },
  ],
};

const FETCH_RESPONSE_EMPTY = {
  message: "No new bank alert emails found",
  dry_run: true,
  processed: 0,
  skipped_duplicates: 0,
  skipped_junk: 0,
  total_emails_found: 0,
  query_used: "is:unread newer_than:2d",
  transactions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DebugRunner", () => {
  it("calls /api/process-emails with dry_run=true and verbose=true by default", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => FETCH_RESPONSE_OK,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<DebugRunner categories={categories} />);

    await user.click(screen.getByRole("button", { name: /run pipeline/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const calls = fetchMock.mock.calls as unknown as Array<[string]>;
    const url = calls[0][0];
    expect(url).toContain("dry_run=true");
    expect(url).toContain("verbose=true");
    expect(url).toContain("limit=50");
  });

  it("renders summary stats and entry from a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => FETCH_RESPONSE_OK }))
    );

    const user = userEvent.setup();
    render(<DebugRunner categories={categories} />);
    await user.click(screen.getByRole("button", { name: /run pipeline/i }));

    expect(await screen.findByText(/would process 1 emails/i)).toBeInTheDocument();
    expect(screen.getByText("Swiggy")).toBeInTheDocument();
    expect(screen.getByText(/would save/i)).toBeInTheDocument();
  });

  it("shows a prominent warning when Gmail returns 0 emails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => FETCH_RESPONSE_EMPTY }))
    );

    const user = userEvent.setup();
    render(<DebugRunner categories={categories} />);
    await user.click(screen.getByRole("button", { name: /run pipeline/i }));

    expect(
      await screen.findByText(/gmail returned/i)
    ).toBeInTheDocument();
  });

  it("displays pipeline error when API returns non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "Failed", details: "Gmail auth failed" }),
      }))
    );

    const user = userEvent.setup();
    render(<DebugRunner categories={categories} />);
    await user.click(screen.getByRole("button", { name: /run pipeline/i }));

    expect(await screen.findByText(/pipeline failed/i)).toBeInTheDocument();
    expect(screen.getByText(/gmail auth failed/i)).toBeInTheDocument();
  });

  it("includes custom query in the request when user edits it", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => FETCH_RESPONSE_OK,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<DebugRunner categories={categories} />);

    const queryInput = screen.getByLabelText(/gmail search query/i);
    await user.clear(queryInput);
    await user.type(queryInput, "from:custom@bank.com newer_than:30d");

    await user.click(screen.getByRole("button", { name: /run pipeline/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const calls = fetchMock.mock.calls as unknown as Array<[string]>;
    const qs = new URLSearchParams(calls[0][0].split("?")[1]);
    expect(qs.get("query")).toBe("from:custom@bank.com newer_than:30d");
  });
});
