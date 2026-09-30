/**
 * LISTING REVIEW REASON CODES (C8).
 *
 * Two reviewers used to write the same rejection two ways, the lister got
 * prose of uneven quality, and nobody could count why listings fail. A
 * reviewer now picks one or more codes as chips; each carries ONE
 * lister-facing sentence from this library, and an optional free note goes
 * under them. The sentences reach the lister as a checklist (the notes the
 * listing already carries), and the codes are kept on the audit row
 * (`listing.review`, `detail.reasons`) so the analytics desk can count them.
 *
 * THE WORDING IS LISTER-FACING COPY AND THE FOUNDER'S DECISION (RECS_C C8).
 * These are drafts in plain English; change the sentence here, never the code.
 */
export const REVIEW_REASONS = [
  { code: "photos_unclear", label: "Photos too few or unclear", sentence: "Add at least five clear, well-lit photos, including every bedroom, the kitchen and a bathroom." },
  { code: "price_fee_missing", label: "Price missing a fee", sentence: "State every fee a tenant or guest pays on top of the price (agency, legal, caution, service), or say there are none." },
  { code: "address_mismatch", label: "Address does not match", sentence: "The address does not match the map pin or the photos. Correct the address or move the pin to the property." },
  { code: "photos_elsewhere", label: "Photos seen on another listing", sentence: "Some photos also appear on another listing. Use photos you took of this property." },
  { code: "description_short", label: "Description too short", sentence: "Describe the property in a few more sentences: the rooms, the water and power supply, and the street." },
  { code: "wrong_category", label: "Wrong category", sentence: "This listing is in the wrong category. Choose the type that matches the property." },
] as const;

export type ReviewReasonCode = (typeof REVIEW_REASONS)[number]["code"];

export const REVIEW_REASON_CODES = REVIEW_REASONS.map((r) => r.code) as readonly ReviewReasonCode[];

export function isReviewReasonCode(value: unknown): value is ReviewReasonCode {
  return typeof value === "string" && (REVIEW_REASON_CODES as readonly string[]).includes(value);
}

/**
 * The note the lister reads: each chosen reason's sentence as a checklist
 * line, then the reviewer's own words. Unknown codes are dropped; order
 * follows the library, so two reviewers choosing the same reasons send the
 * same text.
 */
export function composeReviewNote(codes: readonly string[], note: string): string {
  const chosen = REVIEW_REASONS.filter((r) => codes.includes(r.code));
  const lines = chosen.map((r) => `- ${r.sentence}`);
  const free = note.trim();
  return [...lines, ...(free ? [lines.length > 0 ? "" : null, free].filter((x) => x !== null) : [])].join("\n").trim();
}
