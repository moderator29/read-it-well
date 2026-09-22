import type { MyAccommodation, MyBusiness } from "@/lib/host/queries";
import type { AccommodationPhoto } from "@/lib/stays/accommodation-photos";

/**
 * Fixtures for the stays supply surfaces, stated here so every C2 preview
 * draws the same hotel.
 *
 * NOTHING HERE IS A COUNT OR A PRICE THE DATABASE WOULD HAVE TO PRODUCE. The
 * names are a plausible Abuja hotel and the photographs are the lead's own
 * filed plates from `public/brand/photos`, which is what the seed uses too.
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
