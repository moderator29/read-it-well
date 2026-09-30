"use server";

/**
 * THE HOST'S CALENDAR SYNC WRITES (C2, 30 September 2026).
 *
 * The tables (`calendar_feeds`, `calendar_imports`) arrive with the
 * migration `20260930084937_host_c2_calendar_sync_feeds_out_and_imports_in.sql`
 * (applied 30 September 2026).
 * Until the lead applies it every write here answers with the sentence
 * `SYNC_NOT_READY`, never a fault: a missing table is PostgREST's PGRST205
 * or Postgres's 42P01.
 *
 * Every write is the caller's own client and the policies decide ownership
 * (`private.owns_calendar_target`). The links a host pastes are checked
 * against the list of sites in `ical.ts` before they are stored, because the
 * scheduled job fetches them from our server.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { checkFeedUrl } from "./ical";

const SYNC_NOT_READY =
  "Calendar sync is not switched on yet. Nothing about your nights changed; set them by hand until it is.";
const SERVICE_DOWN = "We could not save that just now. Nothing changed, so try again in a moment.";
const NOT_YOURS = "That room is not on your account. Refresh the calendar and pick one of your own rooms.";

type Untyped = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => { single: () => PromiseLike<{ data: unknown; error: DbError | null }> };
    };
    delete: () => { eq: (col: string, v: string) => PromiseLike<{ error: DbError | null }> };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, v: string) => { select: (cols: string) => PromiseLike<{ data: unknown; error: DbError | null }> };
    };
  };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: DbError | null }>;
};
type DbError = { code?: string | null; message?: string | null };

function missing(error: DbError | null): boolean {
  return Boolean(error && (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST202"));
}

async function client(): Promise<{ ok: true; db: Untyped } | { ok: false; result: ActionResult<never> }> {
  const s = await resolveSession();
  if (s.state === "unconfigured") return { ok: false, result: fail(NOT_CONFIGURED_MESSAGE) };
  if (s.state === "signed-out") return { ok: false, result: fail(SIGNED_OUT_MESSAGE) };
  return { ok: true, db: s.supabase as unknown as Untyped };
}

function refresh(): void {
  revalidatePath("/host/calendar");
}

const roomOnly = z.object({ roomTypeId: z.uuid("That room could not be identified.") });

/**
 * Make (or remake) the room's export link. Remaking deletes the old row
 * first, so the old link stops working at once: that is the point of the
 * button, for a link that was pasted somewhere it should not have been.
 */
export async function makeCalendarFeed(input: unknown): Promise<ActionResult<{ token: string }>> {
  const parsed = validate(roomOnly.extend({ fresh: z.boolean().optional() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  if (parsed.data.fresh) {
    const { error } = await got.db.from("calendar_feeds").delete().eq("room_type_id", parsed.data.roomTypeId);
    if (missing(error)) return fail(SYNC_NOT_READY);
    if (error) return fail(SERVICE_DOWN);
  }
  const { data, error } = await got.db
    .from("calendar_feeds")
    .insert({ room_type_id: parsed.data.roomTypeId })
    .select("token")
    .single();
  if (missing(error)) return fail(SYNC_NOT_READY);
  if (error?.code === "23505") return fail("This room already has a link. Refresh to see it.");
  if (error?.code === "42501") return fail(NOT_YOURS);
  if (error || !data) return fail(SERVICE_DOWN);
  refresh();
  return ok({ token: (data as { token: string }).token });
}

const importSchema = z.object({
  roomTypeId: z.uuid("That room could not be identified."),
  source: z.enum(["airbnb", "booking_com", "other"], "Pick the site this calendar comes from."),
  url: z.string().trim().min(1, "Paste the calendar link.").max(2000),
});

/** Link another site's calendar to a room. The first pull happens on the next run. */
export async function addCalendarImport(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(importSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const checked = checkFeedUrl(parsed.data.url);
  if (!checked.ok) return fail(checked.reason, { url: checked.reason });
  const got = await client();
  if (!got.ok) return got.result;
  const { error } = await got.db
    .from("calendar_imports")
    .insert({ room_type_id: parsed.data.roomTypeId, source: parsed.data.source, url: checked.url })
    .select("id")
    .single();
  if (missing(error)) return fail(SYNC_NOT_READY);
  if (error?.code === "23505") return fail("That calendar is already linked to this room.", { url: "Already linked." });
  if (error?.code === "23514") return fail("A room can have up to five linked calendars. Remove one first.");
  if (error?.code === "42501") return fail(NOT_YOURS);
  if (error) return fail(SERVICE_DOWN);
  refresh();
  return ok(null);
}

const idOnly = z.object({ importId: z.uuid("That calendar could not be identified.") });

/** Unlink a calendar. Every night it closed on Vallo opens again. */
export async function removeCalendarImport(input: unknown): Promise<ActionResult<{ released: number }>> {
  const parsed = validate(idOnly, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  const { data, error } = await got.db.rpc("remove_calendar_import", { p_import: parsed.data.importId });
  if (missing(error)) return fail(SYNC_NOT_READY);
  if (error) return fail(SERVICE_DOWN);
  const result = (data ?? {}) as { status?: string; released?: number };
  if (result.status !== "ok") return fail(NOT_YOURS);
  refresh();
  revalidatePath("/stays");
  return ok({ released: Number(result.released ?? 0) });
}

/** Pause or resume one linked calendar. A paused one keeps its nights as they are. */
export async function setCalendarImportEnabled(input: unknown): Promise<ActionResult<null>> {
  const parsed = validate(idOnly.extend({ enabled: z.boolean() }), input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const got = await client();
  if (!got.ok) return got.result;
  const { data, error } = await got.db
    .from("calendar_imports")
    .update({ enabled: parsed.data.enabled })
    .eq("id", parsed.data.importId)
    .select("id");
  if (missing(error)) return fail(SYNC_NOT_READY);
  if (error) return fail(SERVICE_DOWN);
  if (!Array.isArray(data) || data.length === 0) return fail(NOT_YOURS);
  refresh();
  return ok(null);
}
