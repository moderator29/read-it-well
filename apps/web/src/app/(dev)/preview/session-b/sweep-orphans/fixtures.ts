import type { OpenPlace, PlaceTree } from "@/lib/social/places-schema";
import type { AreaDetail, AreaProposal, AreaSummary } from "@/lib/social/areas-queries";
import type { RentPayView } from "@/lib/rent/queries";
import type { ListingReview, ReviewSubject } from "@/lib/reviews/queries";
import type { SavedSearchView } from "@/lib/saved/searches";

/*
 * Fixture props for the orphans sweep harness (rule R-G): every value here is
 * made up for the proof and says so by living under `(dev)/preview`. The
 * booking, tenancy, saved and inspection fixtures are the committed ones in
 * `../../f3/fixtures.ts` and `../../f5/fixtures.ts`, read, not copied.
 */

const AREA_BASE: AreaSummary = {
  id: "00000000-0000-4000-8000-0000000a0e01",
  slug: "lagos-yaba",
  name: "Yaba",
  kind: "AREA",
  city: "Lagos",
  stateCode: "LA",
  area: "Yaba",
  blurb: "Around the college gates, the market and the rail line. Rooms, rent and who to ask.",
  status: "ACTIVE",
  lgaCode: null,
  withinLgaCode: "LA-MAI",
  memberCount: 214,
  postCount: 38,
  slowMode: false,
  openedAt: "2026-08-01T09:00:00.000Z",
};

export const AREAS: AreaSummary[] = [
  AREA_BASE,
  {
    ...AREA_BASE,
    id: "00000000-0000-4000-8000-0000000a0e02",
    slug: "lagos-surulere",
    name: "Surulere",
    area: "Surulere",
    blurb: null,
    memberCount: 1,
    postCount: 0,
  },
  {
    ...AREA_BASE,
    id: "00000000-0000-4000-8000-0000000a0e03",
    slug: "abuja-gwagwalada",
    name: "Gwagwalada",
    city: "Abuja",
    stateCode: "FC",
    status: "PAUSED",
    blurb: "Paused while we look again at who keeps it.",
    memberCount: 57,
  },
];

export const MODERATORS: AreaDetail["moderators"] = [
  { userId: "00000000-0000-4000-8000-0000000a0f01", handle: "tolu.yaba", displayName: "Tolu" },
  { userId: "00000000-0000-4000-8000-0000000a0f02", handle: null, displayName: null },
];

export const PROPOSALS: AreaProposal[] = [
  {
    id: "00000000-0000-4000-8000-0000000a0d01",
    slug: "abuja-kubwa",
    name: "Kubwa",
    city: "Abuja",
    status: "PROPOSED",
    decisionNote: null,
    createdAt: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-0000000a0d02",
    slug: "lagos-ikoyi-south",
    name: "Ikoyi South",
    city: "Lagos",
    status: "REJECTED",
    decisionNote: "Ikoyi is already open and covers these streets. Join it instead.",
    createdAt: "2026-09-10T09:00:00.000Z",
  },
];

export const STATES = [
  { code: "LA", name: "Lagos" },
  { code: "FC", name: "Federal Capital Territory" },
];

export const REVIEW_SUBJECT: ReviewSubject = {
  bookingId: "00000000-0000-4000-8000-00000000b002",
  listingId: "00000000-0000-4000-8000-00000000a002",
  title: "Lekki Palm Grove shortlet",
  location: "Lekki Phase 1, Lagos",
  checkOutDisplay: "Sun 16 Aug",
};

export const REVIEW: ListingReview = {
  id: "00000000-0000-4000-8000-00000000c0f1",
  rating: 4,
  body: "Quiet street, the power held all weekend and the agent answered within the hour.",
  author: "Seyi O.",
  when: "18 Aug 2026",
  response: null,
};

export const RENT_VIEW: RentPayView = {
  inspectionId: "00000000-0000-4000-8000-00000000d001",
  inspectionState: "COMPLETED",
  listingId: "00000000-0000-4000-8000-00000000a001",
  title: "Two bedroom flat, Lekki Phase 1",
  location: "Lekki Phase 1, Lagos",
  moveIn: "1 Oct 2026",
  rentPeriod: "year",
  lines: [
    { label: "Rent, one year", display: "₦3,500,000.00", minor: 350_000_000 },
    { label: "Agency fee", display: "₦350,000.00", minor: 35_000_000 },
    { label: "Caution deposit", display: "₦250,000.00", minor: 25_000_000 },
  ],
  totalStated: false,
  totalMinor: 410_000_000,
  totalDisplay: "₦4,100,000.00",
  currency: "NGN",
  locale: "en",
  bookingId: null,
  bookingStatus: null,
  paid: false,
  chargeOpen: false,
  holdExpiresAt: null,
  holdExpired: false,
  cardAvailable: true,
  walletBalanceMinor: 12_500_000,
  walletBalanceDisplay: "₦125,000.00",
  walletCovers: false,
  moveInDisplay: "Thu 1 Oct",
  quotedAt: null,
  quotedOnDisplay: null,
  remainderMinor: 0,
  remainderDisplay: "₦0.00",
  routes: { leadWithTransfer: true, walletOffered: true, walletLimitMinor: 1_000_000_000 },
};

export const SAVED_SEARCHES: SavedSearchView[] = [
  {
    id: "00000000-0000-4000-8000-00000000e001",
    label: "Two bedrooms in Yaba under 2m a year",
    derivedLabel: false,
    params: { area: "Yaba", beds: "2", max: "2000000", kind: "rental" },
    href: "/search?area=Yaba&beds=2&max=2000000&kind=rental",
    key: "area=Yaba&beds=2&kind=rental&max=2000000",
    alertEnabled: true,
    createdAt: "2026-09-12T09:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-00000000e002",
    label: "Shortlets in Lekki",
    derivedLabel: true,
    params: { area: "Lekki", kind: "shortlet" },
    href: "/search?area=Lekki&kind=shortlet",
    key: "area=Lekki&kind=shortlet",
    alertEnabled: false,
    createdAt: "2026-09-02T09:00:00.000Z",
  },
];

/* The place picker (SW-O2): two states, Lagos with six of its local
   governments, two of them already open. Names are the public reference list;
   member counts are fixture numbers. */
export const PICKER_TREE: PlaceTree = [
  {
    code: "LA",
    name: "Lagos",
    lgas: [
      { code: "la_eti_osa", name: "Eti-Osa" },
      { code: "la_ikeja", name: "Ikeja" },
      { code: "la_lagos_mainland", name: "Lagos Mainland" },
      { code: "la_surulere", name: "Surulere" },
      { code: "la_alimosho", name: "Alimosho" },
      { code: "la_kosofe", name: "Kosofe" },
    ],
  },
  { code: "FC", name: "Federal Capital Territory", lgas: [{ code: "fc_amac", name: "Abuja Municipal" }] },
];

export const PICKER_OPEN: OpenPlace[] = [
  { lgaCode: "la_eti_osa", slug: "eti-osa", name: "Eti-Osa", status: "ACTIVE", memberCount: 412, postCount: 90 },
  { lgaCode: "la_lagos_mainland", slug: "lagos-mainland", name: "Lagos Mainland", status: "ACTIVE", memberCount: 128, postCount: 31 },
];

/** V-13 and V-25: a Banana Island move-in, quoted, with ₦150,000 nobody itemised. */
export const RENT_VIEW_LARGE: RentPayView = {
  ...RENT_VIEW,
  title: "Four bedroom maisonette, Banana Island",
  location: "Banana Island, Lagos",
  lines: [
    { label: "Rent, one year", display: "₦30,000,000.00", minor: 3_000_000_000 },
    { label: "Caution deposit", display: "₦3,000,000.00", minor: 300_000_000 },
    { label: "Agency fee", display: "₦3,000,000.00", minor: 300_000_000 },
    { label: "Legal fee", display: "₦150,000.00", minor: 15_000_000 },
  ],
  totalStated: true,
  totalMinor: 3_630_000_000,
  totalDisplay: "₦36,300,000.00",
  quotedAt: "2026-10-01T10:00:00Z",
  quotedOnDisplay: "Thu 1 Oct",
  remainderMinor: 15_000_000,
  remainderDisplay: "₦150,000.00",
  routes: { leadWithTransfer: true, walletOffered: false, walletLimitMinor: 1_000_000_000 },
};
