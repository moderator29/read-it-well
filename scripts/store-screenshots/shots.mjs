/**
 * The shot list: a pool of 30 store images for the founder to choose from,
 * 27 in the dark theme and 3 in the light, all but two with a single phone.
 *
 * Direction (the founder, 29 September 2026): screens from inside the
 * product's important areas (home, stays, feed, search, listings, the agent
 * and host workspaces, messages), phones with the camera island, mostly dark,
 * mostly one phone to an image, and many compositions rather than one: tilted,
 * cropped close, standing on photographs of homes, floating among the brand's
 * glass objects. The reference images were Anchor, Breet, Kraken, Nosh,
 * Jeroid, Prestmit, TikTok and X.
 *
 * Each shot names the live screens it shows (`screens`), captured by
 * capture.mjs from https://www.vallospaces.com as the QA member, and the
 * words drawn above them. `from: [n, k]` reuses screen k of shot n instead of
 * capturing it twice.
 *
 * The copy obeys the product's own claims rules, because a store listing is
 * copy a person reads (apps/web/src/lib/trust/claims.ts, the valuation-word
 * gate, docs/store/LISTING_COPY.md): no "verified" about a listing, no
 * "safe", "secure", "protected" or "guaranteed", no valuation language about
 * Price Check, no "best", and no em dashes.
 *
 * Capture steps, run in order after the page loads:
 *   { goto: "/path" }                     navigate
 *   { follow: "css selector" }            navigate to the first match's href
 *   { click: "css selector" }             tap the first match
 *   { clickIf: "css selector" }           tap it only if it is on screen
 *   { reveal: "css", offset: 24 }         scroll a section to the top
 *   { scroll: 600 }                       scroll the page by CSS pixels
 *   { wait: 1200 }                        settle
 * `auth: false` marks a public screen that needs no account, and `locale`
 * sets the language cookie the in-app switcher writes (en, yo, ha, ig).
 *
 * Layouts and grounds are described in templates.mjs. Every layout shows the
 * whole phone: the founder's ruling after the first pool was that a phone cut
 * off by the edge of the image, or zoomed past it, does not show the feature.
 * `glass` can still place the brand's glass objects (x and y as fractions of
 * the image, size as a fraction of its width) where there is clear space.
 */

const HOME = [{ goto: "/home" }, { clickIf: "[data-testid=welcome-skip-all]" }, { goto: "/home" }];
const FIRST_RENTAL = [{ goto: "/search?market=rent" }, { follow: "a[href^='/listing/']" }];
const THREAD = [{ goto: "/messages" }, { follow: "a[href^='/messages/']:not([href='/messages/new'])" }];

export const SHOTS = [
  {
    n: 1, slug: "find-your-next-home", mode: "dark", layout: "hero", ground: "electric", appleFrame: true,
    headline: ["Find your next", "home in Nigeria"],
    screens: [{ steps: HOME }],
  },
  {
    n: 2, slug: "full-move-in-cost", mode: "dark", layout: "photo", photo: "villa-exterior-sunset.jpg",
    headline: ["The full move-in cost,", "before you call"],
    note: "\"Verified listings\" is not a backed claim (docs/store/LISTING_COPY.md): only a person is verified, and every live listing is labelled example stock. The listing's own promise, the move-in total, is the message.",
    screens: [{ steps: FIRST_RENTAL }],
  },
  {
    n: 3, slug: "book-a-stay", mode: "dark", layout: "duo", ground: "aurora",
    headline: ["Book a stay", "in a few taps"],
    screens: [{ from: [4, 1] }, { steps: [{ goto: "/stays" }] }],
  },
  {
    n: 4, slug: "hotels-resorts-shortlets", mode: "dark", layout: "photo", photo: "resort-pool-deck.jpg",
    headline: ["Hotels, resorts", "and shortlets"],
    screens: [{ steps: [{ goto: "/stays" }, { follow: "a[href^='/stay/']" }] }],
  },
  {
    n: 5, slug: "whats-happening-around-you", mode: "dark", layout: "hero", ground: "navy",
    headline: ["Hear what's happening", "around you"],
    note: "The feed as the QA member sees it: two posts by the Vallo account, one by the founder's account and one by another member (@kida). Submit it only if that member is one of the founder's accounts or has agreed.",
    screens: [{ steps: [{ goto: "/around" }] }],
  },
  {
    n: 6, slug: "search-homes-across-nigeria", mode: "dark", layout: "card", cardGround: "electric",
    headline: ["Search homes", "across Nigeria"],
    screens: [{ steps: [{ goto: "/search?market=rent" }] }],
  },
  {
    n: 7, slug: "filter-by-what-you-need", mode: "dark", layout: "tilt", side: "left", ground: "midnight",
    headline: ["Filter by exactly", "what you need"],
    glass: [{ file: "listing-search.png", x: 0.9, y: 0.56, size: 0.18, rotate: 8 }],
    screens: [{ steps: [{ goto: "/search?filters=open" }] }],
  },
  {
    n: 8, slug: "message-the-agent", mode: "dark", layout: "hero", ground: "aurora",
    headline: ["Message the agent,", "keep it in one thread"],
    note: "The QA member's rental enquiry with the example lister. On 29 September 2026, at the founder's request, the QA member shared two saved listings into it through the product's own share picker and sent one follow-up, so the thread shows listing cards. Conversations are always a guest and a listing's agent, and every live listing's agent is the example account, so the thread has one side.",
    screens: [{ steps: THREAD }],
  },
  {
    n: 9, slug: "every-conversation-one-inbox", mode: "dark", layout: "duo", ground: "navy",
    headline: ["Every conversation", "in one inbox"],
    screens: [{ steps: [{ goto: "/messages" }] }, { from: [8, 1] }],
  },
  {
    n: 10, slug: "know-the-moment", mode: "dark", layout: "tilt", ground: "midnight",
    headline: ["Know the moment", "anything changes"],
    glass: [{ file: "bell-badge.png", x: 0.1, y: 0.5, size: 0.18, rotate: -8 }],
    screens: [{ steps: [{ goto: "/notifications" }] }],
  },
  {
    n: 11, slug: "ask-the-assistant", mode: "dark", layout: "hero", ground: "electric",
    headline: ["Ask the AI assistant", "about any listing"],
    screens: [{ steps: [{ goto: "/assistant" }] }],
  },
  {
    n: 12, slug: "save-your-favourites", mode: "dark", layout: "photocard", ground: "aurora", photo: "villa-pool-portrait.jpg",
    headline: ["Save your favourites,", "compare them later"],
    note: "Three example listings were saved to the QA account's own favourites during capture on 29 September 2026, so the screen is not empty.",
    glass: [{ file: "heart-home.png", x: 0.11, y: 0.84, size: 0.18, rotate: -8 }],
    screens: [{ steps: [{ goto: "/saved" }] }],
  },
  {
    n: 13, slug: "reserve-a-table", mode: "dark", layout: "photo", photo: "restaurant-02-lounge.jpg",
    headline: ["Reserve a table", "in the same app"],
    screens: [{ steps: [{ goto: "/restaurants" }] }],
  },
  {
    n: 14, slug: "run-your-listings", mode: "dark", layout: "card", cardGround: "aurora",
    headline: ["Run your listings", "from one workspace"],
    note: "The agent workspace as a member who has not been approved sees it: the workspace's four doors, with the empty state above them.",
    screens: [{ steps: [{ goto: "/agent/dashboard" }] }],
  },
  {
    n: 15, slug: "put-your-property-on-vallo", mode: "dark", layout: "tilt", ground: "navy",
    headline: ["Put your property", "on Vallo"],
    note: "The listing wizard opens only for an approved agent and there is no agent QA account, so this is the pitch a member sees. \"In minutes\" would overstate it: applying takes about two minutes and review 24 to 48 hours, as the pitch says.",
    glass: [{ file: "keys-home.png", x: 0.1, y: 0.56, size: 0.18, rotate: -8 }],
    screens: [{ steps: [{ goto: "/agent/list" }] }],
  },
  {
    n: 16, slug: "track-your-application", mode: "dark", layout: "hero", ground: "navy",
    headline: ["Track your application", "step by step"],
    screens: [{ steps: [{ goto: "/profile/application" }] }],
  },
  {
    n: 17, slug: "host-your-hotel", mode: "dark", layout: "photo", photo: "tower-entrance-dusk.jpg",
    headline: ["Host your hotel", "or shortlet"],
    note: "The host workspace as a member with no venue sees it: the start of the application.",
    screens: [{ steps: [{ goto: "/host" }] }],
  },
  {
    n: 18, slug: "see-what-places-are-asking", mode: "dark", layout: "tilt", side: "left", ground: "aurora",
    headline: ["See what places", "nearby are asking"],
    note: "Price Check reports asking prices and never what a place is worth, which would be the regulated valuation act (apps/web/scripts/check-valuation-words.mjs). With every listing an example it declines to give a figure, so the screen is the question as the product asks it, filled in for Lekki.",
    glass: [{ file: "chart-ring.png", x: 0.9, y: 0.5, size: 0.18, rotate: 8 }],
    screens: [{ steps: [{ goto: "/price?state=LA&area=Lekki&lat=6.44&lng=3.47&type=apartment&intent=rent&period=year&beds=2" }] }],
  },
  {
    n: 19, slug: "all-your-plans-in-one-place", mode: "dark", layout: "tilt", side: "left", ground: "navy",
    headline: ["All your plans", "in one place"],
    glass: [{ file: "calendar-check.png", x: 0.9, y: 0.6, size: 0.18, rotate: 8 }],
    screens: [{ steps: [{ goto: "/profile" }] }],
  },
  {
    n: 20, slug: "homes-and-stays-one-account", mode: "dark", layout: "hero", ground: "electric",
    headline: ["Homes and stays,", "one account"],
    screens: [{ auth: false, steps: [{ goto: "/welcome" }] }],
  },
  {
    n: 21, slug: "speak-your-language", mode: "dark", layout: "card", cardGround: "electric",
    headline: ["Speak your", "language"],
    sub: "English, Hausa, Yorùbá and Igbo.",
    note: "Every language picker in the product is a native select, whose open list the operating system draws and a capture never sees. The product speaking Yoruba is the stronger proof.",
    screens: [{ auth: false, locale: "yo", steps: [{ goto: "/welcome" }] }],
  },
  {
    n: 22, slug: "stays-that-fit-your-trip", mode: "dark", layout: "hero", ground: "midnight",
    headline: ["Stays that fit", "your trip"],
    screens: [{ steps: [{ goto: "/stays/search?filters=open" }] }],
  },
  {
    n: 23, slug: "verify-with-confidence", mode: "dark", layout: "tilt", ground: "navy",
    headline: ["Verify with", "confidence"],
    glass: [{ file: "id-card-check.png", x: 0.1, y: 0.56, size: 0.18, rotate: -8 }],
    screens: [{ steps: [{ goto: "/verification" }] }],
  },
  {
    n: 24, slug: "stays-for-every-trip", mode: "dark", layout: "photo", photo: "skyline-waterfront-dusk.jpg",
    headline: ["Stays for", "every trip"],
    screens: [{ steps: [{ goto: "/stays/search?in=2026-10-16&out=2026-10-19&guests=2" }] }],
  },
  {
    n: 25, slug: "real-estate-done-right", mode: "dark", layout: "brand",
    headline: ["Vallo.", "Real estate, done right."],
    sub: "Homes, stays and tables in one app.",
    screens: [],
  },
  {
    n: 26, slug: "a-lighter-way-to-browse", mode: "light", layout: "hero", ground: "light",
    headline: ["A lighter way", "to browse"],
    screens: [{ steps: HOME }],
  },
  {
    n: 27, slug: "listings-that-speak-for-themselves", mode: "light", layout: "photocard", ground: "light", photo: "villa-exterior-gate.jpg",
    headline: ["Listings that speak", "for themselves"],
    screens: [{ steps: [{ goto: "/search?market=buy" }, { follow: "a[href^='/listing/']" }] }],
  },
  {
    n: 28, slug: "search-beautifully", mode: "light", layout: "duo", ground: "light",
    headline: ["Search,", "beautifully"],
    screens: [{ steps: [{ goto: "/search?market=rent" }] }, { from: [26, 1] }],
  },
  {
    n: 29, slug: "found-the-one", mode: "dark", layout: "duo", ground: "aurora",
    headline: ["Found the one?", "Message the agent"],
    screens: [{ from: [2, 1] }, { from: [8, 1] }],
  },
  {
    n: 31, slug: "share-listings-in-the-chat", mode: "dark", layout: "photocard", ground: "aurora", photo: "villa-pool-skyline-01.jpg",
    headline: ["Share listings", "right in the chat"],
    glass: [{ file: "send-plane-tile.png", x: 0.11, y: 0.84, size: 0.17, rotate: -8 }],
    screens: [{ from: [8, 1] }],
  },
  {
    n: 32, slug: "a-table-in-a-few-taps", mode: "dark", layout: "tilt", side: "left", ground: "aurora",
    headline: ["Book a table", "in a few taps"],
    glass: [{ file: "concierge-bell.png", x: 0.9, y: 0.58, size: 0.18, rotate: 8 }],
    screens: [{ steps: [{ goto: "/restaurants" }, { follow: "a[href^='/restaurant/']" }] }],
  },
  {
    n: 33, slug: "you-choose-what-rings", mode: "dark", layout: "hero", ground: "navy",
    headline: ["You choose", "what reaches you"],
    screens: [{ steps: [{ goto: "/settings/notifications" }] }],
  },
  {
    n: 30, slug: "vallo-never-holds-your-money", mode: "dark", layout: "hero", ground: "aurora",
    headline: ["Vallo never holds", "your money"],
    sub: "When you pay, the owner's or agent's share goes straight to their bank.",
    note: "The subline is NO_CUSTODY_SENTENCE in apps/web/src/lib/money/copy.ts, shortened. The screen is the listing's own move-in breakdown.",
    screens: [{ steps: [...FIRST_RENTAL, { reveal: "[data-testid=move-in-cost]", offset: 20 }] }],
  },
  {
    n: 34, slug: "sign-in", mode: "dark", layout: "hero", ground: "electric",
    headline: ["Welcome back,", "sign in in seconds"],
    screens: [{ auth: false, steps: [{ goto: "/sign-in" }] }],
  },
  {
    n: 35, slug: "join-vallo", mode: "dark", layout: "tilt", ground: "aurora",
    headline: ["Join Vallo", "with one account"],
    glass: [{ file: "user-check.png", x: 0.1, y: 0.56, size: 0.18, rotate: -8 }],
    screens: [{ auth: false, steps: [{ goto: "/sign-up" }] }],
  },
  {
    n: 36, slug: "your-payment-methods", mode: "dark", layout: "photocard", ground: "navy", photo: "living-room-dusk.jpg",
    headline: ["Your cards and banks,", "in one place"],
    note: "Payment methods as the QA member sees them. There is no wallet or balance to show: the wallet was retired when Vallo stopped holding money (/wallet redirects to /agreements), and crypto appears only inside a live checkout, switched off until Yellow Card is configured.",
    glass: [{ file: "card-lock.png", x: 0.11, y: 0.84, size: 0.17, rotate: -8 }],
    screens: [{ steps: [{ goto: "/settings/payments" }] }],
  },
];

export const pad = (n) => String(n).padStart(2, "0");
export const shotName = (shot) => `${pad(shot.n)}-${shot.slug}`;

/** The source file for screen k (1-based) of a shot, following `from`. */
export function sourceName(shot, k) {
  const screen = shot.screens[k - 1];
  if (screen?.from) {
    const [n, j] = screen.from;
    return sourceName(SHOTS.find((s) => s.n === n), j);
  }
  return `${shotName(shot)}-${k}.webp`;
}
