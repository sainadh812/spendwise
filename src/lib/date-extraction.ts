import { emailBodyToText } from "@/lib/email";

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export function extractDateFromEmail(emailBody: string): Date | null {
  const text = emailBodyToText(emailBody);
  const patterns = [
    /(\d{1,2})[\s-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,.\s-]*(\d{4})/gi,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/g,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2})\b/g,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;

    if (/[A-Za-z]/.test(match[2])) {
      const day = parseInt(match[1], 10);
      const month = MONTH_MAP[match[2].toLowerCase()];
      const year = parseInt(match[3], 10);
      if (month !== undefined && day >= 1 && day <= 31) {
        return new Date(Date.UTC(year, month, day));
      }
    } else {
      const a = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      let c = parseInt(match[3], 10);
      if (c < 100) c += 2000;
      if (a >= 1 && a <= 31 && b >= 1 && b <= 12) {
        return new Date(Date.UTC(c, b - 1, a));
      }
    }
  }

  return null;
}

export function resolveTransactionDate(aiDateStr: string, emailBody: string): Date {
  const extractedDate = extractDateFromEmail(emailBody);
  const normalizedAiStr = aiDateStr.includes("T") && !aiDateStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(aiDateStr)
    ? aiDateStr + "Z"
    : aiDateStr;
  const aiDate = new Date(normalizedAiStr);
  const aiValid = !isNaN(aiDate.getTime());

  if (extractedDate && aiValid) {
    const diffMs = Math.abs(extractedDate.getTime() - aiDate.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 1) {
      return extractedDate;
    }
    return aiDate;
  }

  if (extractedDate) return extractedDate;
  if (aiValid) return aiDate;
  return new Date();
}
