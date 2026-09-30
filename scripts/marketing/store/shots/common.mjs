/**
 * Measures and small parts shared by the shot layouts.
 */
import { px, esc, exampleChip } from "../components.mjs";
import { night, glow, stars, fill } from "../grounds.mjs";
import { icon, C } from "../lib.mjs";

/**
 * The frame most shots use: the headline's top and size, and the box the
 * handset fills. `top`/`bottom` move the handset; `hlBottom` puts the
 * headline under the handset instead.
 */
export function frame(ctx, { top, bottom, hlBottom = false } = {}) {
  const ios = ctx.ios;
  const size = ios ? 122 : 128;
  const max = ctx.W - (ios ? 150 : 170);
  if (hlBottom) {
    const phoneTop = top ?? (ios ? 150 : 120);
    const phoneH = ios ? 2068 : 1867;
    const hlTop = phoneTop + phoneH + (ios ? 150 : 120);
    return { hlTop, size, phoneTop, phoneH, max };
  }
  const hlTop = ios ? 176 : 150;
  const phoneTop = top ?? (ios ? 650 : 575);
  const phoneBottom = bottom ?? (ios ? 150 : 118);
  return { hlTop, size, phoneTop, phoneH: ctx.H - phoneTop - phoneBottom, max };
}

/** A dark vignette that settles the corners. */
export const vignette = (a = 0.5, at = "50% 45%") =>
  fill(`radial-gradient(130% 90% at ${at}, rgb(1 1 24 / 0) 55%, rgb(1 1 24 / ${a}) 100%)`, "z-index:6");

/** Night ground with a few glows and stars. */
export function darkBase(ctx, { top = "#050C52", mid = "#03073A", bottom = "#010118", glows = [], starCount = 36, starBottom, seed = 3, vig = 0.45 } = {}) {
  return [
    night({ top, mid, bottom }),
    ...glows.map((g) => glow(g)),
    starCount ? stars({ W: ctx.W, H: ctx.H, count: starCount, top: 30, bottom: starBottom ?? ctx.H * 0.3, seed }) : "",
    vig ? vignette(vig) : "",
  ].join("\n");
}

/** A glass disc holding a line icon (share targets, the drawer's doors). */
export function iconDisc({ x, y, size = 120, lucide, theme = "dark", z = 32, rotate = 0, tone = "glass" }) {
  const dark = theme === "dark";
  const bg = tone === "electric"
    ? "linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%)"
    : dark ? "linear-gradient(180deg, rgb(30 42 112 / 0.9), rgb(12 18 66 / 0.88))" : "rgb(255 255 255 / 0.95)";
  const sh = tone === "electric"
    ? "inset 0 2px 0 rgb(255 255 255 / 0.35), 0 24px 50px -12px rgb(0 105 254 / 0.6)"
    : dark ? "inset 0 0 0 1.5px rgb(120 170 255 / 0.34), inset 0 2px 0 rgb(255 255 255 / 0.1), 0 30px 60px -18px rgb(0 0 16 / 0.8)" : "inset 0 0 0 1px rgb(10 20 70 / 0.06), 0 30px 60px -24px rgb(20 30 90 / 0.4)";
  const color = tone === "electric" ? "#FFFFFF" : dark ? C.sky : C.electric;
  return `<div class="abs" style="left:${px(x - size / 2)};top:${px(y - size / 2)};width:${px(size)};height:${px(size)};border-radius:50%;display:grid;place-items:center;background:${bg};box-shadow:${sh};z-index:${z};transform:rotate(${rotate}deg);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px)">${icon(lucide, { size: Math.round(size * 0.44), color, stroke: 2 })}</div>`;
}

/** A dotted path (round dots along an SVG path). */
let dottedId = 0;
export function dotted({ d, W, H, color = "rgb(143 211 255 / 0.7)", dot = 10, gap = 30, z = 8, glow = true }) {
  const fid = `dg${(dottedId += 1)}`;
  return `<svg class="g" style="left:0;top:0;z-index:${z}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${glow ? `<defs><filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${dot * 0.9}"/></filter></defs><path d="${d}" fill="none" stroke="rgb(0 105 254 / 0.9)" stroke-width="${dot * 1.8}" stroke-linecap="round" stroke-dasharray="0 ${gap}" filter="url(#${fid})"/>` : ""}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${dot}" stroke-linecap="round" stroke-dasharray="0 ${gap}"/>
  </svg>`;
}

/* ------------------------------------------------------------- move-in cost */

export const COST = [
  ["Rent", "₦18,000,000", "#2F7BFF"],
  ["Agency fee", "₦1,800,000", "#35C2F5"],
  ["Legal fee", "₦1,800,000", "#A7B0CC"],
  ["Agreement fee", "₦900,000", "#7FD6FF"],
  ["Caution deposit", "₦3,600,000", "#2FD08A"],
];

export function costCard({ x, y, w, label, amount, dot, rotate = 0, s = 1, z = 34 }) {
  return `<div class="card dk" style="left:${px(x)};top:${px(y)};width:${px(w)};padding:${px(26 * s)} ${px(32 * s)};border-radius:${px(30 * s)};transform:rotate(${rotate}deg);z-index:${z};display:flex;align-items:center;justify-content:space-between;gap:${px(18 * s)}">
    <span style="display:inline-flex;align-items:center;gap:${px(16 * s)};font-weight:600;font-size:${px(30 * s)};color:rgb(214 226 255 / 0.9);white-space:nowrap"><i style="width:${px(18 * s)};height:${px(18 * s)};border-radius:50%;background:${dot};box-shadow:0 0 ${px(14 * s)} ${dot}"></i>${esc(label)}</span>
    <span style="font-weight:700;font-size:${px(35 * s)};letter-spacing:-0.015em;font-variant-numeric:tabular-nums;white-space:nowrap">${esc(amount)}</span>
  </div>`;
}

export function totalCard({ x, y, w, rotate = 0, s = 1, z = 36 }) {
  return `<div class="abs" style="left:${px(x)};top:${px(y)};width:${px(w)};padding:${px(32 * s)} ${px(36 * s)} ${px(34 * s)};border-radius:${px(38 * s)};transform:rotate(${rotate}deg);z-index:${z};color:#fff;font-family:Inter;
      background:linear-gradient(145deg, #4A97FF 0%, #0B6BFF 45%, #0048C0 100%);
      box-shadow:inset 0 2px 0 rgb(255 255 255 / 0.35), inset 0 0 0 1.5px rgb(170 210 255 / 0.45), 0 50px 100px -20px rgb(0 60 200 / 0.65), 0 18px 40px -10px rgb(0 0 30 / 0.6)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
      <span style="font-weight:600;font-size:${px(30 * s)};color:rgb(235 243 255 / 0.94)">Move-in total</span>
      ${exampleChip({ theme: "dark", scale: s })}
    </div>
    <div style="font-weight:800;font-size:${px(76 * s)};letter-spacing:-0.03em;line-height:1.05;margin-top:${px(10 * s)};font-variant-numeric:tabular-nums">₦26,100,000</div>
    <div style="font-weight:500;font-size:${px(26 * s)};color:rgb(225 236 255 / 0.86);margin-top:${px(8 * s)}">Rent plus every fee, added up</div>
  </div>`;
}

/** A glass notification card for the notifications burst (lucide icon). */
export function noteCard({ x, y, w, lucide, title, line, meta = "now", example = false, rotate = 0, s = 1, z = 34, opacity = 1 }) {
  return `<div class="card dk" style="left:${px(x)};top:${px(y)};width:${px(w)};padding:${px(24 * s)} ${px(28 * s)};border-radius:${px(32 * s)};transform:rotate(${rotate}deg);z-index:${z};display:flex;align-items:center;gap:${px(22 * s)};opacity:${opacity}">
    <div style="flex:none;width:${px(84 * s)};height:${px(84 * s)};border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%);box-shadow:inset 0 2px 0 rgb(255 255 255 / 0.3)">${icon(lucide, { size: Math.round(40 * s), color: "#FFFFFF", stroke: 2.1 })}</div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:${px(14 * s)}">
        <span style="font-weight:700;font-size:${px(31 * s)};letter-spacing:-0.01em;white-space:nowrap">${esc(title)}</span>
        <span style="display:inline-flex;align-items:center;gap:${px(10 * s)}">${example ? exampleChip({ theme: "dark", scale: s * 0.92 }) : ""}<span style="font-weight:500;font-size:${px(22 * s)};color:rgb(200 214 250 / 0.78);white-space:nowrap">${esc(meta)}</span></span>
      </div>
      <div style="font-weight:500;font-size:${px(25 * s)};color:rgb(208 222 255 / 0.84);margin-top:${px(6 * s)};white-space:nowrap">${esc(line)}</div>
    </div>
  </div>`;
}
