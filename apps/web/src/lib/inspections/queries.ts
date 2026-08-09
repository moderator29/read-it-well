import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";
import { isOpen, type Inspection, type InspectionState } from "./types";

/**
 * READING INSPECTIONS, FROM BOTH SIDES.
 *
 * The same rows, two questions:
 *
 *   "what have I been asked to show"  the lister's home
 *   "what did I ask to see"           the renter's own list
 *
 * Both go through `public.inspection_requests` under the caller's own RLS,
 * where `inspection_requests_select_party` already limits the answer to rows
 * the caller is a party to. The `eq` below narrows a set the policy has
 * already bounded; it is not what enforces anything.
 *
 * NEITHER READ EVER THROWS UPWARDS. An inspection list is a section of a
 * screen that has other things on it, and a failure to load one must not take
 * a lister's whole dashboard down. It comes back empty with `readFailed` set,
 * which is the same rule the wallet applies to its balance: an empty list and
 * an unreadable one look identical and mean opposite things, so the caller is
 * told which it has.
 */

export type InspectionList = {
  inspections: Inspection[];
  /** Those still waiting on somebody. The count the lister's home leads with. */
  openCount: number;
  readFailed: boolean;
};

const EMPTY: InspectionList = { inspections: [], openCount: 0, readFailed: false };

/** How many to carry on a home screen section. The full list has its own page. */
const HOME_LIMIT = 20;

type Row = {
  id: string;
  listing_id: string;
  requester_id: string;
  lister_id: string;
  conversation_id: string | null;
  state: InspectionState;
  requested_at: string;
  slot_at: string | null;
  note: string | null;
  lister_note: string | null;
  created_at: string;
  responded_at: string | null;
};

const COLUMNS =
  "id, listing_id, requester_id, lister_id, conversation_id, state, requested_at, slot_at, note, lister_note, created_at, responded_at";

/** What a lister has been asked to show. */
export async function readInspectionsForLister(): Promise<InspectionList> {
  return readSide("lister_id");
}

/** What this person has asked to see. */
export async function readInspectionsForRequester(): Promise<InspectionList> {
  return readSide("requester_id");
}

async function readSide(column: "lister_id" | "requester_id"): Promise<InspectionList> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return EMPTY;

  try {
    const { data, error } = await session.supabase
      .from("inspection_requests")
      .select(COLUMNS)
      .eq(column, session.user.id)
      /*
       * Open ones first, then newest.
       *
       * Ordering by `created_at` alone puts a request somebody answered a
       * month ago above one that came in this morning and is still waiting,
       * which is exactly backwards for the surface this feeds. Postgres has no
       * "these two states first" ordering that reads well through PostgREST,
       * so the sort is applied here over a bounded set rather than pretended
       * at in SQL.
       */
      .order("created_at", { ascending: false })
      .limit(HOME_LIMIT * 3);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    const titles = await readListingTitles(
      session.supabase,
      rows.map((row) => row.listing_id),
    );
    /* The OTHER party, whichever side this read is. */
    const names = await readDisplayNames(
      session.supabase,
      rows.map((row) => (column === "lister_id" ? row.requester_id : row.lister_id)),
    );

    const inspections: Inspection[] = rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      listingTitle: titles.get(row.listing_id) ?? null,
      state: row.state,
      requestedAt: row.requested_at,
      slotAt: row.slot_at,
      note: row.note,
      listerNote: row.lister_note,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      conversationId: row.conversation_id,
      counterpartName:
        names.get(column === "lister_id" ? row.requester_id : row.lister_id) ?? null,
    }));

    inspections.sort((a, b) => {
      const openDelta = Number(isOpen(b.state)) - Number(isOpen(a.state));
      if (openDelta !== 0) return openDelta;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return {
      inspections: inspections.slice(0, HOME_LIMIT),
      openCount: inspections.filter((one) => isOpen(one.state)).length,
      readFailed: false,
    };
  } catch {
    return { ...EMPTY, readFailed: true };
  }
}

/** Titles for a set of listing ids, deduplicated, under the caller's RLS. */
async function readListingTitles(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const { data } = await supabase.from("listings").select("id, title").in("id", wanted);
  const out = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; title: string | null }[]) {
    if (typeof row.title === "string" && row.title.trim().length > 0) {
      out.set(row.id, row.title.trim());
    }
  }
  return out;
}

/**
 * The other party's name, from the SOCIAL profile rather than from `profiles`.
 *
 * `public.profiles` is own-row only under RLS, correctly: a lister has no
 * business reading a renter's account record. `public.social_profiles` is the
 * public face somebody has chosen to show, world-readable unless the two have
 * blocked each other, and `display_label` falling back to `handle` is exactly
 * what every other screen on this platform calls a person.
 *
 * A party who has never claimed a handle simply has no name here, and the row
 * says the property instead. That is honest: we have nothing they have
 * published, so we show nothing rather than an account detail they did not
 * choose to share.
 */
async function readDisplayNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(ids)];
  if (wanted.length === 0) return new Map();
  const { data } = await supabase
    .from("social_profiles")
    .select("user_id, display_label, handle")
    .in("user_id", wanted);
  const out = new Map<string, string>();
  for (const row of (data ?? []) as {
    user_id: string;
    display_label: string | null;
    handle: string | null;
  }[]) {
    const name = (row.display_label ?? "").trim() || (row.handle ? `@${row.handle}` : "");
    if (name.length > 0) out.set(row.user_id, name);
  }
  return out;
}

/**
 * Whether this person already has a live request against this listing.
 *
 * Asked by the listing page so the control can say "you have already asked"
 * instead of quietly filing a second identical request, which is the fastest
 * way to make an agent's queue useless.
 */
export async function readOpenInspectionFor(listingId: string): Promise<Inspection | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await session.supabase
      .from("inspection_requests")
      .select(COLUMNS)
      .eq("listing_id", listingId)
      .eq("requester_id", session.user.id)
      .in("state", ["REQUESTED", "PROPOSED", "CONFIRMED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as Row;
    return {
      id: row.id,
      listingId: row.listing_id,
      listingTitle: null,
      state: row.state,
      requestedAt: row.requested_at,
      slotAt: row.slot_at,
      note: row.note,
      listerNote: row.lister_note,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      conversationId: row.conversation_id,
      counterpartName: null,
    };
  } catch {
    /* The listing page renders whatever happens here. Not knowing whether
       there is an existing request is survivable; failing the page is not. */
    return null;
  }
}
