import "server-only";

import type { VisitMode } from "../inspections/visit";

/**
 * BOOKING AN OPEN SLOT WITH A VISIT MODE, AGAINST EITHER DATABASE.
 *
 * `public.book_viewing_slot` writes the CONFIRMED row in one transaction and
 * notifies both sides from its insert trigger. Until the pending migration
 * `supabase/migrations/pending/visit_mode_on_booking.sql` is applied it takes
 * three arguments and every booking it writes is in person (the column's
 * default). After it, a fourth, `p_mode`, writes the mode in the same insert,
 * so the lister's "Viewing booked" notification can say it is a video visit.
 *
 * So: an in-person booking calls with three arguments, which both versions
 * answer. A video booking calls with four; if PostgREST answers that no such
 * function exists (PGRST202, the live database before the migration), it
 * books with three and then writes the mode onto the row it just booked,
 * under the caller's own RLS (the requester may update their own row, and
 * nothing in `private.inspection_columns_belong` refuses the column today).
 *
 * Kept out of the "use server" module because it is not an action: it is
 * handed the caller's own client by one.
 */

export type BookRpc = (
  fn: "book_viewing_slot",
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { code?: string; hint?: string; message?: string } | null }>;

export type ModeWriter = (id: string, mode: VisitMode) => PromiseLike<{ error: unknown }>;

export type BookAnswer = { data: unknown; error: { code?: string; hint?: string; message?: string } | null };

/** True for PostgREST's "no function with these arguments" answer. */
export function isMissingSignature(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  return /could not find the function/i.test(error.message ?? "");
}

export async function bookWithMode(
  rpc: BookRpc,
  writeMode: ModeWriter,
  args: { p_listing: string; p_slot: string; p_note: string | null },
  mode: VisitMode,
): Promise<BookAnswer> {
  if (mode === "in_person") return rpc("book_viewing_slot", args);

  const withMode = await rpc("book_viewing_slot", { ...args, p_mode: mode });
  if (!isMissingSignature(withMode.error)) return withMode;

  const booked = await rpc("book_viewing_slot", args);
  if (booked.error || typeof booked.data !== "string") return booked;
  /* The booking stands whatever happens here: a failed mode write leaves an
     in-person row, which the status screen then says, rather than a lost
     booking. */
  await writeMode(booked.data, mode);
  return booked;
}
