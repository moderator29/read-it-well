/**
 * Mobile rows 01-04 (0.00-8.65): frame one, the three questions, "Finding a
 * place / in Nigeria", the shuffle and the fan, the rush into the Vallo card,
 * the mark and its ring, and the ring opening into daylight.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, ringBurst } from "../engine/components.js";
import { SKY, QUIET, SHADOW_NIGHT, fitSize, freshLayers } from "./a-common.js";

const W = 1080;
const H = 1920;

/** The night's question cards: frosted glass, the question on two balanced lines. */
export function nightCard(ctx, parent, { q, a, box, size = 46, inner = 440 }) {
  const card = questionCard(ctx, parent, { q, a, box, fontSize: size });
  /* All three questions on two balanced lines (the text box is narrower than the shortest
     question), so no card reads one line while another wraps. */
  Object.assign(card.front.style, {
    background: "linear-gradient(180deg, rgb(255 255 255 / 0.15) 0%, rgb(255 255 255 / 0.07) 100%)",
    border: "1.5px solid rgb(255 255 255 / 0.24)",
    boxShadow: `${SHADOW_NIGHT}, inset 0 1px 0 rgb(255 255 255 / 0.16)`,
    justifyContent: "center", textAlign: "center", color: "#fff", textWrap: "balance", lineHeight: "1.14",
    padding: `0 ${Math.round((box.w - inner) / 2)}px`,
  });
  Object.assign(card.back.style, { justifyContent: "center", textAlign: "center", textWrap: "balance", lineHeight: "1.2" });
  /* No night card shows its back in this section (the rush turns card 2 only edge-on). Its back is
     the one 3D-transformed layer a card carries, and Chrome may raster such a layer at a scale kept
     from an earlier frame: without it the cards paint the same whichever way the film is sought. */
  card.back.style.display = "none";
  return card;
}

export function buildOpenMobile(ctx, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const WORDS = L.WORDS; // x 44, y 520, w 896, h 520

  /* ================= the night: rows 01-03 ================= */
  const night = ctx.scene("a-night", 0, T.rush + 0.32, { z: 1 });
  /* The sky meets the art's own top colour (#000b2e) at the art's edge (y 570). */
  ctx.el("div", { class: "fill", style: { background: "linear-gradient(180deg, #000313 0%, #00061c 16%, #000a2a 27%, #000b2e 29.7%, #000b2e 100%)" } }, night);

  /* The slow push: the whole night world, 1.00 -> 1.04 by the end of row 01, drifting on through row 02. */
  const world = ctx.el("div", { class: "fill", style: { transformOrigin: "540px 820px" } }, night);
  tl.fromTo(world, { scale: 1 }, { scale: 1.075, duration: T.rows[2] + 0.4, ease: "drift" }, 0);
  /* The velvet-hills art at native size, anchored low: the house and hotel sit at y 900-1320. */
  ctx.img(ctx.src.art("step-1-dark.webp"), { class: "abs", style: { left: "0px", top: "570px", width: "1080px", height: "1440px" } }, world);

  /* Three depths for the three cards: a little parallax on the push. */
  const depths = [1.012, 1.03, 1.02];
  const cards = QUESTIONS.map((q, i) => {
    /* (card 2 sits 16 px left of its CARDS_OPEN box, so its turned corner stays inside x 940) */
    const box = i === 1 ? { ...L.CARDS_OPEN[i], x: L.CARDS_OPEN[i].x - 16 } : L.CARDS_OPEN[i];
    const layer = ctx.el("div", { class: "fill", style: { transformOrigin: "540px 760px", zIndex: String(i + 1) } }, night);
    tl.fromTo(layer, { scale: 1 }, { scale: depths[i], duration: T.rows[2] + 0.4, ease: "drift" }, 0);
    const card = nightCard(ctx, layer, { q: q.q, a: q.a, box });
    return { ...card, box, layer, i };
  });

  freshLayers(ctx, cards.map((c) => c.root), { to: T.rush + 0.32 });

  /* Row 01: frame one is finished (all three cards readable at t = 0); each card sets down on its beat. */
  const lift = [-3.5, 3, -3];
  cards.forEach((c) => {
    const k = c.i;
    tl.set(c.root, { rotation: c.box.r + lift[k], y: -34 }, 0);
    tl.fromTo(c.root, { y: -34, rotation: c.box.r + lift[k] }, { y: 0, rotation: c.box.r, duration: 0.52, ease: "power2.inOut" }, T.settle[k] - 0.52);
    tl.fromTo(c.front, { scale: 1.025 }, { scale: 1, duration: 0.52, ease: "power2.inOut" }, T.settle[k] - 0.52);
  });
  /* A slow bob once settled, until the gather. */
  cards.forEach((c) => {
    const ph = c.i * 1.7;
    ctx.onFrame((t) => {
      const on = ctx.progress(t, T.settle[c.i], T.settle[c.i] + 0.6) * (1 - ctx.progress(t, T.shouldnt - 0.1, T.shouldnt + 0.2));
      c.front.style.translate = `0px ${(Math.sin((t - T.settle[c.i]) * 2.3 + ph) * 4 * on).toFixed(2)}px`;
    });
  });

  /* ---------- row 02: "Finding a place / in Nigeria", in WORDS on a navy band, over the dimmed cards ---------- */
  const bandTop = WORDS.y + 56;
  const band = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: `${bandTop}px`, width: `${W}px`, height: "300px", zIndex: "10", transformOrigin: "50% 50%",
      background: "linear-gradient(180deg, rgb(2 6 50 / 0) 0%, rgb(2 6 50 / 0.9) 8%, rgb(2 6 50 / 0.9) 92%, rgb(2 6 50 / 0) 100%)",
    },
  }, night);
  tl.fromTo(band, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.42, ease: "power3.out" }, T.finding - 0.12);
  tl.to(band, { scaleY: 0, opacity: 0, duration: 0.28, ease: "power2.in" }, T.shouldnt + 0.02);

  const inner = WORDS.w - 2 * 28;
  const s1 = fitSize("Finding a place", "700 {}px Poppins", 110, inner);
  const s2 = fitSize("in Nigeria", "700 {}px Poppins", 116, inner);
  const lineStyle = (top, size) => ({ left: `${WORDS.x + 28}px`, width: `${inner}px`, top: `${top}px`, height: "130px", zIndex: "11", display: "flex", alignItems: "baseline", gap: `${Math.round(size * 0.24)}px`, letterSpacing: "-0.03em" });
  const line1 = ctx.el("div", { class: "abs display", style: { ...lineStyle(bandTop + 34, s1), justifyContent: "flex-start" } }, night);
  const line2 = ctx.el("div", { class: "abs display", style: { ...lineStyle(bandTop + 150, s2), justifyContent: "flex-end" } }, night);
  const spec1 = [["Finding", s1, 0, T.finding], ["a", Math.round(s1 * 0.94), 6, T.a1], ["place", s1, -4, T.place]];
  const spec2 = [["in", Math.round(s2 * 0.92), 6, T.in1], ["Nigeria", s2, -2, T.nigeria]];
  const mk = (parent, spec, fromX, key) => spec.map(([text, size, dy, t]) => {
    const span = ctx.el("span", { text, style: { display: "inline-block", fontSize: `${size}px`, color: "#fff", position: "relative", top: `${dy}px`, whiteSpace: "pre" } }, parent);
    /* On night, the key word takes the brand's light blues (electric on navy is 4.0:1; these are 7:1 and up). */
    if (text === key) Object.assign(span.style, { background: `linear-gradient(100deg, ${SKY} 0%, ${QUIET} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" });
    tl.fromTo(span, { x: fromX, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, t - 0.07);
    return span;
  });
  /* Each word lands from a little to its right, so it never crosses the word before it. */
  const w1 = mk(line1, spec1, 48, null);
  const w2 = mk(line2, spec2, 48, "Nigeria");
  /* On "shouldn't" they part: the top line out to the left, the bottom line out to the right, leading word first. */
  w1.forEach((s, k) => tl.to(s, { x: -1100, duration: 0.3, ease: "power3.in" }, T.shouldnt - 0.1 + k * 0.03));
  w2.forEach((s, k) => tl.to(s, { x: 1100, duration: 0.3, ease: "power3.in" }, T.shouldnt - 0.1 + (w2.length - 1 - k) * 0.03));

  /* The cards all but vanish behind the words (8%, blurred), so no type sits over their text. */
  const dimIn = { t0: T.finding - 0.1, t1: T.finding + 0.3 };
  const dimOut = { t0: T.shouldnt + 0.02, t1: T.shouldnt + 0.37 };
  cards.forEach((c) => {
    tl.fromTo(c.root, { opacity: 1 }, { opacity: 0.08, duration: dimIn.t1 - dimIn.t0, ease: "power2.out" }, dimIn.t0);
    tl.fromTo(c.root, { opacity: 0.08 }, { opacity: 1, duration: dimOut.t1 - dimOut.t0, ease: "power2.out", immediateRender: false }, dimOut.t0);
    ctx.onFrame((t) => {
      const d = ctx.ease("power2.out")(ctx.progress(t, dimIn.t0, dimIn.t1)) * (1 - ctx.ease("power2.out")(ctx.progress(t, dimOut.t0, dimOut.t1)));
      c.root.style.filter = d > 0.01 ? `blur(${(6 * d).toFixed(2)}px)` : "none";
    });
  });

  /* ---------- row 03: the shuffle, the fan, the rush ---------- */
  const C = { x: 540, y: 720 };
  const at = (c, dx = 0, dy = 0) => ({ x: C.x - (c.box.x + c.box.w / 2) + dx, y: C.y - (c.box.y + c.box.h / 2) + dy });
  const stack = [{ dy: -12, r: -2.2 }, { dy: 0, r: 1.4 }, { dy: 12, r: -0.8 }];
  /* Three cuts, one card each (bottom, middle, top), on the card_slide cues. Each card's moves are one
     chain of tweens that never overlap on a property, so a frame never depends on the seek direction:
     the bottom card's gather carries it straight out to its cut, and the top card's cut hands it
     straight to the fan. */
  const moves = [
    { c: 2, t: T.b(7.1), dx: 460, r: 11, back: -1.5, zb: 0 },
    { c: 1, t: T.b(7.8), dx: -460, r: -11, back: 1.8, zb: -1 },
    { c: 0, t: T.b(8.5), dx: -460, r: -10, back: null, zb: -2 },
  ];
  const OUT = 0.19;
  cards.forEach((c, k) => {
    const home = at(c, 0, stack[k].dy);
    const m = moves.find((mv) => mv.c === k);
    const t0 = T.shouldnt + k * 0.03;
    const out = { x: home.x + m.dx, y: home.y - 26, rotation: m.r };
    if (m.t < t0 + 0.5) {
      tl.to(c.root, { ...out, scale: 0.9, duration: m.t + OUT - t0, ease: "power3.inOut" }, t0);
    } else {
      tl.to(c.root, { x: home.x, y: home.y, rotation: stack[k].r, scale: 0.9, duration: 0.5, ease: "power3.inOut" }, t0);
      tl.to(c.root, { ...out, duration: OUT, ease: "power2.out" }, m.t);
    }
    tl.set(c.layer, { zIndex: m.zb }, m.t + OUT);
    if (m.back != null) tl.to(c.root, { x: home.x, y: home.y, rotation: m.back, duration: 0.2, ease: "power2.inOut" }, m.t + OUT);
  });
  /* On "gamble" they fan like a hand, around a pivot far below the stack. */
  const P = 700;
  const fan = [-16, 0, 16];
  cards.forEach((c, k) => {
    tl.set(c.layer, { zIndex: k + 1 }, T.gamble - 0.02);
    const a = (fan[k] * Math.PI) / 180;
    const p = at(c, P * Math.sin(a), P * (1 - Math.cos(a)) - 40);
    tl.to(c.root, { x: p.x, y: p.y, rotation: fan[k], scale: 0.86, duration: 0.42, ease: "back.out(1.5)" }, T.gamble - 0.04);
    const a2 = ((fan[k] * 1.1) * Math.PI) / 180;
    const p2 = at(c, P * Math.sin(a2), P * (1 - Math.cos(a2)) - 40);
    tl.to(c.root, { x: p2.x, y: p2.y, rotation: fan[k] * 1.1, duration: T.rush - T.gamble - 0.45, ease: "sine.inOut" }, T.gamble + 0.4);
  });
  /* On bar 3's last beat the middle card rushes at the camera and turns (edge-on at rush + 0.27). */
  const mid = cards[1];
  const edge = T.rush + 0.27;
  tl.set(mid.layer, { zIndex: 9 }, T.rush);
  tl.to(mid.root, { y: 960 - (mid.box.y + mid.box.h / 2), x: 540 - (mid.box.x + mid.box.w / 2), scale: 2.6, duration: edge - T.rush, ease: "power2.in" }, T.rush);
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
  freshLayers(ctx, [back], { from: edge - 0.02, to: T.widen + 0.8 });

  /* Row 04: the mark lands at the centre on the drop, the ring draws, the wordmark rises on "Vallo". */
  const MARK = { cx: 540, cy: 880, w: 380 };
  const markH = (MARK.w * 587) / 614;
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${MARK.cx - MARK.w / 2}px`, top: `${MARK.cy - markH / 2}px`, width: `${MARK.w}px`, height: `${markH}px` } }, vallo);
  tl.fromTo(mark, { scale: 1.45, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "land" }, T.drop);
  const ring = ringBurst(ctx, vallo, { cx: MARK.cx, cy: MARK.cy, r: 285, t: T.drop + 0.06, color: SKY, stroke: 4, dots: 16, seed: 12, dur: 0.75 });
  const WM = { w: 470 };
  const wmH = (WM.w * 167) / 758;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: `${540 - WM.w / 2}px`, top: "1236px", width: `${WM.w}px`, height: `${wmH}px` } }, vallo);
  tl.fromTo(wordmark, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "land" }, T.vallo - 0.04);
  /* At the widen, the mark and the wordmark rush past the camera as the ring opens. */
  tl.to([mark, wordmark], { scale: 1.3, opacity: 0, duration: 0.26, ease: "power2.in" }, T.widen);
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
