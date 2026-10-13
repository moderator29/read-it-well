import type { Inspection, InspectionState } from "@/lib/inspections/types";
import type { CalendarRow } from "@/components/agent/visit-calendar/VisitCalendar";
import type { AdminVisitRow } from "@/lib/admin/reads/visits-model";
import type { VisitMode } from "@/lib/visit-calendar/model";

/**
 * VISIT OPS FIXTURES, for the preview harness and the component tests only.
 * Invented people and homes on a pinned clock (Tuesday 13 October 2026,
 * Lagos), so a screenshot and a test draw the same week every time. Never
 * imported by a product route.
 */

export const TODAY = "2026-10-13";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Seed = {
  n: number;
  at: string;
  asked?: boolean;
  state: InspectionState;
  mode: VisitMode;
  renter: string | null;
  lister: string;
  listing: string | null;
  area: string;
  city: string;
};

const SEEDS: Seed[] = [
  { n: 1, at: "2026-10-13T09:00:00Z", state: "CONFIRMED", mode: "in_person", renter: "Chiamaka Obi", lister: "Tunde Bakare", listing: "Two bed flat, Sabo", area: "Yaba", city: "Lagos" },
  { n: 2, at: "2026-10-13T14:30:00Z", state: "CONFIRMED", mode: "video", renter: "Ibrahim Musa", lister: "Tunde Bakare", listing: "Mini flat off Herbert Macaulay", area: "Yaba", city: "Lagos" },
  { n: 3, at: "2026-10-14T10:00:00Z", asked: true, state: "REQUESTED", mode: "in_person", renter: "Funke Adeyemi", lister: "Tunde Bakare", listing: "Three bed terrace", area: "Surulere", city: "Lagos" },
  { n: 4, at: "2026-10-15T15:00:00Z", asked: true, state: "REQUESTED", mode: "video", renter: null, lister: "Tunde Bakare", listing: "Two bed flat, Sabo", area: "Yaba", city: "Lagos" },
  { n: 5, at: "2026-10-16T11:00:00Z", state: "PROPOSED", mode: "in_person", renter: "Emeka Nwosu", lister: "Tunde Bakare", listing: "Self contain, Akoka", area: "Akoka", city: "Lagos" },
  { n: 6, at: "2026-10-17T08:30:00Z", state: "CONFIRMED", mode: "in_person", renter: "Halima Bello", lister: "Tunde Bakare", listing: "Three bed terrace", area: "Surulere", city: "Lagos" },
  { n: 7, at: "2026-10-17T09:30:00Z", state: "CONFIRMED", mode: "in_person", renter: "Segun Ojo", lister: "Tunde Bakare", listing: "Two bed flat, Sabo", area: "Yaba", city: "Lagos" },
  { n: 8, at: "2026-10-12T15:00:00Z", state: "COMPLETED", mode: "in_person", renter: "Ngozi Eze", lister: "Tunde Bakare", listing: "Mini flat off Herbert Macaulay", area: "Yaba", city: "Lagos" },
  { n: 9, at: "2026-10-09T10:00:00Z", state: "NO_SHOW", mode: "in_person", renter: "Kunle Afolabi", lister: "Tunde Bakare", listing: "Self contain, Akoka", area: "Akoka", city: "Lagos" },
  { n: 10, at: "2026-10-07T13:00:00Z", state: "DECLINED", mode: "video", renter: "Aisha Lawal", lister: "Tunde Bakare", listing: null, area: "Gbagada", city: "Lagos" },
  { n: 11, at: "2026-10-22T12:00:00Z", state: "CONFIRMED", mode: "video", renter: "Ada Okafor", lister: "Tunde Bakare", listing: "Three bed terrace", area: "Surulere", city: "Lagos" },
];

/** The lister's calendar rows (Tunde's diary). */
export const LISTER_ROWS: CalendarRow[] = SEEDS.map((s) => ({
  id: id(s.n),
  at: s.at,
  asked: s.asked === true,
  state: s.state,
  mode: s.mode,
  listingTitle: s.listing,
  personName: s.renter,
}));

/** The same visits as the `Inspection` the existing sheet takes. */
export const LISTER_INSPECTIONS: Inspection[] = SEEDS.map((s) => ({
  id: id(s.n),
  listingId: id(100 + s.n),
  listingTitle: s.listing,
  state: s.state,
  requestedAt: s.at,
  slotAt: s.asked ? null : s.at,
  note: null,
  listerNote: null,
  createdAt: "2026-10-05T09:00:00.000Z",
  respondedAt: s.asked ? null : "2026-10-06T09:00:00.000Z",
  conversationId: null,
  counterpartName: s.renter,
  counterpartPhone: null,
  outcome: s.state === "COMPLETED" ? "inspected" : null,
}));

/** The console's rows: the platform, so two more listers in Abuja. */
export const ADMIN_ROWS: AdminVisitRow[] = [
  ...SEEDS.map((s) => adminRow(s, id(900))),
  adminRow({ n: 20, at: "2026-10-14T13:00:00Z", state: "CONFIRMED", mode: "video", renter: "Zainab Yusuf", lister: "Musa Danjuma", listing: "Two bed, Wuse 2", area: "Wuse 2", city: "Abuja" }, id(901)),
  adminRow({ n: 21, at: "2026-10-16T09:00:00Z", state: "COMPLETED", mode: "in_person", renter: "Peter Okon", lister: "Grace Edet", listing: "Duplex, Gwarinpa", area: "Gwarinpa", city: "Abuja" }, id(902)),
];

function adminRow(s: Seed, listerId: string): AdminVisitRow {
  return {
    id: id(s.n),
    listingId: id(100 + s.n),
    listingTitle: s.listing,
    city: s.city,
    area: s.area,
    listerId,
    listerName: s.lister,
    renterId: id(500 + s.n),
    renterName: s.renter,
    state: s.state,
    mode: s.mode,
    at: s.at,
    asked: s.asked === true,
    requestedAt: s.at,
    slotAt: s.asked ? null : s.at,
    createdAt: "2026-10-05T09:00:00Z",
    respondedAt: s.asked ? null : "2026-10-06T09:00:00Z",
    confirmedAt: s.state === "CONFIRMED" || s.state === "COMPLETED" || s.state === "NO_SHOW" ? "2026-10-06T09:00:00Z" : null,
    completedAt: s.state === "COMPLETED" ? new Date(Date.parse(s.at) + 2 * 3_600_000).toISOString() : null,
    outcome: null,
  };
}

export const FIXTURE_ID = id;
