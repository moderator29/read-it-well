import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { resolveSession } from "../actions/session";
import type { Slot } from "./route";

/**
 * V-94: THE READS. Slots through `viewing_slots` (signed in, a published real
 * listing, times only); the lister's own windows under RLS. A failed read is
 * null, which the screens say, distinct from none.
 */

type Rpc = (fn: "viewing_slots", args: { p_listing: string; p_days: number }) => PromiseLike<{ data: unknown; error: unknown }>;

export async function readViewingSlots(listingId: string, days = 14): Promise<Slot[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const rpc = session.supabase.rpc.bind(session.supabase) as unknown as Rpc;
    const { data, error } = await rpc("viewing_slots", { p_listing: listingId, p_days: days });
    await reportReadError("read.viewings.readViewingSlots", error);
    if (error || !Array.isArray(data)) return null;
    return (data as { slot_at: string; slot_minutes: number; window_id: string }[]).map((row) => ({
      slotAt: row.slot_at,
      minutes: Number(row.slot_minutes),
      windowId: row.window_id,
    }));
  } catch {
    return null;
  }
}

export type ViewingWindow = {
  id: string;
  listingIds: string[];
  weekday: number;
  starts: string;
  ends: string;
  slotMinutes: number;
};

type WindowsTable = {
  from: (table: "viewing_windows") => {
    select: (cols: string) => {
      eq: (col: string, value: unknown) => {
        order: (col: string, opts: { ascending: boolean }) => PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export async function readMyViewingWindows(): Promise<ViewingWindow[] | null> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  try {
    const { data, error } = await (session.supabase as unknown as WindowsTable)
      .from("viewing_windows")
      .select("id, listing_ids, weekday, starts, ends, slot_minutes")
      .eq("active", true)
      .order("weekday", { ascending: true });
    await reportReadError("read.viewings.readMyViewingWindows", error);
    if (error || !Array.isArray(data)) return null;
    return (data as { id: string; listing_ids: string[]; weekday: number; starts: string; ends: string; slot_minutes: number }[]).map(
      (row) => ({
        id: row.id,
        listingIds: row.listing_ids ?? [],
        weekday: Number(row.weekday),
        starts: String(row.starts).slice(0, 5),
        ends: String(row.ends).slice(0, 5),
        slotMinutes: Number(row.slot_minutes),
      }),
    );
  } catch {
    return null;
  }
}
