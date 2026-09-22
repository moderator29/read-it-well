import type { BusinessQueueRow } from "@/lib/admin/business-queries";
import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "@/app/host/reservations/board";

/**
 * Fixtures for the three P3 surfaces.
 *
 * Real components, made-up rows, so a signed-in surface can be screenshotted
 * in a sandbox with no session. Never the proof of the ONE LAW, only the proof
 * of the look. Nothing here is written anywhere and nothing here is seeded.
 *
 * The venue is deliberately HALF FINISHED: hours and a phone but no
 * photographs and no cuisines, which is exactly the state a venue signed
 * across a table on a Tuesday is in. A fixture where everything passes would
 * prove the one state the desk was not built for.
 */

const HOUR = 3_600_000;

/** A fixed clock, so a proof taken twice is the same picture twice. */
export const P3_NOW = new Date("2026-09-19T17:00:00.000+01:00");

export const P3_BUSINESS: BusinessQueueRow = {
  id: "00000000-0000-4000-8000-0000000p3001",
  name: "Yellow Chilli Ikoyi",
  slug: "yellow-chilli-ikoyi",
  kind: "restaurant",
  status: "SUBMITTED",
  hostType: "restaurant",
  city: "Lagos",
  area: "Ikoyi",
  stateCode: "LA",
  address: "27 Awolowo Road, Ikoyi",
  phone: "+2348031234567",
  email: "bookings@example.test",
  cacNumber: "BN 2841993",
  registeredName: "Yellow Chilli Hospitality",
  tin: null,
  representativeName: "Amaka Obi",
  representativePhone: "+2348039876543",
  consents: {
    accuracy: "2026-09-18T10:02:00.000Z",
    terms: "2026-09-18T10:02:10.000Z",
    processing: "2026-09-18T10:02:20.000Z",
  },
  hygieneAttestedAt: "2026-09-18T10:01:00.000Z",
  licenceAttestedAt: null,
  ownerId: "00000000-0000-4000-8000-0000000p3010",
  ownerName: "Amaka Obi",
  payoutName: "AMAKA NGOZI OBI",
  payoutBank: "Guaranty Trust Bank",
  payoutNameMismatch: true,
  verificationTier: 0,
  verified: false,
  photoCount: 0,
  submittedAt: "2026-09-18T10:03:00.000Z",
  reviewedAt: null,
  reviewNotes: null,
  createdAt: "2026-09-18T09:40:00.000Z",
  documents: [
    {
      id: "00000000-0000-4000-8000-0000000p3020",
      kind: "identity",
      uploadedAt: "2026-09-18T09:58:00.000Z",
      media: "image" as const,
    },
    {
      id: "00000000-0000-4000-8000-0000000p3021",
      kind: "hygiene",
      uploadedAt: "2026-09-18T10:00:00.000Z",
      media: "image" as const,
    },
  ],
  rungs: [],
  properties: [],
  restaurant: { priceBand: 3, cuisineCount: 0, windowCount: 4 },
};

/** The same venue a day later, read and approved, waiting on the shelf gate. */
export const P3_BUSINESS_APPROVED: BusinessQueueRow = {
  ...P3_BUSINESS,
  id: "00000000-0000-4000-8000-0000000p3002",
  name: "Vallo House Kitchen",
  slug: "vallo-house-kitchen",
  status: "APPROVED",
  area: "Maitama",
  city: "Abuja",
  stateCode: "FC",
  payoutNameMismatch: false,
  payoutName: "VALLO SPACES LTD",
  verificationTier: 1,
  photoCount: 4,
  reviewedAt: "2026-09-19T08:30:00.000Z",
  restaurant: { priceBand: 2, cuisineCount: 3, windowCount: 6 },
  rungs: [
    {
      rung: "identity",
      status: "passed",
      note: "International passport, current, names the representative on the application.",
      decidedAt: "2026-09-19T08:31:00.000Z",
      reviewerName: "Operations",
    },
  ],
};

function table(
  id: string,
  over: Partial<HostReservationView> & Pick<HostReservationView, "reservedFor" | "status">,
): HostReservationView {
  return {
    id,
    listingId: null,
    businessId: P3_BUSINESS.id,
    listingTitle: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    partySize: 2,
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: false,
    guestId: "00000000-0000-4000-8000-0000000p3030",
    guestName: "A guest",
    awaitingAnswer: false,
    ...over,
  };
}

export const P3_TABLE_BOARD: HostTableBoard = {
  requests: [
    table("00000000-0000-4000-8000-0000000p3040", {
      status: "PENDING",
      reservedFor: new Date(P3_NOW.getTime() + 2 * HOUR).toISOString(),
      partySize: 4,
      guestName: "Tunde Bakare",
      awaitingAnswer: true,
      note: "One of us cannot have peanuts. We may be fifteen minutes late from Victoria Island.",
      conversationId: "00000000-0000-4000-8000-0000000p3050",
    }),
    table("00000000-0000-4000-8000-0000000p3041", {
      status: "PENDING",
      reservedFor: new Date(P3_NOW.getTime() + 26 * HOUR).toISOString(),
      partySize: 2,
      guestName: "Ifeoma Nwosu",
      awaitingAnswer: true,
    }),
  ],
  upcoming: [
    table("00000000-0000-4000-8000-0000000p3042", {
      status: "CONFIRMED",
      reservedFor: new Date(P3_NOW.getTime() + 4 * HOUR).toISOString(),
      partySize: 6,
      guestName: "Chidi Okonkwo",
      note: "A birthday. A high chair if you have one.",
      conversationId: "00000000-0000-4000-8000-0000000p3051",
    }),
  ],
  past: [
    table("00000000-0000-4000-8000-0000000p3043", {
      status: "CANCELLED",
      reservedFor: new Date(P3_NOW.getTime() - 20 * HOUR).toISOString(),
      partySize: 3,
      guestName: "Zainab Bello",
    }),
  ],
  total: 4,
};

/** The plates the lead filed, standing in for an owner's own photographs. */
export const P3_PHOTOS = [
  { id: "00000000-0000-4000-8000-0000000p3060", url: "/brand/photos/restaurant-01.jpg" },
  { id: "00000000-0000-4000-8000-0000000p3061", url: "/brand/photos/restaurant-02-lounge.jpg" },
  { id: "00000000-0000-4000-8000-0000000p3062", url: "/brand/photos/restaurant-03-bar.jpg" },
];

/**
 * The board on the day a venue signs: nothing has ever arrived.
 *
 * Stated here rather than imported from `@/app/host/reservations/board`,
 * which is where the same constant lives for the route. That module opens with
 * `import "server-only"` and pulls in the admin client and the reader behind
 * it, and importing it as a VALUE from a preview page took the whole route to
 * a 404 on the dev server while the identical page next door, which imports
 * only fixtures, rendered. The harness pages stay clear of the read path
 * entirely, which is the rule the rest of this file already follows.
 */
export const P3_EMPTY_BOARD: HostTableBoard = {
  requests: [],
  upcoming: [],
  past: [],
  total: 0,
};
