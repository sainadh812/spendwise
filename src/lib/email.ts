import { convert } from "html-to-text";

export function emailBodyToText(body: string): string {
  return convert(body, { wordwrap: false });
}

export function emailBodySnippet(body: string, maxLength = 500): string {
  return emailBodyToText(body).slice(0, maxLength);
}
