import "server-only";

import { resolveSession } from "../actions/session";
import { getListingRepository } from "../listings/repository";
import { loadListingsByIds } from "../listings/supabase-repository";
import type { Listing } from "../listings/types";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { normaliseSaves, type LocalSave } from "./keys";
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
