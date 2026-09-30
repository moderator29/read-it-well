/**
 * Shots 13 to 24: restaurants, the feed, notifications, the assistant,
 * saved homes, the menu, payments, verification, the passcode and support.
 */
import { headline, popup, sticker, pill, px, reflection } from "../components.mjs";
import { night, glow, beam, rings, ribbon, photo, art, stars, floorGlow, fill, electric, stage, bokeh } from "../grounds.mjs";
import { frame, vignette, darkBase, stickerIn, pairVignette, pairBoxes, iconDisc, dotted, noteCard } from "./common.mjs";
import { icon, artUrl } from "../lib.mjs";

/* Points along a quadratic Bezier, for the string of lights. */
const quad = (p0, p1, p2, t) => [
  (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
  (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
];

export const SET_B = [
  /* 13 --------------------------------------------------------------- */
  {
    n: 13, slug: "find-a-restaurant-you-love", captures: ["restaurants"], theme: "dark", pairWith: 14,
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "restaurants", cx: W * 0.46, cy, h: f.phoneH, rotation: { x: -6, y: 15, z: -2 }, fov: 26 });
      const b = p.box;
      return [
        p.html,
        headline({ lines: ["Find a restaurant", "you love"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
    ground({ W, H, pageW, u, ctxs }) {
      const [a, b] = pairBoxes(ctxs, W);
      return [
        fill("linear-gradient(180deg, #0A0B3C 0%, #0B0A30 45%, #1C0E26 78%, #120818 100%)"),
        glow({ x: W, y: H * 0.88, rx: W * 1.5, ry: 600 * u, color: "255 140 60", alpha: 0.32, blur: 50 }),
        glow({ x: a.cx - 120 * u, y: a.cy - 200 * u, rx: W * 0.6, ry: a.h * 0.42, color: "0 105 254", alpha: 0.42, blur: 40 }),
        glow({ x: b.cx + 120 * u, y: b.cy - 200 * u, rx: W * 0.6, ry: b.h * 0.42, color: "0 105 254", alpha: 0.42, blur: 40 }),
        stars({ W: pageW, H, count: 56, top: 30, bottom: H * 0.2, seed: 81 }),
        pairVignette(0.4),
      ].join("\n");
    },
    bridge({ W, H, pageW, u }) {
      const p0 = [-W * 0.04, H * 0.225];
      const p1 = [W, H * 0.43];
      const p2 = [W * 2.04, H * 0.225];
      const d = `M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
      const bulbs = Array.from({ length: 23 }, (_, i) => {
        const [x, y] = quad(p0, p1, p2, (i + 0.5) / 23);
        const r = 10 * u;
        return `<div class="g" style="left:${px(x - r)};top:${px(y - r + 12 * u)};width:${px(r * 2)};height:${px(r * 2)};border-radius:50%;background:radial-gradient(circle at 40% 35%, #FFF6DC 0%, #FFD08A 45%, #FF9B3D 100%);box-shadow:0 0 ${px(18 * u)} ${px(6 * u)} rgb(255 170 80 / 0.55), 0 0 ${px(60 * u)} ${px(16 * u)} rgb(255 120 40 / 0.28);z-index:10"></div>`;
      }).join("");
      return `<svg class="g" style="left:0;top:0;z-index:10" width="${pageW}" height="${H}"><path d="${d}" fill="none" stroke="rgb(255 214 170 / 0.45)" stroke-width="${2.5 * u}"/></svg>${bulbs}`;
    },
  },

  /* 14 --------------------------------------------------------------- */
  {
    n: 14, slug: "reserve-your-table", captures: ["restaurant"], theme: "dark", pairedFrom: 13,
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "restaurant", cx: W * 0.55, cy, h: f.phoneH, rotation: { x: -6, y: -15, z: 2 }, fov: 26, color: "natural-titanium" });
      const b = p.box;
      return [
        p.html,
        /* Over the restaurant's photograph (display y 400 to 690), clear of
           every word and of the page's example notice. */
        popup({ x: 44 * u, y: p.at(660, 400)[1], w: 920 * u, rotate: -3, emoji: "1f942", tone: "warm", title: "Table for 2", line: "Tonight, 8:00 PM · Harbour Lights Kitchen", meta: "now", example: true, scale: u * 1.06 }),
        headline({ lines: ["Reserve your table", "in seconds"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 15 --------------------------------------------------------------- */
  {
    n: 15, slug: "hear-whats-happening-around-you", captures: ["around"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx, { hlBottom: true });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "around", cx: W * 0.55, cy, h: f.phoneH, rotation: { x: 5, y: -12, z: 2 }, fov: 28 });
      const b = p.box;
      const sx = W * 0.16;
      const sy = b.y + b.h * 0.34;
      const waves = [1, 2, 3, 4].map((k) => `<circle cx="${sx}" cy="${sy}" r="${k * 160 * u}" fill="none" stroke="rgb(143 211 255 / ${0.42 - k * 0.08})" stroke-width="${3.5 * u}"/>`).join("");
      return [
        darkBase(ctx, { top: "#040844", mid: "#030634", bottom: "#010118", seed: 91, starBottom: H * 0.5,
          glows: [{ x: W * 0.55, y: cy, rx: W * 0.66, ry: f.phoneH * 0.5, alpha: 0.46, blur: 40 }, { x: sx, y: sy, rx: 420, ry: 420, color: "143 211 255", alpha: 0.2, blur: 30 }] }),
        `<svg class="g" style="left:0;top:0;z-index:7" width="${W}" height="${H}">${waves}</svg>`,
        p.html,
        stickerIn(ctx, { code: "1f4e3", x: sx - 40 * u, y: sy, size: 240 * u, rotate: -14, z: 36 }),
        headline({ lines: ["Hear what's happening", "around you"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 16 --------------------------------------------------------------- */
  {
    n: 16, slug: "know-the-moment-anything-changes", captures: ["notifications"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "notifications", cx: W * 0.63, cy, h: f.phoneH * 0.93, rotation: { x: -8, y: -22, z: 7 }, fov: 26 });
      const b = p.box;
      const cw = 760 * u;
      const arc = (r, a) => `<ellipse cx="${b.x + b.w * 0.3}" cy="${b.y + b.h * 0.42}" rx="${r}" ry="${r * 0.62}" fill="none" stroke="rgb(255 255 255 / ${a})" stroke-width="${2 * u}" stroke-dasharray="${6 * u} ${14 * u}" transform="rotate(-24 ${b.x + b.w * 0.3} ${b.y + b.h * 0.42})"/>`;
      return [
        darkBase(ctx, { top: "#050A46", mid: "#030634", bottom: "#010118", seed: 101, starBottom: f.phoneTop,
          glows: [{ x: W * 0.62, y: cy - 150, rx: W * 0.62, ry: f.phoneH * 0.46, alpha: 0.48, blur: 40 }] }),
        `<svg class="g" style="left:0;top:0;z-index:7" width="${W}" height="${H}">${arc(W * 0.62, 0.16)}${arc(W * 0.46, 0.12)}</svg>`,
        p.html,
        noteCard({ x: 64 * u, y: p.at(660, 1760)[1] - 60 * u, w: cw * 0.94, lucide: "house", title: "New home", line: "For your saved search", meta: "2m", example: true, s: u * 0.98, rotate: 4, z: 31 }),
        noteCard({ x: 52 * u, y: p.at(660, 2010)[1] - 60 * u, w: cw * 1.02, lucide: "file-check", title: "Agreement confirmed", line: "By both of you", meta: "1m", example: true, s: u * 1.04, rotate: -2, z: 33 }),
        noteCard({ x: 56 * u, y: p.at(660, 2260)[1] - 60 * u, w: cw * 1.08, lucide: "calendar-check", title: "Inspection set", line: "Saturday, 11:00 AM", meta: "now", example: true, s: u * 1.1, rotate: -5, z: 35 }),
        headline({ lines: ["Know the moment", "anything changes"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 17 --------------------------------------------------------------- */
  {
    n: 17, slug: "ask-the-ai-assistant", captures: ["assistant-caution"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "assistant-caution", cx: W / 2, cy, h: f.phoneH, rotation: { x: -3, y: 8, z: -1.5 }, fov: 24, color: "natural-titanium" });
      const b = p.box;
      return [
        night({ top: "#03052C", mid: "#020424", bottom: "#010118" }),
        `<div class="g" style="left:${px(W * 0.5 - 760 * u)};top:${px(f.phoneTop - 120 * u)};width:${px(1520 * u)};height:${px(1520 * u)};border-radius:50%;background:radial-gradient(circle at 38% 34%, rgb(190 230 255 / 0.9) 0%, rgb(92 159 255 / 0.85) 18%, rgb(0 105 254 / 0.75) 38%, rgb(40 40 200 / 0.4) 60%, rgb(2 4 40 / 0) 72%);filter:blur(30px);opacity:0.8;z-index:1"></div>`,
        glow({ x: W * 0.82, y: f.phoneTop + 200, rx: 420, ry: 420, color: "255 150 90", alpha: 0.18, blur: 40 }),
        stars({ W, H, count: 40, top: 30, bottom: H * 0.9, seed: 111 }),
        vignette(0.45),
        p.html,
        stickerIn(ctx, { code: "2728", x: Math.min(b.r + 20 * u, W - 90 * u), y: b.y - 10 * u, size: 150 * u, rotate: 12 }),
        headline({ lines: ["Ask the AI assistant,", "any time of day"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 18 --------------------------------------------------------------- */
  {
    n: 18, slug: "save-favourites-compare-later", captures: ["saved"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "saved", cx: W * 0.63, cy, h: f.phoneH * 0.96, rotation: { x: -5, y: -16, z: 2.5 }, fov: 26 });
      const b = p.box;
      const card = (src, x, y, r, z) => photo({ src, x, y, w: 560 * u, h: 430 * u, rotate: r, radius: 36 * u, z, brightness: 0.95 })
        + `<div class="abs" style="left:${px(x + 30 * u)};top:${px(y + 20 * u)};width:${px(72 * u)};height:${px(72 * u)};border-radius:50%;display:grid;place-items:center;background:rgb(1 1 24 / 0.55);box-shadow:inset 0 0 0 1.5px rgb(255 255 255 / 0.25);transform:rotate(${r}deg);z-index:${z + 1};-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)">${icon("heart", { size: Math.round(36 * u), color: "#5C9FFF", stroke: 2.4 }).replace('fill="none"', 'fill="#5C9FFF"')}</div>`;
      return [
        darkBase(ctx, { top: "#060B4C", mid: "#040738", bottom: "#010118", seed: 121, starBottom: f.phoneTop,
          glows: [{ x: W * 0.6, y: cy - 100, rx: W * 0.62, ry: f.phoneH * 0.48, alpha: 0.46, blur: 40 }] }),
        card("living-room-dusk.jpg", 40 * u, b.y + b.h * 0.14, -8, 14),
        card("villa-pool-terrace.jpg", 20 * u, b.y + b.h * 0.4, 4, 15),
        card("bedroom-01.jpg", 56 * u, b.y + b.h * 0.64, -5, 16),
        p.html,
        headline({ lines: ["Save favourites,", "compare later"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 19 --------------------------------------------------------------- */
  {
    n: 19, slug: "everything-one-tap-away", captures: ["drawer"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 610 : 545, bottom: ios ? 330 : 300 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "drawer", cx: W / 2, cy, h: f.phoneH, rotation: { x: 0, y: 0, z: 0 }, fov: 20, shadow: { type: "none" } });
      const b = p.box;
      const size = 128 * u;
      const lx = Math.max(size / 2 + 40 * u, b.x - 6 * u);
      const rxx = Math.min(W - size / 2 - 40 * u, b.r + 6 * u);
      const discs = [
        ["calendar-days", lx, 0.2, "glass"], ["message-circle", lx, 0.42, "electric"], ["heart", lx, 0.64, "glass"],
        ["bell", rxx, 0.3, "glass"], ["credit-card", rxx, 0.52, "glass"], ["sparkles", rxx, 0.74, "glass"],
      ].map(([ic, x, k, tone]) => iconDisc({ x, y: b.y + b.h * k, size, lucide: ic, z: 32, tone }));
      return [
        stage({ W, H, floorY: b.b + 4 * u }),
        beam({ x: W / 2, top: -200, h: b.b + 200, wTop: 200 * u, wBottom: W * 1.3, alpha: 0.2, blur: 50 }),
        stars({ W, H, count: 24, top: 30, bottom: f.phoneTop, seed: 131 }),
        reflection(p, { opacity: 0.3, length: 0.26, bottom: H - 8 }),
        p.html,
        ...discs,
        headline({ lines: ["Everything,", "one tap away"], cx: W / 2, y: f.hlTop - (ios ? 10 : 10), max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 20 --------------------------------------------------------------- */
  {
    n: 20, slug: "vallo-never-holds-your-money", captures: ["payments"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 800 : 705 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "payments", cx: W * 0.43, cy, h: f.phoneH, rotation: { x: -4, y: 17, z: -2 }, fov: 26 });
      const b = p.box;
      return [
        electric({ W, H }),
        rings({ W, H, cx: W * 0.45, cy: cy + 260 * u, r: W * 0.86, ratio: 0.3, rotate: -8, alpha: 0.2, count: 3 }),
        p.html,
        popup({ x: W - 900 * u - 60 * u, y: b.y + b.h * 0.44, w: 900 * u, rotate: -3, theme: "light", lucide: "landmark", title: "Payment settled", line: "Straight to the owner's bank", meta: "now", example: true, scale: u * 1.1 }),
        headline({ lines: ["Vallo never holds", "your money"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size, accent: 0,
          sub: "Money goes straight to the owner, the host or the business, through Paystack.", subSize: 40 * u, subMax: f.max * 0.9, subColor: "#FFFFFF" }),
      ].join("\n");
    },
  },

  /* 21 --------------------------------------------------------------- */
  {
    n: 21, slug: "your-cards-and-banks", captures: ["payment-methods"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "payment-methods", cx: W * 0.56, cy, h: f.phoneH, rotation: { x: -5, y: -15, z: 2 }, fov: 26, color: "natural-titanium" });
      const b = p.box;
      const card = (x, y, r, bg, z, bank = false) => `<div class="abs" style="left:${px(x)};top:${px(y)};width:${px(620 * u)};height:${px(390 * u)};border-radius:${px(40 * u)};transform:rotate(${r}deg);z-index:${z};background:${bg};box-shadow:inset 0 2px 0 rgb(255 255 255 / 0.25), inset 0 0 0 1.5px rgb(170 200 255 / 0.3), 0 60px 100px -24px rgb(0 0 20 / 0.8)">
        ${bank
          ? `<div style="position:absolute;left:${px(44 * u)};top:${px(44 * u)};width:${px(96 * u)};height:${px(96 * u)};border-radius:50%;display:grid;place-items:center;background:rgb(92 159 255 / 0.18);box-shadow:inset 0 0 0 1.5px rgb(143 211 255 / 0.35)">${icon("landmark", { size: Math.round(48 * u), color: "#8FD3FF", stroke: 2 })}</div>`
          : `<div style="position:absolute;left:${px(48 * u)};top:${px(56 * u)};width:${px(92 * u)};height:${px(70 * u)};border-radius:${px(14 * u)};background:linear-gradient(135deg, #F4D38A, #C9A04E);opacity:0.9"></div>`}
        <div style="position:absolute;left:${px(48 * u)};bottom:${px(56 * u)};font:600 ${px(34 * u)}/1 Inter;letter-spacing:0.18em;color:rgb(255 255 255 / 0.8)">•••• ••••</div></div>`;
      return [
        darkBase(ctx, { top: "#050A46", mid: "#030634", bottom: "#010118", seed: 151, starBottom: f.phoneTop,
          glows: [{ x: W * 0.56, y: cy - 100, rx: W * 0.64, ry: f.phoneH * 0.48, alpha: 0.48, blur: 40 }] }),
        p.html,
        /* A card and a bank account settle into the empty half of the screen. */
        card(70 * u, p.at(0, 1770)[1], -9, "linear-gradient(135deg, #3E8BFF 0%, #0069FE 45%, #003F98 100%)", 31),
        card(150 * u, p.at(0, 2030)[1], 5, "linear-gradient(135deg, #1B2466 0%, #0E1447 55%, #060A2E 100%)", 32, true),
        headline({ lines: ["Your cards and banks,", "in one place"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 22 --------------------------------------------------------------- */
  {
    n: 22, slug: "the-verified-mark", captures: ["verification"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 800 : 705 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "verification", cx: W * 0.6, cy, h: f.phoneH * 0.96, rotation: { x: -4, y: -14, z: 2 }, fov: 24 });
      const b = p.box;
      const aw = 660 * u;
      return [
        night({ top: "#050A40", mid: "#030630", bottom: "#010118" }),
        glow({ x: W * 0.3, y: b.y + b.h * 0.35, rx: W * 0.55, ry: 700, color: "0 105 254", alpha: 0.45, blur: 40 }),
        stars({ W, H, count: 30, top: 30, bottom: f.phoneTop, seed: 191 }),
        `<div class="g" style="left:${px(56 * u)};top:${px(b.y + b.h * 0.08)};width:${px(aw)};height:${px(aw * 4 / 3)};border-radius:${px(48 * u)};overflow:hidden;transform:rotate(-6deg);z-index:12;box-shadow:inset 0 0 0 2px rgb(255 255 255 / 0.1), 0 60px 120px -30px rgb(0 0 20 / 0.8)"><img src="${artUrl("step-2-dark.webp")}" style="width:100%;height:100%;object-fit:cover;object-position:50% 40%"></div>`,
        vignette(0.35),
        p.html,
        /* In the empty band under the form (display y 2440 on), hiding no words. */
        popup({ x: 44 * u, y: p.at(660, 2440)[1], w: 900 * u, rotate: -3, emoji: "2705", tone: "mint", title: "Checked by a person", line: "Verified mark added", meta: "now", example: true, scale: u * 1.08 }),
        headline({ lines: ["The verified mark means", "a real person checked"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size * 0.92,
          sub: "About the person, not the property.", subSize: 42 * u }),
      ].join("\n");
    },
  },

  /* 23 --------------------------------------------------------------- */
  {
    n: 23, slug: "lock-vallo-with-a-passcode", captures: ["passcode-create"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 700 : 620, bottom: ios ? 330 : 300 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "passcode-create", cx: W / 2, cy, h: f.phoneH, rotation: { x: 0, y: 0, z: 0 }, fov: 20, shadow: { type: "none" }, color: "natural-titanium" });
      const b = p.box;
      const dial = [0.46, 0.6, 0.76].map((k, i) => `<circle cx="${W / 2}" cy="${cy}" r="${W * k}" fill="none" stroke="rgb(143 211 255 / ${0.16 - i * 0.04})" stroke-width="${(i === 1 ? 26 : 2.5) * u}" ${i === 1 ? `stroke-dasharray="${3 * u} ${22 * u}"` : ""}/>`).join("");
      return [
        stage({ W, H, floorY: b.b + 4 * u }),
        glow({ x: W / 2, y: cy, rx: W * 0.7, ry: f.phoneH * 0.5, alpha: 0.4, blur: 40 }),
        `<svg class="g" style="left:0;top:0;z-index:2" width="${W}" height="${H}">${dial}</svg>`,
        reflection(p, { opacity: 0.28, length: 0.26, bottom: H - 8 }),
        p.html,
        popup({ x: W / 2 - 470 * u, y: b.y - 40 * u, w: 940 * u, rotate: 0, emoji: "1f512", title: "Passcode on", line: "Vallo locks when you step away", meta: "now", scale: u * 1.1 }),
        headline({ lines: ["Lock Vallo", "with a passcode"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 24 --------------------------------------------------------------- */
  {
    n: 24, slug: "help-from-a-real-person", captures: ["support"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx, { hlBottom: true });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "support", cx: W * 0.5, cy, h: f.phoneH, rotation: { x: 6, y: 12, z: -2 }, fov: 28, color: "natural-titanium" });
      const b = p.box;
      return [
        fill("linear-gradient(180deg, #0A0C48 0%, #120E40 50%, #1E1030 80%, #0C0716 100%)"),
        glow({ x: W * 0.2, y: cy - 300, rx: W * 0.6, ry: 900, color: "0 105 254", alpha: 0.45, blur: 40 }),
        glow({ x: W * 0.85, y: cy + 400, rx: W * 0.55, ry: 700, color: "255 178 122", alpha: 0.3, blur: 50 }),
        stars({ W, H, count: 30, top: 30, bottom: H * 0.5, seed: 171 }),
        p.html,
        stickerIn(ctx, { code: "1f91d", x: Math.min(b.r - 10 * u, W - 130 * u), y: b.y + b.h * 0.64, size: 240 * u, rotate: 8 }),
        headline({ lines: ["Help from", "a real person"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },
];
