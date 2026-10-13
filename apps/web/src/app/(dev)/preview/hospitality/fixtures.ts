import type { HotelDeskRead } from "@/lib/host/tape-chart-read";
import type { StayEvents } from "@/lib/host/front-desk";
import { addDays, type TapeInventory, type TapeRoomType, type TapeStay } from "@/lib/host/tape-chart";
import type { StayRow } from "@/lib/host/front-desk";
import type { WeekRow } from "@/components/host/dashboard/restaurant-figures";

/**
 * Fixtures for the hotel and restaurant dashboard previews. Made-up rows on a
 * fixed clock (10:00 Lagos on Tuesday 13 October 2026); nothing here is
 * written anywhere. Never proof of a read, only of the look.
 */

export const NOW = new Date("2026-10-13T09:00:00.000Z");
export const TODAY = "2026-10-13";

const TYPES: TapeRoomType[] = [
  { id: "rt-deluxe", name: "Deluxe double", hotel: "Harbour Hotel", unitsTotal: 6 },
  { id: "rt-exec", name: "Executive suite", hotel: "Harbour Hotel", unitsTotal: 3 },
  { id: "rt-std", name: "Standard room", hotel: "Harbour Hotel", unitsTotal: 12 },
];

type Seed = { id: string; type: string; guest: string; from: string; to: string; rooms?: number; status?: string; paid?: boolean };

const SEEDS: Seed[] = [
  { id: "b01", type: "rt-deluxe", guest: "Tunde Bakare", from: "2026-10-11", to: "2026-10-15" },
  { id: "b02", type: "rt-deluxe", guest: "Ifeoma Nwosu", from: "2026-10-13", to: "2026-10-16" },
  { id: "b03", type: "rt-deluxe", guest: "Chidi Okonkwo", from: "2026-10-09", to: "2026-10-13" },
  { id: "b04", type: "rt-deluxe", guest: "Aisha Lawal", from: "2026-10-16", to: "2026-10-19", rooms: 2 },
  { id: "b05", type: "rt-deluxe", guest: "Emeka Obi", from: "2026-10-17", to: "2026-10-18", status: "PENDING", paid: false },
  { id: "b06", type: "rt-deluxe", guest: "Funke Akindele", from: "2026-10-21", to: "2026-10-28" },
  { id: "b07", type: "rt-exec", guest: "Bayo Adebayo", from: "2026-10-12", to: "2026-10-14" },
  { id: "b08", type: "rt-exec", guest: "Ngozi Eze", from: "2026-10-14", to: "2026-10-20" },
  { id: "b09", type: "rt-exec", guest: "Musa Abdullahi", from: "2026-10-23", to: "2026-10-26" },
  { id: "b10", type: "rt-std", guest: "Kemi Adeyemi", from: "2026-10-10", to: "2026-10-13" },
  { id: "b11", type: "rt-std", guest: "Zainab Bello", from: "2026-10-12", to: "2026-10-17", rooms: 2 },
  { id: "b12", type: "rt-std", guest: "Segun Arinze", from: "2026-10-13", to: "2026-10-14", paid: false },
  { id: "b13", type: "rt-std", guest: "Hauwa Ibrahim", from: "2026-10-15", to: "2026-10-18" },
  { id: "b14", type: "rt-std", guest: "Obinna Eze", from: "2026-10-16", to: "2026-10-23", rooms: 3 },
  { id: "b15", type: "rt-std", guest: "Lola Fashola", from: "2026-10-19", to: "2026-10-22" },
  { id: "b16", type: "rt-std", guest: "Yusuf Danjuma", from: "2026-10-24", to: "2026-11-02" },
  { id: "b17", type: "rt-std", guest: "Adaeze Okafor", from: "2026-10-11", to: "2026-10-15" },
];

const HOLDS = new Set(["PENDING", "CONFIRMED", "COMPLETED"]);

function stays(): (TapeStay & StayRow)[] {
  return SEEDS.map((s) => {
    const type = TYPES.find((t) => t.id === s.type)!;
    return {
      id: s.id,
      roomTypeId: s.type,
      status: s.status ?? "CONFIRMED",
      checkIn: s.from,
      checkOut: s.to,
      rooms: s.rooms ?? 1,
      guestName: s.guest,
      paid: s.paid ?? true,
      hotel: type.hotel,
      room: type.name,
    };
  });
}

/** Rooms on sale and rooms held, per night, counted from the stays so the two never disagree. */
function inventory(rows: readonly (TapeStay & StayRow)[]): TapeInventory[] {
  const out: TapeInventory[] = [];
  for (const type of TYPES) {
    for (let i = 0; i < 14; i += 1) {
      const date = addDays(TODAY, i);
      let booked = 0;
      for (const s of rows) {
        if (s.roomTypeId === type.id && HOLDS.has(s.status) && s.checkIn <= date && date < s.checkOut) booked += s.rooms;
      }
      /* Two Standard rooms are taken off sale the second weekend, and the
         Executive suite is closed on the 22nd. */
      const open =
        type.id === "rt-std" && (date === "2026-10-24" || date === "2026-10-25")
          ? type.unitsTotal - 2
          : type.id === "rt-exec" && date === "2026-10-22"
            ? 0
            : type.unitsTotal;
      out.push({ roomTypeId: type.id, date, unitsOpen: open, unitsBooked: Math.min(booked, open) });
    }
  }
  return out;
}

const marks = (entries: Record<string, { in?: string; out?: string }>): StayEvents =>
  new Map(Object.entries(entries).map(([id, m]) => [id, { checkedInAt: m.in ?? null, checkedOutAt: m.out ?? null }]));

const EVENTS = marks({
  b01: { in: "2026-10-11T13:20:00Z" },
  b03: { in: "2026-10-09T15:00:00Z" },
  b07: { in: "2026-10-12T12:10:00Z" },
  b10: { in: "2026-10-10T14:00:00Z", out: "2026-10-13T08:15:00Z" },
  b11: { in: "2026-10-12T16:40:00Z" },
  b17: {},
});

export function hotelRead(options: { marks?: "ok" | "missing" | "error"; revenue?: boolean } = {}): Extract<HotelDeskRead, { state: "ok" }> {
  const rows = stays();
  const m = options.marks ?? "ok";
  return {
    state: "ok",
    today: TODAY,
    roomTypes: TYPES,
    inventory: inventory(rows),
    stays: rows,
    marks: m === "ok" ? { state: "ok", events: EVENTS } : { state: m },
    revenue: options.revenue === false ? null : { grossMinor: 482_000_000, commissionMinor: 48_200_000, shareMinor: 433_800_000, payments: 21 },
    truncated: false,
  };
}

export function emptyHotelRead(): Extract<HotelDeskRead, { state: "ok" }> {
  return { state: "ok", today: TODAY, roomTypes: [], inventory: [], stays: [], marks: { state: "ok", events: new Map() }, revenue: { grossMinor: 0, commissionMinor: 0, shareMinor: 0, payments: 0 }, truncated: false };
}

const at = (lagos: string) => new Date(`${lagos}+01:00`).toISOString();

/** The next seven days of a working restaurant, for the line. */
export const WEEK_ROWS: WeekRow[] = [
  ...[4, 2, 6, 3, 2, 5].map((n, i) => ({ reservedFor: at(`2026-10-13T${12 + i}:30:00`), status: "CONFIRMED", partySize: n })),
  ...[2, 4, 3].map((n, i) => ({ reservedFor: at(`2026-10-14T${13 + i}:00:00`), status: "CONFIRMED", partySize: n })),
  ...[5, 2, 2, 6, 3, 4, 2].map((n, i) => ({ reservedFor: at(`2026-10-15T${12 + i}:00:00`), status: "CONFIRMED", partySize: n })),
  ...[2, 2].map((n, i) => ({ reservedFor: at(`2026-10-16T${19 + i}:00:00`), status: "PENDING", partySize: n })),
  ...[6, 8, 4, 4, 2, 2, 3, 5, 6, 2].map((n, i) => ({ reservedFor: at(`2026-10-17T${12 + (i % 9)}:00:00`), status: "CONFIRMED", partySize: n })),
  ...[7, 4, 4, 2, 6, 2, 3, 2, 8, 2, 4, 3].map((n, i) => ({ reservedFor: at(`2026-10-18T${12 + (i % 9)}:00:00`), status: "CONFIRMED", partySize: n })),
  ...[3, 2, 2].map((n, i) => ({ reservedFor: at(`2026-10-19T${18 + i}:00:00`), status: "CONFIRMED", partySize: n })),
];
