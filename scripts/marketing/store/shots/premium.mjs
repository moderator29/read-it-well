/**
 * The 35 store images, by DESIGN.md section 6a and the round-2 review
 * (30 September 2026), in the manner of X's App Store set:
 *
 *   - one night ground for every image, a vertical gradient from #050B3D
 *     (the top row) to #010118 (the last), drawn by compose.mjs;
 *   - the headline, centred at the top on the same baselines in every image,
 *     set on its ink, never wider than the phone plus 50 px;
 *   - the phone: big, centred on its screen, whole, straight on, the same
 *     size in every image, lit so its frame reads against the ground, with
 *     the capture laid on flat (the app's dark theme).
 *
 * Nothing else is drawn, except on two images, each with one card that has
 * just arrived: "Room booked" (5) and "Payment settled" (18). Both follow one
 * rule: the card overhangs one edge of the phone by 70 to 90 px, never sits
 * on a button or words (it covers the app's header whole, as a notification
 * does), carries the Example chip, and sets any amount in white.
 *
 * Two pairs share one big tilted phone across their seam, as X's "Be the
 * first to know" does: 4 and 5 (stays) and 10 and 11 (restaurants).
 *
 * Order: the first three, then a pair in the first swipe; never more than
 * two screens without a photograph or artwork in a row; screens that look
 * alike at store size (the two onboarding slides, the two filter sheets, the
 * two searches, the two move-in pages) far apart.
 */
import { headline, popup } from "../components.mjs";
import { brandUrl } from "../lib.mjs";

/* ------------------------------------------------------------- the system */

/** The ground (compose.mjs draws it): the first row and the last. */
export const GROUND = { top: [5, 11, 61], bottom: [1, 1, 24] };
const PHONE_COLOR = "black-titanium";
const FRONT = { rotation: { x: 0, y: 0, z: 0 }, fov: 20 };

/**
 * The grid every image shares, per store (page pixels). The headline's cap
 * height is 2.7% of the image's height in both stores (112 px on 2868, 100 px
 * on 2560), so the two sets read the same size in their store rows; `max` is
 * the phone's width plus 50 px.
 */
export function M(ctx) {
  const { W, H, ios } = ctx;
  const size = ios ? 112 : 100;
  const hlTop = ios ? 140 : 130;
  const phoneTop = ios ? 490 : 470;
  const phoneBottom = ios ? 100 : 90;
  return {
    W, H, size, hlTop, lh: 1.08,
    side: ios ? 80 : 88,
    /* the phone's frame is 1080 px wide on the App Store and 946 on Play */
    max: ios ? 1130 : 996,
    subSize: ios ? 30 : 34,
    phoneTop,
    phoneH: H - phoneTop - phoneBottom,
    /* how far a card overhangs the phone's edge, in px (and still keeps 40 px to the
       image's edge), and how far the frame's outer edge lies outside the display, in
       display px (2.35 mm on the island, 1.95 mm on the Android) */
    overhang: ios ? 50 : 80,
    frame: ios ? 42 : 36,
    /* the cards keep the same size against the phone in both stores (the Play
       phone is 0.876 of the App Store's width) */
    card: 1.3 * (ios ? 1 : 0.876),
  };
}

function head(ctx, m, lines, { align = "center", sub } = {}) {
  return headline({
    lines, cx: ctx.W / 2, x: m.side, y: m.hlTop, max: m.max, size: m.size, align, weight: 600, lineHeight: m.lh,
    sub, subSize: m.subSize, subGap: m.subSize * (ctx.ios ? 0.5 : 0.42), subColor: "rgb(255 255 255 / 0.6)",
  });
}

/**
 * The phone every plain image shows: straight on, centred on its screen
 * (the side buttons make the body's box lopsided), with the display's corner
 * on whole pixels so the flat layer lands exactly.
 */
async function stdPhone(ctx, m, id) {
  const cy = m.phoneTop + m.phoneH / 2;
  const opts = { id, h: m.phoneH, rotation: FRONT.rotation, fov: FRONT.fov, color: PHONE_COLOR, flat: true };
  const first = await ctx.phone({ ...opts, cx: ctx.W / 2, cy });
  const sx = first.quad.reduce((a, q) => a + q[0], 0) / 4;
  let dx = ctx.W / 2 - sx;
  const tl = first.quad[0];
  dx += Math.round(tl[0] + dx) - (tl[0] + dx);
  const dy = Math.round(tl[1]) - tl[1];
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return first;
  ctx.placed.pop();
  ctx.flats.pop();
  return ctx.phone({ ...opts, cx: ctx.W / 2 + dx, cy: cy + dy });
}

/** The template every plain image follows. */
function std(n, slug, id, lines, { sub, extra } = {}) {
  return {
    n, slug, captures: [id],
    async layout(ctx) {
      const m = M(ctx);
      const p = await stdPhone(ctx, m, id);
      return [head(ctx, m, lines, { sub }), p.html, extra ? await extra(ctx, m, p) : ""].join("\n");
    },
  };
}

/* ------------------------------------------------------------- the cards */

/* Page positions on a placed phone's display (display px, 1320 x 2868). */
const HEADER = { top: 186, bottom: 365, bell: { x: 1204, y: 275, r: 66 }, menu: [77, 126], logo: [234, 596] };

/* ------------------------------------------------------------- the pairs */

/**
 * Two neighbours that share one phone across their seam. Each keeps its own
 * headline, set left on the same grid, so the words run on across the seam;
 * the phone is drawn once, tilted by the 3D studio, and keeps the studio's
 * own mapping of the capture.
 */
function pair(a, b, { id, rotation, fov, dx = 0, h = 1, clear, through, extraA, extraB }) {
  const shared = async ({ pc, W, H, ios }) => {
    const m = M({ W, H, ios });
    const o = { id, cy: m.phoneTop + m.phoneH / 2, h: m.phoneH * h, rotation, fov, color: PHONE_COLOR, margin: ios ? 64 : 70 };
    let p = await pc.phone({ ...o, cx: W + dx * (W / 1320) });
    if (clear || through) {
      /* Slide the phone so the seam passes `clear.gap` px to the right of a
         region of the display (display px), such as a name; or exactly
         through a point of the display, such as the space between two words. */
      let shift;
      if (through) shift = W - p.at(through[0], through[1])[0];
      else {
        const [x0, y0, x1, y1] = clear.box;
        const right = Math.max(...[[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => p.at(x, y)[0]));
        shift = W - clear.gap * (W / 1320) - right;
      }
      pc.placed.pop();
      p = await pc.phone({ ...o, cx: W + dx * (W / 1320) + shift });
    }
    return { html: p.html, phone: p };
  };
  const words = (S, extra) => async (ctx) => {
    const m = M(ctx);
    return [head(ctx, m, S.lines, { align: "left" }), extra ? await extra(ctx, m) : ""].join("\n");
  };
  return [
    { n: a.n, slug: a.slug, captures: [id], pairWith: b.n, shared, layout: words(a, extraA) },
    { n: b.n, slug: b.slug, captures: [id], pairedFrom: a.n, layout: words(b, extraB) },
  ];
}

/* ------------------------------------------------------------- the 35 */

export const SHOTS = [
  std(1, "find-your-next-home-in-nigeria", "home", ["Find your next home", "in Nigeria"]),
  /* 2: the listing itself, whose move-in total sits under the photograph. */
  std(2, "the-move-in-total-before-you-call", "listing", ["The move-in total,", "before you call"]),
  std(3, "homes-and-stays-one-account", "welcome-1", ["Homes and stays,", "one account"]),

  /* 4 and 5, the one connected pair: the stays home across the seam, leaning
     right, slid so the seam passes clear of every word. The booking arrives
     on 4, over the phone's left edge beside the header (clear of the menu),
     where the ground is open; on 5 the phone's right side has no room for a
     card of this size within the overhang rule. */
  ...pair(
    { n: 4, slug: "hotels-shortlets-and-resorts", lines: ["Hotels, shortlets", "and resorts"] },
    { n: 5, slug: "book-a-room-in-a-few-taps", lines: ["Book a room", "in a few taps"] },
    {
      id: "stays", rotation: { x: -16, y: -16, z: -17 }, fov: 26, h: 1, through: [893, 1272],
      async extraA(ctx, m) {
        const { u, W } = ctx;
        const sp = ctx.shared.phone;
        /* the frame's left edge along the header, and the menu button */
        const edge = Math.min(...[HEADER.top, 275, HEADER.bottom].map((y) => sp.at(-m.frame, y)[0]));
        const menuLeft = Math.min(...[237, 313].map((y) => sp.at(HEADER.menu[0], y)[0]));
        const right = edge + m.overhang;
        const [, midY] = sp.at(0, 275);
        const cardH = 158 * m.card;
        ctx.cardCheck = { rightOf: menuLeft - 12 * u };
        return popup({ right: W - right, fit: true, y: midY - cardH / 2, lucide: "bed-double", title: "Room booked", line: "Lagoon Crest Resort · 3 nights", meta: null, example: true, scale: m.card });
      },
    },
  ),

  std(6, "vallo-never-holds-your-money", "support-money", ["Vallo never holds", "your money"]),
  std(7, "see-the-stay-before-you-book", "stay", ["See the stay", "before you book"]),
  std(8, "ask-the-ai-assistant-any-time-of-day", "assistant-caution-2", ["Ask the AI assistant", "any time of day"]),
  std(9, "save-favourites-compare-later", "saved", ["Save favourites,", "compare later"]),
  std(10, "find-a-restaurant-you-love", "restaurant", ["Find a restaurant", "you love"]),
  std(11, "every-fee-added-up", "listing-cost", ["Every fee,", "added up"]),
  std(12, "each-verified-mark-checked-by-a-person", "welcome-2", ["Each verified mark,", "checked by a person"]),

  /* 13: the host's side. The payout arrives over the app's header, covering
     the menu and the logo whole, clear of the back button below, and
     overhangs the phone's left edge. No amount. */
  std(13, "have-a-property-put-it-on-vallo", "host-start", ["Have a property?", "Put it on Vallo"], {
    async extra(ctx, m, p) {
      const { u } = ctx;
      const [edge] = p.at(-m.frame, HEADER.top);
      const left = edge - m.overhang;
      /* the back button starts at display y 464 */
      const [, backTop] = p.at(100, 464);
      const cardH = 172 * m.card;
      return popup({ x: left, fit: true, y: backTop - 23 * u - cardH, lucide: "landmark", title: "Payment settled", line: "Straight to your bank", line2: "Lagoon Crest Resort · 3 nights", meta: null, example: true, scale: m.card });
    },
  }),

  /* 14: the villas search, whose Map button sits over photographs, not over
     an Example chip. */
  std(14, "search-homes-across-nigeria", "search-villas", ["Search homes", "across Nigeria"]),
  std(15, "six-digits-and-youre-back-in", "lock", ["Six digits,", "and you’re back in"]),
  std(16, "vallo-speaks-your-language", "welcome-yo", ["Vallo speaks", "your language"], { sub: "English, Hausa, Yorùbá and Igbo." }),
  std(17, "light-water-and-getting-in", "listing-amenities", ["Light, water", "and getting in"]),
  std(18, "pick-your-dates-see-the-price", "stays-dates", ["Pick your dates,", "see the price"]),
  std(19, "homes-to-buy-not-just-to-rent", "listing-sale", ["Homes to buy,", "not just to rent"]),
  std(20, "real-help-from-real-people", "support", ["Real help,", "from real people"]),
  std(21, "inspect-first-then-pay-on-vallo", "welcome-3", ["Inspect first,", "then pay on Vallo"]),
  std(22, "filter-by-exactly-what-you-need", "filters-villas", ["Filter by exactly", "what you need"]),
  std(23, "light-or-dark-your-call", "appearance", ["Light or dark,", "your call"]),
  std(24, "rooms-amenities-all-laid-out", "stay-amenities", ["Rooms, amenities,", "all laid out"]),
  std(25, "vallo-charges-no-inspection-fee", "support-inspection", ["Vallo charges no", "inspection fee"]),
  std(26, "apply-for-your-verified-mark", "verification", ["Apply for your", "verified mark"]),
  std(27, "back-where-you-left-off", "home-recent", ["Back where", "you left off"]),
  std(28, "ask-about-prices-areas-or-renting", "assistant", ["Ask about prices,", "areas or renting"]),
  std(29, "restaurants-all-in-one-place", "restaurants", ["Restaurants,", "all in one place"]),
  std(30, "lock-vallo-with-a-passcode", "passcode", ["Lock Vallo", "with a passcode"]),
  std(31, "need-a-bq-filter-for-it", "filters-detached-bq", ["Need a BQ?", "Filter for it"]),
  std(32, "one-sign-up-for-all-of-vallo", "sign-up", ["One sign-up", "for all of Vallo"]),
  std(33, "the-agents-fees-spelled-out", "listing-cost-total", ["The agent’s fees,", "spelled out"]),
  std(34, "browse-stays-before-you-sign-up", "stays-dates-gb", ["Browse stays", "before you sign up"]),
  std(35, "vallo-real-estate-done-right", "welcome-4", ["Vallo. Real estate,", "done right."], { sub: "Homes, hotels, shortlets and restaurants." }),
];

/** Play's feature graphic, 1024 x 500, on the same night ground: the wordmark, one line, one phone. */
export async function FEATURE(ctx) {
  const p = await ctx.phone({ id: "home", cx: 766, cy: 258, h: 440, rotation: { x: -6, y: -16, z: 4 }, fov: 24, margin: 30, color: PHONE_COLOR });
  return [
    `<img class="abs" src="${brandUrl("vallo-wordmark.png")}" style="left:146px;top:146px;width:176px;z-index:30">`,
    `<div class="abs" style="left:144px;top:206px;width:460px;z-index:30;font:600 64px/1.04 Poppins;letter-spacing:-0.03em;color:#fff">Real estate,<br>done right.</div>`,
    p.html,
  ].join("\n");
}
