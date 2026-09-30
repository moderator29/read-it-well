/**
 * The 35 store images, by DESIGN.md section 6a (the founder's ruling of
 * 30 September 2026, evening), in the manner of X's App Store set:
 *
 *   - one night ground for every image, a quiet vertical gradient from
 *     #050B3D to #010118, the same pixel for pixel in all 35;
 *   - a small line icon, then the headline, centred at the top on the same
 *     baseline in every image;
 *   - the phone: big, centred on its screen, whole, straight on, at the
 *     same scale in every image, the app's dark theme on its screen.
 *
 * Nothing else is drawn, except on two images, each with one card that has
 * just arrived: "Room booked" (11) and "Payment settled" (30). Two pairs
 * share one big tilted phone across their seam, as X's "Be the first to
 * know" does: 10 and 11 (stays) and 13 and 14 (restaurants). On the one
 * ground the seam disappears, and the phone is whole across the pair.
 */
import { headline, popup, px } from "../components.mjs";
import { fill } from "../grounds.mjs";
import { icon, brandUrl } from "../lib.mjs";

/* ------------------------------------------------------------- the system */

export const GROUND = "linear-gradient(180deg, #050B3D 0%, #010118 100%)";
const SKY = "#8FD3FF";
const PHONE_COLOR = "black-titanium";
const SHADOW = { type: "contact", opacity: 0.5 };
const FRONT = { rotation: { x: 0, y: 0, z: 0 }, fov: 20 };

/** The grid every image shares, per store (page pixels). */
export function M(ctx) {
  const { W, H, ios } = ctx;
  const side = ios ? 80 : 88;
  const size = ios ? 112 : 122;
  const iconSize = ios ? 64 : 70;
  const iconTop = ios ? 196 : 150;
  const hlTop = iconTop + iconSize + (ios ? 40 : 42);
  const lh = 1.05;
  const phoneTop = ios ? 700 : 660;
  const phoneBottom = ios ? 112 : 96;
  return { W, H, side, size, iconSize, iconTop, hlTop, lh, max: W - 2 * side, phoneTop, phoneH: H - phoneTop - phoneBottom };
}

/* A lucide line icon, 3 px of stroke at its size. */
function lineIcon({ name, x, top, size, align = "center" }) {
  const left = align === "center" ? x - size / 2 : x;
  return `<div class="abs" style="left:${px(left)};top:${px(top)};width:${px(size)};height:${px(size)};z-index:40">${icon(name, { size: Math.round(size), color: SKY, stroke: (3 * 24) / size })}</div>`;
}

function head(ctx, m, lines, { align = "center", sub } = {}) {
  return headline({
    lines, cx: ctx.W / 2, x: m.side, y: m.hlTop, max: m.max, size: m.size, align, accent: 0, weight: 600, lineHeight: m.lh, theme: "dark",
    sub, subSize: ctx.ios ? 40 : 44, subColor: "rgb(255 255 255 / 0.6)",
  });
}

/** The phone every plain image shows: centred on its screen, straight on. */
async function stdPhone(ctx, m, id) {
  const cy = m.phoneTop + m.phoneH / 2;
  const first = await ctx.phone({ id, cx: ctx.W / 2, cy, h: m.phoneH, rotation: FRONT.rotation, fov: FRONT.fov, color: PHONE_COLOR, shadow: SHADOW });
  /* Optical centring: the side buttons make the body's box lopsided, so
     centre the screen instead. */
  const sx = first.quad.reduce((a, q) => a + q[0], 0) / 4;
  const dx = ctx.W / 2 - sx;
  if (Math.abs(dx) < 0.5) return first;
  ctx.placed.pop();
  return ctx.phone({ id, cx: ctx.W / 2 + dx, cy, h: m.phoneH, rotation: FRONT.rotation, fov: FRONT.fov, color: PHONE_COLOR, shadow: SHADOW });
}

/** The template every plain image follows. */
function std(n, slug, id, iconName, lines, { sub } = {}) {
  return {
    n, slug, captures: [id],
    async layout(ctx) {
      const m = M(ctx);
      const p = await stdPhone(ctx, m, id);
      return [
        fill(GROUND),
        lineIcon({ name: iconName, x: ctx.W / 2, top: m.iconTop, size: m.iconSize }),
        head(ctx, m, lines, { sub }),
        p.html,
      ].join("\n");
    },
  };
}

/* ------------------------------------------------------------- the pairs */

/**
 * Two neighbours that share one phone across their seam. Each keeps its own
 * icon and headline, set left on the same grid, so the words run on across
 * the seam; the phone is drawn once, tilted by the 3D studio.
 */
function pair(a, b, { id, rotation, fov, cy, h, extraB }) {
  const shared = async ({ pc, W, H, ios }) => {
    const m = M({ W, H, ios });
    const ph = m.phoneH * h;
    const p = await pc.phone({ id, cx: W, cy: m.phoneTop + (H - m.phoneTop) * cy, h: ph, rotation, fov, color: PHONE_COLOR, shadow: SHADOW, margin: ios ? 64 : 70 });
    return { html: p.html, phone: p };
  };
  const words = (S, extra) => async (ctx) => {
    const m = M(ctx);
    return [
      lineIcon({ name: S.icon, x: m.side, top: m.iconTop, size: m.iconSize, align: "left" }),
      head(ctx, m, S.lines, { align: "left" }),
      extra ? await extra(ctx, m) : "",
    ].join("\n");
  };
  return [
    {
      n: a.n, slug: a.slug, captures: [id], pairWith: b.n, shared,
      ground: ({ pageW, H }) => `<div class="g" style="left:0;top:0;width:${pageW}px;height:${H}px;background:${GROUND}"></div>`,
      layout: words(a),
    },
    { n: b.n, slug: b.slug, captures: [id], pairedFrom: a.n, layout: words(b, extraB) },
  ];
}

/* ------------------------------------------------------------- the 35 */

export const SHOTS = [
  std(1, "find-your-next-home", "home", "house", ["Find your next", "home in Nigeria"]),
  std(2, "homes-and-stays-one-account", "welcome-1", "circle-user-round", ["Homes and stays,", "one account"]),
  std(3, "the-full-move-in-cost", "listing-cost", "receipt-text", ["The full move-in cost,", "before you call"]),
  std(4, "search-homes-across-nigeria", "search", "search", ["Search homes", "across Nigeria"]),
  std(5, "filter-by-what-you-need", "filters-villas", "sliders-horizontal", ["Filter by exactly", "what you need"]),
  std(6, "see-every-home-up-close", "listing", "zoom-in", ["See every home", "up close"]),
  std(7, "share-a-home-in-one-tap", "listing-share", "share-2", ["Share a home", "in one tap"]),
  std(8, "talk-straight-to-the-owner", "thread", "message-circle", ["Talk straight", "to the owner"]),
  std(9, "every-conversation-in-one-place", "messages", "inbox", ["Every conversation", "in one place"]),

  /* 10 and 11: the stays home across the seam, leaning right; the booking
     arrives over its photograph on 11. */
  ...pair(
    { n: 10, slug: "hotels-shortlets-and-resorts", icon: "hotel", lines: ["Hotels, shortlets", "and resorts"] },
    { n: 11, slug: "book-a-room-in-a-few-taps", icon: "bed-double", lines: ["Book a room", "in a few taps"] },
    {
      id: "stays", rotation: { x: -16, y: -16, z: -17 }, fov: 26, cy: 0.52, h: 1.06,
      async extraB(ctx) {
        const { u, W } = ctx;
        /* Over the photograph at the top of the screen (display y 360 to
           900, clear of its words), inside this image. */
        const sp = ctx.shared.phone;
        const [, y] = sp.at(700, 560);
        const w = 860 * u;
        return popup({ x: W - 70 * u - w, y: y - 110 * u, w, lucide: "bed-double", title: "Room booked", line: "Lagoon Crest Resort · 3 nights", meta: "now", example: true, scale: u * 1.06 });
      },
    },
  ),

  std(12, "pick-your-dates", "stays-dates-gb", "calendar-days", ["Pick your dates,", "see what's free"]),

  /* 13 and 14: the restaurant across the seam, leaning left. */
  ...pair(
    { n: 13, slug: "find-a-restaurant-you-love", icon: "utensils", lines: ["Find a restaurant", "you love"] },
    { n: 14, slug: "reserve-your-table", icon: "calendar-check", lines: ["Reserve your table", "in seconds"] },
    { id: "restaurant", rotation: { x: -16, y: 16, z: 17 }, fov: 26, cy: 0.52, h: 1.06 },
  ),

  std(15, "whats-happening-around-you", "around", "megaphone", ["What's happening", "around you"]),
  std(16, "know-the-moment-anything-changes", "notifications", "bell", ["Know the moment", "anything changes"]),
  std(17, "ask-the-ai-assistant", "assistant-caution-2", "sparkles", ["Ask the AI assistant,", "any time of day"]),
  std(18, "save-favourites-compare-later", "saved", "heart", ["Save favourites,", "compare later"]),
  std(19, "everything-one-tap-away", "drawer", "layout-grid", ["Everything,", "one tap away"]),
  std(20, "vallo-never-holds-your-money", "payments", "landmark", ["Vallo never holds", "your money"]),
  std(21, "cards-and-banks-in-one-place", "payment-methods", "credit-card", ["Cards and banks,", "in one place"]),
  std(22, "a-real-person-checks-every-verified-mark", "verification", "badge-check", ["A real person checks", "every verified mark"]),
  std(23, "lock-vallo-with-a-passcode", "passcode-create", "lock-keyhole", ["Lock Vallo", "with a passcode"]),
  std(24, "help-from-a-real-person", "support", "headset", ["Help from", "a real person"]),
  std(25, "see-what-places-nearby-are-asking", "price", "map-pin", ["See what places", "nearby are asking"]),
  std(26, "all-your-plans-in-one-place", "plans", "calendar-range", ["All your plans", "in one place"]),
  std(27, "run-your-listings-from-one-workspace", "agent-dashboard", "layout-dashboard", ["Run your listings", "from one workspace"]),
  std(28, "list-your-property-on-vallo", "agent-properties", "house-plus", ["List your property", "on Vallo"]),
  std(29, "host-your-hotel-or-shortlet", "host-start", "key-round", ["Host your hotel", "or shortlet"]),

  /* 30: the host's side of a booking; the payout arrives in the clear space
     under the empty state, where the screen shows no amount of its own. */
  {
    n: 30, slug: "your-share-goes-straight-to-your-bank", captures: ["host-bookings"],
    async layout(ctx) {
      const { W, u } = ctx;
      const m = M(ctx);
      const p = await stdPhone(ctx, m, "host-bookings");
      const [, y] = p.at(660, 2040);
      const w = 900 * u;
      return [
        fill(GROUND),
        lineIcon({ name: "banknote", x: W / 2, top: m.iconTop, size: m.iconSize }),
        head(ctx, m, ["Your share goes", "straight to your bank"]),
        p.html,
        popup({ x: W / 2 - w / 2, y, w, lucide: "landmark", title: "Payment settled", line: "Straight to your bank", amount: "₦1,800,000", meta: "now", example: true, scale: u * 1.06 }),
      ].join("\n");
    },
  },

  std(31, "welcome-back", "sign-in", "log-in", ["Welcome back,", "sign in in seconds"]),
  std(32, "vallo-speaks-your-language", "welcome-yo", "languages", ["Vallo speaks", "your language"], { sub: "English, Hausa, Yorùbá and Igbo." }),
  std(33, "light-or-dark-your-call", "appearance", "sun-moon", ["Light or dark,", "your call"]),
  std(34, "listings-that-speak-for-themselves", "listing-sale", "image", ["Listings that speak", "for themselves"]),

  /* 35: the closing card. The app icon takes the line icon's place, and
     the launch line sits under the name. */
  {
    n: 35, slug: "real-estate-done-right", captures: ["home-recent"],
    async layout(ctx) {
      const { W } = ctx;
      const m = M(ctx);
      const p = await stdPhone(ctx, m, "home-recent");
      const s = m.iconSize * 1.25;
      return [
        fill(GROUND),
        `<img class="abs" src="${brandUrl("vallo-icon.png")}" style="left:${px(W / 2 - s / 2)};top:${px(m.iconTop + m.iconSize - s)};width:${px(s)};height:${px(s)};border-radius:22.4%;z-index:40;box-shadow:0 0 0 1px rgb(255 255 255 / 0.14)">`,
        head(ctx, m, ["Vallo. Real estate,", "done right."], { sub: "Coming soon on iPhone and Android." }),
        p.html,
      ].join("\n");
    },
  },
];

/** Play's feature graphic, 1024 x 500, on the same night ground: the wordmark, one line, one phone. */
export async function FEATURE(ctx) {
  const p = await ctx.phone({ id: "home", cx: 792, cy: 258, h: 420, rotation: { x: -6, y: -16, z: 4 }, fov: 24, margin: 34, color: PHONE_COLOR, shadow: { type: "drop", opacity: 0.45 } });
  return [
    fill(GROUND),
    `<img class="abs" src="${brandUrl("vallo-wordmark.png")}" style="left:74px;top:150px;width:176px;z-index:30">`,
    `<div class="abs" style="left:72px;top:212px;width:560px;z-index:30;font:600 56px/1.05 Poppins;letter-spacing:-0.03em;color:#fff">Real estate,<br>done right.</div>`,
    p.html,
  ].join("\n");
}
