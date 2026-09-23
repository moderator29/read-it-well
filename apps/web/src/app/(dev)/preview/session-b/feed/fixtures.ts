import type { PostView } from "@/components/social/feed/PostCard";
import type { StoryCard } from "@/lib/social/stories-queries";

/**
 * FIXTURE PROPS, NOT DATA, for `/preview/session-b/feed`. Invented people and
 * the platform's own photography, composed the way the founder's feed image
 * composes its screen (a post with a wide photograph, a question with no
 * picture, a post with a skyline) so the built feed can stand beside it. The
 * counts are invented HERE, in a fixture, to fill the same slots the render
 * fills; on the live route every count is the row's own column. Nothing here
 * ships and every proof taken from it is labelled fixture-backed in ledger 13.
 */

const house = "/brand/photos/villa-exterior-sunset-640.jpg";
const skyline = "/brand/photos/skyline-waterfront-dusk-640.jpg";

function person(n: number, handle: string, name: string) {
  return {
    id: `00000000-0000-4000-8000-0000000fe${String(n).padStart(3, "0")}`,
    handle,
    displayLabel: name,
    avatarPath: null,
    isAgent: false,
    moderatorOf: null,
  };
}

function post(over: Partial<PostView> & Pick<PostView, "id" | "body" | "author">): PostView {
  return {
    kind: "GIST",
    authorKind: "USER",
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
    ...over,
  };
}

/* The tier is what `stampAuthorTiers` would put there from person_badge.
   The bodies carry their authors' line breaks, as the image's copy does. */
export const FEED_POSTS: PostView[] = [
  post({
    id: "00000000-0000-4000-8000-00000000fe01",
    author: { ...person(1, "tunde_realestate", "Tunde Adebayo"), tier: "gold" },
    body: "Just closed on this beautiful 4-bedroom duplex in Lekki Phase 1.\nLuxury, space and great location!",
    createdLabel: "2h ago",
    likeCount: 243,
    repostCount: 37,
    replyCount: 56,
    media: [{ url: house, width: 640, height: 427 }],
  }),
  post({
    id: "00000000-0000-4000-8000-00000000fe02",
    kind: "ASK",
    author: { ...person(2, "chii_realty", "Chioma Okafor"), tier: "gold" },
    body: "Anyone know good serviced apartments in Victoria Island?\nLooking for something short-term, neat and affordable.\nRecommendations please",
    createdLabel: "4h ago",
    likeCount: 89,
    repostCount: 12,
    replyCount: 24,
  }),
  post({
    id: "00000000-0000-4000-8000-00000000fe03",
    author: { ...person(3, "lagosrealtor", "LagosRealtor"), tier: "platinum" },
    body: "The real estate market in Lagos is moving fast this year.\nIf you're serious about investing, now is the time to act.\nLocation + due diligence = long term value.",
    createdLabel: "6h ago",
    likeCount: 51,
    repostCount: 9,
    replyCount: 14,
    media: [{ url: skyline, width: 640, height: 360 }],
  }),
];

function story(n: number, name: string, image: string): StoryCard {
  return {
    id: `00000000-0000-4000-8000-0000000f5${String(n).padStart(3, "0")}`,
    headline: `${name}'s story`,
    placeLabel: "Lagos",
    imageUrl: image,
    authorLabel: name,
    authorHandle: name.toLowerCase(),
    createdLabel: "1h",
    likeCount: 0,
  };
}

export const FEED_STORIES: StoryCard[] = [
  story(1, "Tunde", "/brand/photos/villa-pool-skyline-01-640.jpg"),
  story(2, "Chioma", "/brand/photos/living-room-dusk-640.jpg"),
  story(3, "LagosRealtor", "/brand/photos/villa-exterior-gate-640.jpg"),
  story(4, "PropertyPlug", "/brand/photos/tower-entrance-dusk-640.jpg"),
  story(5, "Adaeze", "/brand/photos/terrace-lounge-night-640.jpg"),
];

export const FEED_PLACES = [
  { slug: "lekki-phase-1", name: "Lekki Phase 1", city: "Lagos" },
  { slug: "victoria-island", name: "Victoria Island", city: "Lagos" },
];

export const REVIEWABLE = [
  {
    bookingId: "00000000-0000-4000-8000-00000000fb01",
    title: "Two-bedroom flat, Lekki Phase 1",
    dateRange: "2 to 6 September",
  },
];
