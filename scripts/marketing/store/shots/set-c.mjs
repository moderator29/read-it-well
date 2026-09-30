/**
 * Shots 25 to 35: Price Check, plans, the agent and host workspaces, signing
 * in, languages, the light theme and the closing card. Also Play's feature
 * graphic.
 */
import { headline, popup, sticker, pill, px, esc } from "../components.mjs";
import { photoUrl } from "../lib.mjs";
import { night, glow, beam, rings, ribbon, photo, art, studio, stars, floorGlow, fill, electric, bokeh } from "../grounds.mjs";
import { frame, vignette, darkBase, stickerIn, pairVignette, pairBoxes, iconDisc, dotted } from "./common.mjs";
import { brandUrl } from "../lib.mjs";

/* A seeded scatter of street lines, for Price Check's map. */
function streets({ W, H, seed = 5, color = "92 159 255", alpha = 0.1, u = 1 }) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out = [];
  for (let i = 0; i < 16; i += 1) {
    const vertical = i % 2 === 0;
    const k = rnd();
    const w = (rnd() < 0.25 ? 9 : 3) * u;
    const a = (vertical ? 78 : -12) + rnd() * 8;
    const cx = rnd() * W;
    const cy = rnd() * H;
    const len = Math.max(W, H) * 1.4;
    const dx = Math.cos((a * Math.PI) / 180) * len;
    const dy = Math.sin((a * Math.PI) / 180) * len;
    out.push(`<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" stroke="rgb(${color} / ${alpha * (0.6 + k)})" stroke-width="${w}"/>`);
  }
  return `<svg class="g" style="left:0;top:0;z-index:2" width="${W}" height="${H}">${out.join("")}</svg>`;
}

export const SET_C = [
  /* 25 --------------------------------------------------------------- */
  {
    n: 25, slug: "see-what-places-nearby-are-asking", captures: ["price"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "price", cx: W * 0.6, cy, h: f.phoneH * 0.97, rotation: { x: -14, y: -20, z: 5 }, fov: 28 });
      const b = p.box;
      const px0 = W * 0.17;
      const py0 = b.y + b.h * 0.46;
      const radar = [1, 2, 3].map((k) => `<circle cx="${px0}" cy="${py0 + 90 * u}" r="${k * 130 * u}" fill="none" stroke="rgb(143 211 255 / ${0.3 - k * 0.07})" stroke-width="${2.5 * u}"/>`).join("");
      return [
        darkBase(ctx, { top: "#040A44", mid: "#030634", bottom: "#010118", seed: 181, starCount: 0,
          glows: [{ x: W * 0.6, y: cy - 100, rx: W * 0.64, ry: f.phoneH * 0.48, alpha: 0.48, blur: 40 }, { x: px0, y: py0, rx: 380, ry: 380, color: "143 211 255", alpha: 0.16, blur: 30 }] }),
        streets({ W, H, seed: 13, u }),
        `<svg class="g" style="left:0;top:0;z-index:7" width="${W}" height="${H}"><ellipse cx="${px0}" cy="${py0 + 90 * u}" rx="${60 * u}" ry="${18 * u}" fill="rgb(0 0 20 / 0.5)"/>${radar}</svg>`,
        p.html,
        stickerIn(ctx, { code: "1f4cd", x: px0, y: py0, size: 230 * u, rotate: 0, z: 36 }),
        headline({ lines: ["See what places", "nearby are asking"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 26 --------------------------------------------------------------- */
  {
    n: 26, slug: "all-your-plans-in-one-place", captures: ["plans"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "plans", cx: W * 0.6, cy, h: f.phoneH, rotation: { x: -5, y: -17, z: 3 }, fov: 26 });
      const b = p.box;
      /* The three example plans sit over the page's empty state (display
         y 1240 to 2070), where the list of plans would be. */
      const s = u * 1.1;
      const hc = 160 * s;
      const step = hc * 1.12;
      const yc = p.at(660, 1686)[1];
      const left = Math.min(p.at(90, 1300)[0], p.at(90, 2100)[0]) - 40 * u;
      const cw = Math.max(p.at(1240, 1300)[0], p.at(1240, 2100)[0]) - left + 10 * u;
      const y0 = yc - (hc + 2 * step) / 2 + 70 * u;
      return [
        fill("#01041C"),
        `<div class="g" style="inset:0;background:url('${photoUrl("bg-blue-wave.jpg")}') 38% 50% / auto 100% no-repeat;transform:scaleX(-1)"></div>`,
        fill("linear-gradient(180deg, rgb(1 4 28 / 0.55) 0%, rgb(1 4 28 / 0) 22%)", "z-index:1"),
        p.html,
        popup({ x: left, y: y0 - 70 * u, w: cw, rotate: -3, theme: "light", emoji: "1f942", tone: "warm", title: "Table for 2", line: "Tonight, 8:00 PM · Harbour Lights Kitchen", meta: "Today", example: true, scale: s, z: 31 }),
        popup({ x: left + 24 * u, y: y0 - 70 * u + step, w: cw, rotate: 1.5, theme: "light", emoji: "1f6cf-fe0f", title: "Room booked", line: "Lagoon Crest Resort · 3 nights", meta: "Fri", example: true, scale: s, z: 32 }),
        popup({ x: left, y: y0 - 70 * u + step * 2, w: cw, rotate: -2, theme: "light", lucide: "calendar-check", title: "Inspection set", line: "Saturday, 11:00 AM", meta: "Sat", example: true, scale: s, z: 33 }),
        headline({ lines: ["All your plans", "in one place"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 27 --------------------------------------------------------------- */
  {
    n: 27, slug: "run-your-listings-from-one-workspace", captures: ["agent-dashboard"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "agent-dashboard", cx: W * 0.47, cy, h: f.phoneH, rotation: { x: -6, y: 15, z: -2 }, fov: 26 });
      const b = p.box;
      const grid = `repeating-linear-gradient(0deg, rgb(92 159 255 / 0.16) 0 2px, transparent 2px ${66 * u}px), repeating-linear-gradient(90deg, rgb(92 159 255 / 0.16) 0 2px, transparent 2px ${66 * u}px)`;
      return [
        night({ top: "#04124F", mid: "#030A3A", bottom: "#010118" }),
        fill(grid, `z-index:1;-webkit-mask-image:radial-gradient(70% 60% at 50% 55%, #000 30%, transparent 100%);mask-image:radial-gradient(70% 60% at 50% 55%, #000 30%, transparent 100%)`),
        glow({ x: W * 0.46, y: cy, rx: W * 0.62, ry: f.phoneH * 0.48, alpha: 0.5, blur: 40 }),
        vignette(0.45),
        p.html,
        headline({ lines: ["Run your listings", "from one workspace"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 28 --------------------------------------------------------------- */
  {
    n: 28, slug: "list-your-property-on-vallo", captures: ["agent-properties"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 700 : 620 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "agent-properties", cx: W * 0.5, cy, h: f.phoneH, rotation: { x: -8, y: -12, z: 2 }, fov: 26, color: "natural-titanium" });
      return [
        fill("#030418"),
        `<div class="g" style="inset:0;background:url('${photoUrl("villa-exterior-gate.jpg")}') 50% 50% / cover no-repeat;filter:brightness(0.78) saturate(1.1)"></div>`,
        fill("linear-gradient(180deg, rgb(3 4 24 / 0.94) 0%, rgb(3 4 24 / 0.82) 16%, rgb(3 4 24 / 0.2) 38%, rgb(3 4 24 / 0.15) 70%, rgb(3 4 24 / 0.75) 100%)", "z-index:2"),
        glow({ x: W / 2, y: cy, rx: W * 0.6, ry: f.phoneH * 0.45, color: "0 105 254", alpha: 0.3, blur: 40, z: 3 }),
        p.html,
        headline({ lines: ["List your property", "on Vallo"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 29 --------------------------------------------------------------- */
  {
    n: 29, slug: "host-your-hotel-or-shortlet", captures: ["host-start"], theme: "dark", pairWith: 30,
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "host-start", cx: W * 0.46, cy, h: f.phoneH, rotation: { x: -6, y: 15, z: -2 }, fov: 26 });
      const b = p.box;
      return [
        p.html,
        headline({ lines: ["Host your hotel", "or shortlet"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
    ground({ W, H, pageW, u, ctxs }) {
      const [a, b] = pairBoxes(ctxs, W);
      return [
        fill("linear-gradient(180deg, #0A0A40 0%, #070530 48%, #030112 100%)"),
        glow({ x: a.cx - 200 * u, y: a.cy - 200 * u, rx: W * 0.6, ry: a.h * 0.44, alpha: 0.48, blur: 40 }),
        glow({ x: b.cx + 200 * u, y: b.cy - 200 * u, rx: W * 0.6, ry: b.h * 0.44, alpha: 0.48, blur: 40 }),
        glow({ x: W * 0.75, y: H * 0.9, rx: W * 0.8, ry: 520 * u, color: "255 107 26", alpha: 0.3, blur: 50 }),
        glow({ x: W * 1.35, y: H * 0.78, rx: W * 0.6, ry: 500 * u, color: "92 159 255", alpha: 0.18, blur: 50 }),
        stars({ W: pageW, H, count: 64, top: 30, bottom: H * 0.22, seed: 211 }),
        pairVignette(0.45),
      ].join("\n");
    },
    bridge({ W, H, pageW, u }) {
      const d = `M ${-W * 0.05} ${H * 0.95} C ${W * 0.5} ${H * 0.93}, ${W * 0.8} ${H * 0.76}, ${W} ${H * 0.7} S ${W * 1.5} ${H * 0.52}, ${W * 2.05} ${H * 0.5}`;
      return ribbon({ d, W: pageW, H, width: 70 * u, from: [0, 0], to: [pageW, 0], stops: [[0, "#FF6B1A", 0.2], [0.3, "#FF8A3D"], [0.5, "#5C9FFF"], [0.8, "#0069FE"], [1, "#0069FE", 0.1]], z: 9, coreAlpha: 0.7 });
    },
  },

  /* 30 --------------------------------------------------------------- */
  {
    n: 30, slug: "your-share-goes-straight-to-your-bank", captures: ["host-earnings"], theme: "dark", pairedFrom: 29,
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "host-earnings", cx: W * 0.55, cy, h: f.phoneH, rotation: { x: -6, y: -15, z: 2 }, fov: 26, color: "natural-titanium" });
      const b = p.box;
      return [
        p.html,
        /* In the empty band between the earnings card and the picture below
           it (display y 1990 to 2330), so the island and every word stay clear. */
        popup({ x: b.cx - 440 * u, y: p.at(660, 2000)[1], w: 880 * u, rotate: -1.5, emoji: "1f3e6", title: "Payment settled", line: "Straight to your bank", amount: "₦1,800,000", meta: "now", example: true, scale: u * 1.04 }),
        headline({ lines: ["Your share goes", "straight to your bank"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 31 --------------------------------------------------------------- */
  {
    n: 31, slug: "welcome-back", captures: ["sign-in"], theme: "dark",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "sign-in", cx: W / 2, cy, h: f.phoneH, rotation: { x: -8, y: 12, z: -2 }, fov: 26 });
      const b = p.box;
      return [
        night({ top: "#03062E", mid: "#020424", bottom: "#010118" }),
        art({ src: "step-4-dark.webp", x: -W * 0.2, y: H * 0.2, w: W * 1.4, h: W * 1.4 * (1440 / 1080), pos: "50% 30%", z: 1,
          mask: "radial-gradient(60% 55% at 50% 42%, #000 40%, transparent 100%)", opacity: 0.95 }),
        vignette(0.4),
        p.html,
        stickerIn(ctx, { code: "1f44b", x: b.x + 6 * u, y: b.y + b.h * 0.3, size: 230 * u, rotate: -14 }),
        headline({ lines: ["Welcome back,", "sign in in seconds"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size }),
      ].join("\n");
    },
  },

  /* 32 --------------------------------------------------------------- */
  {
    n: 32, slug: "vallo-speaks-your-language", captures: ["welcome-yo", "welcome-ha"], theme: "dark",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const f = frame(ctx, { top: ios ? 780 : 690 });
      const h = f.phoneH * 0.95;
      const back = await ctx.phone({ id: "welcome-ha", cx: W * 0.35, cy: f.phoneTop + h / 2 - 10, h: h * 0.9, rotation: { x: -4, y: 20, z: -5 }, fov: 26, z: 18, color: "natural-titanium" });
      const front = await ctx.phone({ id: "welcome-yo", cx: W * 0.63, cy: f.phoneTop + f.phoneH - h / 2, h, rotation: { x: -4, y: -14, z: 3 }, fov: 26, z: 22 });
      return [
        fill("linear-gradient(180deg, #050A45 0%, #0A0C4A 40%, #3A1A55 70%, #8A3A3A 88%, #C0602A 100%)"),
        glow({ x: W * 0.5, y: H * 1.02, rx: W * 0.9, ry: 520, color: "255 150 70", alpha: 0.6, blur: 40 }),
        glow({ x: W * 0.5, y: f.phoneTop + f.phoneH * 0.4, rx: W * 0.7, ry: f.phoneH * 0.4, color: "0 105 254", alpha: 0.35, blur: 40 }),
        stars({ W, H, count: 40, top: 30, bottom: H * 0.5, seed: 221 }),
        back.html,
        front.html,
        stickerIn(ctx, { code: "1f30d", x: Math.min(front.box.r - 30 * u, W - 125 * u), y: front.box.y + 40 * u, size: 220 * u, rotate: 10 }),
        headline({ lines: ["Vallo speaks", "your language"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size,
          sub: "English, Hausa, Yorùbá and Igbo.", subSize: 44 * u }),
      ].join("\n");
    },
  },

  /* 33 --------------------------------------------------------------- */
  {
    n: 33, slug: "light-or-dark-your-call", captures: ["home-light"], theme: "light",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "home-light", cx: W / 2, cy, h: f.phoneH, rotation: { x: 0, y: 0, z: 0 }, fov: 20, color: "natural-titanium", shadow: { type: "drop", opacity: 0.3 } });
      const b = p.box;
      return [
        studio({ top: "#F8F9FC", bottom: "#E6EAF3" }),
        glow({ x: W * 0.15, y: H * 0.3, rx: W * 0.6, ry: 700, color: "255 190 120", alpha: 0.28, blur: 50 }),
        glow({ x: W * 0.9, y: H * 0.75, rx: W * 0.6, ry: 800, color: "120 160 255", alpha: 0.26, blur: 50 }),
        p.html,
        stickerIn(ctx, { code: "2600-fe0f", x: b.x - 10 * u, y: b.y + b.h * 0.24, size: 230 * u, rotate: -8 }),
        stickerIn(ctx, { code: "1f319", x: b.r + 10 * u, y: b.y + b.h * 0.7, size: 210 * u, rotate: 14 }),
        headline({ lines: ["Light or dark,", "your call"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size, theme: "light" }),
      ].join("\n");
    },
  },

  /* 34 --------------------------------------------------------------- */
  {
    n: 34, slug: "listings-that-speak-for-themselves", captures: ["listing-light"], theme: "light",
    async layout(ctx) {
      const { W, H, u } = ctx;
      const f = frame(ctx);
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "listing-light", cx: W * 0.55, cy, h: f.phoneH, rotation: { x: -6, y: -16, z: 2.5 }, fov: 26, shadow: { type: "drop", opacity: 0.3 } });
      const b = p.box;
      return [
        studio({ top: "#F7F8FB", bottom: "#E4E8F1" }),
        glow({ x: W * 0.2, y: H * 0.72, rx: W * 0.6, ry: 700, color: "140 180 255", alpha: 0.25, blur: 50 }),
        photo({ src: "villa-exterior-sunset.jpg", x: 40 * u, y: b.y + b.h * 0.12, w: 600 * u, h: 780 * u, rotate: -6, radius: 44 * u, z: 12, shadow: true }),
        p.html,
        headline({ lines: ["Listings that speak", "for themselves"], cx: W / 2, y: f.hlTop, max: f.max, size: f.size, theme: "light" }),
      ].join("\n");
    },
  },

  /* 35 --------------------------------------------------------------- */
  {
    n: 35, slug: "real-estate-done-right", captures: ["search-light"], theme: "light",
    async layout(ctx) {
      const { W, H, u, ios } = ctx;
      const iconSize = 168 * u;
      const top = ios ? 150 : 118;
      const hlY = top + iconSize + 44 * u;
      const pillY = hlY + 300 * u;
      const f = frame(ctx, { top: pillY + (ios ? 170 : 150), bottom: ios ? 130 : 100 });
      const cy = f.phoneTop + f.phoneH / 2;
      const p = await ctx.phone({ id: "search-light", cx: W / 2, cy, h: f.phoneH, rotation: { x: 12, y: 0, z: 0 }, fov: 28, color: "natural-titanium", shadow: { type: "drop", opacity: 0.32 } });
      return [
        studio({ top: "#F9FAFD", bottom: "#E3E8F2" }),
        glow({ x: W / 2, y: cy + 200, rx: W * 0.72, ry: 900, color: "120 160 255", alpha: 0.3, blur: 50 }),
        glow({ x: W * 0.12, y: H * 0.2, rx: W * 0.4, ry: 500, color: "255 190 130", alpha: 0.2, blur: 50 }),
        `<img class="abs" src="${brandUrl("vallo-icon.png")}" style="left:${px(W / 2 - iconSize / 2)};top:${px(top)};width:${px(iconSize)};height:${px(iconSize)};border-radius:22.4%;box-shadow:0 30px 60px -20px rgb(0 40 140 / 0.45);z-index:40">`,
        headline({ lines: ["Vallo.", "Real estate, done right."], cx: W / 2, y: hlY, max: f.max, size: f.size * 0.94, theme: "light", serif: "right." }),
        `<div class="abs" data-bleed style="left:0;width:${W}px;top:${px(pillY)};display:flex;justify-content:center;z-index:40">
          <span data-chk style="display:inline-flex;align-items:center;gap:${px(14 * u)};font:600 ${px(34 * u)}/1 Inter;color:#0A1030;padding:${px(24 * u)} ${px(40 * u)};border-radius:999px;background:rgb(255 255 255 / 0.92);box-shadow:inset 0 0 0 1px rgb(10 20 70 / 0.08), 0 20px 40px -20px rgb(20 30 90 / 0.3)">Coming soon on iPhone and Android</span></div>`,
        p.html,
      ].join("\n");
    },
  },
];

/** Play's feature graphic, 1024 x 500: the wordmark, the line, one handset. */
export async function FEATURE(ctx) {
  const W = 1024;
  const H = 500;
  const p = await ctx.phone({ id: "home", cx: 792, cy: 250, h: 404, rotation: { x: -6, y: -20, z: 5 }, fov: 26, margin: 34 });
  return [
    fill("linear-gradient(115deg, #071466 0%, #040A4A 40%, #020631 70%, #010118 100%)"),
    glow({ x: 800, y: 250, rx: 330, ry: 260, alpha: 0.62, blur: 16 }),
    glow({ x: 150, y: 40, rx: 380, ry: 180, color: "143 211 255", alpha: 0.14, blur: 24 }),
    glow({ x: 990, y: 520, rx: 300, ry: 160, color: "255 107 26", alpha: 0.22, blur: 24 }),
    stars({ W, H, count: 34, seed: 3, maxAlpha: 0.4 }).replace(/r="([\d.]+)"/g, (m, r) => `r="${(r * 0.55).toFixed(2)}"`),
    rings({ W, H, cx: 792, cy: 300, r: 330, ratio: 0.3, rotate: -10, alpha: 0.16, count: 2, width: 1.4 }),
    `<img class="abs" src="${brandUrl("vallo-wordmark.png")}" style="left:68px;top:112px;width:196px;z-index:30">`,
    `<div class="abs" style="left:66px;top:178px;width:560px;z-index:30;font:700 56px/1.06 Poppins;letter-spacing:-0.03em;color:#fff">Real estate,<br><span style="background:linear-gradient(92deg,#BDE5FF,#86C2FF 45%,#5C9FFF);-webkit-background-clip:text;background-clip:text;color:transparent">done right.</span></div>`,
    `<div class="abs" style="left:68px;top:320px;z-index:30;font:500 21px/1.3 Inter;color:rgb(222 232 255 / 0.9)">Homes, stays and tables in one app.</div>`,
    p.html,
  ].join("\n");
}
