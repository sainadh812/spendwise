import { describe, it, expect } from "vitest";
import { emailBodyToText, emailBodySnippet } from "@/lib/email";

describe("emailBodyToText", () => {
  it("strips HTML tags and returns plain text", () => {
    const html = "<p>Hello <strong>World</strong></p>";
    const result = emailBodyToText(html);
    expect(result).toContain("Hello");
    expect(result).toContain("World");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
  });

  it("converts <br> tags to newlines", () => {
    const html = "Line 1<br>Line 2<br/>Line 3";
    const result = emailBodyToText(html);
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
    expect(result).toContain("Line 3");
  });

  it("decodes HTML entities", () => {
    const html = "&amp; &lt; &gt; &quot; &#39; &nbsp;";
    const result = emailBodyToText(html);
    expect(result).toContain("&");
    expect(result).toContain("<");
    expect(result).toContain(">");
    expect(result).toContain('"');
    expect(result).toContain("'");
  });

  it("strips <style> blocks", () => {
    const html =
      "<style>.foo { color: red; }</style><p>Visible content</p>";
    const result = emailBodyToText(html);
    expect(result).toContain("Visible content");
    expect(result).not.toContain("color");
    expect(result).not.toContain(".foo");
  });

  it("strips <script> blocks", () => {
    const html =
      '<script>alert("xss")</script><p>Safe content</p>';
    const result = emailBodyToText(html);
    expect(result).toContain("Safe content");
    expect(result).not.toContain("alert");
  });

  it("handles a realistic bank email HTML", () => {
    const html = `
      <html>
        <head><style>body { font-family: Arial; }</style></head>
        <body>
          <table>
            <tr><td>Dear Customer,</td></tr>
            <tr><td>Rs. 1,234.56 has been debited from your account</td></tr>
            <tr><td>Merchant: <strong>Amazon</strong></td></tr>
            <tr><td>Date: 15-Jan-2026</td></tr>
          </table>
        </body>
      </html>
    `;
    const result = emailBodyToText(html);
    expect(result).toContain("Dear Customer");
    expect(result).toContain("Rs. 1,234.56");
    expect(result).toContain("Amazon");
    expect(result).toContain("15-Jan-2026");
    expect(result).not.toContain("<table>");
    expect(result).not.toContain("<td>");
    expect(result).not.toContain("font-family");
  });

  it("handles plain text input unchanged", () => {
    const plainText = "This is already plain text with no HTML";
    const result = emailBodyToText(plainText);
    expect(result).toBe(plainText);
  });

  it("handles empty string", () => {
    expect(emailBodyToText("")).toBe("");
  });

  it("extracts text from deeply nested HTML", () => {
    const html =
      "<div><div><div><span>Deeply</span> <em>nested</em></div></div></div>";
    const result = emailBodyToText(html);
    expect(result).toContain("Deeply");
    expect(result).toContain("nested");
    expect(result).not.toContain("<");
  });

  it("handles HTML with no closing tags gracefully", () => {
    const html = "<p>Unclosed paragraph<p>Another one<br>With break";
    const result = emailBodyToText(html);
    expect(result).toContain("Unclosed paragraph");
    expect(result).toContain("Another one");
    expect(result).toContain("With break");
  });
});

describe("emailBodySnippet", () => {
  it("truncates to 500 characters by default", () => {
    const longHtml = `<p>${"A".repeat(1000)}</p>`;
    const result = emailBodySnippet(longHtml);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it("accepts a custom max length", () => {
    const html = `<p>${"B".repeat(200)}</p>`;
    const result = emailBodySnippet(html, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it("does not truncate short content", () => {
    const html = "<p>Short email</p>";
    const result = emailBodySnippet(html);
    expect(result).toContain("Short email");
    expect(result.length).toBeLessThan(500);
  });

  it("strips HTML before truncating so more content fits", () => {
    const padding = "X".repeat(400);
    const htmlWithTags = `<div><style>.x{color:red}</style><table><tr><td>${padding}</td></tr><tr><td>IMPORTANT_INFO</td></tr></table></div>`;
    const result = emailBodySnippet(htmlWithTags);
    expect(result).toContain("IMPORTANT_INFO");
  });

  it("never produces unclosed HTML tags in output", () => {
    const html = `<p>${"Word ".repeat(200)}</p>`;
    const result = emailBodySnippet(html);
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});
