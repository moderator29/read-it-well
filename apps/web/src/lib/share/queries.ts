import "server-only";

import { cache } from "react";
import { photoUrl } from "../listings/supabase-repository";
import { accommodationPhotoUrl } from "../stays/photos";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { createAdminClient } from "../supabase/admin";
import { doorCardFromRow, isDoorKey, isPreviewAgent, type DoorRead, type DoorRow } from "./door";

/**
 * READING A DOOR, THROUGH THE CALLER'S OWN CLIENT.
 *
 * A stranger reading a door is `anon`, and `public.share_door` is the one
 * function `anon` may execute against the token table. The service-role
 * client is never used here: a read that only worked with a key nobody
 * outside the server holds would be a page rendering under a permission its
 * reader does not have, and it would keep working if the function's grant
 * were ever tightened. Read the way a stranger reads, and fail the way a
 * stranger would.
 *
 * `share_door` is not in the generated `database.types.ts` yet, for the
 * reason `lib/price-check/rpc.ts` gives in full (the generated file is a
 * shared artefact and regenerating it here would drag every other worker's
 * schema into this commit). The cast is local and narrow: one function name,
 * its one argument, and the row type the migration declares.
 */

type Db = Awaited<ReturnType<typeof createClient>>;

type DoorRpc = (
  fn: "share_door",
  args: { p_token: string },
) => PromiseLike<{ data: unknown; error: unknown }>;

type NoteRpc = (
  fn: "note_share_door_open",
  args: { p_token: string; p_viewer: string | null },
) => PromiseLike<{ data: unknown; error: unknown }>;

async function client(): Promise<Db | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await createClient();
  } catch {
    return null;
  }
}

/**
 * One door, by token or (while the board flag is on) by listing code.
 *
 * NULL-SHAPED ANSWERS ARE KEPT APART. "No such door" and "we could not ask"
 * are different facts and the page says different things for them: telling a
 * stranger a link is dead because our database blinked would be a claim
 * about somebody else's link that nobody checked.
 *
 * `cache` so the page, its metadata and its image share one read per request.
 */
export const readDoor = cache(async function readDoor(key: string): Promise<DoorRead> {
  if (!isDoorKey(key)) return { state: "missing" };
  const supabase = await client();
  if (!supabase) return { state: "unreachable" };
  try {
    const rpc = supabase.rpc.bind(supabase) as unknown as DoorRpc;
    const { data, error } = await rpc("share_door", { p_token: key.trim() });
    if (error) return { state: "unreachable" };
    const first = Array.isArray(data) ? (data[0] as DoorRow | undefined) : undefined;
    const card = doorCardFromRow(first ?? null);
    return card === null ? { state: "missing" } : { state: "open", card };
  } catch {
    return { state: "unreachable" };
  }
});

/**
 * Count one opening. A bare counter; nothing about the reader is recorded, and
 * the number is never displayed to anybody as a claim.
 *
 * THROUGH THE SERVICE ROLE, BECAUSE ONLY THE SERVER MAY COUNT. The function is
 * closed to every client role (migration 20260924120700), so a stranger cannot
 * inflate a door by calling it in a loop; the page render is the one counter.
 * Where the service key is absent (a local build) nothing is counted. Best
 * effort: a counter that failed is not worth a broken page.
 */
export async function noteDoorOpen(key: string, viewer: { userAgent: string | null; userId: string | null }): Promise<void> {
  if (!isDoorKey(key)) return;
  /* An unfurl is not an open. The sharer's own view is skipped in SQL. */
  if (isPreviewAgent(viewer.userAgent)) return;
  try {
    const admin = createAdminClient();
    const rpc = admin.rpc.bind(admin) as unknown as NoteRpc;
    await rpc("note_share_door_open", { p_token: key.trim(), p_viewer: viewer.userId });
  } catch {
    /* The card still renders. */
  }
}

/** The public URL of the card's one photograph, or null. */
export function doorPhotoUrl(path: string | null): string | null {
  return path === null ? null : photoUrl(path);
}

/** The same for a stay, whose photographs live in their own bucket. */
export function stayDoorPhotoUrl(path: string | null): string | null {
  return path === null ? null : accommodationPhotoUrl(path);
}
