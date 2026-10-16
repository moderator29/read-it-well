/**
 * THE POP-OUT CONTAINER, IN MOTION.
 *
 * The founder's brief, 16 October 2026, with five pump.fun App Store images
 * as the blueprint: "those pop up ui containers... the kind of container and
 * tick edges it have... I need them in the films". The store set draws the
 * same object in scripts/marketing/store/callouts.mjs; this is its moving
 * twin, in the same navy, the same sky hairline, the same radii and type.
 *
 * What makes it the blueprint's container rather than a toast:
 *   - the edge is interrupted: a small label tab sits astride the top rule;
 *   - four short brackets, the TICKS, stand just outside the corners and turn
 *     the corner on the container's own radius, like crop marks;
 *   - an embedded plate of label/value columns, one shade darker than the
 *     slab, for the figures;
 *   - it never sits still: it breathes, and its parts arrive one after
 *     another rather than all at once.
 *
 * Everything is a pure function of t (BUILDING.md, "Determinism").
 */
import { ramp, place, opa, mix } from "./kit.js";

const SKY = "rgb(143 211 255 / 0.95)";
const INK = "#0b1230";

/* The four contents, by `kind`:
 *   line     a disc, a title, a line, an optional amount    (a thing that happened)
 *   stat     an eyebrow and one big figure with a unit      (a number worth the room)
 *   cells    a title and a plate of label/value columns     (a breakdown)
 *   counters a row of small pills, each a glyph and a word  (a tally)
 */

/**
 * Draws the container. Returns { box, slab, rows }: `box` is what moves, so a
 * caller may fly it with kit's `fly`.
 *
 *   x, y        the container's CENTRE on the stage
 *   t0, t1      when it arrives and when it leaves
 *   from        "below" | "above" | "left" | "right", where it comes from
 *   tone        "dark" (navy) or "day" (white paper, for the day stages)
 *   accent      "sky" (the hairline) or "electric" (the one loud container)
 *   size        the type's base size; everything else follows it
 *   w           a set width, or null to hug its content
 *   breathe     how much it drifts while it is up (1 = the kit's default)
 */
export function popOut(ctx, parent, {
  kind = "line", x, y, w = null, t0, t1 = null, rot = 0, size = 34, from = "below",
  tab = null, ticks = true, tone = "dark", accent = "sky", seed = 1, sound = "card_slide",
  breathe = 1, z = null, lucide = null, title = null, line = null, line2 = null, amount = null,
  label = null, figure = null, unit = null, note = null, cells = null, items = null, example = false,
}) {
  const day = tone === "day";
  const loud = accent === "electric";
  const edge = day ? "rgb(0 105 254 / 0.40)" : loud ? "rgb(214 236 255 / 0.62)" : "rgb(143 211 255 / 0.52)";
  const tick = day ? "rgb(0 105 254 / 0.85)" : loud ? "rgb(255 255 255 / 0.95)" : SKY;
  const ink = day ? INK : "#ffffff";
  const soft = day ? "rgb(11 18 48 / 0.62)" : loud ? "rgb(255 255 255 / 0.86)" : "rgb(208 222 255 / 0.86)";
  const eye = day ? "rgb(0 105 254 / 0.90)" : loud ? "rgb(255 255 255 / 0.84)" : "rgb(143 211 255 / 0.92)";
  const radius = size * 1.08;
  const pad = size * 0.82;

  const box = ctx.el("div", {
    class: "abs",
    attrs: { "data-furn": "1" },
    style: { left: "0px", top: "0px", transformOrigin: "50% 50%", ...(z == null ? {} : { zIndex: String(z) }) },
  }, parent);

  const slab = ctx.el("div", {
    style: {
      position: "relative",
      ...(w ? { width: `${w}px` } : {}),
      padding: `${pad}px ${pad * 1.12}px`,
      borderRadius: `${radius}px`,
      border: `${(size * 0.05).toFixed(2)}px solid ${edge}`,
      background: day
        ? "linear-gradient(176deg, #ffffff 0%, #f2f6ff 100%)"
        : loud
          ? "linear-gradient(176deg, #1E7BFF 0%, #0069FE 52%, #0049B4 100%)"
          : "linear-gradient(176deg, rgb(24 34 100 / 0.985) 0%, rgb(11 17 62 / 0.985) 58%, rgb(7 12 48 / 0.985) 100%)",
      boxShadow: day
        ? "0 40px 80px -30px rgb(10 30 90 / 0.30), inset 0 2px 0 rgb(255 255 255 / 0.9)"
        : "0 54px 100px -34px rgb(0 0 12 / 0.88), 0 16px 34px -16px rgb(0 0 20 / 0.6), inset 0 2px 0 rgb(255 255 255 / 0.13)",
      color: ink,
      font: `500 ${size}px/1.2 Inter, sans-serif`,
    },
  }, box);

  /* ---- the ticks: four brackets, each turning the corner on the radius ---- */
  const tks = [];
  if (ticks) {
    const d = size * 0.92;
    const o = -size * 0.33;
    const bw = (size * 0.10).toFixed(2);
    const tr = `${(radius + size * 0.33).toFixed(1)}px`;
    const corners = [
      { left: `${o}px`, top: `${o}px`, borderLeft: `${bw}px solid ${tick}`, borderTop: `${bw}px solid ${tick}`, borderTopLeftRadius: tr, dx: -1, dy: -1 },
      { right: `${o}px`, top: `${o}px`, borderRight: `${bw}px solid ${tick}`, borderTop: `${bw}px solid ${tick}`, borderTopRightRadius: tr, dx: 1, dy: -1 },
      { left: `${o}px`, bottom: `${o}px`, borderLeft: `${bw}px solid ${tick}`, borderBottom: `${bw}px solid ${tick}`, borderBottomLeftRadius: tr, dx: -1, dy: 1 },
      { right: `${o}px`, bottom: `${o}px`, borderRight: `${bw}px solid ${tick}`, borderBottom: `${bw}px solid ${tick}`, borderBottomRightRadius: tr, dx: 1, dy: 1 },
    ];
    corners.forEach((c, i) => {
      const { dx, dy, ...style } = c;
      const el = ctx.el("div", { style: { position: "absolute", width: `${d}px`, height: `${d}px`, ...style } }, slab);
      tks.push({ el, dx, dy, i });
    });
  }

  /* ---- the label astride the top rule ---- */
  let tabEl = null;
  if (tab) {
    tabEl = ctx.el("div", {
      text: tab,
      style: {
        position: "absolute", left: `${pad * 0.9}px`, top: "0px", transform: "translateY(-50%)",
        padding: `${size * 0.2}px ${size * 0.46}px`, borderRadius: "999px",
        border: `${(size * 0.046).toFixed(2)}px solid ${day ? "rgb(0 105 254 / 0.45)" : "rgb(143 211 255 / 0.55)"}`,
        background: day ? "#ffffff" : loud ? "#ffffff" : "linear-gradient(180deg, rgb(28 40 112), rgb(14 22 74))",
        font: `700 ${Math.round(size * 0.56)}px/1 Inter, sans-serif`,
        letterSpacing: "0.13em", textTransform: "uppercase", whiteSpace: "nowrap",
        color: day || loud ? "#0a1240" : "#BFE2FF",
      },
    }, slab);
  }

  /* ---- the contents ---- */
  const rows = [];
  const add = (node) => { rows.push(node); return node; };
  const disc = (name, d = size * 2.1) => {
    const plate = ctx.el("div", {
      style: {
        flex: "none", width: `${d}px`, height: `${d}px`, borderRadius: `${d * 0.33}px`, display: "grid", placeItems: "center",
        background: loud ? "linear-gradient(160deg, #ffffff, #cfe4ff)" : "linear-gradient(160deg, #4A95FF 0%, #0069FE 55%, #0050C8 100%)",
        boxShadow: "inset 0 2px 0 rgb(255 255 255 / 0.3), 0 12px 24px -10px rgb(0 20 80 / 0.7)",
      },
    });
    const ic = ctx.icon(name, { size: Math.round(d * 0.48), stroke: 2.1 }, plate);
    ic.style.color = loud ? "#0056D0" : "#fff";
    return plate;
  };
  const eyebrow = (text, parentEl) => ctx.el("div", {
    text, style: { font: `700 ${Math.round(size * 0.6)}px/1 Inter, sans-serif`, letterSpacing: "0.12em", textTransform: "uppercase", color: eye, whiteSpace: "nowrap" },
  }, parentEl);

  if (kind === "line") {
    const row = add(ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.72}px` } }, slab));
    if (lucide) row.appendChild(disc(lucide));
    const col = ctx.el("div", { style: { minWidth: "0" } }, row);
    const top = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.5}px` } }, col);
    ctx.el("div", { text: title, style: { font: `700 ${size}px/1.15 Inter, sans-serif`, letterSpacing: "-0.012em", whiteSpace: "nowrap" } }, top);
    if (example) {
      const chip = ctx.el("div", { style: { display: "inline-flex", alignItems: "center", gap: `${size * 0.16}px`, padding: `${size * 0.14}px ${size * 0.34}px`, borderRadius: "999px", border: `1.5px solid ${day ? "rgb(11 18 48 / 0.22)" : "rgb(255 255 255 / 0.26)"}`, background: day ? "rgb(11 18 48 / 0.04)" : "rgb(1 1 24 / 0.5)" } }, top);
      const ic = ctx.icon("info", { size: Math.round(size * 0.6), stroke: 2.2 }, chip);
      ic.style.color = day ? INK : "#E8EFFF";
      ctx.el("span", { text: "Example", style: { font: `600 ${Math.round(size * 0.58)}px/1 Inter, sans-serif`, color: day ? INK : "#E8EFFF" } }, chip);
    }
    if (line) add(ctx.el("div", { text: line, style: { marginTop: `${size * 0.26}px`, font: `500 ${Math.round(size * 0.78)}px/1.3 Inter, sans-serif`, color: soft, whiteSpace: "nowrap" } }, col));
    if (line2) add(ctx.el("div", { text: line2, style: { marginTop: `${size * 0.18}px`, font: `500 ${Math.round(size * 0.68)}px/1.3 Inter, sans-serif`, color: soft, opacity: "0.78", whiteSpace: "nowrap" } }, col));
    if (amount) add(ctx.el("div", { text: amount, style: { marginTop: `${size * 0.3}px`, font: `700 ${Math.round(size * 1.16)}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.02em", color: ink } }, col));
  } else if (kind === "stat") {
    const row = add(ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.62}px` } }, slab));
    if (lucide) row.appendChild(disc(lucide, size * 1.9));
    const col = ctx.el("div", {}, row);
    if (label) eyebrow(label, col);
    const fig = ctx.el("div", { style: { marginTop: `${size * 0.2}px`, display: "flex", alignItems: "baseline", gap: `${size * 0.24}px`, whiteSpace: "nowrap" } }, col);
    ctx.el("span", { text: figure, style: { font: `700 ${Math.round(size * 2.05)}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.03em", color: ink } }, fig);
    if (unit) ctx.el("span", { text: unit, style: { font: `600 ${Math.round(size * 0.82)}px/1 Inter, sans-serif`, color: soft } }, fig);
    add(fig);
    if (note) add(ctx.el("div", { text: note, style: { marginTop: `${size * 0.4}px`, font: `500 ${Math.round(size * 0.72)}px/1.3 Inter, sans-serif`, color: soft, whiteSpace: "nowrap" } }, slab));
  } else if (kind === "cells") {
    if (title) {
      const head = add(ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.56}px`, marginBottom: `${size * 0.58}px` } }, slab));
      if (lucide) head.appendChild(disc(lucide, size * 1.85));
      ctx.el("div", { text: title, style: { font: `700 ${Math.round(size * 0.96)}px/1.15 Inter, sans-serif`, letterSpacing: "-0.012em", whiteSpace: "nowrap" } }, head);
    }
    const plate = ctx.el("div", {
      style: {
        display: "flex", alignItems: "stretch", gap: `${size * 0.7}px`,
        padding: `${size * 0.56}px ${size * 0.68}px`, borderRadius: `${radius * 0.62}px`,
        background: day ? "rgb(0 105 254 / 0.06)" : "rgb(3 8 40 / 0.72)",
        border: `1.5px solid ${day ? "rgb(0 105 254 / 0.18)" : "rgb(143 211 255 / 0.22)"}`,
      },
    }, slab);
    cells.forEach(([k, v], i) => {
      const cell = add(ctx.el("div", { style: { minWidth: "0", ...(i ? { borderLeft: `1.5px solid ${day ? "rgb(0 105 254 / 0.16)" : "rgb(143 211 255 / 0.20)"}`, paddingLeft: `${size * 0.7}px` } : {}) } }, plate));
      eyebrow(k, cell);
      ctx.el("div", { text: v, style: { marginTop: `${size * 0.2}px`, font: `700 ${Math.round(size * 1.1)}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.025em", color: ink, whiteSpace: "nowrap" } }, cell);
    });
    if (note) add(ctx.el("div", { text: note, style: { marginTop: `${size * 0.46}px`, font: `500 ${Math.round(size * 0.7)}px/1.3 Inter, sans-serif`, color: soft, whiteSpace: "nowrap" } }, slab));
  } else if (kind === "counters") {
    const row = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: `${size * 0.4}px` } }, slab);
    for (const [g, v] of items) {
      const pill = add(ctx.el("div", {
        style: {
          display: "inline-flex", alignItems: "center", gap: `${size * 0.28}px`,
          padding: `${size * 0.28}px ${size * 0.52}px`, borderRadius: "999px",
          background: day ? "rgb(0 105 254 / 0.07)" : "rgb(4 9 44 / 0.66)",
          border: `1.5px solid ${day ? "rgb(0 105 254 / 0.20)" : "rgb(143 211 255 / 0.26)"}`,
          font: `600 ${Math.round(size * 0.74)}px/1 Inter, sans-serif`, color: ink, whiteSpace: "nowrap",
        },
      }, row));
      const ic = ctx.icon(g, { size: Math.round(size * 0.8), stroke: 2.2 }, pill);
      ic.style.color = day ? "#0069fe" : "#8FD3FF";
      ctx.el("span", { text: v }, pill);
    }
  }

  /* ---- the motion ---- */
  const rand = ctx.random(seed);
  const ph = rand() * Math.PI * 2;
  const off = from === "below" ? [0, size * 2.4] : from === "above" ? [0, -size * 2.4] : from === "left" ? [-size * 3, 0] : [size * 3, 0];
  const IN = 0.56;
  const OUT = 0.42;
  (ctx.__holds ??= []).push([t0 + 0.32, t1 ?? t0 + 2]);

  ctx.onFrame((t) => {
    if (t < t0 - 0.05 || (t1 != null && t >= t1 + OUT + 0.1)) { box.style.visibility = "hidden"; return; }
    const a = ramp(ctx, t, t0, t0 + IN, "land");
    const b = t1 == null ? 0 : ramp(ctx, t, t1, t1 + OUT, "power2.in");
    const o = Math.min(ramp(ctx, t, t0, t0 + 0.2), 1 - b);
    const bob = Math.sin((t - t0) * 0.78 + ph) * 5 * breathe * a;
    const sway = Math.cos((t - t0) * 0.54 + ph) * 3.4 * breathe * a;
    place(box, {
      x: x + mix(off[0], 0, a) + sway,
      y: y + mix(off[1], 0, a) + bob - b * size * 1.1,
      s: (0.93 + 0.07 * a) * (1 - 0.05 * b),
      r: rot + Math.sin((t - t0) * 0.46 + ph) * 0.55 * breathe * a,
      o,
    });
    /* the ticks snap in after the slab has landed, and fly outward as it goes */
    tks.forEach(({ el, dx, dy, i }) => {
      const u = ramp(ctx, t, t0 + 0.14 + i * 0.035, t0 + 0.44 + i * 0.035, "back.out(2)");
      const d = (1 - u) * size * 0.95 + b * size * 1.5;
      el.style.transform = `translate(${(dx * d).toFixed(2)}px, ${(dy * d).toFixed(2)}px)`;
      el.style.opacity = opa(Math.min(u, 1 - b));
    });
    if (tabEl) {
      const u = ramp(ctx, t, t0 + 0.2, t0 + 0.52, "back.out(1.6)");
      tabEl.style.transform = `translateY(-50%) translateY(${((1 - u) * size * 0.5).toFixed(2)}px) scale(${(0.84 + 0.16 * u).toFixed(4)})`;
      tabEl.style.opacity = opa(Math.min(u, 1 - b));
    }
    rows.forEach((node, i) => {
      const u = ramp(ctx, t, t0 + 0.16 + i * 0.07, t0 + 0.5 + i * 0.07, "land");
      node.style.transform = `translateY(${((1 - u) * size * 0.4).toFixed(2)}px)`;
      node.style.opacity = opa(Math.min(u, 1 - b));
    });
    box.style.visibility = o > 0.001 ? "inherit" : "hidden";
  });
  if (sound) ctx.sfx(sound, t0, { offset: -5 });
  return { box, slab, rows };
}

/**
 * The oversized outlined figure the blueprint stands beside its containers:
 * stroked, not filled, so the stage reads through the numerals. It draws
 * itself on, holds, and leaves.
 */
export function figureOut(ctx, parent, { text, x, y, size = 150, rot = -3, t0, t1 = null, tone = "dark", seed = 2, anchor = "center" }) {
  const day = tone === "day";
  const color = day ? "#0069fe" : "#8FD3FF";
  const box = ctx.el("div", { class: "abs", attrs: { "data-furn": "1" }, style: { left: "0px", top: "0px", transformOrigin: "50% 50%" } }, parent);
  const wrap = ctx.el("div", { style: { position: "relative", whiteSpace: "nowrap" } }, box);
  const common = { font: `700 ${size}px/0.95 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", display: "block" };
  const ghost = ctx.el("div", { text, style: { ...common, color, opacity: "0.17" } }, wrap);
  const edge = ctx.el("div", { text, style: { ...common, position: "absolute", left: "0px", top: "0px", color: "transparent", WebkitTextStroke: `${(size * 0.018).toFixed(2)}px ${color}` } }, wrap);
  const rand = ctx.random(seed);
  const ph = rand() * Math.PI * 2;
  ctx.onFrame((t) => {
    if (t < t0 - 0.05 || (t1 != null && t >= t1 + 0.5)) { box.style.visibility = "hidden"; return; }
    const a = ramp(ctx, t, t0, t0 + 0.64, "land");
    const b = t1 == null ? 0 : ramp(ctx, t, t1, t1 + 0.44, "power2.in");
    const o = Math.min(ramp(ctx, t, t0, t0 + 0.26), 1 - b);
    place(box, {
      x: x + (anchor === "left" ? 0 : 0),
      y: y + Math.sin((t - t0) * 0.7 + ph) * 6 * a,
      s: (0.9 + 0.1 * a) * (1 + 0.04 * b),
      r: rot,
      o,
    });
    ghost.style.opacity = opa(0.17 * a);
    edge.style.opacity = opa(Math.min(1, a * 1.3));
    box.style.visibility = o > 0.001 ? "inherit" : "hidden";
  });
  return box;
}

/**
 * A ROUND BADGE, floating free.
 *
 * The blueprint scatters small discs around its handset, each carrying a
 * mark. Ours carry the brand's own 3D objects, a line glyph or the Vallo
 * mark, on the product's navy with a sky rim, and they drift.
 *
 *   kind   "object" | "glyph" | "mark"
 *   tone   "navy" (the usual) or "paper" (one white badge in a shot at most)
 */
export function badgeDisc(ctx, parent, { name, kind = "object", x, y, size = 130, t0, t1 = null, rot = 0, drift = 1, seed = 1, delay = 0, tone = "navy" }) {
  const paper = tone === "paper";
  const box = ctx.el("div", {
    class: "abs",
    attrs: { "data-furn": "1" },
    style: {
      left: "0px", top: "0px", width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      display: "grid", placeItems: "center", transformOrigin: "50% 50%",
      background: paper ? "linear-gradient(165deg, #ffffff 0%, #e4eeff 100%)" : "linear-gradient(165deg, rgb(34 48 126) 0%, rgb(9 15 56) 100%)",
      boxShadow: paper
        ? "inset 0 0 0 2px rgb(255 255 255 / 0.9), 0 26px 44px -18px rgb(0 10 50 / 0.7)"
        : `inset 0 0 0 ${(size * 0.015).toFixed(2)}px rgb(143 211 255 / 0.52), inset 0 2px 0 rgb(255 255 255 / 0.16), 0 0 ${(size * 0.3).toFixed(0)}px -4px rgb(0 105 254 / 0.45), 0 26px 44px -18px rgb(0 0 14 / 0.85)`,
    },
  }, parent);
  if (kind === "object") {
    ctx.img(ctx.src.object(name), { style: { width: `${size * 0.7}px`, height: `${size * 0.7}px`, objectFit: "contain", filter: "drop-shadow(0 10px 16px rgb(0 0 25 / 0.5))" } }, box);
  } else if (kind === "mark") {
    ctx.img(ctx.src.brand("vallo-mark.png"), { style: { width: `${size * 0.52}px`, height: `${size * 0.52}px`, objectFit: "contain" } }, box);
  } else {
    const ic = ctx.icon(name, { size: Math.round(size * 0.42), stroke: 2.2 }, box);
    ic.style.color = paper ? "#0069fe" : "#8FD3FF";
  }
  const rand = ctx.random(seed);
  const ph = rand() * Math.PI * 2;
  ctx.onFrame((t) => {
    const a = ramp(ctx, t, t0 + delay - 0.5, t0 + delay, "back.out(1.8)");
    const b = t1 == null ? 0 : ramp(ctx, t, t1, t1 + 0.4, "power2.in");
    place(box, {
      x: x + Math.cos((t - t0) * 0.55 + ph) * 9 * drift,
      y: y + Math.sin((t - t0) * 0.82 + ph) * 12 * drift - b * 70,
      s: (0.88 + 0.12 * a) * (1 - 0.1 * b),
      r: rot + Math.sin((t - t0) * 0.42 + ph) * 2.2 * drift,
      o: Math.min(a, 1 - b),
    });
  });
  return box;
}
