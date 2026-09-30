/**
 * Mobile rows 01-04 (0.00-8.65): frame one, the three questions, "Finding a
 * place in Nigeria", the shuffle, the rush into the Vallo card, the mark and
 * its ring, and the ring opening into daylight.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, ringBurst } from "../engine/components.js";
import { NAVY, SKY, QUIET, SHADOW_NIGHT } from "./a-common.js";

const W = 1080;
const H = 1920;

export function buildOpenMobile(ctx, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;

  /* ================= the night: rows 01-03 ================= */
  const night = ctx.scene("a-night", 0, T.rush + 0.32, { z: 1 });
  /* The sky meets the art's own top colour (#000b2e) at the art's edge (y 570). */
  ctx.el("div", { class: "fill", style: { background: "linear-gradient(180deg, #000313 0%, #00061c 16%, #000a2a 27%, #000b2e 29.7%, #000b2e 100%)" } }, night);

  /* The slow push: the whole night world, 1.00 -> 1.04 by the end of row 01, still drifting in row 02. */
  const world = ctx.el("div", { class: "fill", style: { transformOrigin: "540px 820px" } }, night);
  tl.fromTo(world, { scale: 1 }, { scale: 1.075, duration: T.rows[2] + 0.4, ease: "drift" }, 0);
  /* The velvet-hills art at native size, anchored low: the house and hotel sit at y 900-1320. */
  ctx.img(ctx.src.art("step-1-dark.webp"), { class: "abs", style: { left: "0px", top: "570px", width: "1080px", height: "1440px" } }, world);

  /* Three depths for the three cards (far, near, middle): a little parallax on the push. */
  const depths = [1.012, 1.03, 1.02];
  const cards = QUESTIONS.map((q, i) => {
    const box = L.CARDS_OPEN[i];
    const layer = ctx.el("div", { class: "fill", style: { transformOrigin: "540px 760px", zIndex: String(i + 1) } }, night);
    tl.fromTo(layer, { scale: 1 }, { scale: depths[i], duration: T.rows[2] + 0.4, ease: "drift" }, 0);
    const card = questionCard(ctx, layer, { q: q.q, a: q.a, box, fontSize: 40 });
    card.front.style.boxShadow = SHADOW_NIGHT + ", inset 0 1px 0 rgb(255 255 255 / 0.10)";
    card.front.style.justifyContent = "center";
    card.front.style.textAlign = "center";
    card.front.style.fontWeight = "600";
    return { ...card, box, layer, i };
  });

  /* Row 01: frame one is finished (all three cards readable at t = 0); each card sets down on its beat. */
  const lift = [-2.5, 2, -2];
  cards.forEach((c) => {
    const k = c.i;
    tl.set(c.root, { rotation: c.box.r + lift[k], y: -26 }, 0);
    tl.fromTo(c.root, { y: -26, rotation: c.box.r + lift[k] }, { y: 0, rotation: c.box.r, duration: 0.5, ease: "power2.inOut" }, T.settle[k] - 0.5);
    tl.fromTo(c.front, { scale: 1.012 }, { scale: 1, duration: 0.5, ease: "power2.inOut" }, T.settle[k] - 0.5);
  });
  /* A slow bob once settled, until the gather (seeded, time-only). */
  cards.forEach((c) => {
    const ph = c.i * 1.7;
    ctx.onFrame((t) => {
      const on = ctx.progress(t, T.settle[c.i], T.settle[c.i] + 0.6) * (1 - ctx.progress(t, T.shouldnt - 0.1, T.shouldnt + 0.2));
      c.front.style.translate = `0px ${(Math.sin((t - T.settle[c.i]) * 2.3 + ph) * 5 * on).toFixed(2)}px`;
    });
  });

  /* ---------- row 02: "Finding a place / in Nigeria" on a navy band ---------- */
  const band = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "950px", width: `${W}px`, height: "260px", zIndex: "10", transformOrigin: "50% 50%",
      background: "linear-gradient(180deg, rgb(2 6 50 / 0) 0%, rgb(2 6 50 / 0.82) 12%, rgb(2 6 50 / 0.82) 88%, rgb(2 6 50 / 0) 100%)",
    },
  }, night);
  tl.fromTo(band, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.42, ease: "power3.out" }, T.finding - 0.12);
  tl.to(band, { scaleY: 0, opacity: 0, duration: 0.3, ease: "power2.in" }, T.shouldnt + 0.08);

  const lineStyle = (top) => ({ left: "0px", right: "0px", top: `${top}px`, height: "120px", zIndex: "11", display: "flex", alignItems: "baseline", gap: "0.24em", fontSize: "108px" });
  const line1 = ctx.el("div", { class: "abs display", style: { ...lineStyle(966), justifyContent: "flex-start", paddingLeft: "64px" } }, night);
  const line2 = ctx.el("div", { class: "abs display", style: { ...lineStyle(1086), justifyContent: "flex-end", paddingRight: "140px" } }, night);
  const spec1 = [["Finding", 108, 0, T.finding], ["a", 100, 8, T.a1], ["place", 112, -6, T.place]];
  const spec2 = [["in", 102, 6, T.in1], ["Nigeria", 114, -4, T.nigeria]];
  const mk = (parent, spec, fromX, key) => spec.map(([text, size, dy, t]) => {
    const span = ctx.el("span", { text, style: { display: "inline-block", fontSize: `${size}px`, color: "#fff", position: "relative", top: `${dy}px`, whiteSpace: "pre" } }, parent);
    if (text === key) Object.assign(span.style, { background: `linear-gradient(100deg, ${SKY} 0%, ${QUIET} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
    tl.fromTo(span, { x: fromX, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, t - 0.07);
    return span;
  });
  const w1 = mk(line1, spec1, -120, null);
  const w2 = mk(line2, spec2, 120, "Nigeria");
  /* On "shouldn't" they part: the top line out to the left, the bottom line out to the right. */
  w1.forEach((s, k) => tl.to(s, { x: -1000, duration: 0.42, ease: "power3.in" }, T.shouldnt - 0.02 + (w1.length - 1 - k) * 0.035));
  w2.forEach((s, k) => tl.to(s, { x: 1000, duration: 0.42, ease: "power3.in" }, T.shouldnt - 0.02 + k * 0.035));

  /* The cards dim behind the words. */
  cards.forEach((c) => {
    tl.fromTo(c.root, { opacity: 1 }, { opacity: 0.36, duration: 0.4, ease: "power2.out" }, T.finding - 0.1);
    tl.to(c.root, { opacity: 1, duration: 0.35, ease: "power2.out" }, T.shouldnt + 0.02);
  });

  /* ---------- row 03: the shuffle, the fan, the rush ---------- */
  const C = { x: 540, y: 700 };
  const at = (c, dx = 0, dy = 0) => ({ x: C.x - (c.box.x + c.box.w / 2) + dx, y: C.y - (c.box.y + c.box.h / 2) + dy });
  const stack = [{ dy: -12, r: -2.2 }, { dy: 0, r: 1.4 }, { dy: 12, r: -0.8 }];
  /* Gather at the centre as the words part. */
  cards.forEach((c, k) => {
    const p = at(c, 0, stack[k].dy);
    tl.to(c.root, { x: p.x, y: p.y, rotation: stack[k].r, scale: 0.9, duration: 0.5, ease: "power3.inOut" }, T.shouldnt + 0.0 + k * 0.03);
  });
  /* Three cuts, one card each (top to bottom), on the card_slide cues. */
  const moves = [
    { c: 2, t: T.b(7.1), dx: 470, r: 11, back: -1.5, zb: 0 },
    { c: 1, t: T.b(7.8), dx: -470, r: -11, back: 1.8, zb: -1 },
    { c: 0, t: T.b(8.5), dx: 470, r: 10, back: -0.6, zb: -2 },
  ];
  moves.forEach((m) => {
    const c = cards[m.c];
    const home = at(c, 0, stack[m.c].dy);
    tl.to(c.root, { x: home.x + m.dx, y: home.y - 26, rotation: m.r, duration: 0.19, ease: "power2.out" }, m.t);
    tl.set(c.layer, { zIndex: m.zb }, m.t + 0.19);
    tl.to(c.root, { x: home.x, y: home.y, rotation: m.back, duration: 0.2, ease: "power2.inOut" }, m.t + 0.19);
  });
  /* On "gamble" they fan like a hand, around a pivot far below the stack. */
  const P = 760;
  const fan = [-15, 0, 15];
  cards.forEach((c, k) => {
    tl.set(c.layer, { zIndex: k + 1 }, T.gamble - 0.02);
    const a = (fan[k] * Math.PI) / 180;
    const p = at(c, P * Math.sin(a), P * (1 - Math.cos(a)));
    tl.to(c.root, { x: p.x, y: p.y, rotation: fan[k], scale: 0.84, duration: 0.42, ease: "back.out(1.5)" }, T.gamble - 0.04);
    /* The hand opens a touch while it is held. */
    const a2 = ((fan[k] * 1.12) * Math.PI) / 180;
    const p2 = at(c, P * Math.sin(a2), P * (1 - Math.cos(a2)));
    tl.to(c.root, { x: p2.x, y: p2.y, rotation: fan[k] * 1.12, duration: T.rush - T.gamble - 0.45, ease: "sine.inOut" }, T.gamble + 0.4);
  });
  /* On bar 3's last beat the middle card rushes at the camera and turns (edge-on at rush + 0.27). */
  const mid = cards[1];
  const edge = T.rush + 0.27;
  tl.set(mid.layer, { zIndex: 9 }, T.rush);
  tl.to(mid.root, { y: 960 - (mid.box.y + mid.box.h / 2), scale: 2.6, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  tl.fromTo(mid.inner, { rotationY: 0 }, { rotationY: 90, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  [cards[0], cards[2]].forEach((c, k) => {
    tl.to(c.root, { scale: 0.7, opacity: 0, x: `+=${k ? 160 : -160}`, y: "+=90", duration: 0.34, ease: "power2.in" }, T.rush + 0.02);
  });

  /* ================= the Vallo card: rows 03-04 ================= */
  const vallo = ctx.scene("a-vallo", edge - 0.02, T.widen + 0.8, { z: 2 });
  const persp = ctx.el("div", { class: "fill", style: { perspective: "1700px", perspectiveOrigin: "540px 960px" } }, vallo);
  const back = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, borderRadius: "84px", transformOrigin: "540px 960px",
      background: `radial-gradient(58% 34% at 50% 45.8%, rgb(0 105 254 / 0.62) 0%, rgb(0 72 190 / 0.28) 46%, rgb(0 40 120 / 0) 78%),
        radial-gradient(120% 70% at 50% 110%, rgb(0 63 152 / 0.45) 0%, rgb(0 63 152 / 0) 60%),
        linear-gradient(170deg, #03104f 0%, #020a36 48%, #010623 100%)`,
      boxShadow: "inset 0 0 0 4px rgb(92 159 255 / 0.55), inset 0 0 90px rgb(0 105 254 / 0.35)",
    },
  }, persp);
  tl.fromTo(back, { rotationY: -90, scale: 0.3 }, { rotationY: 0, scale: 1.1, duration: T.drop - edge, ease: "power3.out" }, edge);

  /* Row 04: the mark lands at the centre on the drop, the ring draws, the wordmark rises on "Vallo". */
  const MARK = { cx: 540, cy: 880, w: 380 };
  const markH = (MARK.w * 587) / 614;
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${MARK.cx - MARK.w / 2}px`, top: `${MARK.cy - markH / 2}px`, width: `${MARK.w}px`, height: `${markH}px` } }, vallo);
  tl.fromTo(mark, { scale: 1.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "land" }, T.drop);
  const ring = ringBurst(ctx, vallo, { cx: MARK.cx, cy: MARK.cy, r: 285, t: T.drop + 0.06, color: SKY, stroke: 4, dots: 18, seed: 12, dur: 0.75 });
  const WM = { w: 470 };
  const wmH = (WM.w * 167) / 758;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: `${540 - WM.w / 2}px`, top: "1236px", width: `${WM.w}px`, height: `${wmH}px` } }, vallo);
  tl.fromTo(wordmark, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "land" }, T.vallo - 0.04);
  /* At the widen, the mark and the wordmark rush past the camera as the ring opens. */
  tl.to([mark, wordmark], { scale: 1.3, opacity: 0, duration: 0.3, ease: "power2.in" }, T.widen);
  tl.to(ring, { opacity: 0, duration: 0.01 }, T.widen);

  /* ================= the ring opens onto daylight ================= */
  const R0 = 285;
  const R1 = 1240;
  const openEnd = T.widen + 0.62;
  const radius = (t) => R0 + (R1 - R0) * ctx.ease("power3.in")(ctx.progress(t, T.widen, openEnd));
  const win = ctx.scene("a-ring", T.widen, openEnd + 0.02, { z: 20 });
  const edgeRing = ctx.el("div", { class: "abs", style: { borderRadius: "50%", border: `4px solid ${SKY}` } }, win);
  ctx.onFrame((t) => {
    if (t < T.widen || t > openEnd + 0.02) return;
    const r = radius(t);
    Object.assign(edgeRing.style, { left: `${MARK.cx - r}px`, top: `${MARK.cy - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, opacity: String(1 - ctx.progress(t, openEnd - 0.25, openEnd)) });
  });
  /** Clips a day layer to the opening window until it covers the frame. */
  const clipDay = (node) => ctx.onFrame((t) => {
    const r = t < T.widen ? 0 : radius(t);
    node.style.clipPath = t < openEnd ? `circle(${r.toFixed(1)}px at ${MARK.cx}px ${MARK.cy}px)` : "none";
  });

  return { clipDay, openEnd, cards };
}
