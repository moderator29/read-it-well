import type { Listing } from "@/lib/listings/types";
import type { BookingView, RentChargeView } from "@/lib/bookings/queries";
import type { ReservationView } from "@/lib/reservations/queries";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import type { PaymentMethod } from "@/lib/payments/methods";
import type { StayDetail } from "@/app/(app)/stay/[id]/detail-model";
import type { StayCardData } from "@/components/app/stays/stay-card-model";

/**
 * Catalogue and stays fixtures for the preview harness.
 *
 * Brand-neutral and fictional: invented streets, invented names, the
 * catalogue's own photography. Money is integer kobo. `isDemo` is false on
 * purpose: these stand in for real inventory so the look is proven without
 * the example mark, which has its own row below.
 */
const P = (name: string) => `/brand/photos/${name}.jpg`;

function listing(over: Partial<Listing> & Pick<Listing, "id" | "title" | "kind">): Listing {
  return {
    slug: over.id,
    area: "Lekki Phase 1",
    city: "Lagos",
    state: "Lagos",
    priceMinor: 0,
    currency: "NGN",
    bedrooms: 0,
    bathrooms: 0,
    rating: 0,
    reviewCount: 0,
    verified: false,
    isDemo: false,
    instantBook: false,
    amenities: [],
    photos: [],
    hue: 0,
    ...over,
  };
}

export const RENTAL: Listing = listing({
  id: "00000000-0000-4000-8000-00000000f301",
  title: "Luxury 4 bedroom duplex with BQ",
  kind: "rental",
  intent: "rent",
  pricePeriod: "year",
  priceMinor: 12_000_000_00,
  cautionDepositMinor: 1_000_000_00,
  agencyFeeMinor: 1_200_000_00,
  legalFeeMinor: 500_000_00,
  moveInCostMinor: 14_700_000_00,
  moveInCostStated: true,
  bedrooms: 4,
  bathrooms: 5,
  toilets: 5,
  sizeSqm: 420,
  parkingSpaces: 2,
  verified: true,
  amenities: ["security", "pool", "gym", "parking", "generator", "wifi", "kitchen"],
  utilities: { powerGrid: "BAND_A", powerBackup: "GENERATOR_INVERTER", hasEstateAccess: true },
  photos: [
    P("villa-pool-skyline-01"),
    P("villa-pool-terrace"),
    P("living-room-dusk"),
    P("bedroom-01"),
    P("bathroom-01"),
    P("villa-exterior-sunset"),
    P("terrace-lounge-night"),
    P("bedroom-02"),
    P("living-room-day"),
    P("villa-exterior-gate"),
    P("villa-pool-skyline-02"),
    P("villa-pool-portrait"),
  ],
  hue: 1,
});

/**
 * The sale side's fixture, and the whole reason it exists is the DIFFERENCE
 * between a declared cost and a silent one.
 *
 * It declares the asking price, the agency fee and the legal fee, and says
 * NOTHING about Governor's consent, stamp duty or survey and registration,
 * which is exactly the shape of a real Nigerian sale listing today: the two
 * costs the seller's side charges are quoted and the three the state charges
 * are met after the buyer is committed. It states no total either, so the
 * block sums the parts it was given and labels the figure "from", which is
 * the only honest thing to call it.
 *
 * NO PERCENTAGE IS ENCODED HERE. The two fees happen to be five per cent of
 * the price because that is the convention a seller would quote, and nothing
 * in the product derives them: they are two figures somebody typed.
 */
export const SALE: Listing = listing({
  id: "00000000-0000-4000-8000-00000000f302",
  title: "4 bedroom terrace with a governor's consent in hand",
  kind: "home",
  intent: "sale",
  priceMinor: 180_000_000_00,
  salePriceMinor: 180_000_000_00,
  saleAgencyFeeMinor: 9_000_000_00,
  saleLegalFeeMinor: 9_000_000_00,
  tenure: "freehold",
  saleStatus: "available",
  bedrooms: 4,
  bathrooms: 4,
  toilets: 5,
  sizeSqm: 380,
  parkingSpaces: 2,
  verified: true,
  amenities: ["security", "parking", "generator", "kitchen"],
  utilities: { powerGrid: "BAND_A", powerBackup: "GENERATOR_INVERTER", hasEstateAccess: true },
  photos: [
    P("villa-exterior-sunset"),
    P("living-room-day"),
    P("bedroom-01"),
    P("villa-exterior-gate"),
  ],
  hue: 2,
});

export const SHELF: Listing[] = [
  listing({
    id: "00000000-0000-4000-8000-00000000f311",
    title: "Luxury 2 bedroom apartment with BQ",
    kind: "rental",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 950_000_00,
    bedrooms: 2,
    bathrooms: 3,
    sizeSqm: 140,
    verified: true,
    amenities: ["security", "parking"],
    photos: [P("villa-exterior-sunset")],
    hue: 0,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000f312",
    title: "Modern 3 bedroom duplex",
    kind: "rental",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 1_200_000_00,
    area: "Ikoyi",
    bedrooms: 3,
    bathrooms: 4,
    sizeSqm: 210,
    amenities: ["security"],
    photos: [P("tower-entrance-dusk")],
    hue: 2,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000f313",
    title: "Contemporary 4 bedroom terrace",
    kind: "home",
    intent: "sale",
    salePriceMinor: 185_000_000_00,
    priceMinor: 185_000_000_00,
    area: "Maitama",
    city: "Abuja",
    state: "FCT",
    bedrooms: 4,
    bathrooms: 4,
    sizeSqm: 300,
    verified: true,
    amenities: ["pool", "parking"],
    photos: [P("villa-pool-skyline-02")],
    hue: 3,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000f314",
    title: "Spacious 5 bedroom mansion",
    kind: "villa",
    intent: "sale",
    salePriceMinor: 350_000_000_00,
    priceMinor: 350_000_000_00,
    area: "Asokoro",
    city: "Abuja",
    state: "FCT",
    bedrooms: 5,
    bathrooms: 6,
    sizeSqm: 620,
    amenities: ["pool", "gym", "security"],
    photos: [P("villa-pool-terrace")],
    hue: 4,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000f315",
    title: "3 bedroom villa with pool",
    kind: "villa",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 2_800_000_00,
    area: "Banana Island",
    bedrooms: 3,
    bathrooms: 4,
    sizeSqm: 260,
    amenities: ["pool", "wifi"],
    photos: [P("villa-pool-portrait")],
    hue: 5,
  }),
  listing({
    id: "00000000-0000-4000-8000-00000000f316",
    title: "Land for sale",
    kind: "land",
    intent: "sale",
    salePriceMinor: 85_000_000_00,
    priceMinor: 85_000_000_00,
    area: "Epe",
    sizeSqm: 5000,
    tenure: "certificate_of_occupancy",
    hue: 1,
  }),
];

/** The one example row, so the disclosure mark is proven on the shelf too. */
export const EXAMPLE_LISTING: Listing = listing({
  id: "00000000-0000-4000-8000-00000000f399",
  title: "Two bedroom flat off Admiralty Way",
  kind: "apartment",
  intent: "rent",
  pricePeriod: "year",
  priceMinor: 3_500_000_00,
  bedrooms: 2,
  bathrooms: 2,
  isDemo: true,
  hue: 2,
});

export const STAYS: StayCardData[] = [
  {
    id: "00000000-0000-4000-8000-00000000f321",
    href: "/preview/f3/stay",
    title: "Grand Vista Hotel",
    where: "Victoria Island, Lagos",
    kind: "hotel",
    hue: 0,
    photo: P("resort-pool-deck"),
    verified: true,
    isDemo: false,
    rating: null,
    nightlyMinor: 120_000_00,
    currency: "NGN",
    amenities: ["wifi", "pool", "breakfast", "gym"],
    totalMinor: null,
    nights: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000f322",
    href: "/preview/f3/stay",
    title: "Pearl Waterside Apartments",
    where: "Eko Atlantic, Lagos",
    kind: "apartment",
    hue: 3,
    photo: P("living-room-dusk"),
    verified: true,
    isDemo: false,
    rating: { average: 4.6, count: 189 },
    nightlyMinor: 85_000_00,
    currency: "NGN",
    amenities: ["kitchen", "wifi", "security", "parking"],
    totalMinor: null,
    nights: null,
  },
];

export const STAY: StayDetail = {
  id: "00000000-0000-4000-8000-00000000f321",
  name: "Oceanview Villa Suites",
  description:
    "A four bedroom villa on the water with a private pool, open living spaces and the sea on three sides. Suited to families, groups and a long weekend away.",
  starRating: 5,
  city: "Lagos",
  area: "Lekki Phase 1",
  checkInFrom: "14:00:00",
  checkOutBy: "11:00:00",
  houseRules: "No parties. Quiet hours from 22:00.",
  photos: [
    { url: P("resort-pool-deck"), alt: null },
    { url: P("bedroom-01"), alt: null },
    { url: P("bathroom-01"), alt: null },
    { url: P("living-room-day"), alt: null },
    { url: P("terrace-lounge-night"), alt: null },
  ],
  amenities: ["Wi-Fi", "Air conditioning", "Kitchen", "Parking", "Security"],
  roomTypes: [
    {
      id: "room-1",
      name: "Garden suite",
      category: "suite",
      description: "A suite opening onto the pool deck.",
      sleeps: 2,
      baseRateMinor: 250_000_00,
      sizeSqm: 48,
      ratePlans: [
        {
          id: "plan-1",
          name: "Room only",
          mealPlan: "room_only",
          rateMinor: 250_000_00,
          minStayNights: 1,
          maxStayNights: null,
          policy: { id: "pol-1", name: "Flexible", summary: "Free cancellation until 48 hours before arrival.", freeUntilHours: 48 },
        },
      ],
    },
    {
      id: "room-2",
      name: "Family room",
      category: "family",
      description: null,
      sleeps: 4,
      baseRateMinor: 320_000_00,
      sizeSqm: 64,
      ratePlans: [
        {
          id: "plan-2",
          name: "Breakfast included",
          mealPlan: "breakfast",
          rateMinor: 340_000_00,
          minStayNights: 2,
          maxStayNights: null,
          policy: null,
        },
      ],
    },
  ],
  policy: { id: "pol-1", name: "Flexible", summary: "Free cancellation until 48 hours before arrival.", freeUntilHours: 48 },
  businessKind: "resort",
  hostName: "Oceanview Hospitality",
  hostVerified: true,
  /* The harness stands in for real inventory, so this fixture carries the
     rating a reviewed property would, exactly as STAYS[1] does. The live read
     carries none and the face draws none; see the note in the route. */
  rating: { average: 4.8, count: 132 },
};

export const BOOKINGS: BookingView[] = [
  {
    id: "00000000-0000-4000-8000-00000000f331",
    listingId: STAYS[0]!.id,
    title: "Grand Vista Hotel",
    area: "Victoria Island",
    city: "Lagos",
    photo: P("bedroom-01"),
    checkIn: "2026-10-02",
    checkOut: "2026-10-05",
    dateRange: "Fri 2 Oct to Mon 5 Oct",
    nights: 3,
    guests: 2,
    totalDisplay: "₦360,000",
    status: "CONFIRMED",
    cancellable: true,
    arrivingName: null,
    arrivingPhone: null,
    reviewed: false,
    reviewable: false,
  },
  {
    id: "00000000-0000-4000-8000-00000000f332",
    listingId: STAYS[1]!.id,
    title: "Pearl Waterside Apartments",
    area: "Eko Atlantic",
    city: "Lagos",
    photo: P("living-room-dusk"),
    checkIn: "2026-08-14",
    checkOut: "2026-08-16",
    dateRange: "Fri 14 Aug to Sun 16 Aug",
    nights: 2,
    guests: 2,
    totalDisplay: "₦170,000",
    status: "COMPLETED",
    cancellable: false,
    arrivingName: null,
    arrivingPhone: null,
    reviewed: false,
    reviewable: true,
  },
];

/**
 * TENANCY CHARGES, the fourth group `getMyBookings` answers with.
 *
 * A move-in day and a rent period, never a range and never a night. The
 * totals are the charge's own frozen figures as the read formats them, and
 * the one door is `/rent/pay/<inspectionId>`, never a stay checkout. The
 * second row is a settled charge, which is what proves the payment control
 * disappears once money is against it.
 */
export const TENANCIES: RentChargeView[] = [
  {
    id: "00000000-0000-4000-8000-00000000f371",
    inspectionId: "00000000-0000-4000-8000-00000000f381",
    listingId: RENTAL.id,
    title: "Luxury 4 bedroom duplex with BQ",
    area: "Lekki Phase 1",
    city: "Lagos",
    photo: P("villa-pool-skyline-01"),
    moveIn: "2026-10-01",
    moveInLabel: "Thu 1 Oct",
    rentPeriod: "year",
    periodLabel: "Yearly",
    totalDisplay: "₦14,700,000",
    status: "PENDING",
    paid: false,
    payable: true,
    href: "/rent/pay/00000000-0000-4000-8000-00000000f381",
    fileHref: "/tenancy/00000000-0000-4000-8000-00000000f391",
  },
  {
    id: "00000000-0000-4000-8000-00000000f372",
    inspectionId: "00000000-0000-4000-8000-00000000f382",
    listingId: "00000000-0000-4000-8000-00000000f312",
    title: "Modern 3 bedroom duplex",
    area: "Ikoyi",
    city: "Lagos",
    photo: P("tower-entrance-dusk"),
    moveIn: "2026-03-01",
    moveInLabel: "Sun 1 Mar",
    rentPeriod: "year",
    periodLabel: "Yearly",
    totalDisplay: "₦6,200,000",
    status: "CONFIRMED",
    paid: true,
    payable: false,
    href: "/rent/pay/00000000-0000-4000-8000-00000000f382",
    fileHref: "/tenancy/00000000-0000-4000-8000-00000000f392",
  },
];

export const RESERVATIONS: ReservationView[] = [
  {
    id: "00000000-0000-4000-8000-00000000f341",
    listingId: "00000000-0000-4000-8000-00000000f351",
    businessId: null,
    listingTitle: "The Lagoon Kitchen",
    location: "Ikoyi, Lagos",
    reservedFor: "2026-10-03T19:30:00.000Z",
    partySize: 4,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
  },
];

export const CHECKOUT: CheckoutView = {
  bookingId: BOOKINGS[0]!.id,
  listingId: STAYS[0]!.id,
  title: "Grand Vista Hotel",
  location: "Victoria Island, Lagos",
  checkIn: "2026-10-02",
  checkOut: "2026-10-05",
  dateRange: "Fri 2 Oct to Mon 5 Oct",
  nights: 3,
  guests: 2,
  lines: [
    { label: "3 nights", display: "₦360,000", minor: 360_000_00 },
    { label: "Cleaning", display: "₦0", minor: 0 },
  ],
  platformTakesNothing: true,
  currency: "NGN",
  locale: "en",
  totalMinor: 360_000_00,
  totalDisplay: "₦360,000",
  status: "PENDING",
  paid: false,
  holdExpiresAt: new Date(Date.now() + 40 * 60_000).toISOString(),
  holdExpired: false,
  cardAvailable: true,
  walletBalanceMinor: 120_000_00,
  walletBalanceDisplay: "₦120,000",
  walletCovers: false,
};

export const SAVED_CARDS: PaymentMethod[] = [
  {
    id: "00000000-0000-4000-8000-00000000f361",
    cardType: "visa",
    last4: "4081",
    expMonth: 9,
    expYear: 2028,
    bank: "First Bank",
    reusable: true,
    isDefault: true,
    createdAt: "2026-06-01T09:00:00.000Z",
  },
];

export const RESTAURANTS: StayCardData[] = [
  {
    id: "00000000-0000-4000-8000-00000000f351",
    href: "/preview/f3/restaurants",
    title: "The Lagoon Kitchen",
    where: "Ikoyi, Lagos",
    kind: "restaurant",
    hue: 0,
    photo: null,
    standIn: P("restaurant-01"),
    hours: { openNow: true, label: "Open until 23:00" },
    verified: false,
    isDemo: false,
    rating: null,
    nightlyMinor: null,
    currency: "NGN",
    amenities: ["parking", "generator"],
    totalMinor: null,
    nights: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000f352",
    href: "/preview/f3/restaurants",
    title: "Harbour Lounge",
    where: "Victoria Island, Lagos",
    kind: "restaurant",
    hue: 1,
    photo: null,
    standIn: P("restaurant-02-lounge"),
    hours: { openNow: false, label: "Opens at 18:00" },
    verified: false,
    isDemo: false,
    rating: null,
    nightlyMinor: null,
    currency: "NGN",
    amenities: ["parking"],
    totalMinor: null,
    nights: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000f353",
    href: "/preview/f3/restaurants",
    title: "Copper Bar and Grill",
    where: "Wuse 2, Abuja",
    kind: "restaurant",
    hue: 2,
    photo: null,
    standIn: P("restaurant-03-bar"),
    verified: false,
    isDemo: false,
    rating: null,
    nightlyMinor: null,
    currency: "NGN",
    amenities: [],
    totalMinor: null,
    nights: null,
  },
];
