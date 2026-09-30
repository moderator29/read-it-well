/**
 * SECTION C's KIT: the pieces rows 28 to 42 share (both films).
 *
 * Times: every key time is a beat, a bar or a spoken word (K below).
 * Motion: `track(t, keys)` is a pure function of t (keyframes with eases), so
 * per-frame hooks stay deterministic; GSAP tweens are used where a plain
 * fromTo is enough. No element is driven by both.
 */
import { phone } from "../engine/phone.js";

/* ---------- the clock ---------- */

export function times(ctx) {
  const b = ctx.beat;
  const w = (i, word, n = 1) => ctx.word(i, word, n).start;
  const we = (i, word, n = 1) => ctx.word(i, word, n).end;
  return {
    r28: b(109), r29: b(112), r30: b(115), r31: b(121), r32: b(126), r33: b(129), r34: b(134),
    r35: b(138), r36: b(142), r37: b(148), r38: b(153), r39: b(156), r40: b(160), r41: b(166), r42: ctx.bar(44), end: b(176),
    /* 14: And when it's time to pay… Vallo never holds your money. */
    and14: w(14, "And"), when: w(14, "when"), its: w(14, "it's"), time: w(14, "time"), to: w(14, "to"), pay: w(14, "pay"),
    vallo14: w(14, "Vallo"), never: w(14, "never"), holds: w(14, "holds"), your14: w(14, "your"), money: w(14, "money"), moneyEnd: we(14, "money"),
    /* 15: Your payment goes straight to the owner, the host or the business, through a licensed payment processor. */
    payment: w(15, "payment"), goes: w(15, "goes"), straight: w(15, "straight"), owner: w(15, "owner"), host: w(15, "host"), business: w(15, "business"),
    through: w(15, "through"), licensed: w(15, "licensed"), processor: w(15, "processor"), processorEnd: we(15, "processor"),
    /* 16, 17 */
    got: w(16, "Got"), questionEnd: we(16, "question"),
    ask: w(17, "Ask"), assistant: w(17, "assistant"), prices: w(17, "prices"), areas: w(17, "areas"), renting: w(17, "renting"), works: w(17, "works"),
    any: w(17, "any"), timeOfDay: w(17, "time"), day: w(17, "day"),
    /* 18 */
    speaks: w(18, "speaks"), your18: w(18, "your"), language: w(18, "language"),
    english: w(18, "English"), hausa: w(18, "Hausa"), yoruba: w(18, "Yorùbá"), igbo: w(18, "Igbo"),
    /* 19, 20 */
    have: w(19, "Have"), property: w(19, "property"), hotel: w(19, "hotel"), restaurant: w(19, "restaurant"), restaurantEnd: we(19, "restaurant"),
    put: w(20, "Put"), vallo20: w(20, "Vallo"), welcome: w(20, "welcome"), guests: w(20, "guests"), country: w(20, "country"),
    /* 21, 22 */
    vallo21: w(21, "Vallo"), real: w(22, "Real"), estate: w(22, "estate"), done: w(22, "done"), right: w(22, "right"), rightEnd: we(22, "right"),
  };
}

/* ---------- motion ---------- */

const EASES = new Map();
/** A cached GSAP ease function by name ("land", "whip", "power2.out", "back.out(1.6)" ...). */
export function E(ctx, name) {
  if (!name) name = "power2.inOut";
  if (!EASES.has(name)) EASES.set(name, ctx.gsap.parseEase(name));
  return EASES.get(name);
}

/**
 * Keyframes as a pure function of t: keys = [[t0, v0], [t1, v1, ease], ...]
 * (the ease on a key shapes the segment that ends there). Before the first
 * key: v0; after the last: its value.
 */
export function track(ctx, t, keys) {
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

/** 0 → 1 between t0 and t1 with an ease. */
export function ramp(ctx, t, t0, t1, ease = "power2.inOut") {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return E(ctx, ease)((t - t0) / (t1 - t0));
}

/** A damped spring kick at t0: 0 at rest, first swing +1. */
export function spring(t, t0, { freq = 2.4, decay = 6 } = {}) {
  const s = t - t0;
  if (s <= 0) return 0;
  return Math.exp(-decay * s) * Math.sin(Math.PI * 2 * freq * s);
}

/** Runs fn(t) on every frame inside [t0, t1] (a little margin either side). */
export function during(ctx, t0, t1, fn) {
  ctx.onFrame((t) => {
    if (t < t0 - 0.02 || t > t1 + 0.02) return;
    fn(t);
  });
}

export const mix = (a, b, u) => a + (b - a) * u;
export const px = (v) => `${v.toFixed(2)}px`;

/* ---------- fonts: the four languages ---------- */

/**
 * The pill wall and the language names need ɗ (U+0257), ụ, ọ, Ụ (U+1Exx):
 * Inter's latin-ext and vietnamese files carry them; tokens.css only maps
 * U+0100-024F. These extra faces (same family) cover the rest.
 */
export async function languageFonts(ctx) {
  if (!document.getElementById("c-fonts")) {
    const css = document.createElement("style");
    css.id = "c-fonts";
    const inter = "/node_modules/@fontsource-variable/inter/files";
    const pop = "/node_modules/@fontsource/poppins/files";
    /* "C Poppins": the same Poppins files as tokens.css, one weight per face.
       (tokens.css's naira face spans weights 600-800, and Chromium then
       resolves Poppins 700 and 800 to it and falls back to Inter; reported.) */
    const faces = [600, 700, 800].map((w) => `
@font-face { font-family: "C Poppins"; font-weight: ${w}; font-display: block; src: url("${pop}/poppins-latin-${w}-normal.woff2") format("woff2"); }
@font-face { font-family: "C Poppins"; font-weight: ${w}; font-display: block; unicode-range: U+0100-02AF, U+1E00-1E9F, U+1EF2-1EFF; src: url("${pop}/poppins-latin-ext-${w}-normal.woff2") format("woff2"); }
@font-face { font-family: "C Poppins"; font-weight: ${w}; font-display: block; unicode-range: U+20A6; src: url("${inter}/inter-latin-ext-wght-normal.woff2") format("woff2"); }`).join("");
    css.textContent = `${faces}
@font-face { font-family: "Inter"; font-weight: 100 900; font-display: block; unicode-range: U+0250-02AF, U+1E00-1E9F, U+1EF2-1EFF; src: url("${inter}/inter-latin-ext-wght-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 100 900; font-display: block; unicode-range: U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF1; src: url("${inter}/inter-vietnamese-wght-normal.woff2") format("woff2"); }
.c-display { font-family: "C Poppins", "Inter", sans-serif; font-weight: 700; letter-spacing: -0.03em; line-height: 1.02; }
.c-display-800 { font-family: "C Poppins", "Inter", sans-serif; font-weight: 800; letter-spacing: -0.035em; line-height: 1; }
.c-600 { font-family: "C Poppins", "Inter", sans-serif; font-weight: 600; letter-spacing: -0.02em; }
`;
    document.head.appendChild(css);
  }
  const probe = "Duniya biyu ɗaya Ayé méjì Pèpéle Ụwa abụọ Yorùbá ₦ Vallo";
  const loads = ["600 40px Inter", "700 40px Inter", "600 80px 'C Poppins'", "700 80px 'C Poppins'", "800 80px 'C Poppins'"].map((f) => document.fonts.load(f, probe));
  ctx.pending = (ctx.pending ?? []).concat(loads);
  await Promise.all(loads);
  const bad = ["600", "700", "800"].filter((w) => !document.fonts.check(`${w} 40px 'C Poppins'`, "Vallo"));
  if (bad.length) console.error(`section c: C Poppins ${bad.join(", ")} did not load`);
}

/** The display family (real Poppins; see languageFonts). */
export const DISPLAY = `"C Poppins", "Inter", sans-serif`;

/* ---------- phones ---------- */

/**
 * The engine's loader caches a "tried" flag, not its promise: a phone made
 * before the first import resolves falls back to the flat CSS stand-in. So
 * each phone waits for every phone before it.
 */
export async function phone3d(ctx, opts, { poses = [], fallback = {} } = {}) {
  /* The phone's own hook reads p.pose when it renders; this hook must run
     before it, so it is registered first (hooks run in order). `poses` is a
     list of { t0, t1, fn(t) -> partial pose }: the first that covers t wins. */
  const holder = { p: null, poses, fallback };
  ctx.onFrame((t) => {
    if (!holder.p) return;
    const seg = holder.poses.find((s) => t >= s.t0 && t < s.t1);
    Object.assign(holder.p.pose, seg ? { ...holder.fallback, ...seg.fn(t) } : { ...holder.fallback, opacity: 0 });
  });
  await Promise.all(ctx.pending ?? []);
  const p = phone(ctx, opts);
  await Promise.all(ctx.pending ?? []);
  if (p.mode !== "3d") console.error(`section c: a phone fell back to CSS (${opts.model})`);
  holder.p = p;
  p.poses = poses;
  return p;
}

/**
 * Places an element's centre at (x, y) with rotation r (deg), scale s (or
 * sx/sy) and opacity o; hidden when o is 0. The element sits at left/top 0.
 *
 * Full opacity is written as 0.9999, never 1: Chromium keeps an element that
 * has once been translucent in its own paint layer after it returns to 1, so
 * a page that played the fade paints it a shade differently (±1) from a page
 * that starts after it. Never quite 1, every page paints it the same way.
 */
export function place(el, { x = 0, y = 0, s = 1, sx = null, sy = null, r = 0, o = 1 }) {
  const X = sx ?? s;
  const Y = sy ?? s;
  el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) rotate(${r.toFixed(3)}deg) scale(${X.toFixed(4)}, ${Y.toFixed(4)})`;
  el.style.opacity = opa(o);
  el.style.visibility = o > 0.001 ? "" : "hidden";
}

/** An opacity value for style.opacity: never exactly 1 (see place). */
export const opa = (o) => (o >= 0.9999 ? "0.9999" : Math.max(0, o).toFixed(4));

/**
 * A copy of an image resampled once, at build time, to `width` px (a blob
 * URL). Chromium decodes a downscaled image at a mip level chosen by its
 * on-screen scale and may reuse a larger decode left in its cache, so an
 * image that animates across a mip boundary (or appears at two sizes) paints
 * slightly differently depending on the frames before it. Sized so that the
 * whole on-screen range stays above half its width, the copy is always drawn
 * from its full-size decode.
 */
export async function scaledSrc(src, width) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = Math.round(width);
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
  return URL.createObjectURL(blob);
}

/** One use of a shared image file: its own decode, apart from other sizes of the same file. */
export const own = (src, tag) => `${src}?c=${tag}`;

/** One soft shadow language for every floating body (on light and on dark). */
export const SHADOW = {
  light: "0 26px 50px -24px rgb(10 30 80 / 0.34), 0 8px 18px -10px rgb(10 30 80 / 0.18)",
  dark: "0 28px 56px -22px rgb(0 0 20 / 0.72), 0 8px 20px -10px rgb(0 0 30 / 0.5)",
};

/** Display geometry at zero rotation, measured from the live phone (screenQuad). */
export const DISPLAY_FIT = {
  island: { w: 532.6 / 1180, h: 1156.6 / 1180 },
  android: { w: 534.8 / 1180, h: 1162.0 / 1180 },
};

/** Stage point of a display pixel for a phone at pose {cx, cy, height} (no rotation). */
export function dispToStage(pose, dx, dy, model = "island") {
  const f = DISPLAY_FIT[model];
  const s = (f.h * pose.height) / 2868;
  return { x: pose.cx + (dx - 660) * s, y: pose.cy + (dy - 1434) * s, s };
}

/** A full display image in a phone's screen, hidden until shown. */
export function screenImage(ctx, p, id, { platform = "ios", src = null } = {}) {
  return ctx.img(src ?? ctx.src.display(id, platform), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen);
}

/* ---------- grounds ---------- */

/** Mist: white at the top to #F3F7FF, with a faint electric glow. */
export function mist(ctx, parent) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.07) 0%, rgb(0 105 254 / 0) 70%),
        linear-gradient(180deg, #ffffff 0%, #f6f9ff 38%, #f3f7ff 70%, #ecf2ff 100%)`,
    },
  }, parent);
}

/** Night: the brand navy, lit softly behind the subject. */
export function night(ctx, parent, { x = 50, y = 40, glow = 0.32 } = {}) {
  return ctx.el("div", {
    class: "fill",
    style: {
      background: `radial-gradient(70% 42% at ${x}% ${y}%, rgb(0 105 254 / ${glow}) 0%, rgb(0 105 254 / 0) 70%),
        linear-gradient(180deg, #000d36 0%, #02063f 46%, #010118 100%)`,
    },
  }, parent);
}

/* ---------- small components ---------- */

/** A glass chip: an optional lucide icon and a label. theme "light" | "dark". */
export function chip(ctx, parent, { text, icon = null, size = 34, theme = "light", weight = 600, style = {} }) {
  const node = ctx.el("div", {
    class: "abs",
    style: {
      display: "flex", alignItems: "center", gap: `${Math.round(size * 0.36)}px`, whiteSpace: "nowrap",
      padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.78)}px ${Math.round(size * 0.42)}px ${Math.round(size * (icon ? 0.52 : 0.78))}px`,
      borderRadius: "999px", font: `${weight} ${size}px/1 Inter, sans-serif`, letterSpacing: "-0.01em",
      ...(theme === "light"
        ? { background: "rgb(255 255 255 / 0.94)", color: "#0b1230", border: "1.5px solid rgb(255 255 255 / 0.95)", boxShadow: "0 18px 40px -18px rgb(10 30 80 / 0.4), 0 4px 12px -6px rgb(10 30 80 / 0.2)" }
        : { background: "rgb(10 16 60 / 0.86)", color: "#fff", border: "1.5px solid rgb(120 170 255 / 0.32)", boxShadow: "0 18px 40px -16px rgb(0 0 20 / 0.7)" }),
      ...style,
    },
  }, parent);
  let iconEl = null;
  if (icon) {
    iconEl = ctx.el("span", { style: { display: "grid", placeItems: "center", width: `${Math.round(size * 1.3)}px`, height: `${Math.round(size * 1.3)}px`, borderRadius: "50%", background: theme === "light" ? "rgb(0 105 254 / 0.1)" : "rgb(143 211 255 / 0.14)", color: theme === "light" ? "var(--electric)" : "var(--sky)" } }, node);
    ctx.icon(icon, { size: Math.round(size * 0.78), stroke: 2.2 }, iconEl);
  }
  const label = ctx.el("span", { text }, node);
  return { node, icon: iconEl, label };
}

/**
 * The naira coin: electric-blue enamel with a raised rim and ₦, with real
 * thickness (a stack of discs) so it reads as an object when it spins.
 * Place it with set({ x, y, size, spin, tilt, sy, opacity, shadow }): spin
 * (about the vertical axis) and tilt (about the horizontal) in degrees, sy a
 * squash along the coin's own vertical.
 *
 * Drawn as a 2D projection of the 3D coin (each disc and face an ellipse with
 * its own matrix, stacked back to front), not with CSS 3D: Chromium
 * composites 3D layers and, when their scale changes between two frames,
 * sometimes draws the previous raster for a frame, so the rim's edge pixels
 * depended on timing. Flat, the coin paints with the rest of its layer.
 */
export function coin(ctx, parent, { size = 150, layers = 14, z = 0 } = {}) {
  const S = size;
  const wrap = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${S}px`, height: `${S}px`, zIndex: String(z), pointerEvents: "none" } }, parent);
  const shadow = ctx.el("div", { class: "abs", style: { left: `${-S * 0.1}px`, top: `${S * 0.92}px`, width: `${S * 1.2}px`, height: `${S * 0.24}px`, borderRadius: "50%", background: "radial-gradient(closest-side, rgb(0 20 80 / 0.28), rgb(0 20 80 / 0))" } }, wrap);
  const body = ctx.el("div", { class: "abs", style: { inset: "0px" } }, wrap);
  const th = S * 0.1;
  const discs = [];
  for (let k = 0; k < layers; k += 1) {
    const zz = -th / 2 + (th * (k + 0.5)) / layers;
    discs.push({ zz, el: ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "50%", background: k % 3 === 0 ? "#0a3fb0" : "#0b47c4" } }, body) });
  }
  const face = () => {
    const f = ctx.el("div", {
      class: "abs",
      style: {
        inset: "0px", borderRadius: "50%", zIndex: String(layers + 1),
        background: "radial-gradient(circle at 34% 28%, #9fd0ff 0%, #4d92ff 18%, #0b6bff 42%, #0050d6 70%, #003a9e 100%)",
        boxShadow: `inset 0 0 0 ${S * 0.045}px rgb(170 215 255 / 0.85), inset 0 0 0 ${S * 0.075}px #0a4fcf, inset 0 ${S * 0.02}px ${S * 0.1}px rgb(255 255 255 / 0.35), inset 0 ${-S * 0.03}px ${S * 0.08}px rgb(0 20 90 / 0.45)`,
        display: "grid", placeItems: "center", overflow: "hidden",
      },
    }, body);
    ctx.el("div", { class: "abs", style: { inset: `${S * 0.16}px`, borderRadius: "50%", border: `${Math.max(1.5, S * 0.012)}px solid rgb(190 225 255 / 0.55)` } }, f);
    ctx.el("span", { text: "₦", style: { position: "relative", font: `800 ${Math.round(S * 0.5)}px/1 Inter, sans-serif`, color: "#fff", textShadow: `0 ${S * 0.018}px 0 rgb(0 40 140 / 0.55), 0 0 ${S * 0.06}px rgb(160 210 255 / 0.5)`, transform: `translateY(${-S * 0.01}px)` } }, f);
    const gloss = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "50%", background: "linear-gradient(115deg, rgb(255 255 255 / 0) 34%, rgb(255 255 255 / 0.28) 47%, rgb(255 255 255 / 0) 58%)", backgroundSize: "260% 100%" } }, f);
    return { f, gloss };
  };
  const front = face();
  const back = face();
  const state = { x: 0, y: 0, size: S, spin: 0, tilt: 0, sy: 1, z: 0, opacity: 1, shadow: 0 };
  const mat = (a, b, c, d, e, f) => `matrix(${a.toFixed(5)}, ${b.toFixed(5)}, ${c.toFixed(5)}, ${d.toFixed(5)}, ${e.toFixed(3)}, ${f.toFixed(3)})`;
  let facing = null;
  function set(o) {
    Object.assign(state, o);
    const k = state.size / S;
    wrap.style.transform = `translate(${px(state.x - S / 2)}, ${px(state.y - S / 2)}) scale(${k.toFixed(4)})`;
    wrap.style.opacity = opa(state.opacity);
    wrap.style.visibility = state.opacity > 0.001 ? "" : "hidden";
    /* rotateX(tilt) rotateY(spin) scaleY(sy), projected: a face's circle maps
       through [[cos s, 0], [sin t sin s, cos t sy]]; a point at depth z moves
       by z (sin s, -sin t cos s) */
    const sp = (state.spin * Math.PI) / 180;
    const tl = (state.tilt * Math.PI) / 180;
    const cs = Math.cos(sp), ss = Math.sin(sp), ct = Math.cos(tl), st = Math.sin(tl);
    const A = cs, B = st * ss, D = ct * state.sy;
    const at = (zz) => [zz * ss, -zz * st * cs];
    const front1 = ct * cs >= 0;
    discs.forEach(({ zz, el }, i) => {
      const [ox, oy] = at(zz);
      el.style.transform = mat(A, B, 0, D, ox, oy);
    });
    if (front1 !== facing) {
      /* back to front: the far end of the stack first, the visible face last */
      facing = front1;
      discs.forEach(({ el }, i) => { el.style.zIndex = String(front1 ? i + 1 : layers - i); });
      front.f.style.visibility = front1 ? "" : "hidden";
      back.f.style.visibility = front1 ? "hidden" : "";
    }
    const [fx, fy] = at(th / 2);
    const [bx, by] = at(-th / 2);
    front.f.style.transform = mat(A, B, 0, D, fx, fy);
    /* the back face is turned half a revolution, so its ₦ reads the right way round */
    back.f.style.transform = mat(-A, -B, 0, D, bx, by);
    const a = (((state.spin % 360) + 360) % 360) / 360;
    const pos = `${(a * 200 - 50).toFixed(1)}% 0%`;
    front.gloss.style.backgroundPosition = pos;
    back.gloss.style.backgroundPosition = pos;
    shadow.style.opacity = opa(state.shadow);
  }
  set({});
  return { wrap, body, set, state, size: S };
}

/**
 * The product's verified mark (assets/icons/ui/verified-badge.svg), inline so
 * its colours can be set: `fill` for the disc, `check` for the tick. On the
 * blue answer cards: a white disc with an electric tick.
 */
let badgeSvg = null;
export async function verifiedMark(ctx, parent, size, { fill = "#ffffff", check = "#0069fe", style = {} } = {}) {
  if (!badgeSvg) {
    badgeSvg = await fetch("/repo/assets/icons/ui/verified-badge.svg").then((r) => {
      if (!r.ok) throw new Error("verified-badge.svg");
      return r.text();
    });
  }
  const span = ctx.el("span", { style: { display: "inline-grid", width: `${size}px`, height: `${size}px`, flex: "none", ...style } }, parent);
  span.innerHTML = badgeSvg
    .replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`)
    .replace(/fill="currentColor"/, `fill="${fill}"`).replace(/stroke="#fff"/, `stroke="${check}"`);
  return span;
}

/** A round tick badge (electric disc, white check). */
export function tick(ctx, parent, size) {
  const node = ctx.el("div", { style: { width: `${size}px`, height: `${size}px`, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(160deg, #3d8bff, #0069fe 55%, #0050d0)", boxShadow: `0 ${size * 0.12}px ${size * 0.3}px -${size * 0.1}px rgb(0 70 200 / 0.6), inset 0 1px 0 rgb(255 255 255 / 0.35)`, color: "#fff", flex: "none" } }, parent);
  ctx.icon("check", { size: Math.round(size * 0.58), stroke: 3.2 }, node);
  return node;
}

/**
 * A passcode dot as the product draws it (passcode-create): an empty ring,
 * and the filled state (a lit sphere inside the same ring) over it.
 * d = diameter in px. Returns { slot, ring, fill }.
 */
export function passDot(ctx, parent, d) {
  const slot = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${d}px`, height: `${d}px` } }, parent);
  const w = Math.max(1.5, d * 0.16);
  const ring = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "50%", border: `${w.toFixed(2)}px solid rgb(79 149 255)` } }, slot);
  const fill = ctx.el("div", {
    class: "abs",
    style: {
      inset: "0px", borderRadius: "50%", border: `${w.toFixed(2)}px solid rgb(80 151 255)`,
      background: "radial-gradient(circle at 40% 36%, rgb(122 178 255) 0%, rgb(70 146 255) 34%, rgb(0 105 254) 72%, rgb(0 94 238) 100%)",
      boxShadow: `0 0 ${(d * 0.32).toFixed(1)}px ${(d * 0.03).toFixed(1)}px rgb(0 105 254 / 0.55)`,
    },
  }, slot);
  return { slot, ring, fill };
}

/**
 * One of the spine's three question cards, built for a slot (w x h): the
 * question on the navy face (with an optional tick), the answer on the blue
 * back. Same materials as the engine's questionCard. Animate `root` with
 * place(); turn it with `inner.style.transform = rotateY(...)`.
 */
export function slotCard(ctx, parent, { w, h, q, a = null, fs, pad, tickSize }) {
  const root = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px`, perspective: `${w * 4}px` } }, parent);
  const inner = ctx.el("div", { class: "abs", style: { inset: "0px", transformStyle: "preserve-3d" } }, root);
  const face = (back) => ctx.el("div", {
    class: "abs",
    style: {
      inset: "0px", borderRadius: `${Math.round(Math.min(w, h) * 0.1)}px`, backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : "none",
      display: "flex", flexDirection: "column", justifyContent: "space-between", padding: `${pad}px`, color: "#fff",
      font: `600 ${fs}px/1.16 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.02em",
      background: back ? "linear-gradient(155deg, #2a86ff 0%, #0069fe 42%, #0050c8 100%)" : "linear-gradient(160deg, #121c5e 0%, #0a1248 100%)",
      border: back ? "1.5px solid rgb(143 211 255 / 0.6)" : "1.5px solid rgb(120 170 255 / 0.28)",
      boxShadow: SHADOW.light,
    },
  }, inner);
  const front = face(false);
  const topRow = ctx.el("div", { style: { height: `${tickSize}px`, display: "flex" } }, front);
  const tickEl = tick(ctx, topRow, tickSize);
  ctx.el("div", { text: q }, front);
  let back = null;
  if (a) {
    back = face(true);
    ctx.el("div", { style: { height: `${tickSize}px` } }, back);
    ctx.el("div", { text: a }, back);
  }
  return { root, inner, front, back, tick: tickEl };
}

/** Measures a text's width in px for a CSS font (after the font is loaded). */
export function measure(text, font, letterSpacing = "-0.03em") {
  /* A hidden span: a detached canvas does not see the page's web fonts here. */
  const n = measure.n ?? (measure.n = Object.assign(document.createElement("span"), { style: "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap" }));
  if (!n.isConnected) document.body.appendChild(n);
  n.style.font = font;
  n.style.letterSpacing = letterSpacing;
  n.textContent = text;
  return n.getBoundingClientRect().width;
}
