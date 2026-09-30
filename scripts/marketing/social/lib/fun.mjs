/* The campaign's playful layer (the founder's ruling of 30 September 2026):
 * Vallo's own 3D identity icons floating in depth, real components lifted off
 * the screens, hand-drawn squiggles and rings, sparkles, and the title pill.
 * Plain shapes and the product's own objects only; nothing here is copied
 * from the reference film. */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { mark } from "./kit.mjs";
import { BRAND, CACHE, SOURCE } from "./paths.mjs";
import { u } from "./render.mjs";

/* ------------------------------------------------------------------ 3D identity icons */

/* Never shown on a house as a check: home-verified and home-small put a tick
   on a home ("verified" is about people only). receipt carries a dollar sign. */
const BANNED = new Set(["home-verified", "home-small", "receipt"]);
export const ICONS3D = [
  "analytics", "apartment", "assistant", "bank", "bell", "boxes", "buy", "calendar-booked", "calendar-pending",
  "camera", "card-secure", "celebrate", "checklist", "city", "clock", "coin", "contract", "earnings", "envelope",
  "explore", "folder", "gift", "handover", "hotel", "id-check", "keys", "land", "list", "local-talks", "map",
  "megaphone", "passcode-lock", "pay", "phone-code", "power", "price-tag", "rent", "report-flag", "restaurant",
  "saved-heart", "search", "shield", "shortlet", "stay-rated", "support", "team", "toolbox", "verified", "video", "villa",
];

/**
 * One floating 3D identity icon. x, y are its centre in post px. `size` is
 * capped at 250 px (the sources are 256 px). `depth`: "far" (smaller feel,
 * a touch of haze), "mid" (default), "near" (soft focus, as if close to the
 * camera). `theme` picks the shadow for a dark or a light ground.
 */
export function obj(name, { x, y, size = 150, rot = 0, depth = "mid", theme = "dark", flip = false, opacity = 1, blur, style = "" } = {}) {
  if (BANNED.has(name)) throw new Error(`3D icon '${name}' is not used in the campaign`);
  const s = Math.min(250, Math.round(size));
  const b = blur ?? (depth === "near" ? Math.max(3, s / 34) : depth === "far" ? 0.6 : 0);
  const shadow =
    theme === "dark"
      ? `drop-shadow(0 ${Math.round(s * 0.1)}px ${Math.round(s * 0.14)}px rgba(0,0,20,.55)) drop-shadow(0 0 ${Math.round(s * 0.1)}px rgba(92,159,255,.30))`
      : `drop-shadow(0 ${Math.round(s * 0.11)}px ${Math.round(s * 0.13)}px rgba(26,44,130,.24)) drop-shadow(0 ${Math.round(s * 0.02)}px ${Math.round(s * 0.03)}px rgba(26,44,130,.12))`;
  const filter = `${shadow}${b ? ` blur(${b}px)` : ""}${depth === "far" ? " saturate(.92)" : ""}`;
  return `<img class="obj" src="${u(join(BRAND, "3d", `${name}@2x.webp`))}" alt="" style="position:absolute;left:${Math.round(x - s / 2)}px;top:${Math.round(y - s / 2)}px;width:${s}px;height:${s}px;
    transform:rotate(${rot}deg)${flip ? " scaleX(-1)" : ""};filter:${filter};opacity:${opacity};${style}">`;
}

/** A 3D icon inside a small rounded chip (for pop-up cards and pills). */
export function objChip(name, { size = 84, theme = "dark", radius } = {}) {
  const r = radius ?? Math.round(size * 0.31);
  const d = theme === "dark";
  return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;flex:none;display:grid;place-items:center;
      background:${d ? "linear-gradient(145deg,rgba(92,159,255,.24),rgba(0,105,254,.10))" : "linear-gradient(145deg,#EEF4FF,#DDE9FF)"};
      border:1px solid ${d ? "rgba(140,185,255,.28)" : "rgba(0,86,208,.10)"}">
    <img src="${u(join(BRAND, "3d", `${name}@2x.webp`))}" alt="" style="width:${Math.round(size * 0.82)}px;height:${Math.round(size * 0.82)}px;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,30,.25))"></div>`;
}

/* ------------------------------------------------------------------ lifted components */

/**
 * A real piece of a captured screen, lifted off the phone as a floating body.
 * `crop` is in capture px (mobile captures are 1320 x 2682). The crop is cut
 * once into the cache; the page shows it `w` px wide with a rounded glass
 * edge and a long soft shadow.
 */
export async function lift(id, crop, { x, y, w, rot = 0, radius = 26, theme = "dark", edge = true, tilt = "", style = "", shadow = "" } = {}) {
  const dir = join(CACHE, "lift");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${id}-${crop.x}-${crop.y}-${crop.w}-${crop.h}.png`);
  if (!existsSync(file)) {
    await sharp(join(SOURCE, `${id}.webp`)).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).png().toFile(file);
  }
  const h = Math.round((w * crop.h) / crop.w);
  const d = theme === "dark";
  const sh =
    shadow ||
    (d
      ? "0 34px 70px rgba(0,0,16,.62), 0 10px 22px rgba(0,0,20,.4), 0 0 0 1.5px rgba(120,170,255,.35)"
      : "0 34px 70px rgba(18,28,90,.22), 0 10px 22px rgba(18,28,90,.12), 0 0 0 1.5px rgba(255,255,255,.9)");
  return `<div class="lift" style="position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;width:${w}px;height:${h}px;border-radius:${radius}px;overflow:hidden;
      transform:${tilt ? `${tilt} ` : ""}rotate(${rot}deg);box-shadow:${edge ? sh : "none"};${style}">
    <img src="${u(file)}" alt="" style="display:block;width:${w}px;height:${h}px"></div>`;
}

/* ------------------------------------------------------------------ hand-drawn marks */

const f1 = (v) => Math.round(v * 10) / 10;

/**
 * A hand-drawn looped squiggle (a pen's cursive "eeee"), `w` wide, under a
 * word. x, y: its left end on the baseline. `loops`: how many.
 */
export function squiggle({ x, y, w, loops = 7, amp = 12, color = "#0069FE", stroke = 5, rot = -2, opacity = 1, style = "" }) {
  const r = w / (loops * 2 * Math.PI + 2.2);
  const d = r * 1.9; // d > r gives loops (a prolate cycloid)
  const pts = [];
  const T = loops * 2 * Math.PI + 2.2;
  for (let t = 0; t <= T; t += 0.12) {
    const px = r * t - d * Math.sin(t) + d;
    const wob = Math.sin(t * 0.37) * amp * 0.12;
    const py = amp * 0.5 + (-d * Math.cos(t) * amp) / (2 * d) + wob;
    pts.push(`${f1(px)},${f1(py)}`);
  }
  const H = amp * 1.8 + stroke * 2;
  return `<svg class="mark" width="${Math.round(w + stroke * 2 + d)}" height="${Math.round(H)}" viewBox="${-stroke} ${-stroke - amp * 0.3} ${f1(w + stroke * 2 + d)} ${f1(H)}"
      style="position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;transform:rotate(${rot}deg);overflow:visible;opacity:${opacity};${style}">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** A hand-drawn underline: one confident stroke with a small hook, `w` wide. */
export function swoosh({ x, y, w, color = "#FF6B1A", stroke = 7, rot = -2, style = "" }) {
  const p = `M0,${f1(stroke + 8)} C${f1(w * 0.25)},${f1(stroke + 1)} ${f1(w * 0.62)},${f1(stroke - 2)} ${f1(w)},${f1(stroke + 4)}
    M${f1(w * 0.12)},${f1(stroke + 18)} C${f1(w * 0.38)},${f1(stroke + 10)} ${f1(w * 0.7)},${f1(stroke + 9)} ${f1(w * 0.92)},${f1(stroke + 13)}`;
  return `<svg class="mark" width="${Math.round(w + stroke)}" height="${Math.round(stroke * 2 + 26)}" style="position:absolute;left:${Math.round(x)}px;top:${Math.round(y)}px;transform:rotate(${rot}deg);overflow:visible;${style}">
    <path d="${p}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/></svg>`;
}

/**
 * A hand-drawn ring around a word: an ellipse drawn in one stroke that
 * overshoots its start, slightly uneven, like a marker. cx, cy: centre.
 */
export function ring({ cx, cy, rx, ry, color = "#0069FE", stroke = 4.5, rot = -4, opacity = 1, style = "" }) {
  const pts = [];
  for (let t = -0.35; t <= Math.PI * 2 + 0.55; t += 0.05) {
    const k = 1 + 0.035 * Math.sin(3 * t + 0.6) + 0.02 * Math.cos(5 * t);
    const drift = t > Math.PI * 2 ? (t - Math.PI * 2) * 0.05 : 0;
    pts.push(`${f1(rx * k * Math.cos(t) * (1 + drift) + rx + stroke * 3)},${f1(ry * k * Math.sin(t) * (1 - drift) + ry + stroke * 3)}`);
  }
  const W = rx * 2 + stroke * 6;
  const H = ry * 2 + stroke * 6;
  return `<svg class="mark" width="${Math.round(W)}" height="${Math.round(H)}" style="position:absolute;left:${Math.round(cx - W / 2)}px;top:${Math.round(cy - H / 2)}px;transform:rotate(${rot}deg);overflow:visible;opacity:${opacity};${style}">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/**
 * Sparkles: four-point stars and a few particles (dots and dashes) around a
 * point, the way a title pops. `items`: [{ x, y, s, rot, kind }] relative to
 * nothing (absolute post px). kind: "star" (default), "dot", "dash", "plus".
 */
export function sparkles(items, { color = "#8FD3FF", style = "" } = {}) {
  return items
    .map(({ x, y, s = 22, rot = 0, kind = "star", c }) => {
      const col = c || color;
      if (kind === "dot") return `<div class="mark" style="position:absolute;left:${x - s / 2}px;top:${y - s / 2}px;width:${s}px;height:${s}px;border-radius:50%;background:${col};${style}"></div>`;
      if (kind === "dash") return `<div class="mark" style="position:absolute;left:${x - s / 2}px;top:${y - 2.5}px;width:${s}px;height:5px;border-radius:3px;background:${col};transform:rotate(${rot}deg);${style}"></div>`;
      if (kind === "plus") return `<svg class="mark" width="${s}" height="${s}" style="position:absolute;left:${x - s / 2}px;top:${y - s / 2}px;transform:rotate(${rot}deg);${style}"><path d="M${s / 2},3V${s - 3}M3,${s / 2}H${s - 3}" stroke="${col}" stroke-width="${Math.max(3, s / 7)}" stroke-linecap="round"/></svg>`;
      const h = s / 2;
      const q = s * 0.1;
      return `<svg class="mark" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="position:absolute;left:${x - h}px;top:${y - h}px;transform:rotate(${rot}deg);overflow:visible;${style}">
        <path d="M${h},0 Q${h + q},${h - q} ${s},${h} Q${h + q},${h + q} ${h},${s} Q${h - q},${h + q} 0,${h} Q${h - q},${h - q} ${h},0Z" fill="${col}"/></svg>`;
    })
    .join("");
}

/**
 * The title pill: the Vallo mark and a short phrase, one word in blue.
 * `html` carries the phrase with the key word in <b>.
 */
export function titlePill(html, { theme = "dark", size = 24, style = "" } = {}) {
  const d = theme === "dark";
  const h = Math.round(size * 2.35);
  return `<div class="tpill" style="display:inline-flex;align-items:center;gap:${Math.round(size * 0.5)}px;height:${h}px;padding:0 ${Math.round(size * 1.05)}px 0 ${Math.round(size * 0.55)}px;border-radius:999px;
      font:600 ${size}px/1 Inter,sans-serif;letter-spacing:-.005em;white-space:nowrap;color:${d ? "#FFFFFF" : "#0A1030"};
      background:${d ? "rgba(10,16,60,.78)" : "rgba(255,255,255,.94)"};border:1.5px solid ${d ? "rgba(120,170,255,.38)" : "rgba(2,6,63,.06)"};
      -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
      box-shadow:${d ? "0 18px 40px rgba(0,0,16,.5)" : "0 16px 36px rgba(20,30,90,.14)"};${style}">
    <span style="width:${Math.round(h * 0.72)}px;height:${Math.round(h * 0.72)}px;border-radius:50%;display:grid;place-items:center;flex:none;
      background:${d ? "rgba(92,159,255,.16)" : "#EEF4FF"}">${mark({ theme: d ? "dark" : "light", h: Math.round(size * 1.05) })}</span>
    <span class="tp">${html}</span></div>`;
}

/** CSS the fun layer needs on every page (the key word colour inside pills). */
export function funCss(theme = "dark") {
  return `.tpill .tp b{font-weight:700;color:${theme === "dark" ? "#8FD3FF" : "#0056D0"}}`;
}
