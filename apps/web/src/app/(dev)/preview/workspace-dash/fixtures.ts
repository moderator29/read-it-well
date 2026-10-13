import {
  addDays,
  lagosDay,
  ownerView,
  parseAgreementsWaiting,
  parseBuildings,
  parseEarnings,
  parseEnquiries,
  parseTenancies,
  parseVisits,
  reminders,
  type ContactThread,
  type OwnerView,
} from "@/lib/workspace/dashboard-model";
import type { AgentDash } from "@/components/workspace/dashboard/Sections";

/**
 * Fixture inputs for the two workspace dashboards, dev preview only. They go
 * through the same parsers and the same `ownerView` the real page uses, so
 * the screenshots prove the arithmetic as well as the layout. Dates are
 * relative to the render, so "ends today" is always today.
 */

const at = (day: string, hour = 10) => `${day}T${String(hour).padStart(2, "0")}:00:00Z`;

export function ownerFixture(now: Date, empty: boolean): { view: OwnerView; places: Map<string, string> } {
  const today = lagosDay(now);
  if (empty) {
    return {
      view: ownerView({ buildings: [], tenancies: [], earnings: [], visits: [], agreements: [] }, now),
      places: new Map(),
    };
  }
  const buildings = parseBuildings([
    { listing_id: "l1", place_name: "Yaba, 2 bedroom flat", bedrooms: 2, status: "PUBLISHED", let_state: "let", tenancy_ends_on: today, achieved_rent_minor: 180_000_000, rent_period: "year" },
    { listing_id: "l2", place_name: "Lekki Phase 1, 3 bedroom flat", bedrooms: 3, status: "PUBLISHED", let_state: "let", tenancy_ends_on: addDays(today, 34), achieved_rent_minor: 420_000_000, rent_period: "year" },
    { listing_id: "l3", place_name: "Surulere, 1 bedroom flat", bedrooms: 1, status: "PUBLISHED", let_state: "let", tenancy_ends_on: addDays(today, 75), achieved_rent_minor: 95_000_000, rent_period: "year" },
    { listing_id: "l4", place_name: "Ikeja GRA, 2 bedroom flat", bedrooms: 2, status: "PUBLISHED", let_state: "vacant" },
    { listing_id: "l5", place_name: "Ajah, 4 bedroom duplex", bedrooms: 4, status: "DRAFT", let_state: "vacant" },
  ]);
  const monthStart = `${today.slice(0, 7)}-01`;
  const tenancies = parseTenancies([
    { id: "t1", listing_id: "l1", booking_id: "b1", move_in: addDays(today, -365), rent_period: "year", rent_minor: 180_000_000, total_minor: 215_000_000, created_at: at(addDays(today, -380)) },
    { id: "t2", listing_id: "l2", booking_id: "b2", move_in: addDays(addDays(today, 34), -365), rent_period: "year", rent_minor: 420_000_000, total_minor: 480_000_000, created_at: at(addDays(today, -331)) },
    { id: "t3", listing_id: "l3", booking_id: "b3", move_in: addDays(addDays(today, 75), -365), rent_period: "year", rent_minor: 95_000_000, total_minor: 120_000_000, created_at: at(addDays(today, -300)) },
    { id: "t4", listing_id: "l4", booking_id: "b4", move_in: addDays(today, 12), rent_period: "year", rent_minor: 260_000_000, total_minor: 310_000_000, created_at: at(monthStart) },
    { id: "t5", listing_id: "l2", booking_id: "b5", move_in: addDays(today, 5), rent_period: "quarter", rent_minor: 60_000_000, total_minor: 70_000_000, created_at: at(monthStart) },
  ]);
  const months = [-5, -4, -3, -2, -1].map((back) => {
    const [y, m] = today.split("-").map(Number) as [number, number];
    const index = y * 12 + (m - 1) + back;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-12`;
  });
  const earnings = parseEarnings([
    { kind: "earning", occurred_at: at(addDays(today, -365)), gross_minor: 215_000_000, status: "SUCCESSFUL", booking_id: "b1" },
    { kind: "earning", occurred_at: at(addDays(addDays(today, 34), -365)), gross_minor: 480_000_000, status: "SUCCESSFUL", booking_id: "b2" },
    { kind: "earning", occurred_at: at(months[0]!), gross_minor: 120_000_000, status: "SUCCESSFUL", booking_id: "b3" },
    { kind: "earning", occurred_at: at(months[2]!), gross_minor: 86_000_000, status: "SUCCESSFUL", booking_id: "b3" },
    { kind: "earning", occurred_at: at(months[3]!), gross_minor: 150_000_000, status: "SUCCESSFUL", booking_id: "b2" },
    { kind: "earning", occurred_at: at(months[4]!), gross_minor: 215_000_000, status: "SUCCESSFUL", booking_id: "b1" },
    { kind: "earning", occurred_at: at(monthStart, 12), gross_minor: 70_000_000, status: "SUCCESSFUL", booking_id: "b5" },
    { kind: "earning", occurred_at: at(monthStart, 13), gross_minor: 120_000_000, status: "SUCCESSFUL", booking_id: "b4" },
  ]);
  const visits = parseVisits([
    { id: "v1", slot_at: at(addDays(today, 1), 9), state: "CONFIRMED", listings: { title: "Ikeja GRA, 2 bedroom flat" } },
    { id: "v2", slot_at: at(addDays(today, 3), 14), state: "CONFIRMED", listings: { title: "Ikeja GRA, 2 bedroom flat" } },
  ]);
  const agreements = parseAgreementsWaiting([
    { id: "a1", status: "awaiting_parties", terms_version: 2, owner_confirmed_version: 1, kind: "rent", listing_id: "l4", updated_at: at(addDays(today, -1)) },
  ]);
  const view = ownerView({ buildings, tenancies, earnings, visits, agreements }, now);
  return { view, places: new Map(buildings.map((b) => [b.listingId, b.place] as const)) };
}

export function agentFixture(now: Date, empty: boolean): AgentDash {
  const today = lagosDay(now);
  if (empty) {
    return {
      enquiries: [],
      visits: [],
      closedDeals: 0,
      liveListings: 0,
      featured: null,
      reminders: reminders({ followupsDue: 0, visitsToday: 0, expiring: 0 }),
      threads: [],
      callNumbers: new Map(),
    };
  }
  const monthDay = (back: number, day: number) => {
    const [y, m] = today.split("-").map(Number) as [number, number];
    const index = y * 12 + (m - 1) - back;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const perMonth = [4, 7, 5, 9, 12, 11];
  const enquiries = parseEnquiries(
    perMonth.flatMap((count, i) =>
      Array.from({ length: count }, (_, k) => ({
        listing_id: k % 3 === 0 ? "f1" : "f2",
        created_at: at(i === 5 ? addDays(today, -(k % 20)) : monthDay(5 - i, 1 + ((k * 2) % 26)), 9 + (k % 8)),
      })),
    ),
  );
  const visitDays = [monthDay(4, 8), monthDay(3, 10), monthDay(3, 18), monthDay(2, 5), monthDay(2, 20), monthDay(1, 9), monthDay(1, 11), monthDay(1, 25)];
  const visits = parseVisits([
    ...visitDays.map((day, i) => ({ id: `p${i}`, slot_at: at(day, 11), state: "COMPLETED", listings: { title: "Lekki flat" } })),
    { id: "c0", slot_at: `${addDays(today, 0)}T17:00:00Z`, state: "CONFIRMED", listings: { title: "Lekki Phase 1 apartment" } },
    { id: "c1", slot_at: at(addDays(today, 2), 10), state: "CONFIRMED", listings: { title: "Yaba 2 bedroom" } },
    { id: "c2", slot_at: at(addDays(today, 5), 15), state: "CONFIRMED", listings: { title: "Ikeja GRA flat" } },
    { id: "c3", slot_at: at(addDays(today, 8), 15), state: "CONFIRMED", listings: { title: "Ikeja GRA flat" } },
  ]);
  const thread = (id: string, name: string, listing: string, hoursAgo: number): ContactThread => ({
    id,
    counterpartName: name,
    counterpartId: `user-${id}`,
    counterpartAvatarUrl: null,
    listingTitle: listing,
    lastAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
    contextKind: "listing",
  });
  return {
    enquiries,
    visits,
    closedDeals: 3,
    liveListings: 6,
    featured: {
      listingId: "f1",
      title: "Lekki Phase 1 apartment",
      place: "Lekki Phase 1, Lagos",
      bedrooms: 3,
      photoUrl: null,
      enquiries30: 9,
      week: { opened: 128, enquired: 4, booked: 2 },
    },
    reminders: reminders({ followupsDue: 3, followupsOverdue: 1, visitsToday: 1, expiring: 2 }),
    threads: [
      thread("t1", "Adaeze Okafor", "Lekki Phase 1 apartment", 2),
      thread("t2", "Tunde Bello", "Yaba 2 bedroom", 9),
      thread("t3", "Ngozi Eze", "Ikeja GRA flat", 30),
      thread("t4", "Musa Danladi", "Lekki Phase 1 apartment", 52),
    ],
    callNumbers: new Map([
      ["user-t1", "+2348012345678"],
      ["user-t3", "+2348023456789"],
    ]),
  };
}
