import { emptyHostDraft, type HostDraft } from "@/lib/host/onboarding";

/**
 * THE THREE HOSTS THE GOVERNING IMAGES DRAW.
 *
 * Every figure below is the render's own. `GOVERNING-10` screen one writes
 * "Lagoon Suites", "RC 1234567", "Plot 12, Admiralty Way", four stars and 50
 * rooms; its screen three writes 85,000 and 105,000 a night against a Deluxe
 * double; `GOVERNING-11` writes "The Lagoon Grill" and 85,000 for the
 * shortlet. Nothing here is a number this build invented, which is the point
 * of a fixture that exists to be photographed beside the image it copies.
 *
 * MONEY IS INTEGER KOBO. 85,000 naira is 8,500,000 kobo, and `formatMoney` is
 * the only thing that turns it back into words.
 */

const ADDRESS = {
  address: "Plot 12, Admiralty Way",
  area: "Lekki",
  city: "Lagos",
  stateCode: "LA",
};

/** A hotelier partway through `GOVERNING-10`. */
export function hotelDraft(over: Partial<HostDraft> = {}): HostDraft {
  return {
    ...emptyHostDraft(),
    businessId: "b0000000-0000-4000-8000-000000000001",
    status: "DRAFT",
    hostType: "business",
    kind: "hotel",
    name: "Lagoon Suites",
    phone: "+2348031234567",
    cacNumber: "RC 1234567",
    registeredName: "Lagoon Suites Limited",
    representativeName: "Emeka Okafor",
    representativePhone: "+2348031234567",
    ...ADDRESS,
    accommodation: {
      id: "a0000000-0000-4000-8000-000000000001",
      name: "Lagoon Suites",
      hasPin: true,
      photos: [],
      facilities: ["pool", "gym", "parking", "generator", "wifi", "ac"],
      starRating: 4,
      checkInFrom: "14:00",
      checkOutBy: "11:00",
      houseRules: "",
      cancellationPolicyId: "ef000000-0000-4000-8000-000000000001",
    },
    roomTypeCount: 2,
    ratePlanCount: 2,
    roomTypes: [
      {
        id: "r0000000-0000-4000-8000-000000000001",
        name: "Deluxe double",
        sleeps: 2,
        unitsTotal: 20,
        rateCount: 2,
        category: "double",
        baseRateMinor: 8_500_000,
        rates: [
          {
            id: "p0000000-0000-4000-8000-000000000001",
            name: "Room only",
            mealPlan: "room_only",
            rateMinor: 8_500_000,
          },
          {
            id: "p0000000-0000-4000-8000-000000000002",
            name: "Bed and breakfast",
            mealPlan: "breakfast",
            rateMinor: 10_500_000,
          },
        ],
        beds: null,
      },
      {
        id: "r0000000-0000-4000-8000-000000000002",
        name: "Executive suite",
        sleeps: 3,
        unitsTotal: 10,
        rateCount: 0,
        category: "suite",
        baseRateMinor: 15_000_000,
        rates: [],
        beds: null,
      },
    ],
    hasBankAccount: false,
    ...over,
  };
}

/** A shortlet operator partway through `GOVERNING-11` screens one and two. */
export function shortletDraft(over: Partial<HostDraft> = {}): HostDraft {
  return {
    ...emptyHostDraft(),
    businessId: "b0000000-0000-4000-8000-000000000002",
    status: "DRAFT",
    hostType: "individual",
    kind: "shortlet_operator",
    name: "Admiralty Flat",
    phone: "+2348031234567",
    representativeName: "Ada Obi",
    representativePhone: "+2348031234567",
    ...ADDRESS,
    accommodation: {
      id: "a0000000-0000-4000-8000-000000000002",
      name: "Admiralty Flat",
      hasPin: false,
      photos: [],
      facilities: [],
      starRating: null,
      checkInFrom: "14:00",
      checkOutBy: "11:00",
      houseRules: "",
      cancellationPolicyId: "ef000000-0000-4000-8000-000000000001",
    },
    roomTypeCount: 1,
    ratePlanCount: 0,
    roomTypes: [
      {
        id: "r0000000-0000-4000-8000-000000000003",
        name: "Admiralty Flat",
        sleeps: 6,
        unitsTotal: 1,
        rateCount: 0,
        /*
         * THE VALUE THE DATABASE DOES NOT HAVE YET, shown here so the drawn
         * tile can be photographed in its chosen state. The migration that
         * adds it is in the tree and has not been applied; see the ledger.
         */
        category: "entire_flat",
        baseRateMinor: 8_500_000,
        rates: [],
        beds: { bedrooms: 2, beds: 3 },
      },
    ],
    hasBankAccount: false,
    ...over,
  };
}

/** A restaurant partway through `GOVERNING-11` screens three and four. */
export function restaurantDraft(over: Partial<HostDraft> = {}): HostDraft {
  return {
    ...emptyHostDraft(),
    businessId: "b0000000-0000-4000-8000-000000000003",
    status: "DRAFT",
    hostType: "restaurant",
    kind: "restaurant",
    name: "The Lagoon Grill",
    phone: "+2348031234567",
    representativeName: "Grace Tobi",
    representativePhone: "+2348031234567",
    ...ADDRESS,
    restaurant: {
      priceBand: 2,
      cuisineCount: 2,
      cuisines: ["Nigerian", "Continental"],
    },
    serviceWindowCount: 7,
    serviceWindows: [
      { id: "w1", weekday: 1, opens: "08:00", lastSeating: "23:00", closes: "23:00", covers: 90 },
      { id: "w2", weekday: 2, opens: "08:00", lastSeating: "23:00", closes: "23:00", covers: 90 },
      { id: "w3", weekday: 3, opens: "08:00", lastSeating: "23:00", closes: "23:00", covers: 90 },
      { id: "w4", weekday: 4, opens: "08:00", lastSeating: "23:00", closes: "23:00", covers: 90 },
      { id: "w5", weekday: 5, opens: "08:00", lastSeating: "23:59", closes: "23:59", covers: 90 },
      { id: "w6", weekday: 6, opens: "08:00", lastSeating: "23:59", closes: "23:59", covers: 90 },
      { id: "w0", weekday: 0, opens: "08:00", lastSeating: "23:00", closes: "23:00", covers: 90 },
    ],
    hygieneAttestedAt: null,
    hasBankAccount: false,
    ...over,
  };
}
