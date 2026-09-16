import type { Dictionary } from "@vallo/i18n";

/**
 * Placeholder filling for dictionary templates.
 *
 * The dictionaries carry whole sentences with `{name}` placeholders, for
 * example "{count} waiting", so a translator controls word order rather than a
 * component gluing English fragments together. This is the only thing that
 * substitutes them inside the console.
 *
 * The agent surfaces keep their own copy of these four lines: the two areas are
 * owned separately, and neither should reach into the other.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/** The console's copy, sliced the way the queue pages consume it. */
export type AdminCopy = Dictionary["admin"];
export type AdminCommon = AdminCopy["common"];

/* ---------------------------------------------------- the column vocabulary */

/**
 * What a column's raw value is called, per column, in English.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS KEYED BY COLUMN AND NOT JUST BY VALUE.
 *
 * `t.admin.common.status` is one flat map keyed by bare value, and the values
 * collide across columns. `PENDING` in that map reads "Requested", which is
 * right for a booking and wrong for a wallet entry, where it means the money
 * has not settled. `pending` reads "Awaiting reply", which is right for a
 * support ticket and wrong for an identity document nobody has looked at yet.
 * A value only means something inside its own column, so the lookup is keyed by
 * both. That is why `adminUi.columnLabel` exists and why four console surfaces
 * could not simply drop their explicit `label` and let `statusLabel` answer.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS HERE AND NOT IN THE DICTIONARY.
 *
 * It belongs in `t.admin.common.columns` and it is going there:
 * `columnLabel` reads that branch FIRST and only falls back to this, so the
 * day the keys land in all four languages this constant stops being consulted
 * without anybody editing a call site. `packages/i18n` is another owner's, so
 * the English is staged here and the exact keys are listed in the sprint
 * report for translation.
 *
 * It is better than the humanising fallback underneath it, which is the only
 * reason it is worth staging at all: that fallback turns
 * `off_platform_payment` into "Off platform payment", and an operator triaging
 * reports wants "Asked to pay outside Vallo". The three tiers in order are the
 * dictionary, then this, then a readable version of the column.
 */
export const ADMIN_COLUMN_WORDS: Record<string, Record<string, string>> = {
  /** `wallet_entry_status`. NOT the booking words: PENDING here is money in flight. */
  walletEntryStatus: {
    PENDING: "Not settled yet",
    COMPLETED: "Settled",
    FAILED: "Failed",
    REVERSED: "Reversed",
  },

  /** `wallet_entry_kind`. The operator's names for the nine movements. */
  walletEntryKind: {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    payment: "Payment",
    refund: "Refund",
    transfer_in: "Transfer received",
    transfer_out: "Transfer sent",
    /* The three escrow kinds describe where the money is without claiming who
       is holding it, for the reason `lib/legal/terms.tsx` sets out in bold. */
    escrow_hold: "On hold",
    escrow_release: "Hold released",
    escrow_refund: "Hold returned",
  },

  /** `document_review_status`. A document nobody has read is not "awaiting reply". */
  kycReview: {
    pending: "Not reviewed yet",
    approved: "Approved",
    rejected: "Not accepted",
  },

  /**
   * `reports.target_type`, which is a text column rather than an enum and
   * carries three values in practice: `listing` from `lib/reports/actions.ts`
   * and `POST` and `SOCIAL_PROFILE` from `lib/social/posts-actions.ts`. The
   * case difference is the schema's, not a typo.
   */
  reportTarget: {
    listing: "A listing",
    POST: "A post",
    SOCIAL_PROFILE: "A profile",
  },

  /**
   * `reports.category`, from `REPORT_CATEGORIES` in `lib/reports/schema.ts`.
   * The words are shortened from `REPORT_CATEGORY_COPY`, which is written for
   * the person filing ("Asked me to pay outside Vallo") rather than for the
   * operator reading a chip on a queue.
   */
  reportCategory: {
    off_platform_payment: "Asked to pay outside Vallo",
    scam: "Looks like a scam",
    unsafe: "Unsafe or threatening",
    not_as_described: "Not as described",
    unavailable: "Not actually available",
    offensive: "Offensive",
    duplicate: "Duplicate",
    other: "Something else",
  },
};
