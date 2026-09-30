/* The premium system (DESIGN.md section 6a): three grounds, one grid per
 * format, the same brand furniture on every post, one headline, one product
 * moment and one 3D identity icon. Nothing else. Posts compose only what is
 * here, and build.mjs checks every phone against the placement rule below. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { baseCss, icon as lucide } from "./kit.mjs";
import { BRAND, CACHE, SOURCE } from "./paths.mjs";
import { u } from "./render.mjs";

/* ------------------------------------------------------------------ grounds */

export const GROUND = {
  night: { css: "linear-gradient(180deg,#050B3D 0%,#010118 100%)", dark: true },
  /* Electric needs a wordmark that reaches 3:1 on it. The chrome wordmark
   * measures 1.8:1 (median) and may not be recoloured, so no post uses
   * Electric until a mono white wordmark exists. The rules stay here. */
  electric: { css: "linear-gradient(180deg,#0A6CFF 0%,#0048C8 100%)", dark: true },
  mist: { css: "#F3F7FF", dark: false },
};

/* type colours per ground */
function ink(g) {
  if (g === "mist") return { head: "#0A1030", key: "#0056D0", sub: "rgba(10,16,48,.66)", foot: "rgba(10,16,48,.64)" };
  if (g === "electric") return { head: "#FFFFFF", key: "#010118", sub: "rgba(255,255,255,.80)", foot: "rgba(255,255,255,.80)" };
  return { head: "#FFFFFF", key: "#8FD3FF", sub: "rgba(255,255,255,.70)", foot: "rgba(255,255,255,.64)" };
}

/* ------------------------------------------------------------------ the grid */

/**
 * One grid per format. Feed posts (4:5, 1:1) and stories share a type scale;
 * the wide formats (1600 across) get their own, 1.33x, so their type reads at
 * the same size in a feed. The gap from the wordmark's foot to the headline's
 * cap-top is 81 px on feed posts, stories and wide posts alike. Stories keep
 * Instagram's safe zones (top 250, bottom 340) clear. The X header is its own
 * format.
 */
export function grid(W, H) {
  const story = H >= 1900;
  const banner = W >= 1500 && H <= 600;
  const wide = !banner && W >= 1500;
  const M = banner ? 88 : wide ? 112 : 80;
  const wm = banner ? { x: M, y: 60, h: 32 } : wide ? { x: M, y: 64, h: 36 } : { x: M, y: story ? 272 : 72, h: 28 };
  const footSize = banner || wide ? 28 : 24;
  const size = banner ? 88 : wide ? 104 : 96;
  const headY = banner ? 123 : story ? 368 : 168;
  return {
    M,
    W,
    H,
    story,
    wide,
    banner,
    wm,
    /* the footer line sits on the wordmark's line, centred on it, at the right margin */
    foot: { right: M, y: Math.round(wm.y + (wm.h - footSize) / 2), size: footSize },
    head: { x: M, y: headY, size },
    capTop: headY + Math.round(size * 0.125),
    sub: { size: wide ? 40 : 34 },
  };
}

/** Where the subline goes under a headline of `lines` lines. */
export function subTop(g, lines = 2) {
  return g.head.y + Math.round(g.head.size * 1.05 * lines) + 30;
}

/* ------------------------------------------------------------------ the frame */

/**
 * A whole post: the ground, the wordmark, the footer, and the post's own
 * layers in `body`. `foot` is the footer line. `panels` repeats the brand bar
 * on every slide of a carousel.
 */
export function frame({ W, H, ground = "night", body = "", css = "", foot = "vallospaces.com", panels = 1 }) {
  const G = GROUND[ground];
  const c = ink(ground);
  const PW = W / panels;
  const g = grid(PW, H);
  const wm = G.dark ? "vallo-wordmark.png" : "vallo-wordmark-light.png";
  const bar = Array.from({ length: panels }, (_, i) => `
  <img src="${u(join(BRAND, wm))}" alt="Vallo" style="position:absolute;left:${i * PW + g.wm.x}px;top:${g.wm.y}px;height:${g.wm.h}px;width:auto">
  <div class="foot" style="right:${W - (i + 1) * PW + g.foot.right}px;top:${g.foot.y}px">${foot}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(W, H)}
  body{background:${G.css}}
  .hl{position:absolute;font-family:"Poppins","Inter",sans-serif;font-weight:600;letter-spacing:-0.03em;line-height:1.05;color:${c.head};white-space:nowrap;font-feature-settings:"kern" 1}
  .hl .k{color:${c.key}}
  .sub{position:absolute;font:500 ${g.sub.size}px/1.3 Inter,sans-serif;letter-spacing:-0.005em;color:${c.sub};white-space:nowrap}
  .foot{position:absolute;font:500 ${g.foot.size}px/1 Inter,sans-serif;letter-spacing:.005em;color:${c.foot};white-space:nowrap}
  ${css}</style></head><body>
  ${body}
  ${bar}
  </body></html>`;
}

/**
 * The headline: Poppins 600, sentence case, -0.03em, line height 1.05, two
 * lines at most, at the format's size. Wrap the one key word in <k>...</k>.
 */
export function headline(lines, { W, H, x, y, size, align = "left" } = {}) {
  if (lines.length > 2) throw new Error("headline: two lines at most");
  const g = grid(W, H);
  const s = size ?? g.head.size;
  const html = lines.map((l) => l.replace(/<k>(.*?)<\/k>/g, '<span class="k">$1</span>')).join("<br>");
  const pos = align === "center" ? `left:0;right:0;text-align:center` : `left:${x ?? g.head.x}px`;
  return `<div class="hl" style="${pos};top:${y ?? g.head.y}px;font-size:${s}px">${html}</div>`;
}

/** One subline under the headline (one line only), at the format's size. */
export function subline(text, { W, H, x, y, lines = 2 } = {}) {
  const g = grid(W, H);
  return `<div class="sub" style="left:${(x ?? g.head.x) + 2}px;top:${y ?? subTop(g, lines)}px">${text}</div>`;
}

/* ------------------------------------------------------------------ the 3D identity icon */

const BANNED = new Set(["home-verified", "home-small", "receipt", "glass"]);
const DIR3D = join(BRAND, "3d");

/* Each icon's alpha box in its 256 px source, measured once and cached. */
async function alphaBoxes() {
  const file = join(CACHE, "icon-boxes.json");
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const { readdirSync } = await import("node:fs");
  const out = {};
  for (const f of readdirSync(DIR3D).filter((n) => n.endsWith("@2x.webp"))) {
    const { data, info } = await sharp(join(DIR3D, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    out[f.replace("@2x.webp", "")] = { n: info.width, x0, y0, x1: x1 + 1, y1: y1 + 1 };
  }
  writeFileSync(file, JSON.stringify(out));
  return out;
}
const BOX = await alphaBoxes();

/**
 * The post's one 3D identity icon, placed by its object (alpha box), not by
 * its image box. Two slots only:
 *   A (default): object right edge on the right margin, object top on the
 *     headline's cap-top.
 *   B: object left edge on the left margin; vertically centred on `cy` (the
 *     phone), or with its object top at `top`, or its object bottom at `bottom`
 *     (component posts: the bottom margin).
 * `at` overrides with an exact object box position {right|left, top} (the X
 * header). A contact shadow is drawn from the object's own base: 0.55 of its
 * width, 14 px tall, 6 px blur, its top 6 px under the object. No halo.
 */
export function icon3d(name, { W, H, slot = "A", ground = "night", size = 200, cy, top, bottom, at } = {}) {
  if (BANNED.has(name)) throw new Error(`3D icon '${name}' is not used`);
  const b = BOX[name];
  if (!b) throw new Error(`3D icon '${name}' not found`);
  const g = grid(W, H);
  const k = size / b.n;
  const ow = (b.x1 - b.x0) * k;
  const oh = (b.y1 - b.y0) * k;
  let ox;
  let oy;
  if (at) {
    ox = at.left ?? at.right - ow;
    oy = at.top;
  } else if (slot === "A") {
    ox = W - g.M - ow;
    oy = g.capTop;
  } else {
    ox = g.M;
    if (top !== undefined) oy = top;
    else if (bottom !== undefined) oy = bottom - oh;
    else if (cy !== undefined) oy = cy - oh / 2;
    else throw new Error(`icon3d ${name}: slot B needs cy, top or bottom`);
  }
  const ix = ox - b.x0 * k;
  const iy = oy - b.y0 * k;
  const shadow = ground === "mist" ? "rgba(20,32,96,.22)" : ground === "electric" ? "rgba(0,20,90,.5)" : "rgba(0,0,8,.9)";
  const sw = ow * 0.55;
  return `<div class="noaudit" style="position:absolute;left:${(ox + ow / 2 - sw / 2).toFixed(1)}px;top:${(oy + oh + 6).toFixed(1)}px;width:${sw.toFixed(1)}px;height:14px;border-radius:50%;background:${shadow};filter:blur(6px)"></div>
    <img class="noaudit" src="${u(join(DIR3D, `${name}@2x.webp`))}" alt="" style="position:absolute;left:${ix.toFixed(1)}px;top:${iy.toFixed(1)}px;width:${size}px;height:${size}px">`;
}

/** The object box an icon would take (for layout decisions in posts). */
export function iconBox(name, size = 200) {
  const b = BOX[name];
  const k = size / b.n;
  return { w: (b.x1 - b.x0) * k, h: (b.y1 - b.y0) * k };
}

/* ------------------------------------------------------------------ a real component, shown flat */

/**
 * A real part of a captured screen, shown flat and upright with rounded
 * corners and a soft shadow, never larger than its source (crop px). `w` is
 * its width in post px. Returns the html; `componentHeight` gives its height.
 */
export async function component(id, crop, { x, y, w, radius = 32, ground = "night" } = {}) {
  if (w > crop.w) throw new Error(`component ${id}: ${w} px wide would upscale a ${crop.w} px crop`);
  const dir = join(CACHE, "comp");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${id}-${crop.x}-${crop.y}-${crop.w}-${crop.h}.png`);
  if (!existsSync(file)) await sharp(join(SOURCE, `${id}.webp`)).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).png().toFile(file);
  const h = componentHeight(crop, w);
  const sh = GROUND[ground].dark
    ? "0 50px 100px -30px rgba(0,0,10,.75), 0 18px 36px -12px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.22)"
    : "0 50px 100px -30px rgba(20,32,96,.30), 0 16px 32px -12px rgba(20,32,96,.16)";
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${radius}px;overflow:hidden;box-shadow:${sh}">
    <img src="${u(file)}" alt="" style="display:block;width:${w}px;height:${h}px"></div>`;
}
export const componentHeight = (crop, w) => Math.round((w * crop.h) / crop.w);

/* ------------------------------------------------------------------ the one pop-up */

/**
 * An opaque pop-up card (navy at 0.97 on dark grounds, white at 0.98 on
 * mist): a Vallo notification, so its chip is the app's own icon, then a
 * title, one line, an optional amount and the Example chip. `scale` draws it
 * larger when the card is itself the post's product moment.
 */
export function popcard({ ground = "night", title, line, amount = "", time = "now", width = 600, x, y, scale = 1 }) {
  const k = scale;
  const px = (v) => `${Math.round(v * k * 10) / 10}px`;
  const dark = GROUND[ground].dark;
  const ex = `<span style="display:inline-flex;align-items:center;gap:${px(7)};height:${px(32)};padding:0 ${px(13)};border-radius:999px;font:600 ${px(18)}/1 Inter,sans-serif;white-space:nowrap;
      color:${dark ? "#E8EFFF" : "#34406B"};background:${dark ? "rgba(255,255,255,.10)" : "rgba(8,16,50,.05)"};box-shadow:inset 0 0 0 ${px(1.5)} ${dark ? "rgba(255,255,255,.26)" : "rgba(8,16,50,.14)"}">
      ${lucide("info", { size: Math.round(17 * k), color: dark ? "#E8EFFF" : "#34406B", stroke: 2.2 })}Example</span>`;
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${px(width)};display:flex;align-items:center;gap:${px(22)};padding:${px(24)} ${px(28)} ${px(24)} ${px(24)};border-radius:${px(32)};
      background:${dark ? "rgba(14,22,74,.97)" : "rgba(255,255,255,.98)"};
      box-shadow:${dark ? `inset 0 0 0 ${px(1.5)} rgba(130,178,255,.34), 0 ${px(50)} ${px(100)} ${px(-28)} rgba(0,0,10,.85), 0 ${px(16)} ${px(36)} ${px(-10)} rgba(0,0,20,.5)` : "inset 0 0 0 1px rgba(10,20,70,.06), 0 50px 90px -30px rgba(20,30,90,.35), 0 14px 30px -10px rgba(20,30,90,.16)"}">
    <div style="width:${px(84)};height:${px(84)};flex:none;border-radius:${px(19)};overflow:hidden;box-shadow:0 ${px(6)} ${px(14)} ${px(-6)} rgba(0,0,20,.5)">
      <img src="${u(join(BRAND, "vallo-icon.png"))}" alt="Vallo" style="width:100%;height:100%;display:block"></div>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:${px(14)}">
        <div style="font:700 ${px(30)}/1.1 Poppins,Inter,sans-serif;letter-spacing:-0.02em;color:${dark ? "#FFFFFF" : "#0A1030"};white-space:nowrap">${title}</div>
        <div style="font:500 ${px(21)}/1 Inter,sans-serif;color:${dark ? "rgba(214,226,255,.72)" : "rgba(10,16,48,.58)"};white-space:nowrap">${time}</div>
      </div>
      <div style="margin-top:${px(8)};font:500 ${px(23)}/1.3 Inter,sans-serif;color:${dark ? "rgba(214,226,255,.86)" : "rgba(10,16,48,.70)"};white-space:nowrap">${line}</div>
      <div style="margin-top:${px(12)};display:flex;align-items:center;gap:${px(14)}">
        ${amount ? `<div style="font:700 ${px(28)}/1 Inter,sans-serif;letter-spacing:-0.01em;color:${dark ? "#8FD3FF" : "#0056D0"}">${amount}</div>` : ""}${ex}</div>
    </div>
  </div>`;
}

/* ------------------------------------------------------------------ a browser window, flat */

/** A flat browser window around a desktop capture (2880 x 1800). No 3D transforms. */
export function browser({ id, x, y, w, url = "vallospaces.com" }) {
  const bar = Math.round(w * 0.04);
  const h = Math.round((w * 1800) / 2880);
  const dot = Math.round(bar * 0.24);
  return `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;border-radius:20px;overflow:hidden;background:#0B1030;
      box-shadow:0 60px 120px -30px rgba(0,0,10,.8), 0 20px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.22)">
    <div style="height:${bar}px;display:flex;align-items:center;gap:${Math.round(dot * 0.8)}px;padding:0 ${Math.round(bar * 0.5)}px;position:relative;background:#121845;border-bottom:1px solid rgba(140,185,255,.14)">
      ${[0, 1, 2].map(() => `<span style="width:${dot}px;height:${dot}px;border-radius:50%;background:rgba(200,215,255,.26)"></span>`).join("")}
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:${Math.round(bar * 0.6)}px;width:${Math.round(w * 0.3)}px;border-radius:999px;
          display:flex;align-items:center;justify-content:center;font:500 ${Math.round(bar * 0.34)}px/1 Inter,sans-serif;color:rgba(220,232,255,.78);background:rgba(255,255,255,.06)">${url}</div>
    </div>
    <img src="${u(join(SOURCE, `${id}.webp`))}" alt="" style="display:block;width:${w}px;height:${h}px">
  </div>`;
}
export const browserHeight = (w) => Math.round(w * 0.04) + Math.round((w * 1800) / 2880);

/* ------------------------------------------------------------------ phones: one finish, three placements */

/** The phone's contact shadow on each ground (the same on every post). */
export const SHADOW = {
  night: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 },
  electric: { type: "drop", opacity: 0.25, ambientOpacity: 0.12, color: "#001040" },
  mist: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#141E5A" },
};

/**
 * The phone-scale rule. A phone that carries a post shows its screen at 0.45x
 * or more (an outline of about 645 px or wider on 1080), in one of these:
 *   bleed: straight, top 490, w 660 by default; w may grow (never below the
 *     0.45x screen) so that the frame edge crosses only an empty band of the
 *     screen, 24 px or more where the screen has one.
 *   whole: straight, top 440, h 830 (bottom 1270), only where the founder's
 *     reference shows the whole phone; the subline is dropped to make room.
 *   lyingBack: 10's pose (rotation x -44, y 18, z 14; fov 50), whole; stories
 *     use it at w 700 with the bottom at 1560.
 * build.mjs measures every phone and prints any breach.
 */
export const PLACE = {
  bleed: ({ w = 660, cx = 540, top = 490 } = {}) => ({ kind: "bleed", rotation: { x: 0, y: 0, z: 0 }, fov: 20, w, cx, top }),
  whole: ({ cx = 540, h = 830, top = 440 } = {}) => ({ kind: "whole", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h, cx, top }),
  lyingBack: ({ w = 700, cx = 540, bottom = 1560 } = {}) => ({ kind: "lying", rotation: { x: -44, y: 18, z: 14 }, fov: 50, w, cx, bottom }),
};

/** A phone in the set's one finish; `place` is a PLACE result or a custom pose. */
export function phone(screen, ground, place, extra = {}) {
  return { screen, model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, shadow: SHADOW[ground], ...place, ...extra };
}

/* Empty bands of a capture: rows whose brightness spread (98th - 2nd
 * percentile, x 60 to 1260) stays under 24 levels, so no text, icon, control
 * or photograph crosses them. Capture px (the web view, no status bar). */
const bandCache = new Map();
export async function emptyBands(id, thr = 24) {
  const key = `${id}:${thr}`;
  if (bandCache.has(key)) return bandCache.get(key);
  const { data, info } = await sharp(join(SOURCE, `${id}.webp`)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const x0 = 60;
  const x1 = Math.min(1260, W);
  const n = x1 - x0;
  const out = [];
  let s = -1;
  for (let y = 0; y <= info.height; y++) {
    let empty = false;
    if (y < info.height) {
      const row = Array.from(data.subarray(y * W + x0, y * W + x1)).sort((a, b) => a - b);
      empty = row[Math.floor(n * 0.98)] - row[Math.floor(n * 0.02)] < thr;
    }
    if (empty && s < 0) s = y;
    if (!empty && s >= 0) {
      out.push([s, y - 1]);
      s = -1;
    }
  }
  bandCache.set(key, out);
  return out;
}

/**
 * Check one rendered phone against the rule: its screen scale, and, for a
 * straight phone that runs off the frame, what the frame edge crosses.
 * Returns { scale, edge, notes }.
 */
export async function checkPhone(spec, layer, { W, H }) {
  const q = layer.image.quad;
  const iw = layer.image.width;
  const ih = layer.image.height;
  const scale = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / iw;
  const notes = [];
  if (spec.kind === "bleed" && scale < 0.45 && !spec.exempt) notes.push(`screen at ${scale.toFixed(3)}x, under 0.45x`);
  if (spec.exempt) notes.push(`exempt: ${spec.exempt}`);
  const r = spec.rotation || {};
  const straight = !r.x && !r.y && !r.z;
  let edge = null;
  if (straight && q[3][1] > H + 0.5 && !spec.screen.includes("/")) {
    const per = (q[3][1] - q[0][1]) / ih;
    const yCap = (H - q[0][1]) / per - 186;
    const bands = await emptyBands(spec.screen);
    /* a post may declare the empty region its foot falls in, when a card's
     * thin border runs through it: [from, to, what it holds] in capture px */
    const declared = spec.edgeBand && yCap >= spec.edgeBand[0] && yCap <= spec.edgeBand[1] ? [spec.edgeBand[0], spec.edgeBand[1]] : null;
    const b = declared || bands.find(([a, z]) => yCap >= a && yCap <= z);
    if (declared) notes.push(`declared band: ${spec.edgeBand[2]}`);
    edge = { yCap: Math.round(yCap) };
    if (!b && spec.exemptBand) notes.push(`bottom edge crosses ${spec.exemptBand} (no text) at capture y ${Math.round(yCap)}`);
    else if (!b) notes.push(`bottom edge crosses live UI at capture y ${Math.round(yCap)}`);
    else {
      const band = (b[1] - b[0] + 1) * per;
      const above = (yCap - b[0]) * per;
      const below = (b[1] - yCap) * per;
      edge = { ...edge, band: [b[0], b[1]], bandPx: +band.toFixed(1), abovePx: +above.toFixed(1), belowPx: +below.toFixed(1) };
      if (band < 24) notes.push(`edge band ${band.toFixed(1)} px, under 24`);
    }
  }
  if (straight && (q[0][0] < -0.5 || q[1][0] > W + 0.5)) notes.push("the screen runs off a side edge");
  return { scale: +scale.toFixed(3), edge, notes };
}
