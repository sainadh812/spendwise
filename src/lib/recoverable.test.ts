import { describe, it, expect } from "vitest";
import {
  RECOVERY_STATUS,
  computeRecoveryStatus,
  effectiveSpend,
  outstandingAmount,
  sumRepayments,
} from "./recoverable";

describe("sumRepayments", () => {
  it("returns 0 for undefined or empty", () => {
    expect(sumRepayments(undefined)).toBe(0);
    expect(sumRepayments([])).toBe(0);
  });

  it("sums all repayment amounts", () => {
    expect(sumRepayments([{ amount: 1000 }, { amount: 500 }])).toBe(1500);
  });
});

describe("outstandingAmount", () => {
  it("returns 0 when not recoverable", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: null,
        recovery_status: null,
      })
    ).toBe(0);
  });

  it("returns full recoverable amount when pending with no repayments", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PENDING,
      })
    ).toBe(4000);
  });

  it("subtracts repayments when partial", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PARTIAL,
        repayments: [{ amount: 2000 }],
      })
    ).toBe(2000);
  });

  it("returns 0 when fully recovered", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.RECOVERED,
        repayments: [{ amount: 4000 }],
      })
    ).toBe(0);
  });

  it("returns 0 when written off (debt is gone but counts as expense)", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.WRITTEN_OFF,
      })
    ).toBe(0);
  });

  it("never goes negative on overpayment", () => {
    expect(
      outstandingAmount({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PARTIAL,
        repayments: [{ amount: 5000 }],
      })
    ).toBe(0);
  });
});

describe("effectiveSpend", () => {
  it("equals amount when not recoverable", () => {
    expect(
      effectiveSpend({
        amount: 1500,
        recoverable_amount: null,
        recovery_status: null,
      })
    ).toBe(1500);
  });

  it("is 0 when fully recovered (full amount was lent)", () => {
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.RECOVERED,
      })
    ).toBe(0);
  });

  it("counts full amount when written off with no repayments", () => {
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.WRITTEN_OFF,
      })
    ).toBe(4000);
  });

  it("only counts outstanding when written off after partial repayment", () => {
    // Lent 4000, got 2000 back, then gave up on the rest.
    // Real out-of-pocket is the 2000 you never recovered, not 4000.
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.WRITTEN_OFF,
        repayments: [{ amount: 2000 }],
      })
    ).toBe(2000);
  });

  it("equals amount when pending with no repayments", () => {
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PENDING,
      })
    ).toBe(4000);
  });

  it("subtracts repayments when partial", () => {
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PARTIAL,
        repayments: [{ amount: 2000 }],
      })
    ).toBe(2000);
  });

  it("preserves non-recoverable portion when only part of spend was lent", () => {
    // Shared bill: spent 5000, only 3000 is owed back. Got 1000 back so far.
    expect(
      effectiveSpend({
        amount: 5000,
        recoverable_amount: 3000,
        recovery_status: RECOVERY_STATUS.PARTIAL,
        repayments: [{ amount: 1000 }],
      })
    ).toBe(4000);
  });

  it("never goes negative on overpayment", () => {
    expect(
      effectiveSpend({
        amount: 4000,
        recoverable_amount: 4000,
        recovery_status: RECOVERY_STATUS.PARTIAL,
        repayments: [{ amount: 9999 }],
      })
    ).toBe(0);
  });
});

describe("computeRecoveryStatus", () => {
  it("returns PENDING with no repayments", () => {
    expect(computeRecoveryStatus(4000, 0, RECOVERY_STATUS.PENDING)).toBe(
      RECOVERY_STATUS.PENDING
    );
  });

  it("returns PARTIAL when some repayments exist but not full", () => {
    expect(computeRecoveryStatus(4000, 2000, RECOVERY_STATUS.PENDING)).toBe(
      RECOVERY_STATUS.PARTIAL
    );
  });

  it("returns RECOVERED when fully repaid", () => {
    expect(computeRecoveryStatus(4000, 4000, RECOVERY_STATUS.PARTIAL)).toBe(
      RECOVERY_STATUS.RECOVERED
    );
  });

  it("returns RECOVERED when overpaid", () => {
    expect(computeRecoveryStatus(4000, 5000, RECOVERY_STATUS.PARTIAL)).toBe(
      RECOVERY_STATUS.RECOVERED
    );
  });

  it("preserves WRITTEN_OFF status even with repayments", () => {
    expect(
      computeRecoveryStatus(4000, 1000, RECOVERY_STATUS.WRITTEN_OFF)
    ).toBe(RECOVERY_STATUS.WRITTEN_OFF);
  });

  it("transitions from RECOVERED back to PARTIAL when repayment removed", () => {
    expect(computeRecoveryStatus(4000, 2000, RECOVERY_STATUS.RECOVERED)).toBe(
      RECOVERY_STATUS.PARTIAL
    );
  });
});
