import type { Dictionary } from "@vallo/i18n/core";
import type { RefundRequestRow, RefundRow } from "./rows";

/**
 * ONE REFUND ROW AS THE GUEST READS IT, pure, so the rule about which refund
 * has landed is proved in `refund-lines.test.ts` rather than trusted to a
 * component (the vitest config cannot import a `.tsx` file).
 *
 * `tone` says how the sentence should feel, and is NOT a state: Paystack
 * starting a refund on time is good news (`success`) while the money is still
 * on its way to the card. Whether the money has reached the card is `landed`,
 * and it is true in exactly one case: `refund.processed` arrived and stamped
 * `processor_settled_at`. The sheet's filled "done" mark reads `landed`, never
 * `tone`, so a refund that has only been started can never be drawn as one
 * that went back (auditor A5).
 */
export type RefundLine = {
  id: string;
  amount: string | null;
  /** The refund in kobo, for a refund line; null for a decision or an ask. */
  refundMinor: number | null;
  retained: string | null;
  sentence: string;
  tone: "success" | "attention" | "error" | "neutral";
  /** Paystack reported the refund processed, with its settled date: the money reached the card. */
  landed: boolean;
};

type RefundCopy = Dictionary["afterTheGate"]["refund"];

/** A refund row in words. `money` and `date` are the caller's formatters. */
export function refundLineFor(
  row: RefundRow,
  request: RefundRequestRow | null,
  copy: RefundCopy,
  money: (minor: number) => string,
  date: (value: string, withTime?: boolean) => string,
): RefundLine {
  const base = {
    id: row.id,
    amount: copy.amount.replace("{amount}", money(row.refundMinor)),
    refundMinor: row.refundMinor,
    retained: row.retainedMinor > 0 ? copy.retained.replace("{amount}", money(row.retainedMinor)) : null,
    landed: false,
  };
  if (row.refundMinor <= 0 || row.processorStatus === "not_needed") return { ...base, sentence: copy.nothingOwed, tone: "neutral" };
  if (row.processorStatus === "processed" && row.settledAt) {
    return { ...base, sentence: copy.landed.replace("{date}", date(row.settledAt, true)), tone: "success", landed: true };
  }
  if (!row.submittedAt || row.processorStatus === "pending" || row.processorStatus === "failed") {
    return { ...base, sentence: copy.sending, tone: "attention" };
  }
  const answers = request && Date.parse(row.createdAt) >= Date.parse(request.requestedAt) ? request : null;
  const late = answers?.dueBy ? Date.parse(row.submittedAt) > Date.parse(answers.dueBy) : false;
  return late && answers?.dueBy
    ? {
        ...base,
        sentence: copy.initiatedLate.replace("{date}", date(row.submittedAt, true)).replace("{due}", date(answers.dueBy)),
        tone: "attention",
      }
    : { ...base, sentence: copy.initiated.replace("{date}", date(row.submittedAt, true)), tone: "success" };
}

/**
 * The shape beside a line: the filled circle only for money that reached the
 * card, the hollow one for a refund on its way or an ask still open, nothing
 * for a line that is not a refund in motion (nothing owed, a decline).
 */
export function refundMark(line: Pick<RefundLine, "tone" | "landed">): "done" | "waiting" | null {
  if (line.landed) return "done";
  if (line.tone === "neutral") return null;
  return "waiting";
}

/**
 * The line a sheet may lead with as its figure: the only refund line, and
 * only when it returns something. "N0.00 back" is not a headline; the row
 * beneath still says nothing was owed.
 */
export function refundLead(lines: readonly RefundLine[]): RefundLine | null {
  const only = lines.length === 1 ? lines[0] : undefined;
  return only && only.amount && (only.refundMinor ?? 0) > 0 ? only : null;
}
