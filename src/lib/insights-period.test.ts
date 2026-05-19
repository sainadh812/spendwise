import { describe, it, expect } from "vitest";
import {
  periodBounds,
  periodKey,
  periodLabel,
  previousPeriodLabel,
  type Period,
} from "@/lib/insights-period";

describe("periodBounds", () => {
  it("returns correct bounds for a month", () => {
    const p: Period = { type: "month", year: 2026, month: 3 };
    const { start, end, previousStart, previousEnd } = periodBounds(p);
    expect(start).toEqual(new Date(2026, 3, 1));
    expect(end).toEqual(new Date(2026, 4, 0, 23, 59, 59, 999));
    expect(previousStart).toEqual(new Date(2026, 2, 1));
    expect(previousEnd).toEqual(new Date(2026, 3, 0, 23, 59, 59, 999));
  });

  it("handles January (previous month is December of prev year)", () => {
    const p: Period = { type: "month", year: 2026, month: 0 };
    const { previousStart, previousEnd } = periodBounds(p);
    expect(previousStart).toEqual(new Date(2025, 11, 1));
    expect(previousEnd).toEqual(new Date(2026, 0, 0, 23, 59, 59, 999));
  });

  it("returns correct bounds for a year", () => {
    const p: Period = { type: "year", year: 2026 };
    const { start, end, previousStart, previousEnd } = periodBounds(p);
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    expect(previousStart).toEqual(new Date(2025, 0, 1));
    expect(previousEnd).toEqual(new Date(2025, 11, 31, 23, 59, 59, 999));
  });
});

describe("periodKey", () => {
  it("formats month as YYYY-MM", () => {
    expect(periodKey({ type: "month", year: 2026, month: 0 })).toBe("2026-01");
    expect(periodKey({ type: "month", year: 2026, month: 11 })).toBe("2026-12");
    expect(periodKey({ type: "month", year: 2026, month: 3 })).toBe("2026-04");
  });

  it("formats year as YYYY", () => {
    expect(periodKey({ type: "year", year: 2026 })).toBe("2026");
  });
});

describe("periodLabel", () => {
  it("formats month label", () => {
    const label = periodLabel({ type: "month", year: 2026, month: 3 });
    expect(label).toMatch(/April/);
    expect(label).toMatch(/2026/);
  });

  it("formats year label", () => {
    expect(periodLabel({ type: "year", year: 2026 })).toBe("2026");
  });
});

describe("previousPeriodLabel", () => {
  it("wraps to December of previous year for January", () => {
    const label = previousPeriodLabel({ type: "month", year: 2026, month: 0 });
    expect(label).toMatch(/December/);
    expect(label).toMatch(/2025/);
  });

  it("returns previous month within same year", () => {
    const label = previousPeriodLabel({ type: "month", year: 2026, month: 3 });
    expect(label).toMatch(/March/);
    expect(label).toMatch(/2026/);
  });

  it("returns previous year for year period", () => {
    expect(previousPeriodLabel({ type: "year", year: 2026 })).toBe("2025");
  });
});
