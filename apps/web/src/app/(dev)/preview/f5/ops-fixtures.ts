import { formatMoney } from "@vallo/i18n";
import type { AgentInbox } from "@/lib/agent/messages-queries";
import type { AgentEarnings } from "@/lib/agent/earnings-queries";
import type { AgentAnalytics } from "@/lib/agent/analytics-queries";
import type { AgentReview, AgentReviewsSummary } from "@/lib/agent/reviews-queries";
import type { HostBookingBoard } from "@/lib/agent/bookings-queries";
import type { ListingSummary } from "@/lib/agent/listings-queries";
import type { OwnLadder } from "@/lib/agent/verification-queries";
import type { ManualGrant } from "@/lib/admin/standing-queries";
import type { AgentStanding } from "@/lib/admin/suspension-queries";
import type { ExampleListingView } from "@/lib/admin/examples-queries";
import type { SwitchView } from "@/lib/admin/queries";
import type { Inspection } from "@/lib/inspections/types";
import { COUNTERPART, HOTEL, PERSON } from "../_fixtures/people";
import { CONVERSATION_ID, INSPECTION, LISTING_ID } from "./fixtures";

/**
 * F5's operations fixtures: the agent console, the Host landing and the admin
 * desks that the queue frame covers.
 *
 * Same discipline as `fixtures.ts`. Invented names, no real person, no real
 * business, money in integer kobo and never a hand-divided figure. These
 * render the REAL components so a surface can be read at 390 dark in a
 * sandbox with no session; they are never the proof of a write.
 */

/* ------------------------------------------------------------- the agent */

export const AGENT_PROFILE = {
  id: COUNTERPART.id,
  displayName: COUNTERPART.name,
  status: "APPROVED" as const,
  type: "individual" as const,
  verified: true,
};

export const AGENT_LISTINGS: ListingSummary[] = [
  {
    id: "00000000-0000-4000-8000-00000000a101",
    title: "Luxury 2 bedroom apartment with a sea view",
    status: "PUBLISHED",
    propertyType: "apartment",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 280_000_000,
    city: "Lagos",
    area: "Lekki Phase 1",
    photoCount: 12,
    coverUrl: "/brand/photos/living-room-day.jpg",
    updatedAt: "2026-06-18T09:00:00.000Z",
    submittedAt: "2026-05-02T09:00:00.000Z",
    reviewNotes: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000a102",
    title: "Modern 3 bedroom duplex",
    status: "UNDER_REVIEW",
    propertyType: "home",
    intent: "rent",
    pricePeriod: "year",
    priceMinor: 165_000_000,
    city: "Abuja",
    area: "Maitama",
    photoCount: 8,
    coverUrl: "/brand/photos/bedroom-01.jpg",
    updatedAt: "2026-06-16T09:00:00.000Z",
    submittedAt: "2026-06-16T09:00:00.000Z",
    reviewNotes: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000a103",
    title: "Serviced studio",
    status: "DRAFT",
    propertyType: "apartment",
    intent: "rent",
    pricePeriod: "month",
    priceMinor: 9_500_000,
    city: "Lagos",
    area: "Yaba",
    photoCount: 0,
    coverUrl: null,
    updatedAt: "2026-06-12T09:00:00.000Z",
    submittedAt: null,
    reviewNotes: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000a104",
    title: "Four bedroom terrace with a generator house",
    status: "MORE_INFO_REQUIRED",
    propertyType: "home",
    intent: "sale",
    pricePeriod: "sale",
    priceMinor: 2_400_000_000,
    city: "Port Harcourt",
    area: "GRA Phase 2",
    photoCount: 5,
    coverUrl: "/brand/photos/bedroom-02.jpg",
    updatedAt: "2026-06-10T09:00:00.000Z",
    submittedAt: "2026-06-08T09:00:00.000Z",
    reviewNotes: "The title document is cut off at the bottom. Send the whole page.",
  },
];

export const AGENT_BOOKINGS: HostBookingBoard = {
  requests: [
    {
      id: "00000000-0000-4000-8000-00000000b101",
      listingId: HOTEL.id,
      listingTitle: HOTEL.name,
      guestName: "Chinedu Okafor",
      checkIn: "2026-07-02",
      checkOut: "2026-07-05",
      nights: 3,
      adults: 2,
      children: 0,
      guests: 2,
      totalMinor: 18_000_000,
      arrivingName: "Adaora Okafor",
      arrivingPhone: "+234 801 000 0000",
      status: "PENDING",
      settlement: "awaiting",
      createdAt: "2026-06-18T09:00:00.000Z",
      hoursWaiting: 19,
      holdHoursLeft: 29,
    },
  ],
  upcoming: [
    {
      id: "00000000-0000-4000-8000-00000000b102",
      listingId: HOTEL.id,
      listingTitle: HOTEL.name,
      guestName: "Funmi Adekunle",
      checkIn: "2026-06-22",
      checkOut: "2026-06-25",
      nights: 3,
      adults: 3,
      children: 1,
      guests: 4,
      totalMinor: 24_000_000,
      arrivingName: null,
      arrivingPhone: null,
      status: "CONFIRMED",
      settlement: "settled",
      createdAt: "2026-06-01T09:00:00.000Z",
      hoursWaiting: 0,
      holdHoursLeft: null,
    },
  ],
  completed: [],
  cancelled: [],
  total: 2,
};

export const AGENT_INBOX: AgentInbox = {
  threads: [
    {
      id: CONVERSATION_ID,
      counterpartName: "Ibrahim Musa",
      listingTitle: "Maitama 3 bedroom duplex",
      lastMessage: "Good afternoon. Is the duplex still on the market, and can I see it on Saturday?",
      whenLabel: "10:24",
      unread: 2,
      lastFromMe: false,
      lastAt: "2026-06-18T09:24:00.000Z",
      isRequest: true,
      counterpartKind: "member",
      counterpartVerified: false,
      contextKind: "listing",
      waitingOnYou: true,
      waitingHours: 19,
    },
    {
      id: "00000000-0000-4000-8000-00000000c102",
      counterpartName: "Adaora Nwosu",
      listingTitle: "Luxury 2 bedroom apartment with a sea view",
      lastMessage: "Thank you, that time works. See you on Saturday.",
      whenLabel: "Mon",
      unread: 0,
      lastFromMe: false,
      lastAt: "2026-06-15T14:02:00.000Z",
      isRequest: false,
      counterpartKind: "member",
      counterpartVerified: false,
      contextKind: "listing",
      waitingOnYou: false,
      waitingHours: 0,
    },
  ],
  waitingCount: 1,
  oldestWaitingHours: 19,
};

export const AGENT_REVIEWS: AgentReview[] = [
  {
    id: "00000000-0000-4000-8000-00000000r101",
    listingId: HOTEL.id,
    listingTitle: HOTEL.name,
    rating: 5,
    body: "Spotless, and the check in took two minutes. The generator ran all night, which is the only thing I actually worried about.",
    author: "Adaora N.",
    when: "4 Jun 2026",
    createdAt: "2026-06-04T09:00:00.000Z",
    response: null,
  },
  {
    id: "00000000-0000-4000-8000-00000000r102",
    listingId: LISTING_ID,
    listingTitle: "Luxury 2 bedroom apartment with a sea view",
    rating: 4,
    body: "Good flat, good area. The water pressure upstairs is weak in the morning.",
    author: "Ibrahim M.",
    when: "28 May 2026",
    createdAt: "2026-05-28T09:00:00.000Z",
    response: { body: "Thank you. The pump has been replaced since your stay.", when: "29 May 2026" },
  },
];

export const AGENT_REVIEWS_SUMMARY: AgentReviewsSummary = {
  total: 2,
  average: 4.5,
  unanswered: 1,
  distribution: [0, 0, 0, 1, 1],
};

export const AGENT_EARNINGS: AgentEarnings = {
  months: [
    {
      key: "2026-06",
      year: 2026,
      month: 6,
      grossMinor: 42_500_000,
      agentShareMinor: 40_800_000,
      platformShareMinor: 0,
      processorMinor: 1_700_000,
      netSettlementMinor: 40_800_000,
      stays: 3,
    },
    {
      key: "2026-05",
      year: 2026,
      month: 5,
      grossMinor: 28_000_000,
      agentShareMinor: 26_880_000,
      platformShareMinor: 0,
      processorMinor: 1_120_000,
      netSettlementMinor: 26_880_000,
      stays: 2,
    },
  ],
  totalGrossMinor: 70_500_000,
  totalAgentShareMinor: 67_680_000,
  totalNetMinor: 67_680_000,
  settledStays: 5,
  currentMonth: {
    key: "2026-06",
    year: 2026,
    month: 6,
    grossMinor: 42_500_000,
    agentShareMinor: 40_800_000,
    platformShareMinor: 0,
    processorMinor: 1_700_000,
    netSettlementMinor: 40_800_000,
    stays: 3,
  },
  readable: true,
};

export const AGENT_ANALYTICS: AgentAnalytics = {
  earnings: AGENT_EARNINGS,
  trend: [
    { key: "2026-05", year: 2026, month: 5, agentShareMinor: 26_880_000 },
    { key: "2026-06", year: 2026, month: 6, agentShareMinor: 40_800_000 },
  ],
  requests: {
    received: 14,
    confirmed: 9,
    cancelled: 2,
    waiting: 1,
    lapsed: 2,
    answered: 11,
    medianAnswerHours: 4,
    answerTimingReadable: true,
  },
  listings: [
    {
      listingId: HOTEL.id,
      title: HOTEL.name,
      status: "PUBLISHED",
      requests: 9,
      confirmed: 6,
      nightsSold: 18,
      settledShareMinor: 40_800_000,
      reviews: 1,
      rating: 5,
      savedSignedIn: 12,
    },
    {
      listingId: LISTING_ID,
      title: "Luxury 2 bedroom apartment with a sea view",
      status: "PUBLISHED",
      requests: 5,
      confirmed: 3,
      nightsSold: 7,
      settledShareMinor: 26_880_000,
      reviews: 1,
      rating: 4,
      savedSignedIn: 4,
    },
  ],
  calendar: { windowNights: 30, listings: 2, offeredNights: 60, bookedNights: 18, blockedNights: 4 },
  reviews: { count: 2, average: 4.5 },
};

export const AGENT_LADDER: OwnLadder = {
  tier: 2,
  rungs: {
    identity: { kind: "identity", status: "passed", note: null, decidedAt: "2026-05-02T09:00:00.000Z" },
    address: { kind: "address", status: "passed", note: null, decidedAt: "2026-05-04T09:00:00.000Z" },
    payout: {
      kind: "payout",
      status: "failed",
      note: "The bank statement is a photograph of a screen. Send the PDF the bank issued.",
      decidedAt: "2026-05-09T09:00:00.000Z",
    },
  },
};

/** Three inspections in the three states an agent's desk actually shows. */
export const AGENT_INSPECTIONS: Inspection[] = [
  {
    ...INSPECTION,
    id: "00000000-0000-4000-8000-00000000d101",
    state: "REQUESTED",
    slotAt: null,
    listerNote: null,
    note: "I can come any time before six. The gate closes at six, so earlier is better for me too.",
  },
  { ...INSPECTION, id: "00000000-0000-4000-8000-00000000d102" },
  {
    ...INSPECTION,
    id: "00000000-0000-4000-8000-00000000d103",
    state: "PROPOSED",
    listingTitle: "Modern 3 bedroom duplex",
    requestedAt: "2026-06-24T09:00:00.000Z",
    slotAt: "2026-06-25T14:00:00.000Z",
    counterpartName: "Ibrahim Musa",
    listerNote: "Saturday is taken. Sunday afternoon suits me.",
  },
];

/* -------------------------------------------------------------- the desks */

export const ADMIN_SWITCHES: SwitchView[] = [
  { key: "messaging", enabled: true, note: null, updatedAt: "2026-06-12T09:00:00.000Z" },
  { key: "bookings", enabled: true, note: null, updatedAt: "2026-06-12T09:00:00.000Z" },
  {
    key: "social",
    enabled: false,
    note: "Turned off while the moderation queue was cleared.",
    updatedAt: "2026-06-17T21:40:00.000Z",
  },
];

export const ADMIN_GRANTS: ManualGrant[] = [
  {
    userId: COUNTERPART.id,
    holder: COUNTERPART.name,
    badgeCode: "founding_host",
    badgeName: "Founding host",
    grantedAt: "2026-05-30T09:00:00.000Z",
    grantedByName: PERSON.name,
    grantedBySignerGone: false,
    reason: "First hotel on the Stays side, and they wrote the check-in copy with us.",
    revoked: false,
  },
  {
    userId: PERSON.id,
    holder: "Adaora Nwosu",
    badgeCode: "community_lead",
    badgeName: "Community lead",
    grantedAt: "2026-04-11T09:00:00.000Z",
    grantedByName: null,
    grantedBySignerGone: true,
    reason: null,
    revoked: true,
  },
];

export const ADMIN_BADGES = [
  { code: "founding_host", name: "Founding host" },
  { code: "community_lead", name: "Community lead" },
];

export const ADMIN_STOPPED: AgentStanding[] = [
  {
    agentId: "00000000-0000-4000-8000-00000000f101",
    userId: COUNTERPART.id,
    displayName: "Harbour Lettings",
    status: "SUSPENDED",
    liveListingCount: 0,
    openStop: {
      id: "00000000-0000-4000-8000-00000000f201",
      reason: "Three listings carried photographs of a property they do not hold.",
      suspendedAt: "2026-06-14T10:00:00.000Z",
      suspendedByName: PERSON.name,
      suspendedBySignerGone: false,
      withdrawn: [
        { id: LISTING_ID, from: "PUBLISHED", title: "Luxury 2 bedroom apartment", statusNow: "SUSPENDED" },
      ],
      staysAhead: 1,
      liftedAt: null,
      liftedByName: null,
      liftNote: null,
      restoredCount: 0,
    },
    pastStops: [],
  },
];

export const ADMIN_TRADING: AgentStanding[] = [
  {
    agentId: "00000000-0000-4000-8000-00000000f102",
    userId: PERSON.id,
    displayName: COUNTERPART.name,
    status: "APPROVED",
    liveListingCount: 4,
    openStop: null,
    pastStops: [],
  },
];

export const ADMIN_EXAMPLES: ExampleListingView[] = [
  {
    id: "00000000-0000-4000-8000-00000000e101",
    title: "Luxury 2 bedroom apartment",
    status: "PUBLISHED",
    city: "Lagos",
    listerName: COUNTERPART.name,
    amountMinor: 280_000_000,
    createdAt: "2026-03-02T09:00:00.000Z",
    retireAfter: "2026-09-30",
    retired: false,
  },
  {
    id: "00000000-0000-4000-8000-00000000e102",
    title: "Modern 3 bedroom duplex",
    status: "PUBLISHED",
    city: "Abuja",
    listerName: COUNTERPART.name,
    amountMinor: 165_000_000,
    createdAt: "2026-03-02T09:00:00.000Z",
    retireAfter: "2026-09-30",
    retired: false,
  },
];

export const ADMIN_OCCUPATIONS = [
  { code: "architect", name: "Architect", category: "Built environment", sortOrder: 10 },
  { code: "quantity_surveyor", name: "Quantity surveyor", category: "Built environment", sortOrder: 20 },
  { code: "estate_surveyor", name: "Estate surveyor and valuer", category: "Built environment", sortOrder: 30 },
];

export const ADMIN_STATES = [
  { code: "LA", name: "Lagos" },
  { code: "FC", name: "Federal Capital Territory" },
];

export const ADMIN_LOCAL_GOVERNMENTS = [
  { code: "la_ikeja", stateCode: "LA", name: "Ikeja" },
  { code: "la_eti_osa", stateCode: "LA", name: "Eti Osa" },
];

/** A figure the money desks print, so a proof shows the real formatter. */
export const EXAMPLE_TOTAL = formatMoney(67_680_000);
