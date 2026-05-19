export type Period =
  | { type: "month"; year: number; month: number }
  | { type: "year"; year: number };

export interface PeriodBounds {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

export function periodBounds(p: Period): PeriodBounds {
  if (p.type === "month") {
    const start = new Date(p.year, p.month, 1);
    const end = new Date(p.year, p.month + 1, 0, 23, 59, 59, 999);
    const previousStart = new Date(p.year, p.month - 1, 1);
    const previousEnd = new Date(p.year, p.month, 0, 23, 59, 59, 999);
    return { start, end, previousStart, previousEnd };
  }
  if (p.type === "year") {
    const start = new Date(p.year, 0, 1);
    const end = new Date(p.year, 11, 31, 23, 59, 59, 999);
    const previousStart = new Date(p.year - 1, 0, 1);
    const previousEnd = new Date(p.year - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, previousStart, previousEnd };
  }
  throw new Error(`Unsupported period type: ${(p as { type: string }).type}`);
}

export function periodKey(p: Period): string {
  if (p.type === "month") {
    return `${p.year}-${String(p.month + 1).padStart(2, "0")}`;
  }
  if (p.type === "year") {
    return String(p.year);
  }
  throw new Error(`Unsupported period type: ${(p as { type: string }).type}`);
}

export function periodLabel(p: Period): string {
  if (p.type === "month") {
    return new Date(p.year, p.month).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }
  if (p.type === "year") {
    return String(p.year);
  }
  throw new Error(`Unsupported period type: ${(p as { type: string }).type}`);
}

export function previousPeriodLabel(p: Period): string {
  if (p.type === "month") {
    const prevMonth = p.month - 1;
    const prevYear = prevMonth < 0 ? p.year - 1 : p.year;
    const m = prevMonth < 0 ? 11 : prevMonth;
    return new Date(prevYear, m).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }
  if (p.type === "year") {
    return String(p.year - 1);
  }
  throw new Error(`Unsupported period type: ${(p as { type: string }).type}`);
}
