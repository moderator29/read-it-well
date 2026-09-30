/**
 * Shots 1 to 12: home, the account, the move-in cost, search, filters,
 * listings, sharing, messages and stays.
 */
import { headline, popup, pill, px } from "../components.mjs";
import { night, glow, beam, rings, ribbon, floorGrid, photo, stars, floorGlow, fill, horizon, electric, bokeh } from "../grounds.mjs";
import { frame, vignette, stickerIn, pairVignette, pairBoxes, iconDisc, dotted, COST, costCard, totalCard, pillWidth, screenLeftAt } from "./common.mjs";
import { photoUrl } from "../lib.mjs";

export const SET_A = [
  /* 1 ---------------------------------------------------------------- */
  {
    n: 1, slug: "find-your-next-home", captures: ["home"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "home", cx: W / 2, cy, h: f.phoneH, rotation: { x: -6, y: -15, z: 3.5 }, fov: 28 });
      return [
        night({ top: "#071466", mid: "#030840", bottom: "#010118" }),
        glow({ x: W / 2, y: cy + 60, rx: W * 0.66, ry: f.phoneH * 0.54, alpha: 0.6, blur: 30 }),
        glow({ x: W * 0.5, y: f.phoneTop + 40, rx: W * 0.56, ry: 300, color: "143 211 255", alpha: 0.2, blur: 40 }),
        beam({ x: W * 0.42, top: -160, h: H * 0.7, wTop: 220, wBottom: W * 1.25, alpha: 0.15, rotate: -8 }),
        stars({ W, H, count: 46, top: 40, bottom: f.phoneTop + 260, seed: 11 }),
        rings({ W, H, cx: W / 2, cy: cy + f.phoneH * 0.2, r: W * 0.74, ratio: 0.3, rotate: -10, alpha: 0.14, count: 3 }),
        floorGlow({ cx: W / 2, y: p.box.b + 16, w: p.box.w * 1.15, alpha: 0.55 }),
        vignette(0.5),
        p.html,
        stickerIn(ctx, { code: "1f3e1", x: p.box.x - 4 * u, y: p.box.y + p.box.h * 0.42, size: 240 * u, rotate: -9 }),
        stickerIn(ctx, { code: "1f511", x: Math.min(p.box.r + 4 * u, W - 118 * u), y: p.box.y + p.box.h * 0.8, size: 196 * u, rotate: 24 }),
        headline({ lines: ["Find your next", "home in Nigeria"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 2 ---------------------------------------------------------------- */
  {
    n: 2, slug: "homes-and-stays-one-account", captures: ["welcome-1"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "welcome-1", cx: W / 2, cy, h: f.phoneH, rotation: { x: 0, y: 0, z: 0 }, fov: 20, color: "natural-titanium" });
      return [
        night({ top: "#070B45", mid: "#040630", bottom: "#02010F" }),
        glow({ x: W * 0.02, y: cy - 160, rx: W * 0.7, ry: f.phoneH * 0.52, color: "0 105 254", alpha: 0.68, blur: 40 }),
        glow({ x: W * 1.0, y: cy + 220, rx: W * 0.66, ry: f.phoneH * 0.46, color: "255 107 26", alpha: 0.5, blur: 50 }),
        glow({ x: W * 0.86, y: H * 0.94, rx: W * 0.5, ry: 360, color: "255 178 122", alpha: 0.3, blur: 50 }),
        stars({ W, H, count: 40, top: 30, bottom: f.phoneTop + 200, seed: 23 }),
        horizon({ W, H, y: H * 0.8, z: 3 }),
        vignette(0.4),
        p.html,
        stickerIn(ctx, { code: "1f6ce-fe0f", x: p.box.r + 14, y: p.box.y + p.box.h * 0.3, size: 214 * u, rotate: 10 }),
        headline({ lines: ["Homes and stays,", "one account"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 3 ---------------------------------------------------------------- */
  {
    n: 3, slug: "the-full-move-in-cost", captures: ["listing-cost"], theme: "dark", pairWith: 4,
    async layout(ctx) {
      const { W, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 800 : 705, bottom: ios ? 140 : 110 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "listing-cost", cx: W * 0.415, cy, h: f.phoneH, rotation: { x: -3, y: 20, z: -2 }, fov: 26 });
      /* Each line lifts out of its own row on the screen (display px). */
      const rows = [980, 1282, 1552, 1822, 2140];
      const cw = 580 * u;
      const cards = COST.map(([label, amount, dot], i) => {
        const [x, y] = p.at(800, rows[i]);
        const left = Math.min(x, W - 56 * u - cw);
        return costCard({ x: left + i * 4 * u, y: y - 52 * u, w: cw, label, amount, dot, rotate: -2.4 + i * 0.75, s: u * 1.04, z: 34 + i });
      });
      const [tx, ty] = p.at(430, 2480);
      const tw = 620 * u;
      return [
        p.html,
        ...cards,
        totalCard({ x: Math.min(tx, W - 64 * u - tw), y: ty - 36 * u, w: tw, rotate: -2, s: u }),
        headline({ lines: ["The full move-in cost,", "before you call"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size,
          sub: "Rent plus every fee on the listing, added up.", subSize: 42 * u }),
      ].join("\n");
    },
    ground({ W, H, pageW, u, ctxs }) {
      const [a, b] = pairBoxes(ctxs, W);
      return [
        fill("linear-gradient(180deg, #050C52 0%, #03073A 48%, #010118 100%)"),
        glow({ x: a.cx - 40 * u, y: a.cy, rx: W * 0.62, ry: a.h * 0.5, alpha: 0.55, blur: 30 }),
        glow({ x: b.cx, y: b.cy - 100 * u, rx: W * 0.66, ry: b.h * 0.48, alpha: 0.42, blur: 40 }),
        glow({ x: W, y: H * 0.6, rx: W * 0.42, ry: 820 * u, color: "143 211 255", alpha: 0.12, blur: 40 }),
        stars({ W: pageW, H, count: 66, top: 30, bottom: H * 0.26, seed: 5 }),
        rings({ W: pageW, H, cx: b.cx, cy: b.cy + 120 * u, r: W * 0.78, ratio: 0.32, rotate: -8, alpha: 0.12, count: 2, dash: "4 18" }),
        pairVignette(0.45),
      ].join("\n");
    },
    /* A ribbon of light leaves the cost lines and runs on into Search. */
    bridge({ W, H, pageW, u }) {
      const d = `M ${W * 0.3} ${H * 0.52} C ${W * 0.62} ${H * 0.6}, ${W * 0.82} ${H * 0.64}, ${W} ${H * 0.655} S ${W * 1.36} ${H * 0.7}, ${W * 1.5} ${H * 0.84} S ${W * 1.78} ${H * 1.02}, ${W * 1.98} ${H * 1.06}`;
      return ribbon({ d, W: pageW, H, width: 50 * u, from: [W * 0.3, 0], to: [W * 1.98, 0], stops: [[0, "#0056D0", 0], [0.2, "#0069FE", 0.9], [0.5, "#5C9FFF"], [0.8, "#8FD3FF", 0.8], [1, "#8FD3FF", 0]], z: 9, coreAlpha: 0.75 });
    },
  },

  /* 4 ---------------------------------------------------------------- */
  {
    n: 4, slug: "search-homes-across-nigeria", captures: ["search"], theme: "dark", pairedFrom: 3,
    async layout(ctx) {
      const { W, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "search", cx: W * 0.605, cy, h: f.phoneH, rotation: { x: -6, y: -14, z: 2 }, fov: 26 });
      const b = p.box;
      return [
        pill({ x: 50 * u, y: b.y + b.h * 0.27, text: "Lagos", lucide: "map-pin", size: 36 * u, z: 36, active: true, rotate: -3 }),
        pill({ x: 84 * u, y: b.y + b.h * 0.45, text: "Abuja", lucide: "map-pin", size: 34 * u, z: 36, rotate: 2 }),
        pill({ x: 50 * u, y: b.y + b.h * 0.63, text: "Kano", lucide: "map-pin", size: 34 * u, z: 36, rotate: -2 }),
        p.html,
        stickerIn(ctx, { code: "1f50d", x: Math.min(b.r - 30 * u, W - 120 * u), y: b.y + 40 * u, size: 210 * u, rotate: 14 }),
        headline({ lines: ["Search homes", "across Nigeria"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 5 ---------------------------------------------------------------- */
  {
    n: 5, slug: "filter-by-what-you-need", captures: ["filters-villas"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "filters-villas", cx: W * 0.6, cy, h: f.phoneH * 0.93, rotation: { x: -20, y: -14, z: 3 }, fov: 30, color: "natural-titanium" });
      const b = p.box;
      /* The same choices the sheet on screen offers. Each pill ends just past
         the screen's left edge, so it overlaps the bezel and never a word. */
      const size = 38 * u;
      const chips = [
        ["Villas", "house", true, 0.22, -4],
        ["Mini flat", "key-round", false, 0.42, 2],
        ["Duplex", "house", false, 0.62, -2],
      ].map(([t, ic, on, k, r]) => {
        const y = b.y + b.h * k;
        const x = Math.max(56 * u, Math.min(80 * u, screenLeftAt(p, y + size) + 24 * u - pillWidth(t, size)));
        return [t, ic, on, x, y, r];
      });
      return [
        night({ top: "#050A3E", mid: "#030630", bottom: "#010118" }),
        glow({ x: W * 0.62, y: cy - 200, rx: W * 0.6, ry: f.phoneH * 0.46, alpha: 0.5, blur: 40 }),
        glow({ x: W * 0.1, y: cy + 300, rx: W * 0.45, ry: 700, color: "92 159 255", alpha: 0.18, blur: 50 }),
        floorGrid({ W, H, horizon: H * 0.6, alpha: 0.13, cell: 110 * u, depth: H * 0.6 }),
        stars({ W, H, count: 28, top: 40, bottom: f.phoneTop, seed: 31 }),
        vignette(0.45),
        p.html,
        ...chips.map(([t, ic, on, x, y, r]) => pill({ x, y, text: t, lucide: ic, size, rotate: r, z: 36, active: on })),
        headline({ lines: ["Filter by exactly", "what you need"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 6 ---------------------------------------------------------------- */
  {
    n: 6, slug: "see-every-home-up-close", captures: ["listing"], theme: "dark",
    async layout(ctx) {
      const { W } = ctx;
      const f = frame(ctx, { hlBottom: true });
      const p = await ctx.phone({ id: "listing", cx: W / 2, cy: f.phoneTop + f.phoneH / 2, h: f.phoneH, rotation: { x: 4, y: 0, z: 0 }, fov: 24, color: "natural-titanium" });
      return [
        fill("#02041F"),
        `<div class="g" style="inset:0;background:url('${photoUrl("villa-exterior-sunset.jpg")}') 50% 30% / cover no-repeat;filter:blur(6px) brightness(0.8) saturate(1.15);transform:scale(1.04)"></div>`,
        fill("linear-gradient(180deg, rgb(2 4 31 / 0.25) 0%, rgb(2 4 31 / 0.05) 30%, rgb(2 4 31 / 0.6) 60%, #02041F 78%)", "z-index:2"),
        glow({ x: W / 2, y: f.phoneTop + f.phoneH * 0.72, rx: W * 0.6, ry: 520, color: "0 105 254", alpha: 0.4, blur: 40, z: 3 }),
        p.html,
        headline({ lines: ["See every home", "up close"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 7 ---------------------------------------------------------------- */
  {
    n: 7, slug: "share-a-home-in-one-tap", captures: ["listing-share"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "listing-share", cx: W * 0.58, cy, h: f.phoneH * 0.97, rotation: { x: -20, y: -18, z: 5 }, fov: 28 });
      const b = p.box;
      const x0 = W * 0.16;
      const arc = `M ${b.x + b.w * 0.26} ${b.y + b.h * 0.7} C ${x0 - 60 * u} ${b.y + b.h * 0.64}, ${x0 - 90 * u} ${b.y + b.h * 0.42}, ${x0} ${b.y + b.h * 0.22}`;
      return [
        electric({ W, H }),
        rings({ W, H, cx: b.cx, cy: b.cy + 200 * u, r: W * 0.8, ratio: 0.3, rotate: -12, alpha: 0.2, count: 3 }),
        dotted({ d: arc, W, H, color: "rgb(255 255 255 / 0.85)", dot: 9 * u, gap: 28 * u, z: 30, glow: false }),
        p.html,
        iconDisc({ x: x0, y: b.y + b.h * 0.22, size: 140 * u, lucide: "send", theme: "light", z: 34 }),
        iconDisc({ x: x0 - 40 * u, y: b.y + b.h * 0.39, size: 124 * u, lucide: "message-circle", theme: "light", z: 34 }),
        iconDisc({ x: x0 - 20 * u, y: b.y + b.h * 0.55, size: 116 * u, lucide: "link", theme: "light", z: 34 }),
        headline({ lines: ["Share a home", "in one tap"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size, accent: 0 }),
      ].join("\n");
    },
  },

  /* 8 ---------------------------------------------------------------- */
  {
    n: 8, slug: "talk-straight-to-the-owner", captures: ["thread"], theme: "dark", pairWith: 9,
    async layout(ctx) {
      const { W, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "thread", cx: W * 0.44, cy, h: f.phoneH, rotation: { x: -5, y: 16, z: -2.5 }, fov: 26 });
      /* The card lands over the first listing's photograph, its lower edge
         (rotation included) clear of the listing's title at display y 1180. */
      const py = Math.min(p.at(700, 860)[1], p.at(420, 1180)[1] - 250 * u);
      ctx.anchors = { popup: [W - 44 * u, py + 92 * u] };
      return [
        p.html,
        popup({ x: W - 800 * u - 50 * u, y: py, w: 800 * u, rotate: -3, emoji: "1f4ac", title: "New message", line: "The owner replied", meta: "now", scale: u * 1.1 }),
        headline({ lines: ["Talk straight", "to the owner"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
    ground({ W, H, pageW, u, ctxs }) {
      const [a, b] = pairBoxes(ctxs, W);
      return [
        fill("linear-gradient(180deg, #15106A 0%, #0A0848 48%, #030220 100%)"),
        glow({ x: a.cx - 200 * u, y: a.cy - 300 * u, rx: W * 0.7, ry: a.h * 0.46, color: "60 90 255", alpha: 0.5, blur: 40 }),
        glow({ x: b.cx + 150 * u, y: b.cy - 260 * u, rx: W * 0.7, ry: b.h * 0.46, color: "60 90 255", alpha: 0.5, blur: 40 }),
        glow({ x: W, y: H * 0.78, rx: W * 0.6, ry: 760 * u, color: "143 211 255", alpha: 0.13, blur: 50 }),
        bokeh({ W: pageW, H, count: 18, seed: 41, color: "120 150 255", top: H * 0.3, bottom: H }),
        pairVignette(0.4),
      ].join("\n");
    },
    /* A dotted line leaves the pop-up and crosses the seam to the first
       kind of conversation in the inbox next door. */
    bridge({ W, H, pageW, u, ctxs }) {
      const [x0, y0] = ctxs[0].anchors.popup;
      const [x1, y1] = ctxs[1].anchors.first;
      const X1 = W + x1;
      /* A plain S: the control points stay between the two ends, so the
         line never loops back on itself. */
      const X = X1 - 16 * u;
      const k = (X - x0) * 0.55;
      const d = `M ${x0} ${y0} C ${x0 + k} ${y0}, ${X - k} ${y1}, ${X} ${y1}`;
      return dotted({ d, W: pageW, H, dot: 10 * u, gap: 30 * u, z: 45 });
    },
  },

  /* 9 ---------------------------------------------------------------- */
  {
    n: 9, slug: "every-conversation-in-one-place", captures: ["messages"], theme: "dark", pairedFrom: 8,
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "messages", cx: W * 0.635, cy, h: f.phoneH * 0.94, rotation: { x: -5, y: -18, z: 2.5 }, fov: 26, color: "natural-titanium" });
      /* Owners, landlords and hosts: every kind of conversation runs into
         the inbox's one row (its avatar sits at display 166, 1397). The
         dotted lines start under each pill, which sits above them. */
      const [ax, ay] = p.at(166, 1397);
      const [ex] = p.at(0, 1397);
      const edge = ex - 22 * u;
      const size = 33 * u;
      const pillH = size * 2.18;
      const x0 = 50 * u;
      const rows = [
        ["Owners", "house", ay - 470 * u, 150 * u],
        ["Landlords", "key-round", ay - 90 * u, 150 * u],
        ["Hosts", "bed-double", ay + 300 * u, 150 * u],
      ];
      ctx.anchors = { first: [x0, rows[0][2] + pillH / 2] };
      const lines = rows.map(([, , y, w]) => {
        const sx = x0 + w + 8 * u;
        const sy = y + pillH / 2;
        return `M ${sx} ${sy} C ${sx + 90 * u} ${sy}, ${edge - 110 * u} ${ay}, ${edge} ${ay} L ${ax - 62 * u} ${ay}`;
      });
      return [
        p.html,
        ...lines.map((d) => dotted({ d, W, H, dot: 9 * u, gap: 24 * u, z: 30 })),
        `<div class="g" style="left:${px(ax - 56 * u)};top:${px(ay - 56 * u)};width:${px(112 * u)};height:${px(112 * u)};border-radius:50%;box-shadow:0 0 0 ${px(4 * u)} rgb(143 211 255 / 0.9), 0 0 ${px(44 * u)} ${px(12 * u)} rgb(0 105 254 / 0.75);z-index:31"></div>`,
        ...rows.map(([t, ic, y], i) => pill({ x: x0, y, text: t, lucide: ic, size, z: 36, active: i === 0 })),
        headline({ lines: ["Every conversation", "in one place"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 10 --------------------------------------------------------------- */
  {
    n: 10, slug: "hotels-shortlets-and-resorts", captures: ["stays"], theme: "dark", pairWith: 11,
    async layout(ctx) {
      const { W, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "stays", cx: W * 0.47, cy, h: f.phoneH, rotation: { x: -6, y: 14, z: -2 }, fov: 26 });
      return [
        p.html,
        headline({ lines: ["Hotels, shortlets", "and resorts"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
    ground({ W, H, pageW, u, ctxs }) {
      const [a, b] = pairBoxes(ctxs, W);
      return [
        fill("linear-gradient(180deg, #060B4A 0%, #0A0B45 38%, #2A1450 64%, #5A2140 78%, #1A0A28 100%)"),
        glow({ x: W, y: H * 0.8, rx: W * 1.25, ry: 560 * u, color: "255 107 26", alpha: 0.42, blur: 50 }),
        glow({ x: a.cx - 150 * u, y: a.cy - 300 * u, rx: W * 0.6, ry: a.h * 0.4, alpha: 0.4, blur: 40 }),
        glow({ x: b.cx + 150 * u, y: b.cy - 300 * u, rx: W * 0.6, ry: b.h * 0.4, alpha: 0.4, blur: 40 }),
        stars({ W: pageW, H, count: 96, top: 30, bottom: H * 0.45, seed: 61 }),
        pairVignette(0.35),
      ].join("\n");
    },
    /* A photograph of the resort's pool deck lies across the seam. */
    bridge({ W, H, u }) {
      const w = 980 * u;
      const h = 620 * u;
      return photo({ src: "resort-pool-deck.jpg", x: W - w / 2, y: H * 0.72, w, h, rotate: -4, radius: 48 * u, z: 9, brightness: 0.95 });
    },
  },

  /* 11 --------------------------------------------------------------- */
  {
    n: 11, slug: "book-a-room-in-a-few-taps", captures: ["stay"], theme: "dark", pairedFrom: 10,
    async layout(ctx) {
      const { W, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 820 : 735 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "stay", cx: W * 0.55, cy, h: f.phoneH, rotation: { x: -6, y: -14, z: 2 }, fov: 26 });
      const b = p.box;
      return [
        p.html,
        /* The card lands on the handset's top edge, clear of the stay page's
           "no such property" notice. */
        popup({ x: W * 0.5 - 450 * u, y: b.y - 170 * u, w: 900 * u, rotate: -2.5, emoji: "1f6cf-fe0f", title: "Room booked", line: "Lagoon Crest Resort · 3 nights", meta: "now", example: true, scale: u * 1.1 }),
        headline({ lines: ["Book a room", "in a few taps"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 12 --------------------------------------------------------------- */
  {
    n: 12, slug: "pick-your-dates", captures: ["stays-dates", "stays-filters"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const h = f.phoneH * 0.9;
      const back = await ctx.phone({ id: "stays-filters", cx: W * 0.355, cy: f.phoneTop + h / 2 - 10, h: h * 0.9, rotation: { x: -4, y: 20, z: -5 }, fov: 26, z: 18, color: "natural-titanium" });
      const front = await ctx.phone({ id: "stays-dates", cx: W * 0.62, cy: f.phoneTop + f.phoneH - h / 2, h, rotation: { x: -4, y: -14, z: 3 }, fov: 26, z: 22 });
      return [
        fill("linear-gradient(180deg, #061A66 0%, #0A2A86 34%, #061555 64%, #020522 100%)"),
        glow({ x: W * 0.5, y: f.phoneTop + f.phoneH / 2, rx: W * 0.72, ry: f.phoneH * 0.5, color: "92 159 255", alpha: 0.4, blur: 40 }),
        stars({ W, H, count: 30, top: 30, bottom: f.phoneTop, seed: 71 }),
        vignette(0.35),
        rings({ W, H, cx: W * 0.5, cy: f.phoneTop + f.phoneH * 0.62, r: W * 0.8, ratio: 0.28, rotate: -6, alpha: 0.12, count: 3 }),
        back.html,
        `<div class="g" style="left:${px(back.box.x)};top:${px(back.box.y)};width:${px(back.box.w)};height:${px(back.box.h)};z-index:19;background:radial-gradient(60% 50% at 70% 50%, rgb(1 1 24 / 0.35), transparent 70%)"></div>`,
        front.html,
        stickerIn(ctx, { code: "1f4c5", x: Math.min(front.box.r - 30 * u, W - 120 * u), y: front.box.y + 30 * u, size: 210 * u, rotate: 12 }),
        headline({ lines: ["Pick your dates,", "see what's free"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },
];
