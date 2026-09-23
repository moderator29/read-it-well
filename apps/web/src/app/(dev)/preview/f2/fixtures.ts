import type { ListingKind } from "@/lib/listings/types";
import type { PlatformStats } from "@/lib/platform-stats";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";

/**
 * Fixtures for the F2 preview harness (docs/archive/BUILD_06_LEDGER.md section 5).
 *
 * Brand-neutral and fictional: the catalogue's invented street names, no
 * real agency, no real person. Prices are integer kobo. `verified` is true
 * on one card so the badge's two states are both visible; the harness is
 * the proof of the look, never of the data, and it is a 404 in production.
 * The stats are the sandbox's own baseline counts from the ledger, so the
 * tiles are shown at a realistic width rather than at "10K+".
 */
export const PREVIEW_CARDS: MiniListing[] = [
  {
    id: "preview-1",
    href: "/search",
    title: "5 bedroom villa with pool, Lekki Phase 1",
    place: "Lekki Phase 1, Lagos",
    priceMinor: 85_000_000_00,
    currency: "NGN",
    suffix: "/yr",
    photo: photo("villa-pool-skyline-01"),
    hue: 1,
    kind: "villa",
    verified: true,
    market: "To rent",
  },
  {
    id: "preview-2",
    href: "/search",
    title: "Serviced 2 bedroom flat, Victoria Island",
    place: "Victoria Island, Lagos",
    priceMinor: 120_000_00,
    currency: "NGN",
    suffix: "/night",
    photo: photo("living-room-dusk"),
    hue: 3,
    kind: "shortlet",
    verified: false,
    market: "Per night",
  },
  {
    id: "preview-3",
    href: "/search",
    title: "4 bedroom terrace, Maitama",
    place: "Maitama, Abuja",
    priceMinor: 12_000_000_00,
    currency: "NGN",
    suffix: "/yr",
    photo: photo("terrace-lounge-night"),
    hue: 4,
    kind: "rental",
    verified: false,
    market: "To rent",
  },
  {
    id: "preview-4",
    href: "/search",
    title: "Deluxe king room, Ikeja GRA",
    place: "Ikeja GRA, Lagos",
    priceMinor: 65_000_00,
    currency: "NGN",
    suffix: "/night",
    photo: photo("bedroom-01"),
    hue: 0,
    kind: "hotel",
    verified: false,
    market: "Per night",
  },
  {
    id: "preview-5",
    href: "/search",
    title: "Detached house with garden, Banana Island",
    place: "Banana Island, Lagos",
    priceMinor: 450_000_000_00,
    currency: "NGN",
    suffix: "",
    photo: photo("villa-exterior-sunset"),
    hue: 2,
    kind: "home",
    verified: false,
    market: "For sale",
  },
];

export const PREVIEW_STATS: PlatformStats = { listings: 64, cities: 4, states: 3, agents: 6 };

export const PREVIEW_COUNTS: ReadonlyMap<ListingKind, number> = new Map<ListingKind, number>([
  ["apartment", 16],
  ["home", 16],
  ["shortlet", 8],
  ["rental", 8],
  ["villa", 3],
  ["land", 3],
  ["office", 3],
  ["shop", 3],
  ["hotel", 2],
  ["restaurant", 2],
]);
