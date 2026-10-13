import type {
  CampaignView,
  ClusterGroup,
  GraphRead,
  PayoutItem,
  ReferralDesk,
  ReviewItem,
} from "@/lib/admin/reads/referrals";
import type { GraphEdge, StatusCounts } from "@/lib/admin/reads/referrals-model";

/**
 * FIXTURES FOR THE REFERRAL DESK, pinned to Tuesday 13 October 2026, noon in
 * Lagos. They are what `lib/admin/reads/referrals.ts` would return, so the
 * preview pages and the tests draw the real `ReferralDesk` from the same rows.
 * The live database holds no referrals yet (read 13 October), so this is also
 * the only place the busy states can be seen.
 *
 * The names are invented. Nothing here is a real person.
 */

export const NOW = Date.parse("2026-10-13T11:00:00Z");

export const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const NAMES: Record<string, string> = {
  [ID(1)]: "Ngozi Eze",
  [ID(2)]: "Tunde Bakare",
  [ID(3)]: "Chiamaka Obi",
  [ID(4)]: "Seyi Adebayo",
  [ID(5)]: "Amina Bello",
  [ID(6)]: "Emeka Nwosu",
  [ID(7)]: "Funke Alabi",
  [ID(8)]: "Ibrahim Musa",
  [ID(9)]: "Kelechi Okafor",
  [ID(10)]: "Bisi Ogunleye",
  [ID(11)]: "Adaeze Nnamdi",
  [ID(12)]: "Yusuf Danjuma",
};

export const LIVE: CampaignView = {
  slug: "signup-80-phone",
  kind: "consumer",
  title: "Invite and Earn",
  status: "active",
  rewardMinor: 8000,
  memberCapMinor: 12_000_000,
  reviewDays: 7,
  reviewHours: 0,
  requirementKeys: ["phone_verified", "onboarding_completed"],
  startsAt: "2026-10-13T17:21:38.855Z",
  endsAt: null,
  reason:
    "Founder ruling 13 October 2026: an invited person counts only after they verify their phone number (terms accepted and first name set as before; no payment). Supersedes signup-80, which counted on a confirmed email.",
};

const EARLIER: CampaignView[] = [
  {
    ...LIVE,
    slug: "signup-80",
    status: "ended",
    requirementKeys: ["email_verified", "onboarding_completed"],
    startsAt: "2026-10-08T19:53:10Z",
    endsAt: "2026-10-13T17:21:38Z",
    reason: "Founder ruling 8 October 2026: 80 naira when the invited person signs up fully.",
  },
  {
    ...LIVE,
    slug: "launch-d51",
    status: "ended",
    rewardMinor: 7000,
    memberCapMinor: 10_500_000,
    requirementKeys: ["phone_verified", "meaningful_activity"],
    startsAt: "2026-10-06T00:00:00Z",
    endsAt: "2026-10-08T19:53:10Z",
    reason: "D51 launch policy.",
  },
  {
    ...LIVE,
    slug: "business-proposed",
    kind: "business",
    title: "Bring a business",
    status: "draft",
    rewardMinor: 15_000,
    memberCapMinor: 22_500_000,
    requirementKeys: ["phone_verified", "business_profile_completed", "business_verified"],
    startsAt: "2026-10-06T00:00:00Z",
    endsAt: null,
    reason: "PROPOSED, NOT DECIDED.",
  },
];

export const COUNTS: StatusCounts = {
  attributed: 14,
  qualified: 3,
  pending: 22,
  under_review: 3,
  approved: 6,
  available: 41,
  withdrawal_requested: 1,
  sent: 2,
  paid: 87,
  rejected: 4,
  reversed: 9,
};

export const DESK: ReferralDesk = {
  liability: {
    owedMinor: 1_840_000,
    pendingMinor: 2_400_000,
    paidMinor: 696_000,
    reversedAfterPaidMinor: 8000,
    month: "2026-10-01",
    budgetCapMinor: 70_000_000,
    budgetCommittedMinor: 41_200_000,
    byCampaign: [
      { slug: "signup-80-phone", status: "active", committedMinor: 4_800_000 },
      { slug: "signup-80", status: "ended", committedMinor: 36_400_000 },
    ],
    blockedOn: { phone_not_verified: 14 },
    referralsUnderReview: 3,
    payoutsUnderReview: 2,
    payoutsUnknown: 1,
    payoutsStuck: 1,
    transferIncidents: 0,
    payoutsEnabled: true,
  },
  programme: { open: true, reason: null },
  live: LIVE,
  others: EARLIER,
  budgets: [{ month: "2026-10-01", capMinor: 70_000_000, committedMinor: 41_200_000, reason: "Founder decision, D64." }],
  counts: COUNTS,
};

export const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: ID(101),
    referrerId: ID(1),
    referrerName: NAMES[ID(1)]!,
    referredId: ID(5),
    referredName: NAMES[ID(5)]!,
    campaign: "signup-80-phone",
    rewardMinor: 8000,
    riskScore: 65,
    riskReasons: ["shared_payout_destination", "same_browser_as_referrer"],
    reviewReason: "cluster flagged for review",
    qualifiedAt: "2026-10-12T09:14:00Z",
    attributedAt: "2026-10-12T08:50:00Z",
    cluster: {
      score: 65,
      nonNetwork: true,
      reasons: ["shared_payout_destination", "same_browser"],
      exposureMinor: 64_000,
      members: 8,
    },
  },
  {
    id: ID(102),
    referrerId: ID(2),
    referrerName: NAMES[ID(2)]!,
    referredId: ID(6),
    referredName: NAMES[ID(6)]!,
    campaign: "signup-80-phone",
    rewardMinor: 8000,
    riskScore: 40,
    riskReasons: ["circular_referral"],
    reviewReason: "cluster flagged for review",
    qualifiedAt: "2026-10-12T11:02:00Z",
    attributedAt: "2026-10-12T10:40:00Z",
    cluster: { score: 40, nonNetwork: true, reasons: ["circular_referral"], exposureMinor: 24_000, members: 3 },
  },
  {
    id: ID(103),
    referrerId: ID(3),
    referrerName: null,
    referredId: ID(7),
    referredName: NAMES[ID(7)]!,
    campaign: null,
    rewardMinor: null,
    riskScore: 0,
    riskReasons: [],
    reviewReason: null,
    qualifiedAt: null,
    attributedAt: "2026-10-13T07:30:00Z",
    cluster: null,
  },
];

export const GROUPS: ClusterGroup[] = [
  {
    referrerId: ID(1),
    referrerName: NAMES[ID(1)]!,
    score: 65,
    nonNetwork: true,
    reasons: ["shared_payout_destination", "same_browser"],
    exposureMinor: 64_000,
    members: 8,
    signals: [
      { signal: "device:ab12cd34ef56", sharedBy: 5, referredIds: [ID(5), ID(6), ID(7), ID(8), ID(9)] },
      { signal: "network:102.89.23.14", sharedBy: 4, referredIds: [ID(5), ID(6), ID(7), ID(8)] },
    ],
  },
  {
    referrerId: ID(2),
    referrerName: NAMES[ID(2)]!,
    score: 40,
    nonNetwork: true,
    reasons: ["circular_referral"],
    exposureMinor: 24_000,
    members: 3,
    signals: [],
  },
  {
    referrerId: ID(10),
    referrerName: NAMES[ID(10)]!,
    score: 10,
    nonNetwork: false,
    reasons: ["shared_network"],
    exposureMinor: 16_000,
    members: 4,
    signals: [{ signal: "network:105.112.7.3", sharedBy: 3, referredIds: [ID(11), ID(12), ID(4)] }],
  },
];

export const EDGES: GraphEdge[] = [
  { referrerId: ID(1), referredId: ID(5), status: "under_review", riskScore: 65, riskReasons: ["shared_payout_destination"], depth: 1 },
  { referrerId: ID(1), referredId: ID(6), status: "under_review", riskScore: 40, riskReasons: ["same_browser_as_referrer"], depth: 1 },
  { referrerId: ID(1), referredId: ID(7), status: "pending", riskScore: 5, riskReasons: [], depth: 1 },
  { referrerId: ID(1), referredId: ID(8), status: "available", riskScore: 0, riskReasons: [], depth: 1 },
  { referrerId: ID(5), referredId: ID(9), status: "pending", riskScore: 20, riskReasons: ["sequential_phones"], depth: 2 },
  { referrerId: ID(5), referredId: ID(4), status: "attributed", riskScore: 0, riskReasons: [], depth: 2 },
  { referrerId: ID(9), referredId: ID(1), status: "reversed", riskScore: 40, riskReasons: ["circular_referral"], depth: 3 },
];

export const GRAPH: GraphRead = { edges: EDGES, names: NAMES };

const PAYOUT_BASE: Omit<PayoutItem, "id" | "memberId" | "memberName" | "amountMinor" | "reference" | "status" | "createdAt"> = {
  accountName: "",
  accountLast4: "0000",
  riskScore: 0,
  riskReasons: [],
  failureReason: null,
  transferInitiated: false,
  hasRecipient: true,
};

export const PAYOUTS_WAITING: PayoutItem[] = [
  {
    ...PAYOUT_BASE,
    id: ID(201),
    memberId: ID(1),
    memberName: NAMES[ID(1)]!,
    amountMinor: 640_000,
    reference: "vallo-rw-8f3a21c0",
    status: "under_review",
    accountName: "NGOZI A EZE",
    accountLast4: "4417",
    riskScore: 60,
    riskReasons: ["shared_payout_destination"],
    createdAt: "2026-10-12T14:20:00Z",
  },
  {
    ...PAYOUT_BASE,
    id: ID(202),
    memberId: ID(8),
    memberName: NAMES[ID(8)]!,
    amountMinor: 120_000,
    reference: "vallo-rw-1be4d9a7",
    status: "under_review",
    accountName: "IBRAHIM MUSA",
    accountLast4: "9082",
    riskScore: 0,
    riskReasons: [],
    hasRecipient: false,
    createdAt: "2026-10-13T08:05:00Z",
  },
];

export const PAYOUTS_IN_FLIGHT: PayoutItem[] = [
  {
    ...PAYOUT_BASE,
    id: ID(203),
    memberId: ID(11),
    memberName: NAMES[ID(11)]!,
    amountMinor: 250_000,
    reference: "vallo-rw-77c0aa31",
    status: "sent",
    accountName: "ADAEZE NNAMDI",
    accountLast4: "1126",
    transferInitiated: true,
    createdAt: "2026-10-13T06:10:00Z",
  },
  {
    ...PAYOUT_BASE,
    id: ID(204),
    memberId: ID(12),
    memberName: NAMES[ID(12)]!,
    amountMinor: 180_000,
    reference: "vallo-rw-5d92e0f4",
    status: "unknown",
    accountName: "YUSUF DANJUMA",
    accountLast4: "7730",
    transferInitiated: true,
    createdAt: "2026-10-10T09:00:00Z",
  },
];
