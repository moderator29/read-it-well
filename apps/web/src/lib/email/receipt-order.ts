import type { ReceiptModel } from "@/components/app/money/receipt-model";

/**
 * The receipt's strings in reading order, and an in-order search, shared by
 * the email's unit test and the sheet's browser test so both hold the two
 * renderings to one sequence (north star 16.5: the receipt email matches the
 * on-screen receipt exactly).
 */
export function receiptSequence(model: ReceiptModel): string[] {
  return [
    model.kind,
    model.title,
    ...(model.place ? [model.place] : []),
    model.figureLabel,
    model.figure,
    ...[...model.facts, ...model.lines].flatMap((row) => [row.label, row.value]),
    model.total.label,
    model.total.value,
    ...model.confirmations.flatMap((row) => [row.label, row.state]),
    ...(model.reference ? [model.reference.label, model.reference.value] : []),
    model.note,
  ];
}

/** The needles that are missing, each searched for after the one before. */
export function inOrder(haystack: string, needles: readonly string[]): string[] {
  const missing: string[] = [];
  let at = 0;
  for (const needle of needles) {
    const found = haystack.indexOf(needle, at);
    if (found < 0) missing.push(needle);
    else at = found + needle.length;
  }
  return missing;
}

/** An email's visible words, decoded, whitespace collapsed. */
export function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<span style="display:none[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&middot;/g, "\u00B7")
    .replace(/&nbsp;|&#\d+;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
