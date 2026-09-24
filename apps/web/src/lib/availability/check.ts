/**
 * V-14: "STILL AVAILABLE?", AS PURE SHAPES.
 *
 * One row of `public.availability_checks`, read under the reader's own RLS
 * (only the two parties see it), and the words each state is drawn with. The
 * three answers are a closed list because each one is a fact the platform
 * will count: available now, available from a date, let. "Let" is recorded
 * and not acted on here; closing a let listing is V-48's event.
 */

export type AvailabilityAnswer = "available" | "available_later" | "let";

export type AvailabilityCheck = {
  id: string;
  conversationId: string;
  listingId: string;
  askedAt: string;
  answer: AvailabilityAnswer | null;
  /** `YYYY-MM-DD`, only with `available_later`. */
  availableFrom: string | null;
  answeredAt: string | null;
  /** Whether the reader is the lister, who answers, or the renter, who asked. */
  viewer: "lister" | "asker";
};

const ANSWERS: readonly AvailabilityAnswer[] = ["available", "available_later", "let"];

export function isAvailabilityAnswer(value: unknown): value is AvailabilityAnswer {
  return typeof value === "string" && (ANSWERS as readonly string[]).includes(value);
}

/** A database row as the card's shape, or null when it is not one. */
export function checkFromRow(row: Record<string, unknown> | null | undefined, me: string): AvailabilityCheck | null {
  if (!row) return null;
  const id = typeof row.id === "string" ? row.id : null;
  const conversationId = typeof row.conversation_id === "string" ? row.conversation_id : null;
  const listingId = typeof row.listing_id === "string" ? row.listing_id : null;
  const askedAt = typeof row.asked_at === "string" ? row.asked_at : null;
  if (!id || !conversationId || !listingId || !askedAt) return null;
  const answer = isAvailabilityAnswer(row.answer) ? row.answer : null;
  return {
    id,
    conversationId,
    listingId,
    askedAt,
    answer,
    availableFrom: answer === "available_later" && typeof row.available_from === "string" ? row.available_from : null,
    answeredAt: answer && typeof row.answered_at === "string" ? row.answered_at : null,
    viewer: row.lister_id === me ? "lister" : "asker",
  };
}

/** The earliest and latest dates a "from a later date" answer may name. */
export function laterWindow(todayIso: string): { min: string; max: string } {
  const today = new Date(`${todayIso}T12:00:00Z`);
  const min = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);
  const max = new Date(today.getTime() + 366 * 86_400_000).toISOString().slice(0, 10);
  return { min, max };
}

/** Whether a typed date is one the database will accept for a later answer. */
export function isLaterDate(value: string, todayIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return false;
  const { min, max } = laterWindow(todayIso);
  return value >= min && value <= max;
}
