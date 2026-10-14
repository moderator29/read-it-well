/**
 * THE OCTOBER FILMS' SHOT KIT (Video One "How Vallo works", Video Two "The
 * Vallo vision"), on the old film's engine: one 3D phone that carries the
 * whole film (mobile and desktop), a browser window for the desktop film,
 * the glossy pointer, real components lifted off the live screens, camera
 * pushes, kinetic words, number rolls, pop-ups and the store ending.
 *
 * Every value is a pure function of t (BUILDING.md, "Determinism"): poses,
 * screens, pointer and bodies are drawn by per-frame hooks from keyframe
 * lists, never by history.
 */
import { orb, press, tap, words, ringBurst, sparkles, odometer, popup, popIn, browserWindow, bob } from "../engine/components.js";
import { phone } from "../engine/phone.js";

export const DW = 1320;
export const DH = 2868;
const BAR_PX = 186;
/* Display geometry at zero rotation, measured from the live phone (scenes/c-kit.js). */
const FIT = { island: { w: 532.6 / 1180, h: 1156.6 / 1180 }, android: { w: 534.8 / 1180, h: 1162.0 / 1180 } };

export const mix = (a, b, u) => a + (b - a) * u;
export const opa = (o) => (o >= 0.9999 ? "0.9999" : Math.max(0, o).toFixed(4));

/* ------------------------------------------------------------------ clock */

/** Anchors from the film's voice plan: s(i) start, e(i) end, w(i, word, nth) start. */
export function anchors(ctx) {
  return {
    s: (i) => ctx.sentence(i).start,
    e: (i) => ctx.sentence(i).end,
    w: (i, word, nth = 1) => ctx.word(i, word, nth).start,
    we: (i, word, nth = 1) => ctx.word(i, word, nth).end,
  };
}

/** u in [0, 1] from t0 to t1 through a named ease. */
export function ramp(ctx, t, t0, t1, ease = "power2.inOut") {
  if (t <= t0) return 0;
  if (t >= t1) return 1;
  return ctx.ease(ease)((t - t0) / (t1 - t0));
}

/**
 * Keyframes: [[t, {props}, ease?], ...] sorted by t. Before the first key its
 * values hold; between two keys the props glide with the later key's ease.
 */
export function keyed(ctx, list) {
  /* each key carries every prop of the keys before it, so no value depends on the frames drawn before */
  const keys = [];
  list.forEach(([t, props, ease], k) => keys.push([t, k ? { ...keys[k - 1][1], ...props } : { ...props }, ease]));
  return (t) => {
    if (t <= keys[0][0]) return { ...keys[0][1] };
    for (let k = 1; k < keys.length; k += 1) {
      const [t1, b, ease = "glide"] = keys[k];
      if (t < t1) {
        const [t0, a] = keys[k - 1];
        const u = ramp(ctx, t, t0, t1, ease);
        const out = { ...a };
        for (const key of Object.keys(b)) out[key] = mix(a[key] ?? b[key], b[key], u);
        return out;
      }
    }
    return { ...keys[keys.length - 1][1] };
  };
}

/** Runs fn(t) on every frame from t0 to t1 only. */
export function during(ctx, t0, t1, fn) {
  ctx.onFrame((t) => { if (t >= t0 && t < t1) fn(t); });
}

/** Places an element's centre at (x, y): rotation r, scale s, opacity o. */
export function place(el, { x = 0, y = 0, s = 1, r = 0, o = 1 }) {
  el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  el.style.opacity = opa(o);
  el.style.visibility = o > 0.001 ? "inherit" : "hidden";
}

/* ---------------------------------------------------------------- grounds */

const TONES = {
  navy: ["rgb(0 105 254 / 0.50)", "rgb(0 63 152 / 0.22)", "#02063f", "#010118"],
  electric: ["rgb(0 105 254 / 0.75)", "rgb(47 124 255 / 0.30)", "#031062", "#010118"],
  dusk: ["rgb(255 107 26 / 0.45)", "rgb(255 178 122 / 0.16)", "#0b0a2e", "#130b22"],
  emerald: ["rgb(16 185 129 / 0.38)", "rgb(0 105 254 / 0.18)", "#02163a", "#010118"],
  violet: ["rgb(124 92 255 / 0.45)", "rgb(0 105 254 / 0.20)", "#0a0640", "#05021c"],
  gold: ["rgb(255 196 61 / 0.36)", "rgb(255 107 26 / 0.14)", "#0d0a2c", "#07041a"],
};

/**
 * A ground: a full-stage night gradient in a tone, its glow drifting slowly,
 * with a few sparkles. Returns the scene root (z 1).
 */
export function ground(ctx, t0, t1, { tone = "navy", x = 50, y = 18, seed = 3, sparkle = 5, z = 1 } = {}) {
  const root = ctx.scene(`ground-${t0.toFixed(2)}`, t0, t1, { z });
  const [g1, g2, top, bottom] = TONES[tone];
  const base = ctx.el("div", { class: "fill", style: { background: `linear-gradient(180deg, ${top} 0%, ${bottom} 72%)` } }, root);
  const glowEl = ctx.el("div", { class: "abs", style: { left: "-25%", top: "-25%", width: "150%", height: "150%", background: `radial-gradient(42% 30% at 50% 50%, ${g1} 0%, ${g2} 45%, transparent 75%)` } }, root);
  const low = ctx.el("div", { class: "fill", style: { background: "radial-gradient(120% 70% at 50% 115%, rgb(2 6 63 / 0.85) 0%, transparent 62%)" } }, root);
  const rand = ctx.random(seed);
  const ph = rand() * 6;
  during(ctx, t0, t1, (t) => {
    const dx = (x - 50) / 100 * ctx.W + Math.sin((t + ph) * 0.23) * ctx.W * 0.05;
    const dy = (y - 50) / 100 * ctx.H + Math.cos((t + ph) * 0.19) * ctx.H * 0.03;
    glowEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  });
  /* drifting soft lights (radial gradients, no blur filter) */
  const lights = [];
  for (let i = 0; i < 7; i += 1) {
    const size = (ctx.isMobile ? 160 : 140) + rand() * 260;
    const hue = rand() < 0.6 ? "143 211 255" : rand() < 0.5 ? "0 105 254" : "255 178 122";
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: `radial-gradient(closest-side, rgb(${hue} / ${(0.10 + rand() * 0.12).toFixed(3)}), transparent)` } }, root);
    lights.push({ el, x: rand() * ctx.W, y: rand() * ctx.H, vx: (rand() - 0.5) * 26, vy: -8 - rand() * 18, size, ph: rand() * 6 });
  }
  during(ctx, t0, t1, (t) => {
    for (const l of lights) {
      const x = ((l.x + l.vx * t) % (ctx.W + l.size) + ctx.W + l.size) % (ctx.W + l.size) - l.size / 2;
      const y = ((l.y + l.vy * t) % (ctx.H + l.size) + ctx.H + l.size) % (ctx.H + l.size) - l.size / 2;
      l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.9 + 0.1 * Math.sin(t * 0.7 + l.ph)).toFixed(4)})`;
    }
  });
  if (sparkle) sparkles(ctx, root, { area: { x: 30, y: ctx.isMobile ? 380 : 110, w: ctx.W - 60, h: ctx.isMobile ? 1100 : 780 }, count: sparkle, seed, t0, t1, min: 14, max: 30 });
  void base; void low;
  return root;
}

/** A quick bloom of light across a cut, with a whoosh. */
export function flash(ctx, t, { color = "rgb(143 211 255 / 0.55)", sound = "whoosh_short", offset = -2 } = {}) {
  const root = ctx.scene(`flash-${t.toFixed(2)}`, t - 0.2, t + 0.35, { z: 870 });
  const el = ctx.el("div", { class: "fill", style: { background: `radial-gradient(60% 50% at 50% 50%, ${color} 0%, transparent 70%)`, opacity: 0 } }, root);
  during(ctx, t - 0.2, t + 0.35, (u) => {
    const a = ramp(ctx, u, t - 0.2, t, "power2.in") * (1 - ramp(ctx, u, t, t + 0.35, "power2.out"));
    el.style.opacity = opa(a * 0.9);
  });
  if (sound) ctx.sfx(sound, t - 0.12, { offset });
}

/* ------------------------------------------------------------- the phone */

/**
 * The film's phone. One 3D phone (one WebGL context) for the whole film:
 *   H.path(keys)                pose keyframes [[t, {cx, cy, height, rx, ry, rz, opacity}, ease]]
 *   H.show(id, t0, t1, opts)    a screen in the display (enter: slide | rise | fade | cut | left)
 *   H.tap(t, dx, dy)            the pointer comes to display px (dx, dy) and presses
 *   H.at(t)                     the pose at t;  H.toStage(t, dx, dy) a display point on the stage
 *   H.aim(dx, dy, height, X, Y) the pose that puts display point (dx, dy) at stage (X, Y)
 *   H.ring(t0, t1, box)         an electric outline on the screen (display px box)
 */
export async function hero(ctx, { model = "island", env = "dark", edge = "#040a2e", platform = "ios" } = {}) {
  const root = ctx.scene("hero-phone", 0, ctx.duration + 1, { z: 400 });
  const keys = [];
  let poseAt = () => ({ cx: ctx.W / 2, cy: ctx.H / 2, height: 1400, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0 });
  const holder = { p: null };
  const swings = [];
  const swung = (t, q) => {
    for (let i = 0; i < swings.length; i += 1) {
      const ts = swings[i];
      if (t > ts - 0.45 && t < ts + 0.55) {
        const u = (t - ts + 0.45) / 1.0;
        const k = Math.sin(Math.PI * u) ** 2;
        const dir = i % 2 ? 1 : -1;
        q.ry = (q.ry ?? 0) + dir * 22 * k;
        q.rz = (q.rz ?? 0) - dir * 2.5 * k;
        q.height = q.height * (1 - 0.06 * k);
      }
    }
    return q;
  };
  ctx.onFrame((t) => {
    if (!holder.p) return;
    Object.assign(holder.p.pose, { fov: 24, rx: 0, ry: 0, rz: 0 }, swung(t, { ...poseAt(t) }));
  });
  await Promise.all(ctx.pending ?? []);
  const p = phone(ctx, { model, parent: root, env, edge });
  await Promise.all(ctx.pending ?? []);
  if (p.mode !== "3d") console.error("films: the phone fell back to CSS");
  holder.p = p;

  const fit = FIT[model];
  const H = {
    p,
    root,
    model,
    platform,
    path(list) {
      keys.splice(0, keys.length, ...list.sort((a, b) => a[0] - b[0]));
      poseAt = keyed(ctx, keys);
      return H;
    },
    at: (t) => swung(t, { rx: 0, ry: 0, rz: 0, opacity: 1, ...poseAt(t) }),
    /** A 3D swing at each time (a chapter change): the phone turns away and back while its screen changes. */
    swing(...times) { swings.push(...times); return H; },
    scaleAt: (t) => (fit.h * H.at(t).height) / DH,
    toStage(t, dx, dy) {
      const q = H.at(t);
      const s = (fit.h * q.height) / DH;
      return { x: q.cx + (dx - DW / 2) * s, y: q.cy + (dy - DH / 2) * s, s };
    },
    aim(dx, dy, height, X, Y) {
      const s = (fit.h * height) / DH;
      return { cx: X - (dx - DW / 2) * s, cy: Y - (dy - DH / 2) * s, height };
    },
    show(id, t0, t1, opts = {}) { return screenShow(ctx, H, id, t0, t1, opts); },
    tap(t, dx, dy, opts = {}) { taps.push({ t, dx, dy, ...opts }); tap(ctx, p.screen, { x: dx, y: dy, t, size: 260, sound: opts.sound ?? "tap", offset: opts.offset ?? 0 }); return H; },
    ring(t0, t1, { x, y, w, h, r = 48 }) {
      const el = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: `${r}px`, border: "6px solid #2f7cff", boxShadow: "0 0 46px 4px rgb(0 105 254 / 0.5), inset 0 0 34px rgb(0 105 254 / 0.22)", zIndex: 60, visibility: "hidden" } }, p.screen);
      ctx.onFrame((t) => {
        const o = ramp(ctx, t, t0, t0 + 0.25) * (1 - ramp(ctx, t, t1 - 0.25, t1));
        el.style.visibility = o > 0.001 ? "inherit" : "hidden";
        el.style.opacity = opa(o);
      });
      ctx.sfx("pop_low", t0, { offset: -3 });
      return el;
    },
  };

  /* the pointer: comes in before each tap, presses, rests, leaves (or glides to the next) */
  const taps = [];
  const ptrScene = ctx.scene("hero-pointer", 0, ctx.duration + 1, { z: 860 });
  const dot = orb(ctx, ptrScene, { size: ctx.isMobile ? 54 : 44 });
  dot.style.visibility = "hidden";
  ctx.onFrame((t) => {
    if (!taps.length) return;
    let k = -1;
    for (let i = 0; i < taps.length; i += 1) if (taps[i].t - 0.75 <= t) k = i;
    if (k < 0) { dot.style.visibility = "hidden"; return; }
    const cur = taps[k];
    const next = taps[k + 1];
    const a = H.toStage(t, cur.dx, cur.dy);
    let x = a.x, y = a.y, o = 1;
    if (t < cur.t) {
      const prev = taps[k - 1];
      const chained = prev && cur.t - prev.t < 1.6;
      const u = ramp(ctx, t, cur.t - 0.7, cur.t - 0.06, "glide");
      if (chained) {
        const b = H.toStage(t, prev.dx, prev.dy);
        x = mix(b.x, a.x, u); y = mix(b.y, a.y, u);
      } else {
        x = a.x + (1 - u) * (ctx.isMobile ? 260 : 320); y = a.y + (1 - u) * 200;
        o = ramp(ctx, t, cur.t - 0.75, cur.t - 0.45);
      }
    } else if (!(next && next.t - cur.t < 1.6)) {
      const u = ramp(ctx, t, cur.t + 0.45, cur.t + 0.95, "power2.in");
      x = a.x + u * 200; y = a.y + u * 120; o = 1 - u;
    }
    dot.style.visibility = o > 0.001 ? "inherit" : "hidden";
    dot.style.opacity = opa(o);
    dot.style.left = `${(x - (ctx.isMobile ? 27 : 22)).toFixed(2)}px`;
    dot.style.top = `${(y - (ctx.isMobile ? 27 : 22)).toFixed(2)}px`;
  });
  H.press = (t) => press(ctx, dot, t, { sound: null, ring: false });
  const origTap = H.tap;
  H.tap = (t, dx, dy, opts) => { origTap(t, dx, dy, opts); H.press(t); return H; };
  return H;
}

/**
 * A screen shown in the phone's display from t0 to t1. `id` is a display
 * (docs/marketing/screens/<id>-<platform>.png). With `full`, a tall capture
 * (docs/marketing/source/<full>.webp) scrolls under the status bar of `id`
 * by `scroll`: [[t, y], ...] in capture px.
 */
function screenShow(ctx, H, id, t0, t1, { enter = "slide", dur = 0.5, full = null, scroll = null, z = 1, patch = null } = {}) {
  /* later screens lie on top, and a screen stays under the next one until that one has landed */
  const wrap = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${DW}px`, height: `${DH}px`, overflow: "hidden", zIndex: String(z + Math.round(t0 * 20)), visibility: "hidden" } }, H.p.screen);
  const display = ctx.src.display(id, H.platform);
  let mover = null;
  if (full) {
    const strip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${DW}px`, height: `${BAR_PX}px`, overflow: "hidden", zIndex: 2 } }, wrap);
    ctx.img(display, { class: "abs", style: { left: "0px", top: "0px", width: `${DW}px`, height: `${DH}px` } }, strip);
    mover = ctx.img(ctx.src.capture(full), { class: "abs", style: { left: "0px", top: `${BAR_PX}px`, width: `${DW}px`, height: "auto", maxWidth: "none" } }, wrap);
  } else {
    ctx.img(display, { class: "abs", style: { left: "0px", top: "0px", width: `${DW}px`, height: `${DH}px` } }, wrap);
  }
  /* A patch redraws a line of the screen's own copy (never to add a claim:
     only to keep the payments partner unnamed, as the founder rules). */
  for (const pt of patch ?? []) {
    const el = ctx.el("div", { class: "abs", style: { left: `${pt.x}px`, top: `${pt.y}px`, width: `${pt.w}px`, height: `${pt.h}px`, background: pt.bg, zIndex: 3, font: `${pt.weight ?? 400} ${pt.size}px/${pt.lh ?? 1.42} Inter, sans-serif`, color: pt.color, letterSpacing: "-0.005em", paddingTop: `${pt.pad ?? 0}px` } }, wrap);
    el.innerHTML = pt.lines.map((l) => `<div style="white-space:nowrap">${l}</div>`).join("");
  }
  const scrollAt = scroll ? keyed(ctx, scroll.map(([t, y, e]) => [t, { y }, e ?? "power2.inOut"])) : null;
  ctx.onFrame((t) => {
    const on = t >= t0 - 0.001 && t < t1 + 0.7;
    wrap.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const u = enter === "cut" ? 1 : ramp(ctx, t, t0, t0 + dur, "power3.out");
    let tf = "";
    if (enter === "slide") tf = `translateX(${((1 - u) * DW).toFixed(1)}px)`;
    else if (enter === "left") tf = `translateX(${((u - 1) * DW).toFixed(1)}px)`;
    else if (enter === "rise") tf = `translateY(${((1 - u) * DH * 0.6).toFixed(1)}px)`;
    wrap.style.transform = tf;
    wrap.style.opacity = enter === "fade" || enter === "rise" ? opa(u) : "0.9999";
    if (mover && scrollAt) mover.style.transform = `translateY(${(-scrollAt(t).y).toFixed(1)}px)`;
  });
  if (enter === "slide" || enter === "left") ctx.sfx("swipe", t0, { offset: -4 });
  return wrap;
}

/* ------------------------------------------------------------- the window */

/**
 * The desktop film's browser window (one for the film), at content scale s
 * (1440 x 900 content px). W.path([[t, {x, y, s, opacity}]]), W.show(id, t0,
 * t1, opts) with d-* captures, W.click(t, cx, cy) with the pointer.
 */
export function windowRig(ctx, { url = "vallospaces.com" } = {}) {
  const root = ctx.scene("hero-window", 0, ctx.duration + 1, { z: 380 });
  const win = browserWindow(ctx, { parent: root, width: 1440, url, theme: "dark" });
  win.root.style.visibility = "hidden";
  let poseAt = () => ({ x: 0, y: 0, s: 1, opacity: 0 });
  ctx.onFrame((t) => {
    const q = { opacity: 1, ...poseAt(t) };
    win.root.style.transformOrigin = "0 0";
    win.root.style.transform = `translate(${q.x.toFixed(2)}px, ${q.y.toFixed(2)}px) scale(${q.s.toFixed(5)})`;
    win.root.style.opacity = opa(q.opacity);
    win.root.style.visibility = q.opacity > 0.001 ? "inherit" : "hidden";
  });
  const clicks = [];
  const dot = orb(ctx, ctx.scene("window-pointer", 0, ctx.duration + 1, { z: 861 }), { size: 40 });
  dot.style.visibility = "hidden";
  const W = {
    win,
    path(list) { poseAt = keyed(ctx, list.sort((a, b) => a[0] - b[0])); return W; },
    at: (t) => ({ opacity: 1, ...poseAt(t) }),
    toStage(t, cx, cy) { const q = W.at(t); return { x: q.x + cx * q.s, y: q.y + (56 + cy) * q.s }; },
    show(id, t0, t1, { enter = "slide", dur = 0.5, scroll = null, full = false } = {}) {
      const wrap = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", overflow: "hidden", visibility: "hidden", zIndex: String(Math.round(t0 * 20)) } }, win.content);
      const img = ctx.img(ctx.src.capture(id), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: full ? "auto" : "900px", maxWidth: "none" } }, wrap);
      const scrollAt = scroll ? keyed(ctx, scroll.map(([t, y, e]) => [t, { y }, e ?? "power2.inOut"])) : null;
      ctx.onFrame((t) => {
        const on = t >= t0 - 0.001 && t < t1 + 0.7;
        wrap.style.visibility = on ? "inherit" : "hidden";
        if (!on) return;
        const u = enter === "cut" ? 1 : ramp(ctx, t, t0, t0 + dur, "power3.out");
        wrap.style.transform = enter === "slide" ? `translateX(${((1 - u) * 1440).toFixed(1)}px)` : enter === "rise" ? `translateY(${((1 - u) * 500).toFixed(1)}px)` : "";
        wrap.style.opacity = enter === "fade" || enter === "rise" ? opa(u) : "0.9999";
        if (scrollAt) img.style.transform = `translateY(${(-scrollAt(t).y).toFixed(1)}px)`;
      });
      if (enter === "slide") ctx.sfx("swipe", t0, { offset: -4 });
      return wrap;
    },
    url(t0, text) { ctx.text(win.url, (t) => (t >= t0 ? text : win.url.textContent)); return W; },
    click(t, cx, cy) {
      clicks.push({ t, cx, cy });
      const ring = ctx.el("div", { class: "abs", style: { left: `${cx - 60}px`, top: `${cy - 60}px`, width: "120px", height: "120px", borderRadius: "50%", border: "4px solid rgb(0 105 254 / 0.8)", opacity: 0, zIndex: 40 } }, win.content);
      ctx.tl.fromTo(ring, { scale: 0.2, opacity: 1 }, { scale: 1.2, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, t);
      ctx.onFrame((u) => { ring.style.visibility = u >= t && u < t + 0.55 ? "inherit" : "hidden"; });
      press(ctx, dot, t, { sound: "tap", ring: false });
      return W;
    },
  };
  ctx.onFrame((t) => {
    if (!clicks.length) return;
    let k = -1;
    for (let i = 0; i < clicks.length; i += 1) if (clicks[i].t - 0.8 <= t) k = i;
    if (k < 0) { dot.style.visibility = "hidden"; return; }
    const cur = clicks[k];
    const next = clicks[k + 1];
    const a = W.toStage(t, cur.cx, cur.cy);
    let x = a.x, y = a.y, o = 1;
    if (t < cur.t) {
      const prev = clicks[k - 1];
      const u = ramp(ctx, t, cur.t - 0.75, cur.t - 0.06, "glide");
      if (prev && cur.t - prev.t < 1.8) { const b = W.toStage(t, prev.cx, prev.cy); x = mix(b.x, a.x, u); y = mix(b.y, a.y, u); }
      else { x = a.x + (1 - u) * 300; y = a.y + (1 - u) * 180; o = ramp(ctx, t, cur.t - 0.8, cur.t - 0.5); }
    } else if (!(next && next.t - cur.t < 1.8)) {
      const u = ramp(ctx, t, cur.t + 0.5, cur.t + 1.0, "power2.in");
      x = a.x + u * 220; y = a.y + u * 120; o = 1 - u;
    }
    dot.style.visibility = o > 0.001 ? "inherit" : "hidden";
    dot.style.opacity = opa(o);
    dot.style.left = `${(x - 20).toFixed(2)}px`;
    dot.style.top = `${(y - 20).toFixed(2)}px`;
  });
  return W;
}

/* ----------------------------------------------------------------- bodies */

/**
 * A real component lifted off the phone's screen: the crop (display px of
 * `id`'s display image) rises from where it sits on the screen at t0, flies to
 * `to` {x, y, s (stage px per display px), r}, floats, and at t1 leaves
 * (exit: "back" returns to the screen, "fade", "up", "left", "right").
 */
export function lift(ctx, H, { id, crop, t0, t1, to, exit = "fade", fly = 0.7, z = 720, radius = 40, seed = 1, sound = "pop", src = null, scrolled = 0 }) {
  const root = ctx.scene(`lift-${id}-${t0.toFixed(2)}`, t0 - 0.01, t1 + 0.8, { z });
  const S = to.s;
  const w = crop.w * S, h = crop.h * S;
  const card = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px`, borderRadius: `${radius * S * 1.4}px`, overflow: "hidden", boxShadow: "0 40px 80px -26px rgb(0 0 20 / 0.8), 0 12px 28px -12px rgb(0 0 40 / 0.55), 0 0 0 1.5px rgb(143 211 255 / 0.22)", background: "#0b0f2a" } }, root);
  /* src: a tall capture (crop in its own px, 1320 wide); scrolled: how far the screen is scrolled, so the part rises from where it is seen */
  if (src) ctx.img(src, { style: { position: "absolute", left: `${-crop.x * S}px`, top: `${-crop.y * S}px`, width: `${DW * S}px`, height: "auto", maxWidth: "none" } }, card);
  else ctx.img(ctx.src.display(id, H.platform), { style: { position: "absolute", left: `${-crop.x * S}px`, top: `${-crop.y * S}px`, width: `${DW * S}px`, height: `${DH * S}px`, maxWidth: "none" } }, card);
  const from = H.toStage(t0, crop.x + crop.w / 2, crop.y + crop.h / 2 - scrolled + (src ? BAR_PX : 0));
  const phase = ctx.random(seed)() * Math.PI * 2;
  const back = exit === "back" ? H.toStage(t1, crop.x + crop.w / 2, crop.y + crop.h / 2 - scrolled + (src ? BAR_PX : 0)) : null;
  card.style.visibility = "hidden";
  ctx.onFrame((t) => {
    if (t < t0 || t >= t1 + 0.8) { card.style.visibility = "hidden"; return; }
    const u = ramp(ctx, t, t0, t0 + fly, "glide");
    const v = ramp(ctx, t, t1, t1 + 0.6, exit === "back" ? "glide" : "power2.in");
    const float = Math.sin((t - t0) * 2.1 + phase) * 7 * u;
    let x = mix(from.x, to.x, u), y = mix(from.y, to.y, u) + float, s = mix(from.s / S, 1, u) * (1 + 0.035 * Math.sin(Math.PI * u));
    let r = mix(0, to.r ?? 0, u) + Math.sin((t - t0) * 1.4 + phase) * 0.8 * u, o = 1;
    if (v > 0) {
      if (back) { x = mix(x, back.x, v); y = mix(y, back.y, v); s = mix(s, back.s / S, v); r = mix(r, 0, v); o = v > 0.96 ? 0 : 1; }
      else if (exit === "up") { y -= v * 420; o = 1 - v; }
      else if (exit === "left") { x -= v * 700; o = 1 - v; }
      else if (exit === "right") { x += v * 700; o = 1 - v; }
      else { s *= 1 - 0.12 * v; o = 1 - v; }
    }
    place(card, { x, y, s, r, o });
  });
  if (sound) ctx.sfx(sound, t0 + 0.05, { offset: -2 });
  return card;
}

/* ------------------------------------------------------------------ words */

/**
 * Kinetic headline: lines of [text, key] parts; words rise out of their masks
 * one after another from t0, key words in sky; at t1 they rise away.
 * box: { x, y } is the top-left (align left) or top-centre (align center).
 */
export function headline(ctx, parent, { lines, x, y, size = 110, t0, t1, align = "left", weight = 700, color = "#ffffff", key = "#8FD3FF", stagger = 0.055, lineGap = 1.04, sound = null }) {
  const box = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: align === "center" ? "0px" : "auto" } }, parent);
  const all = [];
  lines.forEach((parts, li) => {
    const row = ctx.el("div", { class: "abs display", style: { left: align === "center" ? "50%" : "0px", top: `${li * size * lineGap}px`, whiteSpace: "nowrap", fontSize: `${size}px`, fontWeight: String(weight), color, transform: align === "center" ? "translateX(-50%)" : "none" } }, box);
    for (const [text, isKey] of parts) {
      const w = words(ctx, text, { parent: row, cls: "display", style: { position: "relative", display: "inline", fontSize: "inherit", fontWeight: "inherit", color: isKey ? key : "inherit" } });
      w.el.className = "display";
      w.words.forEach((n) => all.push(n));
    }
  });
  all.forEach((n, i) => {
    ctx.tl.fromTo(n, { yPercent: 118, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 0.62, ease: "land", immediateRender: false }, t0 + i * stagger);
    if (t1 != null) ctx.tl.fromTo(n, { yPercent: 0, rotate: 0 }, { yPercent: -118, rotate: -3, duration: 0.42, ease: "power3.in", immediateRender: false }, t1 + i * stagger * 0.4);
  });
  ctx.onFrame((t) => {
    for (const n of all) n.style.visibility = t >= t0 - 0.01 && (t1 == null || t < t1 + 0.9) ? "inherit" : "hidden";
  });
  if (sound) ctx.sfx(sound, t0, { offset: -3 });
  return box;
}

/** A small glass label with an icon (lucide), in at t0, out at t1. */
export function kicker(ctx, parent, { text, icon = null, x, y, t0, t1, size = 30, tone = "dark", anchor = "left" }) {
  const el = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", display: "flex", alignItems: "center", gap: `${size * 0.42}px`, padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: "999px", whiteSpace: "nowrap",
      font: `600 ${size}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.01em",
      ...(tone === "dark" ? { background: "rgb(10 16 60 / 0.78)", color: "#fff", border: "1.5px solid rgb(120 170 255 / 0.35)", boxShadow: "0 18px 40px -18px rgb(0 0 20 / 0.8)" } : { background: "rgb(255 255 255 / 0.96)", color: "#0b1230", boxShadow: "0 18px 40px -18px rgb(10 30 80 / 0.45)" }),
    },
  }, parent);
  if (icon) { const i = ctx.icon(icon, { size: Math.round(size * 1.1), stroke: 2.2 }, el); i.style.color = tone === "dark" ? "#8FD3FF" : "#0069fe"; }
  ctx.el("span", { text }, el);
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, t0, t0 + 0.45, "back.out(1.7)");
    const b = t1 == null ? 0 : ramp(ctx, t, t1, t1 + 0.3, "power2.in");
    const o = Math.min(ramp(ctx, t, t0, t0 + 0.2), 1 - b);
    const dx = anchor === "center" ? -50 : anchor === "right" ? -100 : 0;
    el.style.transform = `translate(${x}px, ${y}px) translateX(${dx}%) translateY(${((1 - a) * 26 - b * 20).toFixed(1)}px) scale(${(0.9 + 0.1 * a).toFixed(4)})`;
    el.style.opacity = opa(o);
    el.style.visibility = o > 0.001 ? "inherit" : "hidden";
  });
  ctx.sfx("pop", t0, { offset: -6 });
  return el;
}

/** The live status chip: a green dot that breathes and the words. */
export function liveChip(ctx, parent, { text = "Live now", x, y, t0, t1, size = 30, anchor = "left" }) {
  const el = kicker(ctx, parent, { text, x, y, t0, t1, size, anchor });
  const dotEl = ctx.el("span", { style: { width: `${size * 0.5}px`, height: `${size * 0.5}px`, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 6px rgb(34 197 94 / 0.22)", order: "-1" } }, el);
  ctx.onFrame((t) => { dotEl.style.boxShadow = `0 0 0 ${(4 + 4 * Math.abs(Math.sin(t * 2.4))).toFixed(1)}px rgb(34 197 94 / 0.22)`; });
  return el;
}

/** A glass card with a big rolling number and a label (odometer). */
export function numberCard(ctx, parent, { value, prefix = "₦", label, x, y, t0, t1, tOut, size = 96, anchor = "center" }) {
  const card = ctx.el("div", { class: "abs glass-dark", style: { left: "0px", top: "0px", padding: `${size * 0.32}px ${size * 0.45}px`, borderRadius: `${size * 0.36}px`, display: "flex", flexDirection: "column", gap: `${size * 0.12}px`, alignItems: "flex-start" } }, parent);
  if (label) ctx.el("div", { text: label, style: { font: `500 ${Math.round(size * 0.3)}px/1.1 Inter, sans-serif`, color: "rgb(255 255 255 / 0.72)" } }, card);
  const num = odometer(ctx, card, { value, t0, t1, prefix, fontSize: size, color: "#ffffff" });
  num.style.position = "relative";
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, t0 - 0.35, t0 + 0.1, "back.out(1.5)");
    const b = tOut == null ? 0 : ramp(ctx, t, tOut, tOut + 0.35, "power2.in");
    const o = Math.min(ramp(ctx, t, t0 - 0.35, t0 - 0.1), 1 - b);
    const dx = anchor === "center" ? -50 : 0;
    card.style.transform = `translate(${x}px, ${y}px) translateX(${dx}%) translateY(${((1 - a) * 40 - b * 30).toFixed(1)}px) scale(${(0.92 + 0.08 * a).toFixed(4)})`;
    card.style.opacity = opa(o);
    card.style.visibility = o > 0.001 ? "inherit" : "hidden";
  });
  for (let k = 0; k < 8; k += 1) ctx.sfx("counter_tick", t0 + ((t1 - t0) * k) / 8, { offset: -4 });
  ctx.sfx("success", t1, { offset: -2 });
  void t1;
  return card;
}

/** A notification pop-up (glass), in at t, out at tOut. */
export function notify(ctx, parent, { title, line, icon = "bell", x, y, t, tOut, size = 36, example = false, from = "above" }) {
  const card = popup(ctx, { theme: "dark", icon, title, line, now: "now", example, fontSize: size, parent, style: { position: "absolute", left: `${x}px`, top: `${y}px` } });
  popIn(ctx, card, t, { from, tOut, offset: -2 });
  ctx.onFrame((u) => { card.style.visibility = u >= t - 0.01 && (tOut == null || u < tOut + 0.35) ? "inherit" : "hidden"; });
  return card;
}

/** A row of small glass chips that pop in one by one (feature tags). */
export function chipRow(ctx, parent, { items, x, y, t0, gap = 0.12, t1, size = 28, icon = null, wrapW = null, anchor = "left" }) {
  const row = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, display: "flex", flexWrap: "wrap", gap: `${size * 0.5}px`, width: wrapW ? `${wrapW}px` : "auto", justifyContent: anchor === "center" ? "center" : "flex-start", transform: anchor === "center" ? "translateX(-50%)" : "none" } }, parent);
  items.forEach((it, i) => {
    const [text, ic] = Array.isArray(it) ? it : [it, icon];
    const el = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.35}px`, padding: `${size * 0.38}px ${size * 0.7}px`, borderRadius: "999px", background: "rgb(10 16 60 / 0.78)", border: "1.5px solid rgb(120 170 255 / 0.32)", color: "#fff", font: `600 ${size}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.01em", whiteSpace: "nowrap", boxShadow: "0 16px 36px -18px rgb(0 0 20 / 0.8)" } }, row);
    if (ic) { const n = ctx.icon(ic, { size: Math.round(size * 1.05), stroke: 2.2 }, el); n.style.color = "#8FD3FF"; }
    ctx.el("span", { text }, el);
    const ti = t0 + i * gap;
    ctx.onFrame((t) => {
      const a = ramp(ctx, t, ti, ti + 0.4, "back.out(1.8)");
      const b = t1 == null ? 0 : ramp(ctx, t, t1 + i * 0.03, t1 + i * 0.03 + 0.3, "power2.in");
      const o = Math.min(ramp(ctx, t, ti, ti + 0.15), 1 - b);
      el.style.transform = `translateY(${((1 - a) * 30 - b * 24).toFixed(1)}px) scale(${(0.86 + 0.14 * a).toFixed(4)})`;
      el.style.opacity = opa(o);
      el.style.visibility = o > 0.001 ? "inherit" : "hidden";
    });
    ctx.sfx("pop", ti, { offset: -8 });
  });
  return row;
}

/** A glass panel with an icon plate, a title and a line (a feature card). */
export function featureCard(ctx, parent, { icon, title, line, x, y, w, t0, t1, size = 34, from = "below", anchor = "left" }) {
  const card = ctx.el("div", { class: "abs glass-dark", style: { left: "0px", top: "0px", width: `${w}px`, padding: `${size * 0.7}px`, borderRadius: `${size * 0.9}px`, display: "flex", gap: `${size * 0.6}px`, alignItems: "flex-start" } }, parent);
  const plate = ctx.el("div", { style: { flex: "none", width: `${size * 2}px`, height: `${size * 2}px`, borderRadius: `${size * 0.6}px`, display: "grid", placeItems: "center", background: "linear-gradient(150deg, #2f7cff, #003f98)", boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.25)" } }, card);
  const ic = ctx.icon(icon, { size: Math.round(size * 1.15), stroke: 2.2 }, plate); ic.style.color = "#fff";
  const body = ctx.el("div", {}, card);
  ctx.el("div", { text: title, style: { font: `700 ${size}px/1.12 Poppins, Inter, sans-serif`, letterSpacing: "-0.02em", color: "#fff" } }, body);
  if (line) ctx.el("div", { text: line, style: { marginTop: `${size * 0.25}px`, font: `500 ${Math.round(size * 0.72)}px/1.3 Inter, sans-serif`, color: "rgb(255 255 255 / 0.74)" } }, body);
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, t0, t0 + 0.55, "land");
    const b = t1 == null ? 0 : ramp(ctx, t, t1, t1 + 0.35, "power2.in");
    const o = Math.min(ramp(ctx, t, t0, t0 + 0.2), 1 - b);
    const off = from === "below" ? [0, 60] : from === "left" ? [-80, 0] : [80, 0];
    const dx = anchor === "center" ? -50 : 0;
    card.style.transform = `translate(${x}px, ${y}px) translateX(${dx}%) translate(${((1 - a) * off[0]).toFixed(1)}px, ${((1 - a) * off[1] - b * 30).toFixed(1)}px)`;
    card.style.opacity = opa(o);
    card.style.visibility = o > 0.001 ? "inherit" : "hidden";
  });
  ctx.sfx("card_slide", t0, { offset: -6 });
  return card;
}

/* ------------------------------------------------------------------ map */

const CITIES = [
  { name: "Lagos", lon: 3.38, lat: 6.52 },
  { name: "Ibadan", lon: 3.9, lat: 7.38 },
  { name: "Abuja", lon: 7.49, lat: 9.06 },
  { name: "Port Harcourt", lon: 7.03, lat: 4.82 },
  { name: "Kano", lon: 8.52, lat: 12.0 },
  { name: "Enugu", lon: 7.5, lat: 6.45 },
  { name: "Kaduna", lon: 7.44, lat: 10.52 },
  { name: "Benin City", lon: 5.62, lat: 6.34 },
];

/**
 * Nigeria's outline (world-atlas 50m) drawing itself from t0, a soft fill,
 * then the cities lighting one by one from `tCities` (every `gap` s); out at t1.
 */
export async function nigeriaMap(ctx, parent, { x, y, w, t0, t1, tCities = null, gap = 0.35, labels = true, cities = CITIES.length }) {
  const { feature } = await import("/node_modules/topojson-client/src/index.js");
  const world = await fetch("/node_modules/world-atlas/countries-50m.json").then((r) => r.json());
  const geo = feature(world, world.objects.countries.geometries.find((g) => String(g.id) === "566"));
  const polys = geo.geometry.type === "Polygon" ? [geo.geometry.coordinates] : geo.geometry.coordinates;
  const ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
  const lons = ring.map((p) => p[0]), lats = ring.map((p) => p[1]);
  const lon0 = Math.min(...lons), lon1 = Math.max(...lons), lat0 = Math.min(...lats), lat1 = Math.max(...lats);
  const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180);
  const sx = w / ((lon1 - lon0) * k);
  const h = (lat1 - lat0) * sx;
  const proj = (lon, lat) => ({ x: (lon - lon0) * k * sx, y: (lat1 - lat) * sx });
  const d = ring.map(([lon, lat], i) => { const p = proj(lon, lat); return `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join("") + "Z";
  const box = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` } }, parent);
  box.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" style="overflow:visible"><defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0069fe" stop-opacity="0.35"/><stop offset="1" stop-color="#003f98" stop-opacity="0.12"/></linearGradient></defs><path class="fillp" d="${d}" fill="url(#ng)" opacity="0"/><path class="line" d="${d}" stroke="#8FD3FF" stroke-width="4" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
  const line = box.querySelector(".line");
  const fill = box.querySelector(".fillp");
  ctx.onFrame((t) => {
    const u = ramp(ctx, t, t0, t0 + 1.6, "power2.inOut");
    const out = t1 == null ? 0 : ramp(ctx, t, t1, t1 + 0.4, "power2.in");
    line.setAttribute("stroke-dashoffset", (1 - u).toFixed(4));
    fill.setAttribute("opacity", (ramp(ctx, t, t0 + 0.9, t0 + 1.8) * (1 - out)).toFixed(3));
    box.style.opacity = opa(1 - out);
    box.style.visibility = t >= t0 && (t1 == null || t < t1 + 0.4) ? "inherit" : "hidden";
  });
  const tc = tCities ?? t0 + 1.4;
  CITIES.slice(0, cities).forEach((c, i) => {
    const p = proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${p.x - 13}px`, top: `${p.y - 13}px`, width: "26px", height: "26px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff, #8FD3FF 35%, #0069fe 75%)", boxShadow: "0 0 0 8px rgb(0 105 254 / 0.25), 0 0 30px 6px rgb(0 105 254 / 0.6)" } }, box);
    const lab = labels ? ctx.el("div", { class: "abs", text: c.name, style: { left: `${p.x + 22}px`, top: `${p.y - 18}px`, font: `600 ${Math.round(w * 0.036)}px/1 Poppins, Inter, sans-serif`, color: "#fff", whiteSpace: "nowrap", textShadow: "0 2px 10px rgb(0 0 20 / 0.8)" } }, box) : null;
    const ti = tc + i * gap;
    ctx.onFrame((t) => {
      const a = ramp(ctx, t, ti, ti + 0.45, "back.out(2.2)");
      dot.style.transform = `scale(${a.toFixed(4)})`;
      dot.style.opacity = opa(ramp(ctx, t, ti, ti + 0.1));
      if (lab) { lab.style.opacity = opa(ramp(ctx, t, ti + 0.1, ti + 0.4)); lab.style.transform = `translateX(${((1 - a) * -10).toFixed(1)}px)`; }
    });
    ctx.sfx("pop", ti, { offset: -9 });
  });
  return { box, h };
}

/* ---------------------------------------------------------------- ending */

/**
 * The end card: the Vallo mark lands with a ring, the wordmark and "Real
 * estate, done right.", then "Live now" and the official, unmodified store
 * badges (assets/badges, SOURCES.md), then the address.
 */
export function ending(ctx, { t0, tLine, tBadges, tUrl, t1 }) {
  const M = ctx.isMobile;
  const root = ctx.scene("ending", t0 - 0.4, t1 + 1, { z: 900 });
  const bg = ctx.el("div", { class: "fill", style: { background: "radial-gradient(70% 45% at 50% 42%, rgb(0 105 254 / 0.55) 0%, rgb(0 63 152 / 0.25) 40%, transparent 72%), linear-gradient(180deg, #02063f 0%, #010118 75%)" } }, root);
  ctx.onFrame((t) => { bg.style.opacity = opa(ramp(ctx, t, t0 - 0.4, t0 + 0.1)); });
  const cx = ctx.W / 2;
  const cy = M ? 760 : 380;
  const markSize = M ? 260 : 190;
  const mark = ctx.img(ctx.src.asset("logo-mark.png"), { class: "abs", style: { left: "0px", top: "0px", width: `${markSize}px`, height: `${markSize}px`, objectFit: "contain" } }, root);
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, t0, t0 + 0.7, "back.out(1.6)");
    place(mark, { x: cx, y: cy, s: 0.4 + 0.6 * a, r: (1 - a) * -30, o: ramp(ctx, t, t0, t0 + 0.2) });
  });
  ringBurst(ctx, root, { cx, cy, r: markSize * 0.78, t: t0 + 0.1, dots: 22, seed: 41 });
  ctx.sfx("impact_soft", t0, { offset: 0 });
  headline(ctx, root, { lines: [[["Real estate, ", false], ["done right.", true]]], x: cx, y: cy + markSize * 0.75, size: M ? 78 : 64, t0: tLine, t1: null, align: "center" });
  const live = liveChip(ctx, root, { text: "Live now on iPhone and Android", x: cx, y: M ? 1180 : 610, t0: tBadges - 0.3, t1: null, size: M ? 34 : 28, anchor: "center" });
  void live;
  const row = ctx.el("div", { class: "abs", style: { left: "0px", top: `${M ? 1290 : 690}px`, width: `${ctx.W}px`, display: "flex", justifyContent: "center", gap: `${M ? 34 : 30}px` } }, root);
  const bh = M ? 112 : 86;
  ["app-store-black.svg", "google-play-black.svg"].forEach((f, i) => {
    const b = ctx.img(ctx.src.asset(`badges/${f}`), { style: { height: `${bh}px`, width: "auto" } }, row);
    ctx.onFrame((t) => {
      const a = ramp(ctx, t, tBadges + i * 0.12, tBadges + i * 0.12 + 0.5, "back.out(1.6)");
      b.style.transform = `translateY(${((1 - a) * 40).toFixed(1)}px)`;
      b.style.opacity = opa(ramp(ctx, t, tBadges + i * 0.12, tBadges + i * 0.12 + 0.2));
    });
    ctx.sfx("pop", tBadges + i * 0.12, { offset: -3 });
  });
  const url = ctx.el("div", { class: "abs", text: "vallospaces.com", style: { left: "0px", top: `${M ? 1460 : 820}px`, width: `${ctx.W}px`, textAlign: "center", font: `600 ${M ? 40 : 32}px/1 Poppins, Inter, sans-serif`, color: "rgb(255 255 255 / 0.82)", letterSpacing: "-0.01em" } }, root);
  ctx.onFrame((t) => { url.style.opacity = opa(ramp(ctx, t, tUrl, tUrl + 0.4)); url.style.transform = `translateY(${((1 - ramp(ctx, t, tUrl, tUrl + 0.5, "land")) * 20).toFixed(1)}px)`; });
  sparkles(ctx, root, { area: { x: 60, y: M ? 420 : 120, w: ctx.W - 120, h: M ? 1200 : 760 }, count: 9, seed: 77, t0, t1 });
  ctx.hideCaptions(t0 - 0.2, t1 + 1);
  return root;
}

/** V-04, the card above an account number in a chat (trust-visible.en.ts), drawn as the product draws it. */
export function flagCard(ctx, parent, M) {
  const fs = M ? 34 : 30;
  const card = ctx.el("div", { class: "abs glass-dark", style: { left: "0px", top: "0px", width: `${M ? 920 : 760}px`, padding: `${fs * 0.9}px`, borderRadius: `${fs}px`, border: "1.5px solid rgb(255 196 61 / 0.55)" } }, parent);
  const head = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${fs * 0.5}px`, font: `600 ${fs * 0.8}px/1.2 Inter, sans-serif`, color: "#ffd27a" } }, card);
  const i = ctx.icon("shield-alert", { size: fs * 1.2, stroke: 2.2 }, head); i.style.color = "#ffc43d";
  ctx.el("span", { text: "About the account number in this message" }, head);
  ctx.el("div", { text: "The name on this account is not a name Vallo has on record for this lister.", style: { marginTop: `${fs * 0.6}px`, font: `600 ${fs}px/1.3 Poppins, Inter, sans-serif`, color: "#fff", letterSpacing: "-0.01em" } }, card);
  ctx.el("div", { text: "Pay only after inspection. Request one here.", style: { marginTop: `${fs * 0.5}px`, font: `500 ${fs * 0.78}px/1.35 Inter, sans-serif`, color: "rgb(255 255 255 / 0.72)" } }, card);
  const row = ctx.el("div", { style: { display: "flex", gap: `${fs * 0.4}px`, marginTop: `${fs * 0.8}px` } }, card);
  [["Request an inspection", true], ["Report", false], ["Block", false]].forEach(([t, main]) => {
    ctx.el("div", { text: t, style: { padding: `${fs * 0.45}px ${fs * 0.8}px`, borderRadius: "999px", font: `600 ${fs * 0.72}px/1 Poppins, Inter, sans-serif`, ...(main ? { background: "#0069fe", color: "#fff" } : { background: "rgb(255 255 255 / 0.08)", color: "#fff", border: "1px solid rgb(255 255 255 / 0.18)" }) } }, row);
  });
  return card;
}


export { orb, press, tap, words, ringBurst, sparkles, odometer, popup, popIn, browserWindow, bob };
