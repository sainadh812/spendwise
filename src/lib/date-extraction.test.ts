import { describe, it, expect, vi, afterEach } from "vitest";
import { extractDateFromEmail, resolveTransactionDate } from "@/lib/date-extraction";

describe("extractDateFromEmail", () => {
  describe("dd-Mon-yyyy format", () => {
    it("parses dd-Mon-yyyy", () => {
      const body = "debited on 15-Jan-2026 from your account";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 0, 15)));
    });

    it("parses dd Mon yyyy with space separator", () => {
      const body = "transaction on 5 March 2026 was successful";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 5)));
    });

    it("parses dd-Mon-yyyy with comma after month", () => {
      const body = "debited on 20 Feb, 2026";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 1, 20)));
    });

    it("is case-insensitive for month names", () => {
      const body = "on 10-JAN-2026";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 0, 10)));
    });

    it("parses full month names", () => {
      const body = "on 7 September 2025";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2025, 8, 7)));
    });
  });

  describe("dd/mm/yyyy format", () => {
    it("parses dd-mm-yyyy with dashes", () => {
      const body = "debited on 25-12-2025 from account";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2025, 11, 25)));
    });

    it("parses dd/mm/yyyy with slashes", () => {
      const body = "transaction on 01/06/2026";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 5, 1)));
    });

    it("parses single-digit day and month", () => {
      const body = "on 3-7-2026";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 6, 3)));
    });
  });

  describe("dd-mm-yy format (2-digit year)", () => {
    it("parses dd-mm-yy and adds 2000", () => {
      const body = "debited on 16-03-26 from account";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("parses dd/mm/yy with slashes", () => {
      const body = "on 05/11/25";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2025, 10, 5)));
    });

    it("does not match 2-digit year followed by more digits", () => {
      const body = "reference number is 120097007567";
      const result = extractDateFromEmail(body);
      expect(result).toBeNull();
    });
  });

  describe("HTML email bodies (the original bug)", () => {
    it("extracts date from HTML with bold-wrapped date parts", () => {
      const html = `<td>debited on <b>16</b>-<b>03</b>-<b>26</b> from account</td>`;
      const result = extractDateFromEmail(html);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("extracts date from HTML with spans around date parts", () => {
      const html = `<p>on <span class="date">15</span>-<span>Jan</span>-<span>2026</span></p>`;
      const result = extractDateFromEmail(html);
      expect(result).toEqual(new Date(Date.UTC(2026, 0, 15)));
    });

    it("extracts date from a realistic bank HTML email", () => {
      const html = `
        <html>
          <head><style>body { font-family: Arial; }</style></head>
          <body>
            <table>
              <tr><td>Dear Customer,</td></tr>
              <tr><td>Rs.<b>10000.00</b> has been debited from account <b>XXXX</b></td></tr>
              <tr><td>to VPA merchant@upi on <b>16</b>-<b>03</b>-<b>26</b>.</td></tr>
              <tr><td>Ref: 120097007567</td></tr>
            </table>
          </body>
        </html>
      `;
      const result = extractDateFromEmail(html);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("extracts dd-mm-yyyy from deeply nested HTML", () => {
      const html = `<div><div><table><tr><td style="color:#333">on 25-12-2025</td></tr></table></div></div>`;
      const result = extractDateFromEmail(html);
      expect(result).toEqual(new Date(Date.UTC(2025, 11, 25)));
    });

    it("handles plain text input without issue", () => {
      const body = "Rs.500.00 debited on 10-02-26. Ref 999999";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 1, 10)));
    });
  });

  describe("priority ordering", () => {
    it("prefers dd-Mon-yyyy over dd/mm/yyyy when both present", () => {
      const body = "Date: 15-Jan-2026 Ref: 01-02-2026";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2026, 0, 15)));
    });

    it("prefers dd/mm/yyyy over dd/mm/yy when both present", () => {
      const body = "on 25-12-2025 and also 01-01-26";
      const result = extractDateFromEmail(body);
      expect(result).toEqual(new Date(Date.UTC(2025, 11, 25)));
    });
  });

  describe("edge cases", () => {
    it("returns null for body with no dates", () => {
      const body = "Dear Customer, your balance is Rs.5000.00";
      expect(extractDateFromEmail(body)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(extractDateFromEmail("")).toBeNull();
    });

    it("does not match invalid day > 31", () => {
      const body = "on 32-01-2026";
      expect(extractDateFromEmail(body)).toBeNull();
    });

    it("does not match invalid month > 12", () => {
      const body = "on 15-13-2026";
      expect(extractDateFromEmail(body)).toBeNull();
    });

    it("does not match phone numbers as dates", () => {
      const body = "call 18002586161 for support";
      expect(extractDateFromEmail(body)).toBeNull();
    });
  });
});

describe("resolveTransactionDate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when both AI and regex produce dates", () => {
    it("returns AI date when both agree within 1 day", () => {
      const aiDate = "2026-03-16T00:00:00Z";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T00:00:00Z"));
    });

    it("returns regex date when AI differs by more than 1 day", () => {
      const aiDate = "2011-03-26T00:00:00Z";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("returns regex date when AI gets year wrong", () => {
      const aiDate = "2024-01-15T00:00:00Z";
      const body = "on 15-Jan-2026 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date(Date.UTC(2026, 0, 15)));
    });

    it("returns AI date when difference is exactly 1 day (timezone edge)", () => {
      const aiDate = "2026-03-15T18:30:00Z";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-15T18:30:00Z"));
    });
  });

  describe("AI date normalization", () => {
    it("appends Z to AI date with T but no timezone", () => {
      const aiDate = "2026-03-16T00:00:00";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T00:00:00Z"));
    });

    it("does not double-append Z when already present", () => {
      const aiDate = "2026-03-16T00:00:00Z";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T00:00:00Z"));
    });

    it("does not append Z when offset is present", () => {
      const aiDate = "2026-03-16T05:30:00+05:30";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T05:30:00+05:30"));
    });
  });

  describe("fallback behavior", () => {
    it("returns regex date when AI date is invalid", () => {
      const aiDate = "not-a-date";
      const body = "debited on 16-03-26 from account";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("returns AI date when regex finds no date", () => {
      const aiDate = "2026-03-16T00:00:00Z";
      const body = "your balance is Rs.5000";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T00:00:00Z"));
    });

    it("returns current date when both fail", () => {
      const now = new Date("2026-03-17T12:00:00Z");
      vi.setSystemTime(now);
      const aiDate = "garbage";
      const body = "no date here at all";
      const result = resolveTransactionDate(aiDate, body);
      expect(result.getTime()).toEqual(now.getTime());
      vi.useRealTimers();
    });
  });

  describe("the reported bug scenario", () => {
    it("correctly resolves date from HTML email where AI got year wrong", () => {
      const html = `
        <table>
          <tr><td>Dear Customer, Rs.<b>10000.00</b> has been debited from account <b>XXXX</b>
          to VPA merchant@upi on <b>16</b>-<b>03</b>-<b>26</b>.
          Your UPI ref is 120097007567.</td></tr>
        </table>
      `;
      const aiDate = "2011-03-26T00:00:00";
      const result = resolveTransactionDate(aiDate, html);
      expect(result).toEqual(new Date(Date.UTC(2026, 2, 16)));
    });

    it("correctly resolves date from plain text email with 2-digit year", () => {
      const body =
        "Dear Customer, Rs.10000.00 has been debited from account XXXX " +
        "to VPA merchant@upi on 16-03-26. " +
        "Your UPI ref is 120097007567. Call 18002586161 for support.";
      const aiDate = "2026-03-16T00:00:00Z";
      const result = resolveTransactionDate(aiDate, body);
      expect(result).toEqual(new Date("2026-03-16T00:00:00Z"));
    });
  });
});
