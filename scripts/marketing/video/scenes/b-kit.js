/**
 * SECTION B's KIT: the pieces rows 14 to 27 share, in both films.
 *
 * Motion is either a GSAP fromTo on the master timeline or a per-frame hook
 * that reads only t (keyframes below), never both on one property.
 * Everything here keeps the founder's "clean" rule: one shadow language,
 * crisp live type, screens never shown above their native pixels.
 */
import { phone, quadMatrix } from "../engine/phone.js";

export const DW = 1320;
export const DH = 2868;
export const NAVY = "#0b1230";
export const INK2 = "#5b6275";
export const ELECTRIC = "#0069fe";

/* ---------- time ---------- */

/** Word start (w) and end (we) helpers bound to ctx. */
export function clock(ctx) {
  return {
    b: ctx.beat,
    w: (i, word, n = 1) => ctx.word(i, word, n).start,
    we: (i, word, n = 1) => ctx.word(i, word, n).end,
  };
}

const EASES = new Map();
export function E(ctx, name = "power2.inOut") {
  if (!EASES.has(name)) EASES.set(name, ctx.gsap.parseEase(name));
  return EASES.get(name);
}

/** Keyframes as a pure function of t: [[t0, v0], [t1, v1, ease], ...]. */
export function kf(ctx, t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1, ease] = keys[i];
    if (t < t1) {
      const [t0, v0] = keys[i - 1];
      const u = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return v0 + (v1 - v0) * E(ctx, ease)(u);
    }
  }
  return keys[keys.length - 1][1];
}

/** 0 -> 1 from t0 to t1 with an ease. */
export function ramp(ctx, t, t0, t1, ease = "power2.inOut") {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return E(ctx, ease)((t - t0) / (t1 - t0));
}

export const mix = (a, b, u) => a + (b - a) * u;

/**
 * A GSAP track on one object: segments are fromTo from the last value.
 * GSAP (3.15) shows an element's build-time values before its first tween
 * (rewinding reverts to them), so a DOM element gets its start state now.
 */
export function track(ctx, obj, init) {
  const cur = { ...init };
  if (obj instanceof Element) ctx.gsap.set(obj, init);
  else Object.assign(obj, init);
  return {
    cur,
    to(t, dur, vals, ease = "power2.inOut") {
      const from = {};
      for (const k of Object.keys(vals)) from[k] = cur[k];
      ctx.tl.fromTo(obj, from, { ...vals, duration: dur, ease, immediateRender: false }, t);
      Object.assign(cur, vals);
      return this;
    },
  };
}

/* ---------- looks ---------- */

/** One soft shadow language (light grounds): size "s" | "m" | "l". */
export const SHADOW = {
  s: "0 14px 32px -16px rgb(16 32 80 / 0.34), 0 3px 10px -5px rgb(16 32 80 / 0.16)",
  m: "0 26px 56px -26px rgb(16 32 80 / 0.38), 0 6px 16px -8px rgb(16 32 80 / 0.16)",
  l: "0 40px 90px -40px rgb(16 32 80 / 0.42), 0 10px 24px -12px rgb(16 32 80 / 0.18)",
};
/** The same language on night grounds. */
export const SHADOW_DARK = {
  s: "0 14px 32px -14px rgb(0 0 12 / 0.7), 0 3px 10px -4px rgb(0 0 12 / 0.5)",
  m: "0 26px 56px -24px rgb(0 0 12 / 0.75), 0 6px 16px -8px rgb(0 0 12 / 0.5)",
  l: "0 40px 90px -36px rgb(0 0 12 / 0.8), 0 10px 24px -12px rgb(0 0 12 / 0.5)",
};

/** Mist: the product's daylight (matches section c's ground). */
export function mist(ctx, parent) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%),
        linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)`,
    },
  }, parent);
}

/** Warm light: mist washed with peach (#FFB27A at 25%). */
export function warm(ctx, parent) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(80% 50% at 50% 62%, rgb(255 178 122 / 0.22) 0%, rgb(255 178 122 / 0) 72%),
        linear-gradient(180deg, rgb(255 178 122 / 0.2) 0%, rgb(255 178 122 / 0.27) 100%),
        linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)`,
    },
  }, parent);
}

/** Night: the brand navy (matches section c's ground). */
export function night(ctx, parent, { x = 50, y = 40, glow = 0.26 } = {}) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(70% 42% at ${x}% ${y}%, rgb(0 105 254 / ${glow}) 0%, rgb(0 105 254 / 0) 70%),
        linear-gradient(180deg, #000d36 0%, #02063f 46%, #010118 100%)`,
    },
  }, parent);
}

/**
 * Warm city bokeh drawn in code: soft discs (radial gradients) at three
 * depths, drifting slowly. Seeded, so every render is the same.
 */
export function bokeh(ctx, parent, { area, count = 16, seed = 11, t0 = 0, drift = 14 }) {
  const rand = ctx.random(seed);
  const hues = ["255 178 122", "255 150 80", "255 210 150", "255 120 60", "255 196 120"];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const depth = rand();
    const size = 40 + depth * depth * 190;
    const x = area.x + rand() * area.w;
    const y = area.y + rand() * area.h;
    const hue = hues[Math.floor(rand() * hues.length)];
    const a = 0.16 + (1 - depth) * 0.22;
    const node = ctx.el("div", {
      class: "abs",
      style: {
        left: `${(x - size / 2).toFixed(1)}px`, top: `${(y - size / 2).toFixed(1)}px`, width: `${size.toFixed(1)}px`, height: `${size.toFixed(1)}px`, borderRadius: "50%",
        background: `radial-gradient(closest-side, rgb(${hue} / ${a.toFixed(3)}) 0%, rgb(${hue} / ${(a * 0.8).toFixed(3)}) 55%, rgb(${hue} / 0) 100%)`,
      },
    }, parent);
    const phase = rand() * Math.PI * 2;
    const sp = 0.35 + rand() * 0.4;
    const amp = drift * (0.4 + depth);
    ctx.onFrame((t) => {
      const k = (t - t0) * sp + phase;
      node.style.transform = `translate(${(Math.sin(k) * amp).toFixed(2)}px, ${(Math.cos(k * 0.8) * amp * 0.6).toFixed(2)}px)`;
    });
    out.push(node);
  }
  return out;
}

/** The platform's trust mark: a filled electric disc with a white tick (verified-badge.svg). */
export function verifiedMark(ctx, parent, size, { color = ELECTRIC, style = {} } = {}) {
  const node = ctx.el("div", { style: { width: `${size}px`, height: `${size}px`, flex: "none", ...style } }, parent);
  node.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="${color}"/><path d="m16.2 9-5.6 5.6L7.8 11.8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return node;
}

/** The product's "Example" chip. theme "light" (on white glass) or "dark". */
export function exampleChip(ctx, parent, { size = 22, theme = "light", style = {} } = {}) {
  return ctx.el("span", {
    text: "Example",
    style: {
      display: "inline-flex", alignItems: "center", flex: "none", font: `600 ${size}px/1 Inter, sans-serif`, letterSpacing: "0.01em",
      padding: `${Math.round(size * 0.36)}px ${Math.round(size * 0.66)}px`, borderRadius: "999px", whiteSpace: "nowrap",
      ...(theme === "light"
        ? { background: "rgb(0 105 254 / 0.08)", color: "#0056d0", border: "1px solid rgb(0 105 254 / 0.2)" }
        : { background: "rgb(143 211 255 / 0.14)", color: "#8fd3ff", border: "1px solid rgb(143 211 255 / 0.3)" }),
      ...style,
    },
  }, parent);
}

/** The product's photo chip "(i) Example" (dark pill over a photo). */
export function photoExample(ctx, parent, { size = 22, style = {} } = {}) {
  const node = ctx.el("span", {
    style: {
      position: "absolute", display: "inline-flex", alignItems: "center", gap: `${Math.round(size * 0.25)}px`, font: `600 ${size}px/1 Inter, sans-serif`,
      padding: `${Math.round(size * 0.3)}px ${Math.round(size * 0.5)}px`, borderRadius: `${Math.round(size * 0.5)}px`, color: "#fff", background: "rgb(8 14 40 / 0.78)", whiteSpace: "nowrap", ...style,
    },
  }, parent);
  ctx.icon("info", { size: Math.round(size * 1.05), stroke: 2.2 }, node);
  ctx.el("span", { text: "Example" }, node);
  return node;
}

/** A white glass card (light grounds). */
export function glassCard(ctx, parent, { w, h = null, radius = 32, shadow = "m", style = {}, cls = "" } = {}) {
  return ctx.el("div", {
    class: `abs ${cls}`,
    style: {
      left: "0px", top: "0px", width: `${w}px`, ...(h != null ? { height: `${h}px` } : {}), borderRadius: `${radius}px`,
      background: "rgb(255 255 255 / 0.96)", border: "1px solid rgb(255 255 255 / 0.9)", boxShadow: SHADOW[shadow], color: NAVY, ...style,
    },
  }, parent);
}

/** A navy glass card (night grounds). */
export function nightCard(ctx, parent, { w, h = null, radius = 32, shadow = "m", style = {} } = {}) {
  return ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${w}px`, ...(h != null ? { height: `${h}px` } : {}), borderRadius: `${radius}px`,
      background: "rgb(10 16 60 / 0.9)", border: "1.5px solid rgb(120 170 255 / 0.32)", boxShadow: SHADOW_DARK[shadow], color: "#fff", ...style,
    },
  }, parent);
}

/** An icon plate: a lucide icon on a tinted rounded square. */
export function iconPlate(ctx, parent, name, { size = 64, theme = "light", round = false } = {}) {
  const node = ctx.el("span", {
    style: {
      display: "grid", placeItems: "center", flex: "none", width: `${size}px`, height: `${size}px`, borderRadius: round ? "50%" : `${Math.round(size * 0.3)}px`,
      ...(theme === "light" ? { background: "rgb(0 105 254 / 0.1)", color: ELECTRIC } : { background: "rgb(143 211 255 / 0.14)", color: "#8fd3ff" }),
    },
  }, parent);
  ctx.icon(name, { size: Math.round(size * 0.52), stroke: 2.1 }, node);
  return node;
}

/**
 * Measures text in px for a CSS font and tracking, with a hidden span (a
 * detached canvas does not see the page's web fonts). Call it from a frame
 * hook, once the fonts have loaded.
 */
export function measure(text, font, letterSpacing = "-0.035em") {
  const n = measure.n ?? (measure.n = Object.assign(document.createElement("span"), { style: "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap" }));
  if (!n.isConnected) document.body.appendChild(n);
  n.style.font = font;
  n.style.letterSpacing = letterSpacing;
  n.textContent = text;
  return n.getBoundingClientRect().width;
}

/* ---------- the phone ---------- */

/**
 * A 3D phone, made only after every phone before it has loaded (the
 * engine's loader returns the CSS stand-in to a phone made while another
 * phone's module import is still in flight).
 */
export async function phone3d(ctx, opts) {
  await Promise.all(ctx.pending ?? []);
  const p = phone(ctx, opts);
  await Promise.all(ctx.pending ?? []);
  if (p.mode !== "3d") console.error(`section b: a phone fell back to CSS (${opts.model ?? "island"})`);
  return p;
}

/**
 * A page in a phone's screen: a full-display div (hidden until shown) with
 * an optional display image inside. Returns { el, img }.
 */
export function screenPage(ctx, p, src = null, { bg = null } = {}) {
  const el = ctx.el("div", {
    class: "abs",
    style: { left: "0px", top: "0px", width: `${DW}px`, height: `${DH}px`, overflow: "hidden", visibility: "hidden", ...(bg ? { background: bg } : {}) },
  }, p.screen);
  const img = src ? ctx.img(src, { class: "abs", style: { left: "0px", top: "0px", width: `${DW}px`, height: `${DH}px` } }, el) : null;
  return { el, img };
}

/** Shows an element only inside the given [t0, t1) ranges (visibility, per frame). */
export function showDuring(ctx, el, ranges) {
  let shown = null;
  ctx.onFrame((t) => {
    const on = ranges.some(([a, b]) => t >= a && t < b);
    if (on !== shown) {
      el.style.visibility = on ? "inherit" : "hidden";
      shown = on;
    }
  });
}

/** A plain div in display px inside a parent (for patches and overlays in a screen). */
export function box(ctx, parent, { x, y, w, h, style = {} }) {
  return ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, ...style } }, parent);
}

/** The phone's display corners [tl, tr, br, bl] in stage px, from its pose now. */
export function phoneQuad(p) {
  const P = p.pose;
  if (p.handle) {
    p.handle.set({ cx: P.cx, cy: P.cy, height: P.height, rotation: { x: P.rx, y: P.ry, z: P.rz }, fov: P.fov });
    return p.handle.screenQuad();
  }
  const s = (1156.6 / 1180) * P.height / DH;
  const w = DW * s;
  const h = DH * s;
  return [
    { x: P.cx - w / 2, y: P.cy - h / 2 }, { x: P.cx + w / 2, y: P.cy - h / 2 },
    { x: P.cx + w / 2, y: P.cy + h / 2 }, { x: P.cx - w / 2, y: P.cy + h / 2 },
  ];
}

/** The display quad for a given pose (not the phone's current one). */
export function quadAtPose(p, P) {
  const saved = { ...p.pose };
  Object.assign(p.pose, P);
  const q = phoneQuad(p);
  Object.assign(p.pose, saved);
  if (p.handle) phoneQuad(p);
  return q;
}

/** The square-to-quad map: (u, v) in [0, 1]^2 to a stage point. */
export function mapQuad(q, u, v) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = p1.x - p0.x + g * p1.x, b = p3.x - p0.x + h * p3.x, c = p0.x;
  const d = p1.y - p0.y + g * p1.y, e = p3.y - p0.y + h * p3.y, f = p0.y;
  const z = g * u + h * v + 1;
  return { x: (a * u + b * v + c) / z, y: (d * u + e * v + f) / z };
}

/** The stage quad of a display rect (display px) on phone p, now. */
export function displayQuad(p, { x, y, w, h }, q = phoneQuad(p)) {
  const m = (xd, yd) => mapQuad(q, xd / DW, yd / DH);
  return [m(x, y), m(x + w, y), m(x + w, y + h), m(x, y + h)];
}

/** A rect's quad, turned by rot (deg) around its centre and scaled by s. */
export function rectQuad({ x, y, w, h, rot = 0, s = 1 }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = (rot * Math.PI) / 180;
  const c = Math.cos(r) * s;
  const n = Math.sin(r) * s;
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([dx, dy]) => ({ x: cx + dx * c - dy * n, y: cy + dx * n + dy * c }));
}

export function lerpQuad(a, b, k) {
  return a.map((p, i) => ({ x: p.x + (b[i].x - p.x) * k, y: p.y + (b[i].y - p.y) * k }));
}

export function shiftQuad(q, dx, dy) {
  return q.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** Places an element (w x h box at the stage origin) onto a quad. */
export function placeQuad(el, w, h, q) {
  el.style.transform = quadMatrix(w, h, q);
}

/**
 * A body cut from a display or capture image: an element of w x h (the
 * crop at 1:1 of the source), placed each frame by quad. Never shown above
 * the source's own pixels: callers keep the placed size at or under w x h.
 */
export function cropBody(ctx, parent, { src, crop, iw, radius = 0, shadow = null, bg = null, z = 0, canvas = false }) {
  const el = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${crop.w}px`, height: `${crop.h}px`, transformOrigin: "0 0", overflow: "hidden", zIndex: String(z),
      borderRadius: `${radius}px`, ...(shadow ? { boxShadow: shadow } : {}), ...(bg ? { background: bg } : {}), visibility: "hidden",
    },
  }, parent);
  if (canvas) {
    /* the crop drawn once into a canvas at 1:1 (as section a draws the handed-over villa card), so both sides of a cut rasterise alike */
    const c = ctx.el("canvas", { class: "abs", style: { left: "0px", top: "0px", width: `${crop.w}px`, height: `${crop.h}px` } }, el);
    c.width = crop.w;
    c.height = crop.h;
    const img = new Image();
    const ready = new Promise((ok, bad) => {
      img.onload = ok;
      img.onerror = () => bad(new Error(`image failed: ${src}`));
    });
    img.src = src;
    ctx.pending = (ctx.pending ?? []).concat(ready.then(() => c.getContext("2d").drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)));
  } else {
    ctx.img(src, { style: { position: "absolute", left: `${-crop.x}px`, top: `${-crop.y}px`, width: `${iw}px`, height: "auto", maxWidth: "none" } }, el);
  }
  return el;
}

/**
 * Drives an element by a quad function of t while t is in [t0, t1); hidden
 * outside. quadAt(t) returns the quad; opacityAt(t) optional.
 */
export function quadDriver(ctx, el, w, h, { t0, t1, quadAt, opacityAt = null }) {
  let shown = null;
  ctx.onFrame((t) => {
    const on = t >= t0 && t < t1;
    if (on !== shown) {
      el.style.visibility = on ? "inherit" : "hidden";
      shown = on;
    }
    if (!on) return;
    placeQuad(el, w, h, quadAt(t));
    if (opacityAt) el.style.opacity = String(Math.max(0, Math.min(1, opacityAt(t))).toFixed(3));
  });
}

/* ---------- the pointer ---------- */

/**
 * A press of the glossy pointer at t (the engine's press(), with its ring
 * shown only during its own half second: a fromTo ring would otherwise sit
 * visible at its start state before the press when frames are sought out
 * of order). ringParent null: no ring (the ripple is under the glass).
 */
export function pressAt(ctx, pointer, t, { ringParent = null, x = 0, y = 0, sound = "tap", offset = 0, color = "rgb(0 105 254 / 0.8)" } = {}) {
  ctx.tl.fromTo(pointer, { scaleX: 1, scaleY: 1 }, { scaleX: 1.1, scaleY: 0.8, duration: 0.09, ease: "power2.out", immediateRender: false }, t - 0.06);
  ctx.tl.fromTo(pointer, { scaleX: 1.1, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.32, ease: "back.out(2.2)", immediateRender: false }, t + 0.05);
  if (ringParent) {
    const r = ctx.el("div", { class: "abs", style: { left: `${x - 50}px`, top: `${y - 50}px`, width: "100px", height: "100px", borderRadius: "50%", border: `3px solid ${color}`, visibility: "hidden", zIndex: "840" } }, ringParent);
    ctx.tl.fromTo(r, { scale: 0.25, opacity: 1 }, { scale: 1.25, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, t);
    showDuring(ctx, r, [[t, t + 0.55]]);
  }
  if (sound) ctx.sfx(sound, t, { offset });
}

/** A tap ripple under the glass at display px (x, y), shown only while it plays. */
export function ripple(ctx, parent, { x, y, t, size = 240, sound = null, offset = 0 }) {
  const ring = ctx.el("div", {
    class: "abs",
    style: {
      left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%", visibility: "hidden",
      background: "radial-gradient(closest-side, rgb(0 105 254 / 0.22), rgb(0 105 254 / 0))", border: "4px solid rgb(0 105 254 / 0.45)", zIndex: "50",
    },
  }, parent);
  ctx.tl.fromTo(ring, { scale: 0.2, opacity: 0.95 }, { scale: 1, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, t);
  showDuring(ctx, ring, [[t, t + 0.55]]);
  if (sound) ctx.sfx(sound, t, { offset });
  return ring;
}

/* ---------- type ---------- */

/**
 * A big word on a white glass pill (type as an object). Centered on its
 * (x, y) by xPercent/yPercent; animate x, y, rotation, scale, opacity.
 */
export function wordPill(ctx, parent, text, { size = 120, color = NAVY, h = null, padX = null, font = "Poppins", weight = 700, z = 0 } = {}) {
  const H = h ?? Math.round(size * 1.3);
  const node = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", height: `${H}px`, display: "flex", alignItems: "center", padding: `0 ${padX ?? Math.round(size * 0.46)}px`,
      borderRadius: "999px", background: "rgb(255 255 255 / 0.97)", border: "1px solid rgb(255 255 255 / 0.9)", boxShadow: SHADOW.m,
      font: `${weight} ${size}px/1 ${font}, Inter, sans-serif`, letterSpacing: "-0.035em", color, whiteSpace: "nowrap", zIndex: String(z),
    },
  }, parent);
  ctx.el("span", { text, style: { transform: `translateY(${Math.round(size * 0.04)}px)` } }, node);
  ctx.gsap.set(node, { xPercent: -50, yPercent: -50, opacity: 0 });
  return node;
}

/** Plain big type (no pill). Centered like wordPill. */
export function bigText(ctx, parent, parts, { size = 120, weight = 700, color = NAVY, z = 0, style = {} } = {}) {
  const node = ctx.el("div", {
    class: "abs",
    style: { left: "0px", top: "0px", font: `${weight} ${size}px/1.02 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color, whiteSpace: "nowrap", zIndex: String(z), ...style },
  }, parent);
  for (const [text, blue] of parts) ctx.el("span", { text, style: blue ? { color: ELECTRIC } : {} }, node);
  ctx.gsap.set(node, { xPercent: -50, yPercent: -50, opacity: 0 });
  return node;
}

/* ---------- the desktop camera ---------- */

/**
 * A camera over a "world" layer: animate cam.s (scale), cam.fx/fy (the
 * world point in focus) and cam.tx/ty (where that point sits on the stage).
 */
export function camera(ctx, world) {
  const cam = { s: 1, fx: ctx.W / 2, fy: ctx.H / 2, tx: ctx.W / 2, ty: ctx.H / 2 };
  world.style.transformOrigin = "0 0";
  ctx.onFrame(() => {
    const x = cam.tx - cam.s * cam.fx;
    const y = cam.ty - cam.s * cam.fy;
    world.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${cam.s.toFixed(5)})`;
  });
  /** A world point to stage px. */
  cam.toStage = (x, y) => ({ x: cam.tx + cam.s * (x - cam.fx), y: cam.ty + cam.s * (y - cam.fy) });
  return cam;
}

/* ---------- the day card and the month calendar (both films) ---------- */

/**
 * The day card: its pages turn (Thursday, Friday) to Saturday; on
 * "inspection" 11:00 AM stamps in with "Inspection set" and the Example
 * chip; then it shrinks into a blue calendar chip (for the dock). k scales
 * the whole card (1 = 470 x 440). Returns { wrap, tOut1, chipAt, chipSize }.
 */
export function dayCard(ctx, parent, T, { X, Y, k = 1, chipAt, tIn, tOut0, tOut1 }) {
  const { tl } = ctx;
  const W = 470 * k;
  const H = 440 * k;
  const r = (v) => Math.round(v * k);
  const wrap = ctx.el("div", { class: "abs", style: { left: `${X}px`, top: `${Y}px`, width: `${W}px`, height: `${H}px`, perspective: `${r(1600)}px`, visibility: "hidden" } }, parent);
  const card = ctx.el("div", {
    class: "abs",
    style: { inset: "0px", borderRadius: `${r(36)}px`, background: "#fff", boxShadow: SHADOW.l, overflow: "hidden", transformStyle: "preserve-3d", border: "1px solid rgb(255 255 255 / 0.9)" },
  }, wrap);
  const BAND = r(124);
  const pages = ["Thursday", "Friday", "Saturday"].map((d, i) => {
    const pg = ctx.el("div", { class: "abs", style: { inset: "0px", background: "#fff", transformOrigin: "50% 0%", backfaceVisibility: "hidden", zIndex: String(10 - i) } }, card);
    const band = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: "0px", height: `${BAND}px`, background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 55%, #0052d6)`, display: "flex", alignItems: "center", justifyContent: "center" } }, pg);
    ctx.el("div", { text: d, style: { font: `700 ${r(52)}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.03em", color: "#fff", transform: `translateY(${r(3)}px)` } }, band);
    for (let j = 0; j < 3; j += 1) box(ctx, pg, { x: r(48), y: BAND + r(80) + j * r(74), w: W - r(96), h: Math.max(1, r(2)), style: { background: "rgb(16 32 80 / 0.07)" } });
    return pg;
  });
  const sat = pages[2];
  const time = ctx.el("div", { class: "abs", text: "11:00 AM", style: { left: "0px", right: "0px", top: `${BAND + r(58)}px`, textAlign: "center", font: `700 ${r(92)}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.04em", color: NAVY, opacity: "0", background: "#fff" } }, sat);
  const row = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${BAND + r(196)}px`, display: "flex", alignItems: "center", justifyContent: "center", gap: `${r(12)}px`, opacity: "0", background: "#fff", padding: `${r(10)}px 0` } }, sat);
  const plate = ctx.el("span", { style: { width: `${r(42)}px`, height: `${r(42)}px`, borderRadius: `${r(13)}px`, display: "grid", placeItems: "center", background: "rgb(0 105 254 / 0.1)", color: ELECTRIC, flex: "none" } }, row);
  ctx.icon("check", { size: r(28), stroke: 3 }, plate);
  ctx.el("span", { text: "Inspection set", style: { font: `600 ${r(34)}px/1 Inter, sans-serif`, letterSpacing: "-0.015em", color: NAVY } }, row);
  exampleChip(ctx, row, { size: r(20) });

  tl.fromTo(wrap, { x: -W - 60, y: r(60), rotation: -14 }, { x: 0, y: 0, rotation: -2.5, duration: 0.42, ease: "land", immediateRender: false }, tIn);
  tl.fromTo(card, { rotationY: 36 }, { rotationY: 0, duration: 0.42, ease: "power3.out", immediateRender: false }, tIn);
  [T.r17 + 0.02, T.r17 + 0.12].forEach((tf, i) => {
    tl.fromTo(pages[i], { rotationX: 0 }, { rotationX: 96, duration: 0.14, ease: "power2.in", immediateRender: false }, tf);
  });
  tl.fromTo(time, { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power4.out", immediateRender: false }, T.inspection);
  tl.fromTo(row, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "power3.out", immediateRender: false }, T.inspection + 0.12);

  const chipSize = 100;
  tl.fromTo(wrap, { x: 0, y: 0, scale: 1, rotation: -2.5 }, { x: chipAt.x - (X + W / 2), y: chipAt.y - (Y + H / 2), scale: chipSize / H, rotation: 0, duration: tOut1 - tOut0, ease: "power3.inOut", immediateRender: false }, tOut0);
  tl.fromTo(card, { borderRadius: 36 * k }, { borderRadius: 140 * k, duration: tOut1 - tOut0, ease: "power2.in", immediateRender: false }, tOut0);
  const face = ctx.el("div", { class: "abs", style: { inset: "0px", zIndex: "20", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", opacity: "0" } }, card);
  const faceIcon = ctx.el("div", { style: { display: "grid", placeItems: "center", transform: `scale(${H / chipSize})` } }, face);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, faceIcon);
  tl.fromTo(face, { opacity: 0 }, { opacity: 1, duration: (tOut1 - tOut0) * 0.45, ease: "power1.inOut", immediateRender: false }, tOut0 + (tOut1 - tOut0) * 0.5);
  showDuring(ctx, wrap, [[tIn, tOut1 + 0.02]]);
  return { wrap, tOut1, chipAt, chipSize: (chipSize / H) * W };
}

/**
 * October 2026 (Oct 1 is a Thursday) in a white card of CAL.w x CAL.h.
 * o: { pad, head, wk, num, row0, rowH, dot }. select(t16, t19) lights 16,
 * then 19, then sweeps the range between them.
 */
export function monthCalendar(ctx, parent, CAL, o) {
  const { tl } = ctx;
  const PAD = o.pad;
  const colW = (CAL.w - PAD * 2) / 7;
  const cellC = (d) => {
    const idx = d - 1 + 4;
    const r = Math.floor(idx / 7);
    const c = idx % 7;
    return { x: PAD + colW * (c + 0.5), y: o.row0 + o.rowH * (r + 0.5) };
  };
  const head = ctx.el("div", { class: "abs", style: { left: `${PAD}px`, right: `${PAD}px`, top: `${o.headTop}px`, display: "flex", alignItems: "center", justifyContent: "space-between" } }, parent);
  ctx.el("div", { text: "October 2026", style: { font: `700 ${o.head}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.03em", color: NAVY } }, head);
  const nav = ctx.el("div", { style: { display: "flex", gap: `${Math.round(o.head * 0.27)}px` } }, head);
  for (const n of ["chevron-left", "chevron-right"]) iconPlate(ctx, nav, n, { size: Math.round(o.head * 1.08), round: true });
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d, i) => {
    ctx.el("div", { class: "abs", text: d, style: { left: `${PAD + colW * i}px`, width: `${colW}px`, top: `${o.wkTop}px`, textAlign: "center", font: `600 ${o.wk}px/1 Inter, sans-serif`, color: "#8a90a0" } }, parent);
  });
  const bh = o.dot - 4;
  const band1 = ctx.el("div", { class: "abs", style: { left: `${cellC(16).x}px`, top: `${cellC(16).y - bh / 2}px`, width: `${CAL.w - PAD - cellC(16).x + 6}px`, height: `${bh}px`, background: "rgb(0 105 254 / 0.12)", borderRadius: `0 ${bh / 2}px ${bh / 2}px 0`, transformOrigin: "0 50%", visibility: "hidden" } }, parent);
  const band2 = ctx.el("div", { class: "abs", style: { left: `${PAD - 6}px`, top: `${cellC(19).y - bh / 2}px`, width: `${cellC(19).x - PAD + 6}px`, height: `${bh}px`, background: "rgb(0 105 254 / 0.12)", borderRadius: `${bh / 2}px 0 0 ${bh / 2}px`, transformOrigin: "0 50%", visibility: "hidden" } }, parent);
  const dots = {};
  for (const d of [16, 19]) {
    const c = cellC(d);
    dots[d] = ctx.el("div", { class: "abs", style: { left: `${c.x - o.dot / 2}px`, top: `${c.y - o.dot / 2}px`, width: `${o.dot}px`, height: `${o.dot}px`, borderRadius: "50%", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, boxShadow: "0 10px 22px -10px rgb(0 80 220 / 0.6)", opacity: "0" } }, parent);
  }
  const nums = {};
  for (let d = 1; d <= 31; d += 1) {
    const c = cellC(d);
    nums[d] = ctx.el("div", { class: "abs", text: String(d), style: { left: `${c.x - 45}px`, width: "90px", top: `${c.y - o.num * 0.53}px`, textAlign: "center", font: `600 ${o.num}px/${Math.round(o.num * 1.06)}px Inter, sans-serif`, color: NAVY, fontVariantNumeric: "tabular-nums" } }, parent);
  }
  return {
    cellCentre: (d) => {
      const c = cellC(d);
      return { x: CAL.x + c.x, y: CAL.y + c.y };
    },
    select(t16, t19, until = 999) {
      for (const [d, t] of [[16, t16], [19, t19]]) {
        tl.fromTo(dots[d], { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, t);
        tl.fromTo(nums[d], { color: NAVY }, { color: "#ffffff", duration: 0.1, ease: "power1.out", immediateRender: false }, t + 0.02);
      }
      tl.fromTo(band1, { scaleX: 0 }, { scaleX: 1, duration: 0.14, ease: "power2.in", immediateRender: false }, t19 + 0.02);
      tl.fromTo(band2, { scaleX: 0 }, { scaleX: 1, duration: 0.14, ease: "power2.out", immediateRender: false }, t19 + 0.16);
      showDuring(ctx, band1, [[t19 + 0.02, until]]);
      showDuring(ctx, band2, [[t19 + 0.16, until]]);
    },
  };
}
