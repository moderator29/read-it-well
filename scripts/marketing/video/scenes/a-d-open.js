/**
 * Desktop rows 01-04 (0.00-8.65): frame one (the velvet art as a tall panel
 * at the right, the three questions cascading down the left), "Finding a
 * place / in Nigeria" on a band, the dealer's spread, the rush into the
 * Vallo card, the mark and ring with the horizontal lockup, and the ring
 * opening onto daylight.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { ringBurst } from "../engine/components.js";
import { SKY, QUIET, fitSize } from "./a-common.js";
import { nightCard } from "./a-m-open.js";

const W = 1920;
const H = 1080;

export function buildOpenDesktop(ctx, T) {
  const { tl } = ctx;
  const L = LAYOUT.desktop;

  /* ================= the night: rows 01-03 ================= */
  const night = ctx.scene("a-night", 0, T.rush + 0.32, { z: 1 });
  ctx.el("div", { class: "fill", style: { background: "linear-gradient(180deg, #000313 0%, #00071f 22%, #000a2a 40%, #000b2e 60%, #000b2e 100%)" } }, night);
  const world = ctx.el("div", { class: "fill", style: { transformOrigin: "1300px 560px" } }, night);
  tl.fromTo(world, { scale: 1 }, { scale: 1.06, duration: T.rows[2] + 0.4, ease: "drift" }, 0);
  /* The velvet-hills art at native size, a tall panel at the right; its left edge feathers into the night. */
  const panel = ctx.el("div", { class: "abs", style: { left: "1060px", top: "0px", width: `${W - 1060}px`, height: `${H}px`, overflow: "hidden" } }, world);
  ctx.img(ctx.src.art("step-1-dark.webp"), { class: "abs", style: { left: "-20px", top: "-40px", width: "1080px", height: "1440px" } }, panel);
  ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "200px", height: `${H}px`, background: "linear-gradient(90deg, #000b2e 0%, rgb(0 11 46 / 0.6) 45%, rgb(0 11 46 / 0) 100%)" } }, panel);

  const depths = [1.01, 1.028, 1.018];
  const cards = QUESTIONS.map((q, i) => {
    const box = L.CARDS_OPEN[i];
    const layer = ctx.el("div", { class: "fill", style: { transformOrigin: "760px 540px", zIndex: String(i + 1) } }, night);
    tl.fromTo(layer, { scale: 1 }, { scale: depths[i], duration: T.rows[2] + 0.4, ease: "drift" }, 0);
    const card = nightCard(ctx, layer, { q: q.q, a: q.a, box, size: 44 });
    return { ...card, box, layer, i };
  });

  /* Row 01: all three readable at t = 0; each sets down on its beat. */
  const lift = [-3.5, 3, -3];
  cards.forEach((c) => {
    const k = c.i;
    tl.set(c.root, { rotation: c.box.r + lift[k], y: -30 }, 0);
    tl.fromTo(c.root, { y: -30, rotation: c.box.r + lift[k] }, { y: 0, rotation: c.box.r, duration: 0.52, ease: "power2.inOut" }, T.settle[k] - 0.52);
    tl.fromTo(c.front, { scale: 1.025 }, { scale: 1, duration: 0.52, ease: "power2.inOut" }, T.settle[k] - 0.52);
    const ph = k * 1.7;
    ctx.onFrame((t) => {
      const on = ctx.progress(t, T.settle[k], T.settle[k] + 0.6) * (1 - ctx.progress(t, T.shouldnt - 0.1, T.shouldnt + 0.2));
      c.front.style.translate = `0px ${(Math.sin((t - T.settle[k]) * 2.3 + ph) * 4 * on).toFixed(2)}px`;
    });
  });

  /* ---------- row 02: "Finding a place" (y 700) / "in Nigeria" (y 820), on a band at the left ---------- */
  const band = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "640px", width: "1260px", height: "280px", zIndex: "10", transformOrigin: "0% 50%",
      background: "linear-gradient(90deg, rgb(2 6 50 / 0.86) 0%, rgb(2 6 50 / 0.86) 70%, rgb(2 6 50 / 0) 100%)",
    },
  }, night);
  tl.fromTo(band, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.5, ease: "power3.out" }, T.finding - 0.14);
  tl.to(band, { scaleX: 0, opacity: 0, duration: 0.3, ease: "power2.in" }, T.shouldnt + 0.02);
  const s1 = fitSize("Finding a place", "700 {}px Poppins", 112, 1000);
  const s2 = fitSize("in Nigeria", "700 {}px Poppins", 116, 1000);
  const line = (top, size) => ctx.el("div", { class: "abs display", style: { left: "120px", top: `${top}px`, height: "130px", zIndex: "11", display: "flex", alignItems: "baseline", gap: `${Math.round(size * 0.24)}px`, letterSpacing: "-0.03em" } }, night);
  const line1 = line(652, s1);
  const line2 = line(772, s2);
  line2.style.left = "300px";
  const mk = (parent, spec, fromX, key) => spec.map(([text, size, dy, t]) => {
    const span = ctx.el("span", { text, style: { display: "inline-block", fontSize: `${size}px`, color: "#fff", position: "relative", top: `${dy}px`, whiteSpace: "pre" } }, parent);
    if (text === key) Object.assign(span.style, { background: `linear-gradient(100deg, ${SKY} 0%, ${QUIET} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
    tl.fromTo(span, { x: fromX, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, t - 0.07);
    return span;
  });
  /* Each word lands from a little to its right, so it never crosses the word before it. */
  const w1 = mk(line1, [["Finding", s1, 0, T.finding], ["a", Math.round(s1 * 0.94), 6, T.a1], ["place", s1, -4, T.place]], 60, null);
  const w2 = mk(line2, [["in", Math.round(s2 * 0.92), 6, T.in1], ["Nigeria", s2, -2, T.nigeria]], 60, "Nigeria");
  w1.forEach((s, k) => tl.to(s, { x: -1500, duration: 0.3, ease: "power3.in" }, T.shouldnt - 0.1 + k * 0.03));
  w2.forEach((s, k) => tl.to(s, { x: 1700, duration: 0.3, ease: "power3.in" }, T.shouldnt - 0.1 + (w2.length - 1 - k) * 0.03));
  cards.forEach((c) => {
    tl.fromTo(c.root, { opacity: 1 }, { opacity: 0.3, duration: 0.4, ease: "power2.out" }, T.finding - 0.1);
    tl.to(c.root, { opacity: 1, duration: 0.35, ease: "power2.out" }, T.shouldnt + 0.02);
  });

  /* ---------- row 03: the cards gather, then deal across the width like a dealer's spread ---------- */
  const C = { x: 960, y: 480 };
  const at = (c, dx = 0, dy = 0) => ({ x: C.x - (c.box.x + c.box.w / 2) + dx, y: C.y - (c.box.y + c.box.h / 2) + dy });
  const stack = [{ dy: -10, r: -2 }, { dy: 0, r: 1.2 }, { dy: 10, r: -0.8 }];
  cards.forEach((c, k) => {
    const p = at(c, 0, stack[k].dy);
    tl.to(c.root, { x: p.x, y: p.y, rotation: stack[k].r, scale: 0.92, duration: 0.5, ease: "power3.inOut" }, T.shouldnt + k * 0.03);
  });
  /* The deal (the card_slide cues): right, left, then the last card to the centre. */
  const spots = [{ c: 2, dx: 560, r: 4, t: T.b(7.1) }, { c: 0, dx: -560, r: -4, t: T.b(7.8) }, { c: 1, dx: 0, r: 0, t: T.b(8.5) }];
  spots.forEach((s) => {
    const c = cards[s.c];
    const p = at(c, s.dx, 10);
    tl.to(c.root, { x: p.x, y: p.y - 40, rotation: s.r * 1.6, duration: 0.2, ease: "power2.out" }, s.t);
    tl.to(c.root, { y: p.y, rotation: s.r, duration: 0.24, ease: "back.out(1.6)" }, s.t + 0.2);
  });
  tl.set(cards[1].layer, { zIndex: 5 }, T.b(8.5));
  /* On "gamble" the spread fans a touch, like a hand; the centre card stays on top. */
  const fan = [{ c: 0, dx: -560, dy: 40, r: -8 }, { c: 1, dx: 0, dy: -6, r: 0 }, { c: 2, dx: 560, dy: 40, r: 8 }];
  fan.forEach((f) => {
    const c = cards[f.c];
    const p = at(c, f.dx, f.dy);
    tl.to(c.root, { x: p.x, y: p.y, rotation: f.r, duration: 0.42, ease: "back.out(1.5)" }, T.gamble - 0.04);
    tl.to(c.root, { y: p.y + (f.c === 1 ? -8 : 8), rotation: f.r * 1.1, duration: T.rush - T.gamble - 0.45, ease: "sine.inOut" }, T.gamble + 0.4);
  });
  /* On bar 3's last beat the centre card rushes at the camera and turns. */
  const mid = cards[1];
  const edge = T.rush + 0.27;
  tl.set(mid.layer, { zIndex: 9 }, T.rush);
  tl.to(mid.root, { x: 960 - (mid.box.x + mid.box.w / 2), y: 540 - (mid.box.y + mid.box.h / 2), scale: 2.8, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  tl.fromTo(mid.inner, { rotationY: 0 }, { rotationY: 90, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  [cards[0], cards[2]].forEach((c, k) => {
    tl.to(c.root, { scale: 0.75, opacity: 0, x: `+=${k ? 220 : -220}`, y: "+=80", duration: 0.34, ease: "power2.in" }, T.rush + 0.02);
  });

  /* ================= the Vallo card: rows 03-04 ================= */
  const vallo = ctx.scene("a-vallo", edge - 0.02, T.widen + 0.8, { z: 2 });
  const persp = ctx.el("div", { class: "fill", style: { perspective: "2200px", perspectiveOrigin: "960px 540px" } }, vallo);
  const back = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, borderRadius: "84px", transformOrigin: "960px 540px",
      background: `radial-gradient(40% 48% at 50% 47%, rgb(0 105 254 / 0.6) 0%, rgb(0 72 190 / 0.28) 46%, rgb(0 40 120 / 0) 78%),
        radial-gradient(90% 90% at 50% 120%, rgb(0 63 152 / 0.45) 0%, rgb(0 63 152 / 0) 60%),
        linear-gradient(170deg, #03104f 0%, #020a36 48%, #010623 100%)`,
      boxShadow: "inset 0 0 0 4px rgb(92 159 255 / 0.55), inset 0 0 90px rgb(0 105 254 / 0.35)",
    },
  }, persp);
  tl.fromTo(back, { rotationY: -90, scale: 0.3 }, { rotationY: 0, scale: 1.1, duration: T.drop - edge, ease: "power3.out" }, edge);

  /* Row 04: the mark lands in the ring on the drop; on "Vallo" it steps left and the wordmark rises beside it. */
  const RING = { cx: 960, cy: 530, r: 300 };
  const markW = 300;
  const markH = (markW * 587) / 614;
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${RING.cx - markW / 2}px`, top: `${RING.cy - markH / 2}px`, width: `${markW}px`, height: `${markH}px` } }, vallo);
  tl.fromTo(mark, { scale: 1.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "land" }, T.drop);
  tl.to(mark, { x: -170, scale: 0.62, duration: 0.55, ease: "power3.inOut" }, T.vallo - 0.06);
  const ring = ringBurst(ctx, vallo, { cx: RING.cx, cy: RING.cy, r: RING.r, t: T.drop + 0.06, color: SKY, stroke: 4, dots: 16, seed: 12, dur: 0.75 });
  const wmW = 350;
  const wmH = (wmW * 167) / 758;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: `${RING.cx - 60}px`, top: `${RING.cy - wmH / 2}px`, width: `${wmW}px`, height: `${wmH}px` } }, vallo);
  tl.fromTo(wordmark, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "land" }, T.vallo + 0.06);
  tl.to([mark, wordmark], { scale: "+=0.3", opacity: 0, duration: 0.26, ease: "power2.in" }, T.widen);
  tl.to(ring, { opacity: 0, duration: 0.01 }, T.widen);

  /* ================= the ring opens onto daylight ================= */
  const R0 = RING.r;
  const R1 = 1160;
  const openEnd = T.widen + 0.62;
  const radius = (t) => R0 + (R1 - R0) * ctx.ease("power3.in")(ctx.progress(t, T.widen, openEnd));
  const win = ctx.scene("a-ring", T.widen, openEnd + 0.02, { z: 20 });
  const edgeRing = ctx.el("div", { class: "abs", style: { borderRadius: "50%", border: `4px solid ${SKY}` } }, win);
  ctx.onFrame((t) => {
    if (t < T.widen || t > openEnd + 0.02) return;
    const r = radius(t);
    Object.assign(edgeRing.style, { left: `${RING.cx - r}px`, top: `${RING.cy - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, opacity: String(1 - ctx.progress(t, openEnd - 0.25, openEnd)) });
  });
  const clipDay = (node) => ctx.onFrame((t) => {
    const r = t < T.widen ? 0 : radius(t);
    node.style.clipPath = t < openEnd ? `circle(${r.toFixed(1)}px at ${RING.cx}px ${RING.cy}px)` : "none";
  });

  return { clipDay, openEnd, cards };
}
