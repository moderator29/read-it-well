import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSession } from "@/lib/actions/session";
import { reportReadError } from "@/lib/observability/read-error";
import { readMonthEarnings } from "./statement-read";
import { statementLines, statementTotals } from "./statement";
import type { StayEvents, StayRow } from "./front-desk";
import { addDays, lagosDayOf, TAPE_DAYS, type TapeInventory, type TapeRoomType, type TapeStay } from "./tape-chart";

/**
 * THE HOTEL'S NEXT TWO WEEKS, READ (track/hospitality-workspace).
 *
 * One read behind the tape chart, the front desk and the summary cards, so the
 * three cannot disagree about a stay. Everything is scoped by OWNERSHIP, not by
 * what the bookings policies happen to let this session see: the businesses
 * this member owns, their accommodations, then the room types, inventory and
 * bookings at those. A host who has also booked a stay as a guest elsewhere
 * must not see their own trip drawn as business, and `room_types` and
 * `room_inventory` are readable for every published hotel, so they are never
 * read unscoped.
 *
 * TWO SMALL SERVICE-ROLE READS, BOTH FOR IDS THE HOST'S OWN SESSION ALREADY
 * RECEIVED (the shape `app/host/reservations/board.ts` documents):
 *
 *   names  `profiles` is select-own, so a guest's display name read through
 *          the host's client comes back empty and every bar would read "A
 *          guest". `display_name` and nothing else, for the guests of the
 *          bookings RLS returned.
 *   paid   `transactions` has a select policy for the paying guest and for
 *          staff and none for the host, so "has this stay been paid" read
 *          through the host's client is always empty. Only `booking_id` is
 *          read, for the same bookings, where the charge settled.
 *
 * Either failing is a designed state (a plain word for the name, "unknown" for
 * paid), not an error.
 *
 * Nothing here writes.
 */

/** The business kinds that take room bookings. */
export const HOTEL_KINDS = ["hotel", "serviced_apartments", "guest_house", "resort", "shortlet_operator"] as const;

const DRAWN_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;
/** A guest who stayed past their day is still on the desk; this is how far back it looks. */
const LOOKBACK_DAYS = 14;
const STAY_LIMIT = 500;

export type StayMarksRead = { state: "ok"; events: StayEvents } | { state: "missing" } | { state: "error" };

/**
 * This Lagos month's settled payments at the host's own places, summed from
 * the split written on each transaction when the money moved
 * (`my_earnings_history`): never estimated, never a rate applied here. After
 * refunds, in kobo.
 */
export type HotelRevenue = {
  /** What guests paid. */
  grossMinor: number;
  /** What Vallo took from the hotel's share. */
  commissionMinor: number;
  /** What the hotel receives: the charge less Vallo's share (and any reserve a payment made before the Guarantee was retired set aside). */
  shareMinor: number;
  payments: number;
};

export type HotelDeskRead =
  | { state: "signed-out" }
  | { state: "unavailable" }
  /** This member owns no hotel, apartment or guest house. */
  | { state: "none" }
  | {
      state: "ok";
      /** The Lagos day the read was cut at. */
      today: string;
      roomTypes: TapeRoomType[];
      inventory: TapeInventory[];
      stays: (TapeStay & StayRow)[];
      marks: StayMarksRead;
      /** Null when the month's payments could not be read in full. */
      revenue: HotelRevenue | null;
      /** True when more bookings matched than were read. */
      truncated: boolean;
    };

type Names = Map<string, string>;

/** Display names for guests RLS has already handed this host. */
export async function readGuestNames(ids: readonly string[]): Promise<Names> {
  const names: Names = new Map();
  if (ids.length === 0) return names;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("id, display_name").in("id", [...new Set(ids)]);
    for (const row of data ?? []) {
      const name = (row.display_name ?? "").trim();
      if (name.length > 0) names.set(row.id, name);
    }
  } catch {
    /* No name is the designed state. */
  }
  return names;
}

/** Of these bookings, the ones with a settled payment; null when that could not be read. */
export async function readPaidBookingIds(ids: readonly string[]): Promise<Set<string> | null> {
  if (ids.length === 0) return new Set();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("transactions")
      .select("booking_id")
      .in("booking_id", [...new Set(ids)])
      .eq("status", "SUCCESSFUL");
    await reportReadError("read.hotelDesk.paid", error);
    if (error) return null;
    return new Set((data ?? []).map((row) => row.booking_id as string));
  } catch {
    return null;
  }
}

type MarkRow = { booking_id: string; kind: string; at: string };

/** The check-in and check-out marks (`stay_events`, HOTEL-01) for these bookings. */
export async function readStayMarks(
  db: { from: (table: string) => unknown },
  ids: readonly string[],
): Promise<StayMarksRead> {
  if (ids.length === 0) return { state: "ok", events: new Map() };
  const table = db.from("stay_events") as {
    select: (columns: string) => {
      in: (column: string, values: string[]) => PromiseLike<{ data: MarkRow[] | null; error: { code?: string; message?: string } | null }>;
    };
  };
  try {
    const { data, error } = await table.select("booking_id, kind, at").in("booking_id", [...ids]);
    /* 42P01 is Postgres, PGRST205 is PostgREST's own "no such table": the
       migration has not been applied yet, which is expected until it is and
       is not reported on every page. Anything else is a failed read. */
    const missing = error?.code === "42P01" || error?.code === "PGRST205";
    await reportReadError("read.hotelDesk.stayMarks", missing ? null : error);
    if (error) return missing ? { state: "missing" } : { state: "error" };
    const events = new Map<string, { checkedInAt: string | null; checkedOutAt: string | null }>();
    for (const row of data ?? []) {
      const marks = events.get(row.booking_id) ?? { checkedInAt: null, checkedOutAt: null };
      if (row.kind === "checked_in") marks.checkedInAt = row.at;
      if (row.kind === "checked_out") marks.checkedOutAt = row.at;
      events.set(row.booking_id, marks);
    }
    return { state: "ok", events };
  } catch {
    return { state: "error" };
  }
}

type BookingRow = {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guest_id: string;
  guest_name: string | null;
  accommodation_id: string;
  room_type_id: string | null;
};

/** This month's payments at the host's own places, from the same history the payout statement reads. */
async function readRevenue(today: string, accommodationIds: string[]): Promise<HotelRevenue | null> {
  const month = today.slice(0, 7);
  const read = await readMonthEarnings(month);
  if (read.state !== "ok" || !read.complete) return null;
  const lines = statementLines(read.entries, month);
  const bookingIds = [...new Set(lines.map((l) => l.bookingId).filter((id): id is string => Boolean(id)))];
  if (bookingIds.length === 0) return { grossMinor: 0, commissionMinor: 0, shareMinor: 0, payments: 0 };
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const { data, error } = await session.supabase
    .from("bookings")
    .select("id")
    .in("id", bookingIds)
    .in("accommodation_id", accommodationIds)
    .limit(1000);
  await reportReadError("read.hotelDesk.revenue", error);
  if (error || !data) return null;
  const mine = new Set(data.map((row) => row.id as string));
  const totals = statementTotals(lines.filter((l) => l.bookingId !== null && mine.has(l.bookingId)));
  return {
    grossMinor: totals.grossMinor,
    commissionMinor: totals.commissionMinor,
    shareMinor: totals.shareMinor,
    payments: totals.payments,
  };
}

export async function readHotelDesk(now: Date = new Date()): Promise<HotelDeskRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  const db = session.supabase;
  const today = lagosDayOf(now);
  const last = addDays(today, TAPE_DAYS - 1);
  try {
    const owned = await db
      .from("businesses")
      .select("id")
      .eq("owner_id", session.user.id)
      .in("kind", [...HOTEL_KINDS]);
    if (owned.error) {
      await reportReadError("read.hotelDesk.businesses", owned.error);
      return { state: "unavailable" };
    }
    const businessIds = (owned.data ?? []).map((row) => row.id as string);
    if (businessIds.length === 0) return { state: "none" };

    const places = await db.from("accommodations").select("id, name").in("business_id", businessIds);
    if (places.error) {
      await reportReadError("read.hotelDesk.accommodations", places.error);
      return { state: "unavailable" };
    }
    const hotels = new Map((places.data ?? []).map((row) => [row.id as string, (row.name as string) || ""]));
    const accommodationIds = [...hotels.keys()];
    /* A hotel business with no property yet (an application in progress)
       has no desk to draw: it reads as none, not as a day of zeros. */
    if (accommodationIds.length === 0) return { state: "none" };

    const [types, bookings] = await Promise.all([
      db.from("room_types").select("id, accommodation_id, name, units_total").in("accommodation_id", accommodationIds).order("name"),
      db
        .from("bookings")
        .select("id, status, check_in, check_out, rooms, guest_id, guest_name, accommodation_id, room_type_id")
        .in("accommodation_id", accommodationIds)
        .in("status", [...DRAWN_STATUSES])
        .gte("check_out", addDays(today, -LOOKBACK_DAYS))
        .lte("check_in", last)
        .order("check_in", { ascending: true })
        .limit(STAY_LIMIT),
    ]);
    if (types.error || bookings.error) {
      await reportReadError("read.hotelDesk.stays", types.error, bookings.error);
      return { state: "unavailable" };
    }

    const roomTypes: TapeRoomType[] = (types.data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.name as string) || "",
      hotel: hotels.get(row.accommodation_id as string) ?? "",
      unitsTotal: Number(row.units_total) || 0,
    }));
    const typeById = new Map(roomTypes.map((t) => [t.id, t]));
    const rows = ((bookings.data ?? []) as unknown as BookingRow[]).filter((r) => r.room_type_id && typeById.has(r.room_type_id));
    const ids = rows.map((r) => r.id);

    const [inventory, names, paid, marks, revenue] = await Promise.all([
      roomTypes.length > 0
        ? db
            .from("room_inventory")
            .select("room_type_id, date, units_open, units_booked")
            .in("room_type_id", roomTypes.map((t) => t.id))
            .gte("date", today)
            .lte("date", last)
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
      readGuestNames(rows.map((r) => r.guest_id)),
      readPaidBookingIds(ids),
      readStayMarks(db as unknown as { from: (table: string) => unknown }, ids),
      readRevenue(today, accommodationIds).catch(() => null),
    ]);
    if (inventory.error) {
      await reportReadError("read.hotelDesk.inventory", inventory.error);
      return { state: "unavailable" };
    }

    const stays = rows.map((r) => {
      const type = typeById.get(r.room_type_id as string)!;
      return {
        id: r.id,
        roomTypeId: type.id,
        status: r.status,
        checkIn: r.check_in,
        checkOut: r.check_out,
        rooms: r.rooms,
        /* Who is arriving, when the booking was made for somebody else, is
           the name on it; otherwise the account's display name. */
        guestName: (r.guest_name ?? "").trim() || names.get(r.guest_id) || null,
        paid: paid === null ? null : paid.has(r.id),
        hotel: type.hotel,
        room: type.name,
      };
    });

    return {
      state: "ok",
      today,
      roomTypes,
      inventory: ((inventory.data ?? []) as { room_type_id: string; date: string; units_open: number; units_booked: number }[]).map((row) => ({
        roomTypeId: row.room_type_id,
        date: row.date,
        unitsOpen: row.units_open,
        unitsBooked: row.units_booked,
      })),
      stays,
      marks,
      revenue,
      truncated: (bookings.data?.length ?? 0) >= STAY_LIMIT,
    };
  } catch (error) {
    await reportReadError("read.hotelDesk", error as never);
    return { state: "unavailable" };
  }
}
