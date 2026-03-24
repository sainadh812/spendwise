import { describe, it, expect } from "vitest";
import { emailBodyToText, emailBodySnippet, buildEmailText } from "@/lib/email";

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

  it("excludes image URLs and link hrefs from output", () => {
    const html = `
      <html>
        <head><style>@media screen { table { width: 100%; } }</style></head>
        <body>
          <table width="600" border="0" cellspacing="0" cellpadding="0" align="center">
            <tr>
              <td>
                <a href="https://tracking.example.com/v1/r/abc123" target="_blank">
                  <img src="https://img.example.com/bank/images/2026/mar/Banner.jpg" alt="" width="100%" border="0">
                </a>
              </td>
            </tr>
            <tr>
              <td><img src="https://cdn.example.com/content/images/header.jpg" alt="" width="100%" border="0"></td>
            </tr>
            <tr>
              <td align="left" style="font-family:Arial; font-size:16px; color:#000;">
                Dear Customer,
                Rs. 500.00 is successfully credited to your account **1234 by VPA testuser@oksbi on 14-03-26.
                Your UPI transaction reference number is 123456789012.
                Thank you for banking with us.
                Warm Regards,
                Example Bank
              </td>
            </tr>
            <tr>
              <td style="font-size:12px;">
                For more details on Service charges and Fees,
                <a href="https://tracking.example.com/v1/r/xyz789" style="text-decoration:underline;color:#004b8d;" target="_blank">
                  <strong>click here.</strong>
                </a>
              </td>
            </tr>
          </table>
          <img src="https://tracking.example.com/v1/w/pixel123" width="1" height="1" border="0">
        </body>
      </html>
    `;
    const result = emailBodyToText(html);
    expect(result).toContain("Dear Customer");
    expect(result).toContain("Rs. 500.00");
    expect(result).toContain("account **1234");
    expect(result).toContain("123456789012");
    expect(result).toContain("click here.");
    expect(result).not.toContain("img.example.com");
    expect(result).not.toContain("cdn.example.com");
    expect(result).not.toContain("tracking.example.com");
    expect(result).not.toContain(".jpg");
    expect(result).not.toContain("https://");
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

describe("buildEmailText", () => {
  it("includes From, Subject, and Body fields", () => {
    const result = buildEmailText(
      "alerts@hdfcbank.net",
      "Debit Alert",
      "Rs.500 debited"
    );
    expect(result).toBe(
      "From: alerts@hdfcbank.net\nSubject: Debit Alert\n\nBody:\nRs.500 debited"
    );
  });

  it("strips HTML tags from the body before constructing text", () => {
    const html = "<p>Rs. <strong>1000.00</strong> debited from your account</p>";
    const result = buildEmailText("alerts@hdfcbank.net", "Alert", html);
    expect(result).toContain("Rs. 1000.00 debited from your account");
    expect(result).not.toContain("<p>");
    expect(result).not.toContain("<strong>");
  });

  it("strips style blocks from HTML email body", () => {
    const html = "<style>body{font:Arial}</style><p>Rs.500 debited</p>";
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("Rs.500 debited");
    expect(result).not.toContain("font");
    expect(result).not.toContain("<style>");
  });

  it("strips script blocks from HTML email body", () => {
    const html = '<script>track("open")</script><p>Rs.200 debited</p>';
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("Rs.200 debited");
    expect(result).not.toContain("track");
    expect(result).not.toContain("<script>");
  });

  it("removes tracking pixel images", () => {
    const html = `
      <p>Rs.100 debited</p>
      <img src="https://tracking.example.com/pixel.gif" width="1" height="1">
    `;
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("Rs.100 debited");
    expect(result).not.toContain("tracking.example.com");
    expect(result).not.toContain(".gif");
  });

  it("removes link hrefs but keeps link text", () => {
    const html = '<a href="https://bank.com/details?id=123">View Details</a>';
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("View Details");
    expect(result).not.toContain("https://bank.com");
  });

  it("handles plain text body without modification", () => {
    const plain = "Rs.500.00 debited from account XXXX on 16-03-26";
    const result = buildEmailText("alerts@hdfcbank.net", "Debit Alert", plain);
    expect(result).toBe(
      "From: alerts@hdfcbank.net\nSubject: Debit Alert\n\nBody:\nRs.500.00 debited from account XXXX on 16-03-26"
    );
  });

  it("handles empty body", () => {
    const result = buildEmailText("bank@example.com", "Alert", "");
    expect(result).toBe("From: bank@example.com\nSubject: Alert\n\nBody:\n");
  });

  it("handles empty from and subject", () => {
    const result = buildEmailText("", "", "Rs.100 debited");
    expect(result).toBe("From: \nSubject: \n\nBody:\nRs.100 debited");
  });

  it("preserves transaction details from a realistic HDFC HTML email", () => {
    const html = `
      <html>
        <head><style>body { font-family: Arial, sans-serif; } .header { background: #004b8d; }</style></head>
        <body>
          <table width="600" cellpadding="0" cellspacing="0" border="0">
            <tr><td><img src="https://www.hdfcbank.com/images/logo.png" alt="HDFC Bank"></td></tr>
            <tr><td style="padding:20px;">
              <p>Dear Customer,</p>
              <p>Rs.<b>2,500.00</b> has been debited from your account <b>XXXX1234</b> on <b>16</b>-<b>03</b>-<b>26</b> to VPA <b>swiggy@paytm</b>.</p>
              <p>Your UPI transaction reference number is <b>508712345678</b>.</p>
              <p>If this was not done by you, please call <b>1800 258 6161</b>.</p>
            </td></tr>
            <tr><td><a href="https://tracking.hdfcbank.com/click/abc123">View Account Statement</a></td></tr>
            <tr><td><img src="https://tracking.hdfcbank.com/open/pixel.gif" width="1" height="1"></td></tr>
          </table>
        </body>
      </html>
    `;
    const result = buildEmailText(
      "alerts@hdfcbank.net",
      "HDFC Bank Debit Alert",
      html
    );
    expect(result).toContain("From: alerts@hdfcbank.net");
    expect(result).toContain("Subject: HDFC Bank Debit Alert");
    expect(result).toContain("Rs.2,500.00");
    expect(result).toContain("XXXX1234");
    expect(result).toContain("16-03-26");
    expect(result).toContain("swiggy@paytm");
    expect(result).toContain("508712345678");
    expect(result).toContain("1800 258 6161");
    expect(result).toContain("View Account Statement");
    expect(result).not.toContain("<table>");
    expect(result).not.toContain("<td>");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("<style>");
    expect(result).not.toContain("font-family");
    expect(result).not.toContain("hdfcbank.com/images");
    expect(result).not.toContain("tracking.hdfcbank.com");
    expect(result).not.toContain("pixel.gif");
    expect(result).not.toContain("https://");
  });

  it("preserves transaction details from a realistic IDFC FIRST Bank HTML email", () => {
    const html = `
      <html>
        <head><style>.alert { color: #d32f2f; } table { border-collapse: collapse; }</style></head>
        <body>
          <table>
            <tr><td><img src="https://www.idfcfirstbank.com/logo.png" alt="IDFC"></td></tr>
            <tr><td>
              Dear Customer,<br><br>
              You have spent Rs. <strong>849.00</strong> at <strong>ZOMATO</strong> using your IDFC FIRST Bank Debit Card ending <strong>5678</strong> on <strong>15-Mar-2026</strong>.<br><br>
              Available balance: Rs. 15,432.50<br>
              <a href="https://idfcfirstbank.com/dispute?ref=xyz">Report unauthorized transaction</a>
            </td></tr>
          </table>
          <img src="https://analytics.idfcfirstbank.com/track/open123" width="1" height="1">
        </body>
      </html>
    `;
    const result = buildEmailText(
      "noreply@idfcfirstbank.com",
      "IDFC FIRST Bank Debit Card Transaction",
      html
    );
    expect(result).toContain("From: noreply@idfcfirstbank.com");
    expect(result).toContain("Subject: IDFC FIRST Bank Debit Card Transaction");
    expect(result).toContain("Rs. 849.00");
    expect(result).toContain("ZOMATO");
    expect(result).toContain("5678");
    expect(result).toContain("15-Mar-2026");
    expect(result).toContain("15,432.50");
    expect(result).toContain("Report unauthorized transaction");
    expect(result).not.toContain("<table>");
    expect(result).not.toContain("<strong>");
    expect(result).not.toContain("<style>");
    expect(result).not.toContain("idfcfirstbank.com/logo");
    expect(result).not.toContain("analytics.idfcfirstbank.com");
    expect(result).not.toContain("https://");
  });

  it("preserves HDFC NACH auto-debit details from HTML", () => {
    const html = `
      <table>
        <tr><td style="font-family:Arial;">
          Dear Customer,<br>
          Rs.<b>5,000.00</b> has been debited from your account <b>XXXX9876</b> towards <b>TATA AIA LIFE INSURANCE</b> with UMRN <b>NACH00000001234567</b> on <b>01</b>-<b>03</b>-<b>26</b>.
        </td></tr>
      </table>
    `;
    const result = buildEmailText(
      "nachautoemailer@hdfcbank.bank.in",
      "HDFC NACH Auto-Debit Alert",
      html
    );
    expect(result).toContain("Rs.5,000.00");
    expect(result).toContain("XXXX9876");
    expect(result).toContain("TATA AIA LIFE INSURANCE");
    expect(result).toContain("NACH00000001234567");
    expect(result).toContain("01-03-26");
    expect(result).not.toContain("<table>");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("font-family");
  });

  it("decodes HTML entities preserving financial symbols", () => {
    const html = "<p>Amount: Rs.1,000.00 &amp; Tax: Rs.180.00</p>";
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("Rs.1,000.00 & Tax: Rs.180.00");
    expect(result).not.toContain("&amp;");
  });

  it("handles multipart email where body is already plain text", () => {
    const plain = `Dear Customer,
Rs.10000.00 has been debited from account XXXX5555
to VPA merchant@upi on 16-03-26.
Your UPI ref is 120097007567.`;
    const result = buildEmailText("alerts@hdfcbank.net", "Debit Alert", plain);
    expect(result).toContain("Rs.10000.00");
    expect(result).toContain("XXXX5555");
    expect(result).toContain("merchant@upi");
    expect(result).toContain("16-03-26");
    expect(result).toContain("120097007567");
  });

  it("produces significantly shorter output than raw HTML input", () => {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial; margin: 0; padding: 0; }
            .container { width: 600px; margin: auto; }
            .header { background: #004b8d; color: white; padding: 20px; }
            .footer { font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <table class="container">
            <tr><td class="header"><img src="https://bank.com/logo.png" alt="Bank"></td></tr>
            <tr><td style="padding:20px; font-size:14px;">
              Rs.500.00 debited on 16-03-26.
            </td></tr>
            <tr><td class="footer">
              <a href="https://bank.com/unsubscribe?token=abc123def456">Unsubscribe</a> |
              <a href="https://bank.com/privacy">Privacy Policy</a>
              <img src="https://tracking.bank.com/pixel" width="1" height="1">
            </td></tr>
          </table>
        </body>
      </html>
    `;
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result.length).toBeLessThan(html.length);
    expect(result).toContain("Rs.500.00 debited on 16-03-26");
  });

  it("handles credit card payment email HTML correctly", () => {
    const html = `
      <table>
        <tr><td>
          Dear Customer,<br>
          Rs.<b>25,000.00</b> has been debited from your account <b>XXXX4321</b> for <b>CC bill payment</b> on <b>10-03-26</b>.
        </td></tr>
      </table>
    `;
    const result = buildEmailText("alerts@hdfcbank.net", "CC Bill Payment", html);
    expect(result).toContain("Rs.25,000.00");
    expect(result).toContain("CC bill payment");
    expect(result).toContain("10-03-26");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("<table>");
  });

  it("handles email with multiple nested tables (common in bank emails)", () => {
    const html = `
      <table>
        <tr><td>
          <table>
            <tr><td>
              <table>
                <tr><td>Dear Customer,</td></tr>
                <tr><td>Rs.750.00 debited</td></tr>
                <tr><td>Merchant: Uber</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `;
    const result = buildEmailText("bank@example.com", "Alert", html);
    expect(result).toContain("Dear Customer");
    expect(result).toContain("Rs.750.00 debited");
    expect(result).toContain("Merchant: Uber");
    expect(result).not.toContain("<table>");
  });
});
