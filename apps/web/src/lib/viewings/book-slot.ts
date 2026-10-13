import "server-only";

import type { VisitMode } from "../inspections/visit";

/**
 * BOOKING AN OPEN SLOT WITH A VISIT MODE, AGAINST EITHER DATABASE.
 *
 * `public.book_viewing_slot` writes the CONFIRMED row in one transaction and
 * notifies both sides from its insert trigger; every booking it writes is in
 * person. `public.book_viewing_slot_mode` (migration
 * `visit_mode_on_booking_notices_and_calls`) takes the mode as a fourth
 * argument and writes it in the same insert, so the lister's "Viewing booked"
 * notification can say it is a video visit. The three-argument function
 * passes through to it, so there is one booking rule.
 *
 * So: an in-person booking calls `book_viewing_slot`. A video booking calls
 * `book_viewing_slot_mode`; if PostgREST answers that no such function exists
 * (PGRST202, a database before the migration), it books in person and then
 * writes the mode onto the row it just booked, under the caller's own RLS
 * (the requester may update their own row's mode).
 *
 * Kept out of the "use server" module because it is not an action: it is
 * handed the caller's own client by one.
 */

export type BookRpc = (
  fn: "book_viewing_slot" | "book_viewing_slot_mode",
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

  const withMode = await rpc("book_viewing_slot_mode", { ...args, p_mode: mode });
  if (!isMissingSignature(withMode.error)) return withMode;

  const booked = await rpc("book_viewing_slot", args);
  if (booked.error || typeof booked.data !== "string") return booked;
  /* The booking stands whatever happens here: a failed mode write leaves an
     in-person row, which the status screen then says, rather than a lost
     booking. */
  await writeMode(booked.data, mode);
  return booked;
}
