import type { TransferableBusiness, TransferOffer } from "@/lib/business-transfer/queries";
import { COUNTERPART, PERSON } from "../_fixtures/people";

/**
 * Fixtures for the hand-over desk, `/host/transfer`, which had NO preview
 * anywhere and therefore no picture on the night the shape law landed.
 *
 * `/host/reservations` and `/admin/businesses` were checked first and are
 * already covered by `preview/p3/**`, whose pages draw the route's own body
 * wrapper and the console chrome, so they are shot there rather than doubled
 * here: a second fixture set for the same surface is a second thing to keep
 * true. The listing wizard needs no rows at all and carries its own page.
 *
 * Brand-neutral throughout, the catalogue's fictional names, never a real
 * person or brand, and nothing here writes.
 */

const NOW = Date.parse("2026-06-18T18:00:00.000Z");
const hours = (n: number) => new Date(NOW + n * 3_600_000).toISOString();

/** One trading business, one quiet one, so both halves of the screen draw. */
export const TRANSFER_BUSINESSES: TransferableBusiness[] = [
  {
    id: "00000000-0000-4000-8000-00000000h001",
    name: "The Harbour Kitchen",
    kind: "restaurant",
    status: "PUBLISHED",
    verified: true,
    stillTrading: true,
    publishedRooms: 0,
    futureReservations: 3,
  },
  {
    id: "00000000-0000-4000-8000-00000000h002",
    name: "Ikoyi Guest House",
    kind: "guest_house",
    status: "DRAFT",
    verified: false,
    stillTrading: false,
    publishedRooms: 0,
    futureReservations: 0,
  },
];

export const TRANSFER_OUTGOING: TransferOffer[] = [
  {
    transferId: "00000000-0000-4000-8000-00000000t001",
    businessId: "00000000-0000-4000-8000-00000000h002",
    businessName: "Ikoyi Guest House",
    status: "OFFERED",
    offeredAt: hours(-48),
    expiresAt: hours(120),
    note: null,
    counterpartyHandle: COUNTERPART.handle,
  },
];

export const TRANSFER_INCOMING: TransferOffer[] = [
  {
    transferId: "00000000-0000-4000-8000-00000000t002",
    businessId: "00000000-0000-4000-8000-00000000h003",
    businessName: "Grand Vista Hotel",
    status: "OFFERED",
    offeredAt: hours(-6),
    expiresAt: hours(162),
    note: "Taking it on means taking on its bookings.",
    counterpartyHandle: PERSON.handle,
  },
];

