import { describe, expect, it } from "vitest";
import { buildBookings, lagosDay, type BookingRaw } from "./bookings";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const DAY = 86_400_000;
const b = (id: string, status: BookingRaw["status"], over: Partial<BookingRaw> = {}): BookingRaw => ({
  id,
  status,
  guest_id: `g-${id}`,
  guest_name: null,
  check_in: "2026-10-01",
  check_out: "2026-10-03",
  nights: 2,
  total_minor: 100_000,
  created_at: new Date(NOW - 2 * DAY).toISOString(),
  listings: { title: `Flat ${id}`, area: "Lekki", city: "Lagos" },
  ...over,
});

const rows = [
  b("a", "PENDING"),
  b("b", "CONFIRMED", { check_in: "2026-09-21", check_out: "2026-09-24" }),
  b("c", "CONFIRMED"),
  b("d", "CANCELLED", { created_at: new Date(NOW - 20 * DAY).toISOString() }),
  b("e", "COMPLETED", { guest_name: "Kemi O." }),
  b("f", "NO_SHOW"),
];
const desk = buildBookings(rows, new Map([["b", 80_000]]), new Map([["d", 50_000], ["f", 0]]), new Map([["g-a", "Tunde A."]]), { page: 1, pageSize: 10 }, NOW);

describe("buildBookings", () => {
  it("counts every state, stays in progress and refunds of more than nothing", () => {
    expect(desk.counts).toEqual({
      requested: 1,
      confirmed: 2,
      inStay: 1,
      completed: 1,
      noShow: 1,
      cancelled: 1,
      refunded: 1,
      total: 6,
      createdThisWeek: 5,
    });
  });
  it("draws thirty Lagos days of bookings created, zero days included", () => {
    expect(desk.perDay).toHaveLength(30);
    expect(desk.perDay.at(-1)?.day).toBe(lagosDay(NOW));
    expect(desk.perDay.reduce((s, d) => s + d.count, 0)).toBe(6);
  });
  it("carries paid and refunded money onto the row, and a name from the profile when the booking has none", () => {
    const row = (id: string) => desk.table.rows.find((r) => r.id === id)!;
    expect(row("b").paidMinor).toBe(80_000);
    expect(row("d").refundedMinor).toBe(50_000);
    expect(row("a").guestName).toBe("Tunde A.");
    expect(row("e").guestName).toBe("Kemi O.");
  });
  it("narrows by state, by listing or guest, and pages", () => {
    expect(buildBookings(rows, new Map(), new Map(), new Map(), { status: "CONFIRMED", page: 1, pageSize: 10 }, NOW).table.total).toBe(2);
    expect(buildBookings(rows, new Map(), new Map(), new Map(), { q: "kemi", page: 1, pageSize: 10 }, NOW).table.rows.map((r) => r.id)).toEqual(["e"]);
    const paged = buildBookings(rows, new Map(), new Map(), new Map(), { page: 9, pageSize: 4 }, NOW);
    expect(paged.table.page).toBe(2);
    expect(paged.table.rows).toHaveLength(2);
  });
});
