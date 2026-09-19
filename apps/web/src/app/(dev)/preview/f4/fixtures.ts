import type { PostView } from "@/components/social/feed/PostCard";
import type { StoryCard } from "@/lib/social/stories-queries";
import { COUNTERPART, PERSON } from "../_fixtures/people";

/**
 * F4's fixtures for the preview harness. Brand-neutral and fictional, per
 * ledger section 5: the catalogue's invented names, the founder's own
 * photography, never a real person or a real brand. These render the real
 * components so the LOOK can be photographed; nothing here is a proof of the
 * ONE LAW and nothing here ships.
 */

const villa = "/brand/photos/villa-pool-skyline-01-640.jpg";
const skyline = "/brand/photos/skyline-waterfront-dusk-640.jpg";
const terrace = "/brand/photos/villa-pool-terrace-640.jpg";

function post(overrides: Partial<PostView> & Pick<PostView, "id" | "body">): PostView {
  return {
    kind: "GIST",
    authorKind: "USER",
    author: {
      id: COUNTERPART.id,
      handle: COUNTERPART.handle,
      displayLabel: COUNTERPART.name,
      avatarPath: null,
      isAgent: true,
      moderatorOf: null,
    },
    createdLabel: "2h ago",
    edited: false,
    areaName: null,
    areaSlug: null,
    listing: null,
    sourceNote: null,
    cited: [],
    replyingTo: null,
    repostedBy: null,
    replyCount: 0,
    likeCount: 0,
    repostCount: 0,
    viewCount: 0,
    liked: false,
    reposted: false,
    saved: false,
    heldReason: null,
    removed: false,
    isMine: false,
    editable: false,
    rawBody: null,
    media: [],
    ...overrides,
  };
}

export const FEED_POSTS: PostView[] = [
  post({
    id: "00000000-0000-4000-8000-00000000a001",
    body: "Just closed on this 4-bedroom duplex in Lekki Phase 1. Space, light and a pool the family will not leave.",
    createdLabel: "2h ago",
    likeCount: 243,
    repostCount: 37,
    replyCount: 56,
    media: [{ url: villa, width: 640, height: 427 }],
  }),
  post({
    id: "00000000-0000-4000-8000-00000000a002",
    body: "Anyone know good serviced apartments in Victoria Island? Looking for something short-term, neat and fairly priced. Recommendations please.",
    kind: "ASK",
    author: {
      id: "00000000-0000-4000-8000-000000000004",
      handle: "chii_realty",
      displayLabel: "Chioma Okafor",
      avatarPath: null,
      isAgent: true,
      moderatorOf: null,
    },
    createdLabel: "4h ago",
    likeCount: 89,
    repostCount: 12,
    replyCount: 24,
  }),
  post({
    id: "00000000-0000-4000-8000-00000000a003",
    body: "The market in Lagos is moving fast this year. If you are serious about investing, do the due diligence first: location, title, and the agent's record.",
    author: {
      id: "00000000-0000-4000-8000-000000000005",
      handle: "lagosrealtor",
      displayLabel: "LagosRealtor",
      avatarPath: null,
      isAgent: true,
      moderatorOf: null,
    },
    createdLabel: "5h ago",
    likeCount: 131,
    repostCount: 18,
    replyCount: 9,
    media: [{ url: skyline, width: 640, height: 360 }],
  }),
];

export const FEED_STORIES: StoryCard[] = [
  {
    id: "00000000-0000-4000-8000-00000000b001",
    headline: "The pool at dusk",
    placeLabel: "Lekki Phase 1",
    imageUrl: villa,
    authorLabel: "Tunde Adebayo",
    authorHandle: "tunde_realestate",
    createdLabel: "Today",
    likeCount: 12,
  },
  {
    id: "00000000-0000-4000-8000-00000000b002",
    headline: "Marina from the water",
    placeLabel: "Victoria Island",
    imageUrl: skyline,
    authorLabel: "Chioma Okafor",
    authorHandle: "chii_realty",
    createdLabel: "Today",
    likeCount: 8,
  },
  {
    id: "00000000-0000-4000-8000-00000000b003",
    headline: "Terrace evenings",
    placeLabel: "Ikoyi",
    imageUrl: terrace,
    authorLabel: "LagosRealtor",
    authorHandle: "lagosrealtor",
    createdLabel: "Yesterday",
    likeCount: 4,
  },
  {
    id: "00000000-0000-4000-8000-00000000b004",
    headline: "Morning at the gate",
    placeLabel: "Ikeja GRA",
    imageUrl: "/brand/photos/villa-exterior-gate-640.jpg",
    authorLabel: "PropertyPlug",
    authorHandle: "propertyplug",
    createdLabel: "Yesterday",
    likeCount: 3,
  },
  {
    id: "00000000-0000-4000-8000-00000000b005",
    headline: "The bridge at night",
    placeLabel: "Lekki",
    imageUrl: "/brand/photos/skyline-bridge-dusk-640.jpg",
    authorLabel: "Adaeze",
    authorHandle: "adaeze",
    createdLabel: "Yesterday",
    likeCount: 6,
  },
];

export const YOU = { label: PERSON.name, avatarUrl: PERSON.avatarUrl };

/** The first feed post as a thread root, with three answers under it. */
export const THREAD = {
  root: { ...FEED_POSTS[0]!, replyCount: 3 },
  replies: [
    {
      ...post({
        id: "00000000-0000-4000-8000-00000000d001",
        kind: "REPLY",
        body: "Congratulations. Is the pool heated, or is that the Lagos sun doing the work?",
        author: {
          id: "00000000-0000-4000-8000-000000000004",
          handle: "chii_realty",
          displayLabel: "Chioma Okafor",
          avatarPath: null,
          isAgent: true,
          moderatorOf: null,
        },
        createdLabel: "1h ago",
        replyingTo: "@tunde_realestate",
        likeCount: 12,
      }),
      depth: 1,
      parentId: FEED_POSTS[0]!.id,
      mutedAuthor: false,
    },
    {
      ...post({
        id: "00000000-0000-4000-8000-00000000d002",
        kind: "REPLY",
        body: "The sun, all of it. The terrace faces west so the evenings are the whole point.",
        createdLabel: "52m ago",
        replyingTo: "@chii_realty",
        likeCount: 8,
      }),
      depth: 2,
      parentId: "00000000-0000-4000-8000-00000000d001",
      mutedAuthor: false,
    },
    {
      ...post({
        id: "00000000-0000-4000-8000-00000000d003",
        kind: "REPLY",
        body: "What did the title search look like for this one? Phase 1 has been busy this year.",
        author: {
          id: "00000000-0000-4000-8000-000000000005",
          handle: "lagosrealtor",
          displayLabel: "LagosRealtor",
          avatarPath: null,
          isAgent: true,
          moderatorOf: null,
        },
        createdLabel: "30m ago",
        replyingTo: "@tunde_realestate",
        likeCount: 3,
      }),
      depth: 1,
      parentId: FEED_POSTS[0]!.id,
      mutedAuthor: false,
    },
  ],
};

/** A saved card and a bank account, for the settings home's payment block.
    The bank is the catalogue's invented one, never a real bank. */
export const PAYMENT_CARDS = [
  {
    id: "00000000-0000-4000-8000-00000000e001",
    cardType: "verve",
    last4: "4081",
    expMonth: 11,
    expYear: 2028,
    bank: null,
    reusable: true,
    isDefault: true,
    createdAt: "2026-06-01T09:00:00.000Z",
  },
];

export const BANK_ACCOUNTS = [
  {
    id: "00000000-0000-4000-8000-00000000e002",
    bankCode: "000",
    bankName: "Lagoon Bank",
    accountNumber: "0000002210",
    accountName: "SEYI OMOJUNI",
    isDefault: true,
    createdAt: "2026-06-01T09:00:00.000Z",
  },
];

export const FEED_PLACES = [
  { slug: "lekki-phase-1", name: "Lekki Phase 1", city: "Lagos" },
  { slug: "victoria-island", name: "Victoria Island", city: "Lagos" },
];
