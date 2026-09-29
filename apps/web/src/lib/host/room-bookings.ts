import "server-only";

import { resolveSession } from "../actions/session";

/**
 * ROOM BOOKINGS 1: the room requests at a host's hotels, read under the
 * host's own session. `bookings_business_host_select` answers exactly the
 * bookings at accommodations this person's businesses own, so this reader
 * never restates who owns what.
 */
export type HostRoomBooking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  guests: number;
  totalMinor: number;
  createdAt: string;
  hotel: string;
  room: string;
  guestName: string;
  arrivingName: string | null;
  agreement: { id: string; status: string } | null;
  paid: boolean;
};

export type HostRoomBookingsRead =
  | { state: "signed-out" }
  | { state: "unavailable" }
  | { state: "ok"; waiting: HostRoomBooking[]; upcoming: HostRoomBooking[]; past: HostRoomBooking[] };

type Row = {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  total_minor: number;
  created_at: string;
  guest_id: string;
  guest_name: string | null;
  accommodation_id: string;
  room_type_id: string;
};

export async function readHostRoomBookings(): Promise<HostRoomBookingsRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  const db = session.supabase;
  try {
    const { data, error } = await db
      .from("bookings")
      .select(
        "id, status, check_in, check_out, nights, rooms, adults, children, total_minor, created_at, guest_id, guest_name, accommodation_id, room_type_id",
      )
      .not("accommodation_id", "is", null)
      .order("check_in", { ascending: true })
      .limit(200);
    if (error) return { state: "unavailable" };
    const rows = (data ?? []) as unknown as Row[];
    const ids = rows.map((r) => r.id);
    const [places, rooms, people, agreements, paid] = await Promise.all([
      rows.length
        ? db.from("accommodations").select("id, name").in("id", [...new Set(rows.map((r) => r.accommodation_id))])
        : Promise.resolve({ data: [] }),
      rows.length
        ? db.from("room_types").select("id, name").in("id", [...new Set(rows.map((r) => r.room_type_id))])
        : Promise.resolve({ data: [] }),
      rows.length
        ? db.from("profiles").select("id, display_name").in("id", [...new Set(rows.map((r) => r.guest_id))])
        : Promise.resolve({ data: [] }),
      ids.length ? db.from("deal_agreements").select("id, status, booking_id").in("booking_id", ids) : Promise.resolve({ data: [] }),
      ids.length
        ? db.from("transactions").select("booking_id").in("booking_id", ids).eq("status", "SUCCESSFUL")
        : Promise.resolve({ data: [] }),
    ]);
    const nameOf = (list: { data: unknown }, key: "name" | "display_name") =>
      new Map(((list.data ?? []) as Record<string, string | null>[]).map((x) => [x.id as string, (x[key] ?? "") as string]));
    const hotel = nameOf(places, "name");
    const room = nameOf(rooms, "name");
    const person = nameOf(people, "display_name");
    const agreementOf = new Map(
      ((agreements.data ?? []) as { id: string; status: string; booking_id: string }[]).map((a) => [
        a.booking_id,
        { id: a.id, status: a.status },
      ]),
    );
    const paidSet = new Set(((paid.data ?? []) as { booking_id: string }[]).map((t) => t.booking_id));
    const today = new Date().toISOString().slice(0, 10);
    const view = rows.map<HostRoomBooking>((r) => ({
      id: r.id,
      status: r.status,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: r.nights,
      rooms: r.rooms,
      guests: r.adults + r.children,
      totalMinor: r.total_minor,
      createdAt: r.created_at,
      hotel: hotel.get(r.accommodation_id) || "Your hotel",
      room: room.get(r.room_type_id) || "A room",
      guestName: person.get(r.guest_id) || "A guest",
      arrivingName: r.guest_name,
      agreement: agreementOf.get(r.id) ?? null,
      paid: paidSet.has(r.id),
    }));
    return {
      state: "ok",
      waiting: view.filter((b) => b.status === "PENDING"),
      upcoming: view.filter((b) => b.status === "CONFIRMED" && b.checkOut >= today),
      past: view
        .filter((b) => !(b.status === "PENDING" || (b.status === "CONFIRMED" && b.checkOut >= today)))
        .reverse(),
    };
  } catch {
    return { state: "unavailable" };
  }
}
