/**
 * Desktop rows 01-04 (0.00-8.65): frame one (the velvet art as a tall panel
 * at the right, the three questions cascading down the left), "Finding a
 * place / in Nigeria" on a band, the dealer's spread, the rush into the
 * Vallo card, the mark and ring with the horizontal lockup, and the ring
 * opening onto daylight.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { SKY, QUIET, fitSize, freshLayers, burst } from "./a-common.js";
import { nightCard, riffle } from "./a-m-open.js";

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
  /* A mask, not an overlay: the night's own gradient shows through the feather, so no seam at any height. */
  const feather = "linear-gradient(90deg, rgb(0 0 0 / 0) 0px, rgb(0 0 0 / 0.55) 110px, #000 240px)";
  const panel = ctx.el("div", { class: "abs", style: { left: "1060px", top: "0px", width: `${W - 1060}px`, height: `${H}px`, overflow: "hidden", WebkitMaskImage: feather, maskImage: feather } }, world);
  /* (the art sits 80 px left in its panel, so the house and the hotel are both whole) */
  ctx.img(ctx.src.art("step-1-dark.webp"), { class: "abs", style: { left: "-80px", top: "-40px", width: "1080px", height: "1440px" } }, panel);

  const depths = [1.01, 1.028, 1.018];
  const cards = QUESTIONS.map((q, i) => {
    const box = L.CARDS_OPEN[i];
    const layer = ctx.el("div", { class: "fill", style: { transformOrigin: "760px 540px", zIndex: String(i + 1) } }, night);
    tl.fromTo(layer, { scale: 1 }, { scale: depths[i], duration: T.rows[2] + 0.4, ease: "drift" }, 0);
    const card = nightCard(ctx, layer, { q: q.q, a: q.a, box, size: 44, inner: 430 });
    return { ...card, box, layer, i };
  });

  freshLayers(ctx, cards.map((c) => c.root), { to: T.rush + 0.32 });

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
      /* round 5: a soft scrim, no edge (was a band) */
      left: "0px", top: "0px", width: "1260px", height: `${H}px`, zIndex: "10",
      background: "radial-gradient(70% 45% at 30% 72%, rgb(2 6 40 / 0.6) 0%, rgb(2 6 40 / 0) 100%)",
    },
  }, night);
  tl.fromTo(band, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, T.finding - 0.14);
  tl.to(band, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.shouldnt + 0.02);
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
  /* they fade in place (0.2 s), never flying past the frame's edge over the cards */
  [...w1, ...w2].forEach((s) => tl.fromTo(s, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in", immediateRender: false }, T.shouldnt - 0.1));
  /* The cards all but vanish behind the words (8%, blurred), so no type sits over their text. */
  /* round 5: they are gone (0) by 2.30, before "Finding" lands */
  const dimIn = { t0: T.finding - 0.36, t1: T.finding - 0.01 };
  /* (they come back only once they are stacked, so no two questions ever show at once) */
  const dimOut = { t0: T.shouldnt + 0.45, t1: T.shouldnt + 0.65 };
  cards.forEach((c) => {
    tl.fromTo(c.root, { opacity: 1 }, { opacity: 0, duration: dimIn.t1 - dimIn.t0, ease: "power2.out" }, dimIn.t0);
    tl.fromTo(c.root, { opacity: 0 }, { opacity: 1, duration: dimOut.t1 - dimOut.t0, ease: "power2.out", immediateRender: false }, dimOut.t0);
    ctx.onFrame((t) => {
      const d = ctx.ease("power2.out")(ctx.progress(t, dimIn.t0, dimIn.t1)) * (1 - ctx.ease("power2.out")(ctx.progress(t, dimOut.t0, dimOut.t1)));
      c.root.style.filter = d > 0.01 ? `blur(${(6 * d).toFixed(2)}px)` : "none";
    });
  });

  /* ---------- row 03: the stack, the riffle, the sway, the rush (x 320-920, clear of the art) ---------- */
  /* the cards become opaque as they gather */
  cards.forEach((c) => tl.fromTo(c.body, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, T.shouldnt - 0.05));
  const { edge } = riffle(ctx, T, cards, { C: { x: 620, y: 500 }, scale: 0.92, rushTo: { x: 960, y: 540 }, rushScale: 2.8, awayDx: 220 });

  /* ================= the Vallo card: rows 03-04 ================= */
  const vallo = ctx.scene("a-vallo", edge, T.widen + 0.8, { z: 2 });
  const back = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, borderRadius: "84px", transformOrigin: "960px 540px",
      background: `radial-gradient(40% 48% at 50% 47%, rgb(0 105 254 / 0.6) 0%, rgb(0 72 190 / 0.28) 46%, rgb(0 40 120 / 0) 78%),
        radial-gradient(90% 90% at 50% 120%, rgb(0 63 152 / 0.45) 0%, rgb(0 63 152 / 0) 60%),
        linear-gradient(170deg, #03104f 0%, #020a36 48%, #010623 100%)`,
      boxShadow: "inset 0 0 0 4px rgb(92 159 255 / 0.55), inset 0 0 90px rgb(0 105 254 / 0.35)",
    },
  }, vallo);
  /* The Vallo card is cut in on one frame as the rushing card leaves (round 5), its mark already printed. */
  tl.fromTo(back, { scaleX: 0.86, scaleY: 0.86 }, { scaleX: 1.1, scaleY: 1.1, duration: T.drop - edge, ease: "power3.out" }, edge);

  /* Row 04: the mark is printed on the card's back as it opens (so the drop lands a mark already
     there), the ring draws, and on "Vallo" the mark steps left and the wordmark rises beside it: a
     lockup centred in the ring, 40 px clear of it; a slow drift through the hold. */
  const RING = { cx: 960, cy: 530, r: 300 };
  const markW = 300;
  const markH = (markW * 587) / 614;
  /* the lockup at 85% of its size, well inside the ring */
  const LOGO_S = 0.85;
  const onBack = { w: (markW * LOGO_S) / 1.1, cy: 540 + (RING.cy - 540) / 1.1 };
  const backMark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${RING.cx - onBack.w / 2}px`, top: `${onBack.cy - (onBack.w * 587) / 614 / 2}px`, width: `${onBack.w}px`, height: `${(onBack.w * 587) / 614}px` } }, back);
  /* The mark and wordmark sit above the opening day (their own layer), so the iris opens from behind
     them as they rush past the camera: no seed of the screen shows before the disc is wide. */
  const logoScene = ctx.scene("a-logo", T.drop - 0.02, T.widen + 0.45, { z: 15 });
  const logo = ctx.el("div", { class: "fill", style: { transformOrigin: `${RING.cx}px ${RING.cy}px` } }, logoScene);
  /* The landing moves the mark; the step left moves its holder (the two overlap in time, never on one element). */
  const markWrap = ctx.el("div", { class: "abs", style: { left: `${RING.cx - markW / 2}px`, top: `${RING.cy - markH / 2}px`, width: `${markW}px`, height: `${markH}px` } }, logo);
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: "0px", top: "0px", width: `${markW}px`, height: `${markH}px`, visibility: "hidden" } }, markWrap);
  ctx.onFrame((t) => {
    const landed = t >= T.drop;
    backMark.style.visibility = landed ? "hidden" : "inherit";
    mark.style.visibility = landed ? "inherit" : "hidden";
  });
  tl.fromTo(mark, { scale: 1 }, { scale: 1.06, duration: 0.12, ease: "power2.out", immediateRender: false }, T.drop);
  tl.fromTo(mark, { scale: 1.06 }, { scale: 1, duration: 0.42, ease: "power2.inOut", immediateRender: false }, T.drop + 0.12);
  const LOCK = { gap: 24, wm: 300 };
  const markS = 0.62;
  const lockW = markW * markS + LOCK.gap + LOCK.wm;
  const lockX = RING.cx - lockW / 2;
  const stepAt = Math.max(T.drop + 0.02, T.vallo - 0.3);
  tl.fromTo(markWrap, { x: 0, scale: 1 }, { x: lockX + (markW * markS) / 2 - RING.cx, scale: markS, duration: 0.5, ease: "power3.inOut", immediateRender: false }, stepAt);
  const { ring, dots } = burst(ctx, vallo, { cx: RING.cx, cy: RING.cy, r: RING.r, t: T.drop + 0.06, clearBy: 7.9, color: SKY, stroke: 4, count: 16, seed: 12, dur: 0.75 });
  logo.appendChild(dots);
  const wmH = (LOCK.wm * 167) / 758;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: `${lockX + markW * markS + LOCK.gap}px`, top: `${RING.cy - wmH / 2}px`, width: `${LOCK.wm}px`, height: `${wmH}px` } }, logo);
  tl.fromTo(wordmark, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "land" }, T.vallo + 0.12);
  tl.fromTo(logo, { scale: LOGO_S }, { scale: LOGO_S * 1.03, duration: T.widen - T.drop, ease: "drift" }, T.drop);
  /* The lockup lifts and fades out by 8.15 (1.0 -> 1.15, 0.12 s), so the iris opens on a clean ring. */
  tl.fromTo(mark, { opacity: 1 }, { opacity: 0, duration: 0.12, ease: "power1.in", immediateRender: false }, T.widen - 0.16);
  tl.fromTo(markWrap, { scale: markS }, { scale: markS * 1.15, duration: 0.12, ease: "power1.in", immediateRender: false }, T.widen - 0.16);
  tl.fromTo(wordmark, { scale: 1, opacity: 1 }, { scale: 1.15, opacity: 0, duration: 0.12, ease: "power1.in", immediateRender: false }, T.widen - 0.16);

  /* ================= the iris opens onto daylight ================= */
  /* From a point at the ring's centre onto the window, already rising in place behind it; the ring
     holds at r 300 until the iris reaches it, then rides its edge out. */
  const R0 = RING.r;
  const R1 = 1160;
  const openEnd = T.widen + 0.62;
  /* nearly linear from the first frame (no slow seed of a disc), easing in a little */
  const radius = (t) => {
    const p = ctx.progress(t, T.widen, openEnd);
    return p > 0 ? 40 + (R1 - 40) * p * (0.45 + 0.55 * p) : 0;
  };
  const win = ctx.scene("a-ring", T.widen, openEnd + 0.02, { z: 20 });
  const edgeRing = ctx.el("div", { class: "abs", style: { borderRadius: "50%", border: `4px solid ${SKY}`, boxSizing: "border-box" } }, win);
  ctx.onFrame((t) => {
    ring.style.visibility = t < T.widen ? "inherit" : "hidden";
    const r = Math.max(R0 + 2, radius(t));
    Object.assign(edgeRing.style, { left: `${RING.cx - r}px`, top: `${RING.cy - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, opacity: String(1 - ctx.progress(t, openEnd - 0.25, openEnd)) });
  });
  const clipDay = (node) => ctx.onFrame((t) => {
    const r = t < T.widen ? 0 : radius(t);
    node.style.clipPath = t < openEnd ? `circle(${r.toFixed(1)}px at ${RING.cx}px ${RING.cy}px)` : "none";
  });

  return { clipDay, openEnd, cards };
}
