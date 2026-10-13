/**
 * THE REELS' SCENE KIT (1920 x 1080).
 *
 * The two October 2026 films are built from a handful of building blocks, so
 * a scene is a few lines of data. Everything animates on the master timeline
 * (ctx.tl); nothing here uses timers, Date or Math.random (see BUILDING.md,
 * "Determinism").
 *
 *   const k = createKit(ctx);
 *   const s = k.scene("id", t0, t1, { theme: "dark" });   // a layer shown t0..t1
 *   k.headline(s, ["Find it.", "Understand it."], { x, y, size, t, tOut });
 *   const p = k.phoneAt(s, { id: "sc-home", t, tOut, pose: {...}, to: {...} });
 *   k.windowAt(s, { id: "d-sc-home", x, y, width, t, tOut });
 *   k.status(s, "live" | "next", { x, y, t, tOut });
 *
 * Times are in seconds on the reel's clock; scenes sit on bar lines
 * (ctx.bar(n)), which at 104 BPM is 2.3077 s per bar.
 */
import { phone } from "../engine/phone.js";
import { bgNavy, bgDusk, bgStudio, glow, words, browserWindow, bodyFromImage, sparkles } from "../engine/components.js";

export const NAVY_EDGE = "#030a2a";
export const LIGHT_EDGE = "#f4f7fd";
const IR = { immediateRender: false };

export function createKit(ctx) {
  const { tl } = ctx;
  const W = ctx.W;
  const H = ctx.H;

  /** A layer shown from t0 to t1, with its own ground when `bg` is given. */
  function scene(id, t0, t1, { z = 1, bg = null, glowAt = null } = {}) {
    const root = ctx.scene(id, t0, t1, { z });
    if (bg === "navy") bgNavy(ctx, root, glowAt ?? {});
    if (bg === "dusk") bgDusk(ctx, root, glowAt ?? {});
    if (bg === "studio") bgStudio(ctx, root);
    return root;
  }

  /** Slides and fades a node in at tIn, and out at tOut. */
  function appear(node, tIn, tOut, { y = 40, x = 0, dur = 0.8, ease = "land", outDur = 0.4, scale = 1 } = {}) {
    tl.fromTo(node, { opacity: 0, y, x, scale }, { opacity: 1, y: 0, x: 0, scale: 1, duration: dur, ease }, tIn);
    if (tOut != null) tl.to(node, { opacity: 0, y: -y * 0.6, duration: outDur, ease: "leave", ...IR }, tOut);
  }

  /**
   * Kinetic type: lines of words that rise from under a mask. `accent` is a
   * word (or words) in electric blue. Returns { el }.
   */
  function headline(parent, lines, { x = 120, y = 300, size = 96, align = "left", width = 900, t, tOut = null, accent = [], cls = "display", color = "#fff", gap = 1.04, stagger = 0.07, dur = 0.85 }) {
    const box = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${width}px`, textAlign: align, color } }, parent);
    const all = [];
    const masks = [];
    const acc = new Set([].concat(accent).map((a) => a.toLowerCase().replace(/[.,!?]/g, "")));
    lines.forEach((line, i) => {
      const w = words(ctx, line, { cls, parent: box, style: { position: "relative", fontSize: `${size}px`, lineHeight: String(gap), whiteSpace: "nowrap" } });
      w.el.style.position = "relative";
      w.el.style.display = "block";
      w.words.forEach((node) => { if (acc.has(node.textContent.toLowerCase().replace(/[.,!?]/g, ""))) node.style.color = "var(--electric)"; });
      all.push(...w.words);
      masks.push(...w.masks);
    });
    tl.fromTo(all, { yPercent: 118 }, { yPercent: 0, duration: dur, ease: "land", stagger }, t);
    if (tOut != null) tl.to(all, { yPercent: -118, duration: 0.45, ease: "leave", stagger: 0.025, ...IR }, tOut);
    return { el: box, words: all };
  }

  /** A small label above a headline (uppercase, tracked, sky). */
  function kicker(parent, text, { x, y, t, tOut = null, color = "var(--sky)", size = 26, align = "left", width = 700 }) {
    const n = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${width}px`, textAlign: align, font: `600 ${size}px/1 Inter, sans-serif`, letterSpacing: "0.22em", textTransform: "uppercase", color } }, parent);
    n.textContent = text;
    appear(n, t, tOut, { y: 18, dur: 0.6 });
    return n;
  }

  /** A body line under a headline. */
  function paragraph(parent, text, { x, y, width = 760, size = 34, t, tOut = null, color = "rgb(220 233 255 / 0.86)", align = "left" }) {
    const n = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${width}px`, textAlign: align, font: `500 ${size}px/1.34 Inter, sans-serif`, letterSpacing: "-0.01em", color } }, parent);
    n.textContent = text;
    appear(n, t, tOut, { y: 26, dur: 0.7 });
    return n;
  }

  /** A glass chip with an optional lucide icon. */
  function chip(parent, { text, icon = null, x, y, t, tOut = null, size = 30, tone = "dark", accent = false }) {
    const n = ctx.el("div", {
      class: "abs",
      style: {
        left: `${x}px`, top: `${y}px`, display: "inline-flex", alignItems: "center", gap: `${size * 0.4}px`, padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: "999px", whiteSpace: "nowrap",
        font: `600 ${size}px/1 Inter, sans-serif`, letterSpacing: "-0.01em",
        background: accent ? "linear-gradient(135deg, #0069fe, #0056d0)" : tone === "dark" ? "rgb(10 16 60 / 0.78)" : "rgb(255 255 255 / 0.94)",
        color: accent || tone === "dark" ? "#fff" : "#0a1440",
        border: accent ? "1.5px solid rgb(143 211 255 / 0.5)" : tone === "dark" ? "1.5px solid rgb(120 170 255 / 0.32)" : "1.5px solid rgb(10 20 60 / 0.08)",
        boxShadow: "0 18px 40px -16px rgb(0 0 30 / 0.55)",
      },
    }, parent);
    if (icon) ctx.icon(icon, { size: size * 1.05, stroke: 2.2 }, n);
    ctx.el("span", { text }, n);
    appear(n, t, tOut, { y: 30, dur: 0.7, ease: "back.out(1.5)" });
    return n;
  }

  /**
   * The status badge that keeps the second film honest: "Live now" (green dot)
   * for what is in the product today, "In development" (sky ring) for what is
   * being built and has no date, "Next" for direction.
   */
  function status(parent, kind, { x, y, t, tOut = null, size = 26, label = null }) {
    const map = {
      live: { text: "Live now", dot: "#34d399", bg: "rgb(8 40 36 / 0.78)", edge: "rgb(52 211 153 / 0.45)", color: "#b7f5dc" },
      rollout: { text: "Rolling out", dot: "#fbbf24", bg: "rgb(46 34 8 / 0.78)", edge: "rgb(251 191 36 / 0.45)", color: "#ffeab0" },
      dev: { text: "In development", dot: "#8fd3ff", bg: "rgb(10 24 70 / 0.78)", edge: "rgb(143 211 255 / 0.45)", color: "#d6ecff" },
      next: { text: "Direction", dot: "#ffb27a", bg: "rgb(48 24 16 / 0.72)", edge: "rgb(255 178 122 / 0.45)", color: "#ffe1cb" },
    }[kind];
    const n = ctx.el("div", {
      class: "abs",
      style: { left: `${x}px`, top: `${y}px`, display: "inline-flex", alignItems: "center", gap: `${size * 0.45}px`, padding: `${size * 0.4}px ${size * 0.8}px`, borderRadius: "999px", background: map.bg, border: `1.5px solid ${map.edge}`, color: map.color, font: `600 ${size}px/1 Inter, sans-serif`, letterSpacing: "0.01em", whiteSpace: "nowrap" },
    }, parent);
    ctx.el("span", { style: { width: `${size * 0.42}px`, height: `${size * 0.42}px`, borderRadius: "50%", background: map.dot, boxShadow: `0 0 ${size * 0.5}px ${map.dot}` } }, n);
    ctx.el("span", { text: label ?? map.text }, n);
    appear(n, t, tOut, { y: 18, dur: 0.6 });
    return n;
  }

  /**
   * A 3D phone showing a prepared display (docs/marketing/screens/<id>-<platform>.png).
   * `pose` is where it enters, `to` where it settles/drifts to; both are
   * { cx, cy, height, rx, ry, rz }. It fades in at t and out at tOut.
   */
  function phoneAt(parent, { id, platform = "ios", theme = "dark", t, tOut = null, pose, to = null, hold = null, dur = 1.1, z = 5, ease = "land" }) {
    const p = phone(ctx, { model: platform === "android" ? "android" : "island", parent, z, edge: theme === "light" ? LIGHT_EDGE : NAVY_EDGE, env: theme === "light" ? "light" : "dark" });
    ctx.img(ctx.src.display(id, platform), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, p.screen);
    const start = { cx: W / 2, cy: H / 2, height: 860, rx: 0, ry: 0, rz: 0, fov: 24, ...pose };
    const rest = { ...start, ...(to ?? {}) };
    tl.fromTo(p.pose, { ...start, opacity: 0 }, { ...rest, opacity: 1, duration: dur, ease }, t);
    if (hold) tl.fromTo(p.pose, { ...rest }, { ...rest, ...hold, duration: (tOut ?? t + 4) - (t + dur) - 0.3, ease: "sine.inOut", ...IR }, t + dur);
    if (tOut != null) tl.to(p.pose, { opacity: 0, duration: 0.4, ease: "leave", ...IR }, tOut);
    return p;
  }


  /**
   * One 3D phone that changes screens: steps = [{ id, t }] (the first step's
   * `t` is also when the phone appears). Each change crossfades over 0.3 s with
   * a small push of the phone, so it reads as one device being used.
   */
  function phoneSeq(parent, { steps, platform = "ios", theme = "dark", tOut, pose, to = null, dur = 1.1, z = 5, bump = 28 }) {
    const p = phone(ctx, { model: platform === "android" ? "android" : "island", parent, z, edge: theme === "light" ? LIGHT_EDGE : NAVY_EDGE, env: theme === "light" ? "light" : "dark" });
    const imgs = steps.map((s) => ctx.img(ctx.src.display(s.id, platform), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", opacity: "0" } }, p.screen));
    const start = { cx: W / 2, cy: H / 2, height: 860, rx: 0, ry: 0, rz: 0, fov: 24, ...pose };
    const rest = { ...start, ...(to ?? {}) };
    const t0 = steps[0].t;
    tl.fromTo(p.pose, { ...start, opacity: 0 }, { ...rest, opacity: 1, duration: dur, ease: "land" }, t0);
    const end = tOut ?? steps[steps.length - 1].t + 4;
    if (end - (t0 + dur) > 0.5) tl.fromTo(p.pose, { ...rest }, { cx: rest.cx, cy: rest.cy - 10, height: rest.height * 1.02, ry: rest.ry * 0.7, duration: end - (t0 + dur) - 0.3, ease: "sine.inOut", ...IR }, t0 + dur);
    steps.forEach((s, i) => {
      const next = steps[i + 1]?.t ?? end;
      if (i === 0) tl.fromTo(imgs[i], { opacity: 0 }, { opacity: 1, duration: 0.01 }, s.t);
      else tl.fromTo(imgs[i], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", ...IR }, s.t);
      if (steps[i + 1]) tl.to(imgs[i], { opacity: 0, duration: 0.01, ...IR }, next + 0.3);
      if (i > 0 && bump) {
        tl.fromTo(p.pose, { rz: 0 }, { rz: -1.6, duration: 0.16, ease: "power2.out", ...IR }, s.t - 0.04);
        tl.to(p.pose, { rz: 0, duration: 0.5, ease: "power3.out", ...IR }, s.t + 0.12);
      }
    });
    tl.to(p.pose, { opacity: 0, duration: 0.4, ease: "leave", ...IR }, end);
    return p;
  }

  /** A browser window showing a desktop capture (2880 x 1800, shown at 1440 x 900). */
  function windowAt(parent, { id, x, y, width = 1100, theme = "dark", url = "vallospaces.com", t, tOut = null, from = { y: 120 }, z = 4 }) {
    const holder = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: "0px", height: "0px", zIndex: String(z) } }, parent);
    const win = browserWindow(ctx, { parent: holder, width, url, theme });
    ctx.img(ctx.src.capture(id), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    appear(holder, t, tOut, { y: from.y, dur: 0.95 });
    return { holder, win };
  }

  /** A part of a capture lifted off as a floating card. */
  function card(parent, { src, crop, scale = 1, x, y, z = 6, t, tOut = null, from = { y: 60 }, radius = 26, light = false, rot = 0 }) {
    const n = bodyFromImage(ctx, parent, { src, crop, scale, radius, x, y, z, light });
    n.style.rotate = `${rot}deg`;
    appear(n, t, tOut, { y: from.y, x: from.x ?? 0, dur: 0.9, ease: "land" });
    return n;
  }

  /** The Vallo wordmark (the founder's artwork, keyed off its background) and mark. */
  function logo(parent, { x, y, width = 520, t, tOut = null, mark = true, markSize = 150, gap = 28 }) {
    const row = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, display: "flex", alignItems: "center", gap: `${gap}px` } }, parent);
    if (mark) ctx.img(ctx.src.asset("logo-mark.png"), { style: { width: `${markSize}px`, height: `${markSize}px` } }, row);
    ctx.img(ctx.src.asset("logo-wordmark.png"), { style: { width: `${width}px`, height: "auto" } }, row);
    appear(row, t, tOut, { y: 24, dur: 0.9, scale: 0.96 });
    return row;
  }

  /** A slow drifting light behind a scene (a radial gradient, never a blur). */
  function drift(parent, { x0, y0, x1, y1, size = 1100, t0, t1, color = "rgb(0 105 254 / 0.42)" }) {
    const g = glow(ctx, parent, { x: 0, y: 0, size, color });
    tl.fromTo(g, { x: x0, y: y0 }, { x: x1, y: y1, duration: t1 - t0, ease: "sine.inOut" }, t0);
    return g;
  }

  /** A thin line that draws left to right. */
  function rule(parent, { x, y, w, t, tOut = null, color = "var(--electric)", h = 6 }) {
    const n = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, borderRadius: "99px", background: color, transformOrigin: "0 50%" } }, parent);
    tl.fromTo(n, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "land" }, t);
    if (tOut != null) tl.to(n, { opacity: 0, duration: 0.3, ...IR }, tOut);
    return n;
  }

  return { scene, appear, headline, kicker, paragraph, chip, status, phoneAt, phoneSeq, windowAt, card, logo, drift, rule, sparkles: (parent, o) => sparkles(ctx, parent, o) };
}
