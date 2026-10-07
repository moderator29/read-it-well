import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { pointSelect } from "../supabase/public-point";
import { resolveSession } from "../actions/session";
import { getListingRepository } from "../listings/repository";
import { loadListingsByIds } from "../listings/supabase-repository";
import type { Listing } from "../listings/types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { staysClient } from "../stays/db";
import type { CatalogueEntryRow, StaySearchRow } from "../stays/types";
import type { SavedPlaceKind } from "./db";
import { normaliseSaves, type LocalSave } from "./keys";
import { undatedSearchRow } from "./places";
import type { SavedEntry } from "./types";

/**
 * Read side of the shortlist.
 *
 * Two sources, one list. Rows in public.saved_items are the account's truth
 * and come back through its own RLS-bound client. Device saves are handed in
 * by the client (localStorage, mirrored into the cookie the page reads), which
 * is the only way a catalogue listing can be on a shortlist at all. Platform
 * listings that were hearted while signed out sit in the device half too, so
 * they still render, and they migrate into rows the moment the account exists.
 *
 * Both halves are resolved through the listing repository, so a saved card is
 * the same card discovery shows. Failure degrades to a shorter list, never to
 * an error screen.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How many saved rows one page reads. */
const ROW_LIMIT = 100;

function toSeconds(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

/** Saved rows for the signed-in account, newest first. Empty for everyone else. */
async function readSavedRows(): Promise<{ listingId: string; savedAt: number }[]> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return [];
    const { data, error } = await session.supabase
      .from("saved_items")
      .select("listing_id, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT);
    await reportReadError("read.saved.readSavedRows", error);
    if (error || !data) return [];
    return data.map((row) => ({
      listingId: row.listing_id,
      savedAt: toSeconds(row.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * The shortlist, newest first.
 *
 * `local` is the device half passed in by the client. Ids that resolve to
 * nothing (a listing withdrawn, a catalogue entry retired) are dropped rather
 * than rendered as a broken card.
 */
const SAVED_CARD_COLUMNS =
  "id, entity_kind, entity_id, title, area, city, state_code, kind, source, verified, is_demo, featured, headline_price_minor, headline_price_period, price_band, max_sleeps, cover_path, latitude, longitude, rating_avg, rating_count, has_breakfast, has_free_cancellation, room_categories, amenity_codes";

export async function getSavedListings(local: LocalSave[] = []): Promise<SavedEntry[]> {
  const localSaves = normaliseSaves(local);
  const rows = await readSavedRows();

  const savedAtById = new Map<string, number>();
  const modeById = new Map<string, "db" | "local">();
  for (const row of rows) {
    savedAtById.set(row.listingId, row.savedAt);
    modeById.set(row.listingId, "db");
  }
  for (const save of localSaves) {
    if (modeById.has(save.id)) continue;
    savedAtById.set(save.id, save.savedAt);
    modeById.set(save.id, "local");
  }
  if (savedAtById.size === 0) return [];

  const ids = [...savedAtById.keys()];
  const platformIds = ids.filter((id) => UUID_RE.test(id));
  const catalogueIds = ids.filter((id) => !UUID_RE.test(id));

  // Platform listings resolve in one query; catalogue entries resolve in
  // memory. Neither path loops over the network.
  const listings = new Map<string, Listing>();
  if (platformIds.length > 0 && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      for (const [id, listing] of await loadListingsByIds(supabase, platformIds)) {
        listings.set(id, listing);
      }
    } catch {
      // Leaves the platform half unresolved; the catalogue half still renders.
    }
  }
  if (catalogueIds.length > 0) {
    const repo = getListingRepository();
    const resolved = await Promise.all(catalogueIds.map((id) => repo.byId(id)));
    resolved.forEach((listing, i) => {
      const id = catalogueIds[i];
      if (listing && id) listings.set(id, listing);
    });
  }

  const entries: SavedEntry[] = [];
  for (const id of ids) {
    const listing = listings.get(id);
    if (!listing) continue;
    entries.push({
      listing,
      savedAt: savedAtById.get(id) ?? 0,
      mode: modeById.get(id) ?? "local",
    });
  }
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}

/* ------------------------------------------------------ the other two shelves */

/**
 * ONE SAVED STAY OR RESTAURANT, RESOLVED TO SOMETHING RENDERABLE.
 *
 * The shortlist has three shelves and until now the page could only draw one.
 * `saved_items` holds the Property side and `getSavedListings` above reads it;
 * `saved_places` holds all three kinds and had an action layer with no reader
 * at all, so a person could heart a hotel and then find nothing on /saved.
 *
 * The row handed back is a `StaySearchRow` on purpose rather than a fourth
 * card shape. That is what `stays_search` answers with, what the stays shelf
 * renders and what `stayCardFromRow` already turns into a card, so a saved
 * stay is drawn by exactly the component that draws a searched one. A
 * shortlist asks no dates, so the dated half of the row is null; see
 * `undatedSearchRow`.
 */
export type SavedPlaceEntry = {
  kind: SavedPlaceKind;
  /** Epoch seconds, so this list orders beside `SavedEntry` with no conversion. */
  savedAt: number;
  row: StaySearchRow;
};

/**
 * The account's saved stays and restaurants, newest first.
 *
 * LISTING SAVES ARE DELIBERATELY NOT READ HERE. They are `saved_items`, which
 * `getSavedListings` already resolves through the listing repository along
 * with the device half a signed-out visitor built up. Reading the listing kind
 * from `saved_places` too would draw some property twice and neither shelf
 * would be able to say which heart it was.
 *
 * Empty for a signed-out reader, an unconfigured platform and any read
 * failure, for the same reason the listing half degrades: a shortlist is a
 * section of a page with other things on it. An id that resolves to nothing
 * (a hotel withdrawn, a restaurant closed) is dropped rather than drawn as a
 * broken card, which is the behaviour M13 designed the missing foreign key
 * around.
 */
export async function getSavedPlaces(): Promise<SavedPlaceEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return [];

    const { data: saves, error } = await session.supabase
      .from("saved_places")
      .select("entity_kind, entity_id, created_at")
      .eq("user_id", session.user.id)
      .in("entity_kind", ["accommodation", "restaurant"])
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT);
    await reportReadError("read.saved.getSavedPlaces", error);
    if (error || !saves) return [];

    const wanted = saves.filter((save) => UUID_RE.test(save.entity_id));
    if (wanted.length === 0) return [];

    /* One read for every shelf. `catalogue_entries` is the same projection
       the stays search answers from, so a saved card and a searched card
       cannot disagree about a title, a cover or a rating. */
    const stays = await staysClient();
    const { data: entries } = await stays
      .from("catalogue_entries")
      /* Named columns, never "*": the exact point is not granted to members,
         and a card only needs the public one. */
      .select(await pointSelect(stays, SAVED_CARD_COLUMNS))
      .in(
        "entity_id",
        wanted.map((save) => save.entity_id),
      );

    const byKey = new Map<string, CatalogueEntryRow>();
    for (const entry of (entries ?? []) as CatalogueEntryRow[]) {
      byKey.set(`${entry.entity_kind}:${entry.entity_id}`, entry);
    }

    const out: SavedPlaceEntry[] = [];
    for (const save of wanted) {
      const entry = byKey.get(`${save.entity_kind}:${save.entity_id}`);
      if (!entry) continue;
      out.push({
        kind: save.entity_kind as SavedPlaceKind,
        savedAt: toSeconds(save.created_at),
        row: undatedSearchRow(entry),
      });
    }
    return out.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}
