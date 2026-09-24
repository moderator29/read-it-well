import type { MyAccommodation, MyBusiness, MyRoomType } from "@/lib/host/queries";
import type { AccommodationPhoto } from "@/lib/stays/accommodation-photos";

/**
 * Fixtures for the stays supply surfaces, stated here so every C2 preview
 * draws the same hotel.
 *
 * NOTHING HERE IS A COUNT OR A PRICE THE DATABASE WOULD HAVE TO PRODUCE. The
 * names are a plausible Abuja hotel and the photographs are the filed
 * plates from `public/brand/photos`, which is what the seed uses too.
 */

export const C2_OWNER = "00000000-0000-4000-8000-0000000c2010";

export const C2_HOTEL: MyBusiness = {
  id: "00000000-0000-4000-8000-0000000c2001",
  name: "Wuse Garden Hotel",
  slug: "wuse-garden-hotel",
  kind: "hotel",
  status: "SUBMITTED",
  hostType: "business",
  verificationTier: 1,
  verified: false,
  submittedAt: "2026-09-21T10:03:00.000Z",
  reviewedAt: null,
  reviewNotes: null,
  createdAt: "2026-09-21T09:40:00.000Z",
};

export const C2_HOTEL_PROPERTY: MyAccommodation = {
  id: "00000000-0000-4000-8000-0000000c2002",
  name: "Wuse Garden Hotel",
  status: "DRAFT",
};

export const C2_PROPERTY_PHOTOS: AccommodationPhoto[] = [
  {
    id: "00000000-0000-4000-8000-0000000c2060",
    storagePath: "/brand/photos/bedroom-01.jpg",
    url: "/brand/photos/bedroom-01.jpg",
    position: 0,
  },
  {
    id: "00000000-0000-4000-8000-0000000c2061",
    storagePath: "/brand/photos/bathroom-01.jpg",
    url: "/brand/photos/bathroom-01.jpg",
    position: 1,
  },
  {
    id: "00000000-0000-4000-8000-0000000c2062",
    storagePath: "/brand/photos/resort-pool-deck.jpg",
    url: "/brand/photos/resort-pool-deck.jpg",
    position: 2,
  },
];

/**
 * Two room types as the host's own console reads them: one on the shelf with a
 * year of nights open, one saved with a rate and not a single night on sale,
 * which is the state EVERY hotel on the platform was in, because nothing in
 * the application had ever written a `room_inventory` row.
 */
export const C2_ROOM_TYPES: MyRoomType[] = [
  {
    id: "00000000-0000-4000-8000-0000000c2070",
    name: "Deluxe double",
    category: "double",
    sleeps: 2,
    unitsTotal: 20,
    lowestRateMinor: 8_500_000,
    status: "PUBLISHED",
    nightsOnSale: 365,
    lastNightOnSale: "2027-09-21",
  },
  {
    id: "00000000-0000-4000-8000-0000000c2071",
    name: "Executive suite",
    category: "suite",
    sleeps: 3,
    unitsTotal: 10,
    lowestRateMinor: 14_500_000,
    status: "DRAFT",
    nightsOnSale: 0,
    lastNightOnSale: null,
  },
];

/** The same two rooms before a single night was ever put on sale. */
export const C2_ROOM_TYPES_NO_NIGHTS: MyRoomType[] = C2_ROOM_TYPES.map((room) => ({
  ...room,
  status: "DRAFT",
  nightsOnSale: 0,
  lastNightOnSale: null,
}));
