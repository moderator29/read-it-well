/**
 * Section a (rows 01-13, 0.00-30.58): what both films share.
 *
 *  - the clock: every time in the section, anchored to beats and words;
 *  - the section's one look: tokens, one shadow language, the mist ground;
 *  - the phone's projection (the same maths as phone3d/browser/live.js), so
 *    a body can be lifted off the glass from exactly where it sits on screen;
 *  - small builders: the word chip, the Nigeria outline, the sound cues.
 */
import { quadMatrix } from "../engine/phone.js";

/* ---------- the look ---------- */

export const NAVY = "#0b1230";
export const ELECTRIC = "#0069fe";
export const SKY = "#8fd3ff";
export const QUIET = "#5c9fff";
/* One shadow language across the film (the same values as sections b and c). */
export const SHADOW = "0 26px 56px -26px rgb(16 32 80 / 0.38), 0 6px 16px -8px rgb(16 32 80 / 0.16)";
export const SHADOW_L = "0 40px 90px -40px rgb(16 32 80 / 0.42), 0 10px 24px -12px rgb(16 32 80 / 0.18)";
export const SHADOW_SOFT = "0 14px 32px -16px rgb(16 32 80 / 0.34), 0 3px 10px -5px rgb(16 32 80 / 0.16)";
/* ...and its night twin. */
export const SHADOW_NIGHT = "0 26px 56px -24px rgb(0 0 12 / 0.75), 0 6px 16px -8px rgb(0 0 12 / 0.5)";
/* The mist, the daylight ground: the same string as sections b and c (b-kit / c-kit mist()). */
export const MIST = "radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%), linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)";

/* ---------- the clock ---------- */

/** Every time in the section, from the beat grid and the voice (timeline.json). */
export function times(ctx) {
  const b = (k) => ctx.beat(k);
  const w = (i, word, n = 1) => ctx.word(i, word, n).start;
  const we = (i, word, n = 1) => ctx.word(i, word, n).end;
  return {
    b,
    w,
    we,
    end: b(53), // 30.577: the hand-off to section b
    rows: [0, b(4), b(7), b(12), b(15), b(20), b(26), b(29), b(32), b(36), b(40), b(44), b(48), b(53)],
    /* 01 */ settle: [b(1), b(2), b(3)],
    /* 02 */ finding: w(1, "Finding"), a1: w(1, "a"), place: w(1, "place"), in1: w(1, "in"), nigeria: w(1, "Nigeria"), shouldnt: w(1, "shouldn't"),
    /* 03 */ feel: w(1, "feel"), like: w(1, "like"), gamble: w(1, "gamble"), rush: b(11), drop: b(12),
    /* 04 */ meet: w(2, "Meet"), vallo: w(2, "Vallo"), sparkle: b(12.65), widen: b(14.2),
    /* 05 */ homes: w(3, "Homes"), hotels: w(3, "hotels"), shortlets: w(3, "shortlets"), restaurants: w(3, "restaurants"), welcome: b(20),
    /* 06 */ all: w(3, "all"), one1: w(3, "one", 1), app: w(3, "app"), one2: w(3, "one", 2), account: w(3, "account"), accountEnd: we(3, "account"),
    /* 07 */ looking: w(4, "Looking"), for4: w(4, "for"), home: w(4, "home"), rent: w(4, "rent"), buy: w(4, "buy"), pill1: b(28.1),
    /* 08 */ search: w(5, "Search"), across: w(5, "across"), nigeria5: w(5, "Nigeria"), filterPress: b(31.72),
    /* 09 */ filter: w(5, "filter"), exactly: w(5, "exactly"), need: w(5, "need"),
    /* 10 */ see: w(5, "see"), movein: w(5, "move-in"), cost: w(5, "cost"), call: w(5, "call"), callEnd: we(5, "call"),
    /* 12 */ rentLine: w(6, "Rent"), fees: w(6, "fees"), caution: w(6, "caution"), deposit: w(6, "deposit"),
    /* 13 */ all6: w(6, "all"), added: w(6, "added"), right: w(6, "right"), there: w(6, "there"), thereEnd: we(6, "there"),
  };
}

/** Times derived from the anchors: the city dots, the printed lines, the amounts' flights. */
export function timesPlus(ctx) {
  const T = times(ctx);
  /* 08: Lagos, Abuja, Kano, Port Harcourt, Ibadan, in time with "Search across Nigeria". */
  T.dots = [T.search, T.across, T.across + 0.26, T.nigeria5, T.nigeria5 + 0.23];
  /* 12: Rent; the three fees on "fees"; caution; the grey service charge on "deposit". */
  T.lines = [T.rentLine, T.fees, T.fees + 0.19, T.fees + 0.38, T.caution, T.deposit];
  /* 13: the five amounts leave for the total one by one from "all". */
  T.flies = [0, 1, 2, 3, 4].map((k) => T.all6 + k * 0.12);
  /* 06: the Property | Stays tabs rise on "with one account". */
  T.tabsUp = T.one2 - 0.14;
  /* 07: the Rent press lands inside the word "rent", once the phone has risen. */
  T.rentPress = T.rent + 0.25;
  /* 09: the lifted Apply button's count rolls just after the Villas press. */
  T.countRoll = T.exactly + 0.12;
  /* 10: the listing opens on "see" and whips down to its costs, landing on "move-in". Its move-in
     total is never at rest on screen before 28.87: it only passes, blurred, in the whip. */
  T.open = T.need + 0.5;
  T.flick = T.need + 0.58;
  return T;
}

/* ---------- the phone's projection ---------- */

/* phone3d's island model: the display rectangle (mm, model space) and the
   framing constant, as in phone3d/browser/live.js (probed 30 Sep 2026). */
const ISLAND = { x0: -36.45, x1: 36.45, y0: -79.15, y1: 79.15, z: 4.125, height: 163, FIT: 0.85 };
const DEG = Math.PI / 180;

/** The display's corners [tl, tr, br, bl] in stage px for a phone pose. */
export function projectDisplay(pose, W, H) {
  const f = 1 / Math.tan(((pose.fov ?? 24) * DEG) / 2);
  const d = (f * ISLAND.height) / (2 * ISLAND.FIT);
  const a = Math.cos((pose.rx ?? 0) * DEG), bb = Math.sin((pose.rx ?? 0) * DEG);
  const c = Math.cos((pose.ry ?? 0) * DEG), dd = Math.sin((pose.ry ?? 0) * DEG);
  const e = Math.cos((pose.rz ?? 0) * DEG), ff = Math.sin((pose.rz ?? 0) * DEG);
  /* three.js makeRotationFromEuler, order ZXY */
  const ce = c * e, cf = c * ff, de = dd * e, df = dd * ff;
  const m = [ce - df * bb, -a * ff, de + cf * bb, cf + de * bb, a * e, df - ce * bb, -a * dd, bb, a * c];
  const k = pose.height / (2 * ISLAND.FIT);
  const pts = [[ISLAND.x0, ISLAND.y1], [ISLAND.x1, ISLAND.y1], [ISLAND.x1, ISLAND.y0], [ISLAND.x0, ISLAND.y0]];
  return pts.map(([x, y]) => {
    const z = ISLAND.z;
    const wx = m[0] * x + m[1] * y + m[2] * z;
    const wy = m[3] * x + m[4] * y + m[5] * z;
    const wz = m[6] * x + m[7] * y + m[8] * z;
    const depth = d - wz;
    return { x: pose.cx + (k * f * wx) / depth, y: pose.cy - (k * f * wy) / depth };
  });
}

/** Projective map of the unit square onto a quad: returns (u, v) => {x, y}. */
export function quadMap(q) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
  };
}

/** Display px (1320 x 2868) to stage px, for a phone pose. */
export function displayToStage(pose, W, H, x, y) {
  return quadMap(projectDisplay(pose, W, H))(x / 1320, y / 2868);
}

/** The stage quad of a display-px rectangle on the phone at `pose`. */
export function displayRectQuad(pose, W, H, r) {
  const map = quadMap(projectDisplay(pose, W, H));
  return [
    map(r.x / 1320, r.y / 2868),
    map((r.x + r.w) / 1320, r.y / 2868),
    map((r.x + r.w) / 1320, (r.y + r.h) / 2868),
    map(r.x / 1320, (r.y + r.h) / 2868),
  ];
}

/** A flat rectangle quad: centre (cx, cy), size w x h, turned by `rot` degrees. */
export function rectQuad(cx, cy, w, h, rot = 0) {
  const r = rot * DEG;
  const cs = Math.cos(r), sn = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => ({ x: cx + x * cs - y * sn, y: cy + x * sn + y * cs }));
}

export const lerp = (a, b, p) => a + (b - a) * p;
export const lerpQuad = (qa, qb, p) => qa.map((pt, i) => ({ x: lerp(pt.x, qb[i].x, p), y: lerp(pt.y, qb[i].y, p) }));

/** Places an element (its own box w x h at left 0 / top 0, origin 0 0) onto a quad. */
export function placeOnQuad(node, w, h, q) {
  node.style.transform = quadMatrix(w, h, q);
}

/* ---------- builders ---------- */

/**
 * A big word on a white glass chip: type as an object that lands (rows 05-07).
 * parts: [[text, blue], ...]. Returns { root, chip } (animate root).
 */
export function wordChip(ctx, parent, { parts, size = 124, x, y, anchor = "left", z = 0, pad = 0.34 }) {
  const root = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, zIndex: String(z), willChange: "transform" } }, parent);
  const chip = ctx.el("div", {
    style: {
      position: "absolute", top: "0px", [anchor === "right" ? "right" : "left"]: "0px", whiteSpace: "nowrap",
      padding: `${Math.round(size * 0.13)}px ${Math.round(size * pad)}px ${Math.round(size * 0.17)}px`,
      borderRadius: `${Math.round(size * 0.42)}px`, background: "rgb(255 255 255 / 0.97)",
      boxShadow: SHADOW, border: "1px solid rgb(11 18 48 / 0.05)",
      font: `700 ${size}px/1.06 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color: NAVY,
    },
  }, root);
  parts.forEach(([text, blue]) => ctx.el("span", { text, style: blue ? { color: ELECTRIC } : {} }, chip));
  return { root, chip };
}

/*
 * The pointer's press and the tap ripple. The engine's press()/tap()/click()
 * build their rings with fromTo from a visible state, so every future ring
 * shows as a small circle from frame 0 until its press. These draw the rings
 * from the time alone (a frame hook), so nothing shows before the press.
 */
function ringHook(ctx, node, t0, dur, s0, s1, o0) {
  const e = ctx.ease("power2.out");
  ctx.onFrame((t) => {
    const k = (t - t0) / dur;
    if (k < 0 || k >= 1) {
      if (node.style.visibility !== "hidden") node.style.visibility = "hidden";
      return;
    }
    const p = e(k);
    node.style.visibility = "inherit";
    node.style.transform = `scale(${(s0 + (s1 - s0) * p).toFixed(4)})`;
    node.style.opacity = String(o0 * (1 - p));
  });
}

/** The glossy pointer's press at t: it dips, and a ring opens where it is (stage px). */
export function pressAt(ctx, pointer, t, { parent, x, y, color = "rgb(0 105 254 / 0.8)" }) {
  ctx.tl.to(pointer, { scaleY: 0.8, scaleX: 1.1, duration: 0.09, ease: "power2.out" }, t - 0.06);
  ctx.tl.to(pointer, { scaleY: 1, scaleX: 1, duration: 0.32, ease: "back.out(2.2)" }, t + 0.05);
  const r = ctx.el("div", { class: "abs", style: { left: `${x - 50}px`, top: `${y - 50}px`, width: "100px", height: "100px", borderRadius: "50%", border: `3px solid ${color}`, visibility: "hidden", zIndex: "840" } }, parent);
  ringHook(ctx, r, t, 0.55, 0.25, 1.25, 1);
  return r;
}

/** A tap ripple under the glass (display px, inside the phone's screen). */
export function rippleAt(ctx, parent, { x, y, t, size = 260 }) {
  const r = ctx.el("div", {
    class: "abs",
    style: {
      left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", visibility: "hidden", zIndex: "50",
      background: "radial-gradient(closest-side, rgb(0 105 254 / 0.22), rgb(0 105 254 / 0.08) 70%, transparent)", border: "4px solid rgb(0 105 254 / 0.35)",
    },
  }, parent);
  ringHook(ctx, r, t, 0.55, 0.25, 1, 1);
  return r;
}

/* ---------- signature 1: the receipt's lines (FACTS.md, the Maitama villa) ---------- */

export const LINES = [
  { label: "Rent · a year", amount: 18000000 },
  { label: "Agency fee", amount: 1800000, note: "10.0% of a year's rent" },
  { label: "Legal fee", amount: 1800000, note: "10.0% of a year's rent" },
  { label: "Agreement fee", amount: 900000, note: "5.0% of a year's rent" },
  { label: "Caution deposit", amount: 3600000, note: "(refundable)" },
  { label: "Service charge: not declared", amount: null },
];
export const TOTAL = 26100000;
export const naira = (n) => `₦${n.toLocaleString("en-NG")}`;

/** Nigeria's outline as an SVG path in a box (world-atlas 50m, id 566), and a projector for cities. */
export async function nigeriaOutline({ x, y, w }) {
  const { feature } = await import("/node_modules/topojson-client/src/index.js");
  const world = await fetch("/node_modules/world-atlas/countries-50m.json").then((r) => r.json());
  const geo = feature(world, world.objects.countries.geometries.find((g) => String(g.id) === "566"));
  const polys = geo.geometry.type === "Polygon" ? [geo.geometry.coordinates] : geo.geometry.coordinates;
  let ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
  const lons = ring.map((p) => p[0]), lats = ring.map((p) => p[1]);
  const lon0 = Math.min(...lons), lon1 = Math.max(...lons), lat0 = Math.min(...lats), lat1 = Math.max(...lats);
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const sx = w / ((lon1 - lon0) * k);
  const h = (lat1 - lat0) * sx;
  const proj = (lon, lat) => ({ x: x + (lon - lon0) * k * sx, y: y + (lat1 - lat) * sx });
  const d = ring.map(([lon, lat], i) => {
    const p = proj(lon, lat);
    return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join("") + "Z";
  return { d, proj, w, h };
}

/** The five cities of row 08 (FACTS.md), lon / lat. */
export const CITIES = [
  { name: "Lagos", lon: 3.38, lat: 6.52 },
  { name: "Abuja", lon: 7.49, lat: 9.06 },
  { name: "Kano", lon: 8.52, lat: 12.0 },
  { name: "Port Harcourt", lon: 7.03, lat: 4.82 },
  { name: "Ibadan", lon: 3.9, lat: 7.38 },
];

/* ---------- crops ---------- */

const imageCache = new Map();
/** Loads and decodes an image once (for crops drawn at build time). */
export function loadImage(src) {
  if (!imageCache.has(src)) {
    const img = new Image();
    img.decoding = "sync";
    img.src = src;
    imageCache.set(src, img.decode().then(() => img));
  }
  return imageCache.get(src);
}

/** Lets the build-time crop sources go once every crop is drawn. */
export function releaseImages() {
  imageCache.clear();
}

/** A canvas holding one crop of an image (source px), drawn once at build time: light and deterministic. */
export async function cropCanvas(ctx, src, box, { parent = null, style = {} } = {}) {
  const img = await loadImage(src);
  const c = ctx.el("canvas", { class: "abs", style: { left: "0px", top: "0px", width: `${box.w}px`, height: `${box.h}px`, ...style } }, parent);
  c.width = box.w;
  c.height = box.h;
  c.getContext("2d").drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return c;
}

/* ---------- type ---------- */

/** Loads the section's faces, so widths can be measured at build time. */
export async function loadFonts() {
  await Promise.all(["700 100px Poppins", "600 100px Poppins", "600 40px Inter", "700 40px Inter", "500 40px Inter"].map((f) => document.fonts.load(f, "Vallo ₦ 0123456789")));
}

/** A text's width in px at a CSS font, with letter-spacing in em (as the stage draws it). */
export function measure(text, font, letterSpacingEm = 0) {
  const c = measure.canvas ?? (measure.canvas = document.createElement("canvas"));
  const g = c.getContext("2d");
  g.font = font;
  const px = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
  return g.measureText(text).width + [...text].length * letterSpacingEm * px;
}

/** The largest size (<= size) at which `text` fits `maxW`, for a font template like "700 {}px Poppins". */
export function fitSize(text, template, size, maxW, letterSpacingEm = -0.03) {
  const w = measure(text, template.replace("{}", String(size)), letterSpacingEm);
  return w <= maxW ? size : Math.floor((size * maxW) / w);
}

/* ---------- the odometer ---------- */

/*
 * The total rolls into place like an odometer: each digit column spins at a
 * steady high speed (more than a digit a frame, so it is a vertical smear,
 * never a readable digit), then brakes in the last 0.12 s onto its digit;
 * the columns stop left to right, the last on t1. The smear is a vertical
 * gaussian (an SVG filter), strongest at full speed. Only ₦26,100,000 is
 * ever readable. (The engine's odometer blurs by at most 3 px, which leaves
 * wrong digits readable mid-spin.)
 */
let vblurReady = false;
function vblurFilters(ctx) {
  if (vblurReady) return;
  vblurReady = true;
  const holder = ctx.el("div", { style: { position: "absolute", width: "0px", height: "0px", overflow: "hidden" } }, ctx.stage);
  const steps = [2, 4, 7, 10, 14, 18];
  holder.innerHTML = `<svg width="0" height="0"><defs>${steps.map((k, i) => `<filter id="a-vblur-${i}" x="-5%" y="-60%" width="110%" height="220%"><feGaussianBlur stdDeviation="0 ${k}"/></filter>`).join("")}</defs></svg>`;
}

/**
 * A fast scroll's motion blur: a vertical gaussian on `el` as strong as the
 * scroll is fast (a camera's shutter, exaggerated), so nothing the page
 * carries past can be read while it moves, and gone once it slows.
 * `speed(t)` is the scroll's speed in el's own px per second. The blur is a
 * function of speed only, so a 30 fps review and the 60 fps film match.
 */
let scrollBlurs = 0;
export function scrollBlur(ctx, el, speed, { k = 0.45, max = 60 } = {}) {
  const id = `a-sblur-${++scrollBlurs}`;
  const holder = ctx.el("div", { style: { position: "absolute", width: "0px", height: "0px", overflow: "hidden" } }, ctx.stage);
  holder.innerHTML = `<svg width="0" height="0"><defs><filter id="${id}" x="-2%" y="-12%" width="104%" height="124%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter></defs></svg>`;
  const g = holder.querySelector("feGaussianBlur");
  let last = -1;
  ctx.onFrame((t) => {
    const s = Math.min(max, (k * Math.abs(speed(t))) / 60);
    const q = s < 1 ? 0 : Math.round(s * 2) / 2;
    if (q === last) return;
    last = q;
    if (q === 0) el.style.filter = "none";
    else {
      g.setAttribute("stdDeviation", `0 ${q}`);
      el.style.filter = `url(#${id})`;
    }
  });
}

/** power4.out and its slope, for a whip scroll whose speed a hook needs. */
export const whip = { ease: "power4.out", slope: (p) => (p <= 0 || p >= 1 ? 0 : 4 * (1 - p) ** 3) };

export function rollNumber(ctx, parent, { value, t0, t1, font, color, prefix = "₦", speed = 72, gapMax = 0.075, ls = -0.02 }) {
  vblurFilters(ctx);
  const text = value.toLocaleString("en-NG");
  const box = ctx.el("div", { style: { display: "flex", alignItems: "flex-start", font, color, lineHeight: "1", whiteSpace: "nowrap", letterSpacing: `${ls}em` } }, parent);
  if (prefix) ctx.el("span", { text: prefix, style: { display: "inline-block", height: "1.08em", lineHeight: "1.08em" } }, box);
  const n = [...text].filter((c) => /\d/.test(c)).length;
  /* every column spins from t0; they stop left to right over the window's last part, the last on t1 */
  const gap = Math.min(gapMax, (t1 - t0 - 0.25) / Math.max(1, n - 1));
  let k = 0;
  [...text].forEach((ch) => {
    if (!/\d/.test(ch)) {
      ctx.el("span", { text: ch, style: { display: "inline-block", height: "1.08em", lineHeight: "1.08em" } }, box);
      return;
    }
    const idx = k;
    k += 1;
    /* each column is exactly its final digit's width (Poppins has no tabular figures), the spin centred in it */
    const fontPx = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)[1]);
    const cw = measure(ch, font.split(",")[0]) + ls * fontPx;
    const col = ctx.el("span", { style: { display: "inline-block", position: "relative", height: "1.08em", overflow: "hidden", width: `${cw.toFixed(2)}px` } }, box);
    const run = t1 - (n - 1 - idx) * gap - t0;
    const brake = Math.min(0.12, run * 0.4);
    const final = Number(ch);
    const cycles = Math.max(2, Math.round((speed * (run - brake / 2) - final) / 10));
    const travel = cycles * 10 + final;
    const v = travel / (run - brake / 2);
    const strip = ctx.el("span", { style: { position: "absolute", left: "-0.2em", right: "-0.2em", top: "0px", display: "flex", flexDirection: "column", alignItems: "center" } }, col);
    for (let s = 0; s <= travel; s += 1) ctx.el("span", { text: String(s % 10), style: { display: "block", height: "1.08em", lineHeight: "1.08em" } }, strip);
    let lastF = -2;
    ctx.onFrame((t) => {
      const u = Math.min(Math.max(t - t0, 0), run);
      const tb = run - brake;
      const pos = u <= tb ? v * u : v * tb + v * ((u - tb) - (u - tb) ** 2 / (2 * brake));
      const vel = u <= 0 || u >= run ? 0 : u <= tb ? v : v * (1 - (u - tb) / brake);
      strip.style.transform = `translateY(${(-pos * 1.08).toFixed(4)}em)`;
      const f = vel / 60 < 0.12 ? -1 : Math.min(5, Math.floor((vel / 60) * 4));
      if (f !== lastF) {
        col.style.filter = f < 0 ? "none" : `url(#a-vblur-${f})`;
        lastF = f;
      }
    });
  });
  return box;
}

/**
 * The section's sound cues and caption gaps (STORYBOARD.md, rows 01-13). The
 * films share one clock and one soundtrack, so both register the same cues.
 */
export function registerSound(ctx, T) {
  const s = (name, t, offset = 0) => ctx.sfx(name, t, { offset });
  /* 02 */ s("whoosh_short", T.rows[1], -2);
  /* 03 */ s("card_slide", T.b(7.1), 0); s("card_slide", T.b(7.8), 0); s("card_slide", T.b(8.5), 0); s("whoosh_long", T.rush, 0);
  /* 04 */ s("impact_soft", T.drop, 0); s("sparkle", T.sparkle, -3);
  /* 05 */ for (const t of [T.hotels, T.shortlets, T.restaurants]) s("swipe", t, -3);
  /* 06 */ s("pop", T.tabsUp, -4);
  /* 07 (the chapter's opener) */ s("whoosh_short", T.rows[6], -4); s("tap", T.rentPress, 0); s("swipe", T.buy, -2);
  /* 08 */ for (const t of T.dots) s("tap_soft", t, -6); s("tap", T.filterPress, 0);
  /* 09 */ s("toggle_on", T.exactly, 3); s("counter_tick", T.countRoll, -2); s("tap", T.need, 0);
  /* 10 */ s("swipe", T.flick, -2);
  /* 11 (the receipt opens the chapter) */ s("whoosh_short", T.call, 0); s("card_slide", T.call + 0.17, -2);
  /* 12 */ for (const t of T.lines) s("counter_tick", t, 0);
  /* 13 */ for (const t of T.flies) s("counter_tick", t + 0.24, -4); s("success", T.right, 0); s("pop", T.there + 0.11, 0);
  /* Captions: off while the same words are big (02, 04, 06, 07 until the pill). Row 05 has no big words (v3.1). */
  ctx.hideCaptions(T.rows[1], T.rows[2]);
  ctx.hideCaptions(T.rows[3], T.rows[4]);
  ctx.hideCaptions(T.rows[5], T.pill1);
}
