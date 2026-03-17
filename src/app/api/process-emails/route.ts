import { NextRequest, NextResponse } from "next/server";
import { google as googleapis } from "googleapis";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { prisma } from "@/lib/prisma";
import { emailBodySnippet } from "@/lib/email";
import { transactionSchema } from "@/lib/schemas";
import { resolveTransactionDate } from "@/lib/date-extraction";

// We use newer_than:2d (not 1d) as a safety buffer.
// Cron runs at 11:30 PM IST - if an email arrives at 11:35 PM the previous night,
// a 1d window would miss it by the next run. 2d ensures overlap, and the
// email_message_id unique constraint prevents any duplicates from being saved.
const BANK_EMAIL_QUERY = [
  "is:unread",
  "newer_than:2d",
  "(",
  "from:alerts@hdfcbank.net",
  "OR from:alerts@hdfcbank.bank.in",
  "OR from:nachautoemailer@hdfcbank.bank.in",
  "OR from:noreply@idfcfirstbank.com",
  "OR from:delivery.idfcfirstbank.com",
  ")",
].join(" ");

function buildAIPrompt(): string {
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  return `You are a financial transaction parser for Indian bank alert emails.
Your job is to extract DEBIT (money going out) transactions — any transaction where money leaves the account.

CRITICAL — set confidence_score to 0.0 and skip ONLY if the email is one of these:
- A CREDIT/refund alert (money coming IN, e.g. "credited to your account", "received", "refund processed")
- A marketing/promotional email
- An OTP or verification code
- A monthly statement or summary
- A balance update without a specific debit transaction

IMPORTANT — the following ARE valid debits and must NOT be skipped:
- Transfers to investment/trading platforms, mutual funds, SIPs, brokerages
- Insurance premium payments
- Loan EMI payments
- Transfers to savings accounts, fixed deposits, PPF, NPS
- UPI/NEFT/IMPS/RTGS transfers to any recipient
- Bill payments, subscriptions, recharges
- ATM withdrawals
If money left the account, it is a debit — extract it regardless of the purpose.

How to distinguish DEBIT vs CREDIT:
- DEBIT keywords: "debited", "spent", "paid", "purchased", "charged", "withdrawn", "debit alert", "transferred"
- CREDIT keywords: "credited", "received", "refund", "cashback credited", "credit alert"
- If the email says "credited to your account" — this is a CREDIT, set confidence_score to 0.0

Extraction rules:
- amount: The debited amount in INR. Look for "Rs.", "INR", "Rs" followed by a number.
- merchant: The merchant/payee name.
  - HDFC: usually after "at" or "to" (e.g. "at SWIGGY" or "to JOHN DOE")
  - HDFC NACH auto-debit: the merchant name appears after "towards" (e.g. "towards MERCHANT NAME with UMRN")
  - IDFC FIRST Bank: usually after "spent at" or "paid to"
- date: Transaction date in ISO 8601 format (YYYY-MM-DDT00:00:00Z, always UTC with Z suffix). Parse from email body, or fall back to today (${today}).
  Today's date is ${today} and the current year is ${currentYear}. Do NOT default to past years like 2024 — use the year stated in the email.
  Indian bank emails typically use dd-mm-yyyy or dd-mm-yy date formats (day first, then month, then year).
  For 2-digit years (e.g. "23-02-26"), interpret as dd-mm-yy NOT yy-mm-dd — so "23-02-26" means 23 Feb 2026.
  Always pick the most recent valid date (not a future date). Never assume yyyy-mm-dd or mm-dd-yy.
- category: Best-guess from: Food & Dining, Groceries, Transportation, Shopping, Entertainment, Bills & Utilities, Health & Fitness, Travel, Education, Investment, Insurance, Credit Card Payment, ATM Withdrawal, Transfer, Other.
- is_cc_payment: true ONLY if paying off a credit card bill (e.g. "CC bill payment"). Regular purchases made with a credit card are false.
- confidence_score (0.0 to 1.0): Lower if merchant name is unclear/truncated, amount is ambiguous, or you had to guess the category.

Email content:
`;
}



async function findDuplicate(amount: number, merchant: string, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return prisma.transaction.findFirst({
    where: {
      amount,
      merchant,
      date: { gte: dayStart, lte: dayEnd },
    },
  });
}

interface ProcessedEntry {
  email_id: string;
  from: string;
  subject: string;
  parsed: {
    amount: number;
    merchant: string;
    date: string;
    category: string;
    is_cc_payment: boolean;
    confidence_score: number;
  };
  status: "saved" | "duplicate_skipped" | "duplicate_flagged" | "junk_skipped";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get("dry_run") === "true";
  const verbose = searchParams.get("verbose") === "true";
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // In dev, allow calling without CRON_SECRET for local testing
  const isDev = process.env.NODE_ENV !== "production";
  const authHeader = request.headers.get("authorization");
  if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oauth2Client = new googleapis.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = googleapis.gmail({ version: "v1", auth: oauth2Client });
    const searchQuery = process.env.GMAIL_SEARCH_QUERY || BANK_EMAIL_QUERY;

    const messages = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: Math.min(limit, 50),
    });

    if (!messages.data.messages || messages.data.messages.length === 0) {
      return NextResponse.json({
        message: "No new bank alert emails found",
        processed: 0,
        dry_run: dryRun,
        query_used: verbose ? searchQuery : undefined,
      });
    }

    let processed = 0;
    let skippedDuplicates = 0;
    let skippedJunk = 0;
    const entries: ProcessedEntry[] = [];
    const errors: string[] = [];

    for (const msg of messages.data.messages) {
      try {
        const messageId = msg.id!;

        const [alreadyProcessed, alreadySkipped] = await Promise.all([
          prisma.transaction.findUnique({
            where: { email_message_id: messageId },
          }),
          prisma.skippedEmail.findUnique({
            where: { email_message_id: messageId },
          }),
        ]);
        if (alreadyProcessed || alreadySkipped) {
          skippedDuplicates++;
          if (verbose && alreadyProcessed) {
            entries.push({
              email_id: messageId,
              from: "",
              subject: "",
              parsed: {
                amount: alreadyProcessed.amount,
                merchant: alreadyProcessed.merchant,
                date: alreadyProcessed.date.toISOString(),
                category: alreadyProcessed.category,
                is_cc_payment: alreadyProcessed.is_cc_payment,
                confidence_score: alreadyProcessed.confidence_score,
              },
              status: "duplicate_skipped",
            });
          }
          continue;
        }

        const email = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const headers = email.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "";
        const from = headers.find((h) => h.name === "From")?.value || "";

        const parts = email.data.payload?.parts || [];
        let body =
          email.data.payload?.body?.data ||
          parts.find((p) => p.mimeType === "text/plain")?.body?.data ||
          parts.find((p) => p.mimeType === "text/html")?.body?.data ||
          "";

        if (body) {
          body = Buffer.from(body, "base64").toString("utf-8");
        }

        const emailText = `From: ${from}\nSubject: ${subject}\n\nBody:\n${body}`;

        const { object: transaction } = await generateObject({
          model: google("gemini-2.5-flash"),
          schema: transactionSchema,
          prompt: buildAIPrompt() + emailText,
        });

        if (transaction.confidence_score === 0) {
          skippedJunk++;
          if (!dryRun) {
            await prisma.skippedEmail.create({
              data: {
                email_message_id: messageId,
                subject,
                sender: from,
                body_snippet: emailBodySnippet(body),
                ai_reason: `AI classified as non-debit (merchant: ${transaction.merchant || "N/A"})`,
              },
            });
            await gmail.users.messages.modify({
              userId: "me",
              id: messageId,
              requestBody: { removeLabelIds: ["UNREAD"] },
            });
          }
          entries.push({
            email_id: messageId,
            from,
            subject,
            parsed: { ...transaction, date: transaction.date },
            status: "junk_skipped",
          });
          continue;
        }

        const txDate = resolveTransactionDate(transaction.date, body);
        const duplicate = await findDuplicate(
          transaction.amount,
          transaction.merchant,
          txDate
        );

        let needsReview = transaction.confidence_score < 0.8;
        let status: ProcessedEntry["status"] = "saved";

        if (duplicate) {
          needsReview = true;
          status = "duplicate_flagged";
        }

        if (!dryRun) {
          await prisma.transaction.create({
            data: {
              amount: transaction.amount,
              merchant: transaction.merchant,
              date: txDate,
              category: transaction.category,
              is_cc_payment: transaction.is_cc_payment,
              confidence_score: transaction.confidence_score,
              needs_review: needsReview,
              email_message_id: messageId,
              source: "email",
            },
          });

          await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: { removeLabelIds: ["UNREAD"] },
          });
        }

        entries.push({
          email_id: messageId,
          from,
          subject,
          parsed: { ...transaction, date: transaction.date },
          status,
        });

        processed++;
      } catch (err) {
        errors.push(
          `Failed to process email ${msg.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      message: dryRun
        ? `[DRY RUN] Would process ${processed} emails`
        : `Processed ${processed} emails`,
      dry_run: dryRun,
      processed,
      skipped_duplicates: skippedDuplicates,
      skipped_junk: skippedJunk,
      total_emails_found: messages.data.messages.length,
      transactions: entries,
      errors: errors.length > 0 ? errors : undefined,
      query_used: verbose ? searchQuery : undefined,
    });
  } catch (error) {
    console.error("Email processing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process emails", details: message },
      { status: 500 }
    );
  }
}
