import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";
import type { ReservationStatus } from "./db";

/**
 * Read side of restaurant reservations.
 *
 * Every read goes through the caller's own RLS-bound client and asks; the
 * policies answer. A guest's client returns their own tables and nothing
 * else (`reservations_select_own`); a host's returns the tables at the
 * restaurants they own, through the listing-agent join or the business-owner
 * helper. Nothing here needs the service role and nothing here re-implements
 * who may see what.
 *
 * Both readers degrade to a renderable answer: null when nobody is signed in
 * (the trips page keeps its signed-out rendering), "unavailable" when the
 * read itself failed, because a dropped read is not an empty account (the
 * lesson `getMyBookings` learned the hard way).
 */

/** The TripSpine-ready shape the ledger's contract names (section 2.1). */
export type ReservationView = {
  id: string;
  /** The restaurant listing, or null when the table is at a business (M7). */
  listingId: string | null;
  businessId: string | null;
  listingTitle: string;
  /** Where it is, "Victoria Island, Lagos", or empty. */
  location: string;
  /** ISO instant of the table. */
  reservedFor: string;
  partySize: number;
  status: ReservationStatus;
  note: string | null;
  respondedAt: string | null;
  /** The thread attached to this table, once reserveTable opened it. */
  conversationId: string | null;
  /** True while the guest may still call it off. */
  cancellable: boolean;
};

/** The host's view of the same row, with the guest named. */
export type HostReservationView = ReservationView & {
  guestId: string;
  guestName: string;
  /** True while the venue still has to answer. */
  awaitingAnswer: boolean;
};

export type ReservationsRead<T> = T[] | null | "unavailable";

const COLUMNS =
  "id, listing_id, business_id, guest_id, party_size, reserved_for, status, note, responded_at, conversation_id";

type Venue = { title: string; location: string };

/**
 * Titles and places for the venues these rows point at, in two reads at most.
 * Read through the same client, so a venue the caller may not see (a listing
 * taken down since) falls back to a plain word rather than leaking.
 */
async function readVenues(
  supabase: SupabaseClient<Database>,
  listingIds: string[],
  businessIds: string[],
): Promise<{ listings: Map<string, Venue>; businesses: Map<string, Venue> }> {
  const listings = new Map<string, Venue>();
  const businesses = new Map<string, Venue>();
  const place = (area: string | null, city: string | null) =>
    [area ?? "", city ?? ""].filter((part) => part.length > 0).join(", ");

  const [listingRead, businessRead] = await Promise.all([
    listingIds.length > 0
      ? supabase.from("listings").select("id, title, area, city").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: string; title: string; area: string | null; city: string | null }[] }),
    businessIds.length > 0
      ? supabase.from("businesses").select("id, name, area, city").in("id", businessIds)
      : Promise.resolve({ data: [] as { id: string; name: string; area: string | null; city: string | null }[] }),
  ]);
  for (const row of listingRead.data ?? []) {
    listings.set(row.id, { title: row.title, location: place(row.area, row.city) });
  }
  for (const row of businessRead.data ?? []) {
    businesses.set(row.id, { title: row.name, location: place(row.area, row.city) });
  }
  return { listings, businesses };
}

function toView(
  row: {
    id: string;
    listing_id: string | null;
    business_id: string | null;
    party_size: number;
    reserved_for: string;
    status: ReservationStatus;
    note: string | null;
    responded_at: string | null;
    conversation_id: string | null;
  },
  venues: { listings: Map<string, Venue>; businesses: Map<string, Venue> },
  now: Date,
): ReservationView {
  const venue =
    (row.listing_id ? venues.listings.get(row.listing_id) : null) ??
    (row.business_id ? venues.businesses.get(row.business_id) : null) ??
    null;
  return {
    id: row.id,
    listingId: row.listing_id,
    businessId: row.business_id,
    listingTitle: venue?.title ?? "Restaurant",
    location: venue?.location ?? "",
    reservedFor: row.reserved_for,
    partySize: row.party_size,
    status: row.status,
    note: row.note,
    respondedAt: row.responded_at,
    conversationId: row.conversation_id,
    // The action refuses a cancel on a CANCELLED row; a table whose moment has
    // passed is a record, not a plan, so the control is not offered either.
    cancellable:
      (row.status === "PENDING" || row.status === "CONFIRMED") &&
      Date.parse(row.reserved_for) > now.getTime(),
  };
}

/**
 * The signed-in person's own tables, newest moment first, for `/trips` and
 * `/bookings`. Null when nobody is signed in.
 */
export async function getMyReservations(now: Date = new Date()): Promise<ReservationsRead<ReservationView>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const supabase = session.supabase;

  const { data: rows, error } = await supabase
    .from("reservations")
    .select(COLUMNS)
    .eq("guest_id", session.user.id)
    .order("reserved_for", { ascending: false })
    .limit(100);
  await reportReadError("read.reservations.getMyReservations", error);
  if (error || !rows) return "unavailable";
  if (rows.length === 0) return [];

  const venues = await readVenues(
    supabase,
    [...new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)))],
    [...new Set(rows.map((r) => r.business_id).filter((id): id is string => Boolean(id)))],
  );
  return rows.map((row) => toView(row, venues, now));
}

/**
 * The tables at the restaurants this person hosts, soonest first, for the
 * agent and Host consoles. The policies decide which restaurants are theirs;
 * the one thing this adds is the guest's display name, read from the public
 * profile projection.
 */
export async function getHostReservations(
  now: Date = new Date(),
): Promise<ReservationsRead<HostReservationView>> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const supabase = session.supabase;

  const { data: rows, error } = await supabase
    .from("reservations")
    .select(COLUMNS)
    .neq("guest_id", session.user.id)
    .order("reserved_for", { ascending: true })
    .limit(200);
  await reportReadError("read.reservations.getHostReservations", error);
  if (error || !rows) return "unavailable";
  if (rows.length === 0) return [];

  const guestIds = [...new Set(rows.map((r) => r.guest_id))];
  const [venues, profilesRead] = await Promise.all([
    readVenues(
      supabase,
      [...new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)))],
      [...new Set(rows.map((r) => r.business_id).filter((id): id is string => Boolean(id)))],
    ),
    supabase.from("profiles").select("id, display_name").in("id", guestIds),
  ]);
  const names = new Map<string, string>();
  for (const p of profilesRead.data ?? []) {
    const name = (p.display_name ?? "").trim();
    if (name.length > 0) names.set(p.id, name);
  }

  return rows.map((row) => ({
    ...toView(row, venues, now),
    guestId: row.guest_id,
    guestName: names.get(row.guest_id) ?? "A guest",
    awaitingAnswer: row.status === "PENDING" && Date.parse(row.reserved_for) > now.getTime(),
  }));
}
