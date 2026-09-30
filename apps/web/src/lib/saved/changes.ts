/**
 * CHANGES ON THINGS YOU SAVED (recommendation B13, 30 September 2026).
 *
 * `public.listing_changes` (migration
 * `20260930104610_m1_b11_b13_severity_and_saved_changes`) records a listing's price moves,
 * its availability going or coming back, and new viewing windows, readable
 * only by the people who saved that listing. Saved reads the last 30 days of
 * them for its cards; each card shows one muted line for the newest change
 * since the person last opened Saved.
 *
 * DEGRADES TO NOTHING. Until the migration is applied the relation does not
 * exist, the read fails, and this returns no changes: Saved draws no change
 * lines (the phone's own shelf check, ShelfSync, still reports the price
 * moves it can see). No invented change is ever drawn.
 *
 * The read is a server function of a client; `changeLine` is pure.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, type Locale } from "@vallo/i18n/core";

export type SavedChange =
  | { kind: "price"; at: string; wasMinor: number; nowMinor: number }
  | { kind: "availability"; at: string; available: boolean }
  | { kind: "viewing_windows"; at: string };

export type SavedChangeCopy = {
  priceDown: string;
  priceUp: string;
  gone: string;
  back: string;
  windows: string;
};

const WINDOW_DAYS = 30;

type Row = {
  listing_id?: unknown;
  change?: unknown;
  old_minor?: unknown;
  new_minor?: unknown;
  available?: unknown;
  changed_at?: unknown;
};

/** Pure: fold rows into changes per listing, newest first. Malformed rows are skipped. */
export function changesFromRows(rows: readonly Row[] | null | undefined): Map<string, SavedChange[]> {
  const out = new Map<string, SavedChange[]>();
  for (const row of rows ?? []) {
    const id = typeof row.listing_id === "string" ? row.listing_id : null;
    const at = typeof row.changed_at === "string" ? row.changed_at : null;
    if (!id || !at) continue;
    let change: SavedChange | null = null;
    if (row.change === "price") {
      const was = Number(row.old_minor);
      const now = Number(row.new_minor);
      if (Number.isFinite(was) && Number.isFinite(now) && was > 0 && now > 0 && was !== now) {
        change = { kind: "price", at, wasMinor: was, nowMinor: now };
      }
    } else if (row.change === "availability" && typeof row.available === "boolean") {
      change = { kind: "availability", at, available: row.available };
    } else if (row.change === "viewing_windows") {
      change = { kind: "viewing_windows", at };
    }
    if (!change) continue;
    const list = out.get(id) ?? [];
    list.push(change);
    out.set(id, list);
  }
  for (const list of out.values()) list.sort((a, b) => b.at.localeCompare(a.at));
  return out;
}

export async function readSavedChanges(
  supabase: SupabaseClient,
  listingIds: readonly string[],
): Promise<Map<string, SavedChange[]>> {
  if (listingIds.length === 0) return new Map();
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("listing_changes")
      .select("listing_id, change, old_minor, new_minor, available, changed_at")
      .in("listing_id", listingIds.slice(0, 200))
      .gte("changed_at", since)
      .order("changed_at", { ascending: false })
      .limit(400);
    if (error || !Array.isArray(data)) return new Map();
    return changesFromRows(data as Row[]);
  } catch {
    return new Map();
  }
}

/**
 * The one line a card shows: the newest change after `since` (ms), or null.
 * With `since` null (a first visit on this phone) the newest change of the
 * window shows, since the person has not seen any of them here.
 */
export function changeLine(
  changes: readonly SavedChange[] | undefined,
  since: number | null,
  locale: Locale,
  copy: SavedChangeCopy,
): { text: string; gone: boolean } | null {
  const newest = changes?.find((c) => since === null || Date.parse(c.at) > since);
  if (!newest) return null;
  if (newest.kind === "price") {
    const template = newest.nowMinor < newest.wasMinor ? copy.priceDown : copy.priceUp;
    return {
      text: template
        .replace("{was}", formatMoney(newest.wasMinor, locale))
        .replace("{now}", formatMoney(newest.nowMinor, locale)),
      gone: false,
    };
  }
  if (newest.kind === "availability") {
    return newest.available ? { text: copy.back, gone: false } : { text: copy.gone, gone: true };
  }
  return { text: copy.windows, gone: false };
}
