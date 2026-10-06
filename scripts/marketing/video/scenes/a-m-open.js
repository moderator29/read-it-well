/**
 * Mobile rows 01-04 (0.00-8.65): frame one, the three questions, "Finding a
 * place / in Nigeria", the shuffle and the fan, the rush into the Vallo card,
 * the mark and its ring, and the ring opening into daylight.
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard } from "../engine/components.js";
import { SKY, QUIET, SHADOW_NIGHT, fitSize, freshLayers, burst } from "./a-common.js";

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
  /* An opaque body under the glass, from row 03 on (the caller fades it in), so in the stack and the fan
     only the top card's words show. */
  const body = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: card.front.style.borderRadius, background: "linear-gradient(180deg, #1a2358 0%, #111848 100%)", opacity: "0" } });
  card.inner.insertBefore(body, card.inner.firstChild);
  return { ...card, body };
}

/** The riffle's three cuts (card_slide cues; a-common registerSound uses the same beats). */
export const CUT_BEATS = [8.0, 8.7, 9.6];

/**
 * Row 03 (round 4): the three question cards gather into one tight, opaque stack, so only the top
 * card's words ever show (the cards below sit at most 14 px off it, edge only). On each cut the top
 * card flicks edge-on (a flat turn) and tucks under, so the next card's question is the only one up.
 * On "gamble" the stack sways; on the rush the top card (card 3) rushes the camera and turns.
 * Returns { top, edge }.
 */
export function riffle(ctx, T, cards, { C, scale, rushTo, rushScale, awayDx }) {
  const { tl } = ctx;
  const at = (c, dx = 0, dy = 0) => ({ x: C.x - (c.box.x + c.box.w / 2) + dx, y: C.y - (c.box.y + c.box.h / 2) + dy });
  const slots = [{ dy: 14, r: -1.2 }, { dy: 7, r: 0.8 }, { dy: 0, r: 0 }];
  const homes = cards.map((c, k) => ({ ...at(c, 0, slots[k].dy), r: slots[k].r }));
  /* the gather (the cards are all but invisible behind the row 02 words until it is done) */
  cards.forEach((c, k) => tl.to(c.root, { x: homes[k].x, y: homes[k].y, rotation: homes[k].r, scale, duration: 0.5, ease: "power3.inOut" }, T.shouldnt + k * 0.03));
  /* the cuts: card 3 (top), then card 2, then card 1 flick to their edge and tuck under */
  const order = [2, 1, 0];
  CUT_BEATS.forEach((beat, i) => {
    const t = T.b(beat);
    const c = cards[order[i]];
    tl.fromTo(c.inner, { scaleX: 1 }, { scaleX: 0.02, duration: 0.11, ease: "power2.in", immediateRender: false }, t);
    tl.set(c.layer, { zIndex: -i }, t + 0.11);
    tl.fromTo(c.inner, { scaleX: 0.02 }, { scaleX: 1, duration: 0.14, ease: "power2.out", immediateRender: false }, t + 0.11);
  });
  /* on "gamble" the stack sways as one, then drifts */
  cards.forEach((c, k) => {
    tl.to(c.root, { y: homes[k].y - 16, rotation: homes[k].r + 3, duration: 0.42, ease: "back.out(1.5)" }, T.gamble - 0.04);
    tl.to(c.root, { y: homes[k].y - 6, rotation: homes[k].r + 2, duration: T.rush - T.gamble - 0.45, ease: "sine.inOut" }, T.gamble + 0.4);
  });
  /* the rush: the top card (card 3) at the camera, turning to its edge */
  const top = cards[2];
  /* round 5: no edge-on outline; the rushing card cuts to the Vallo card on one frame, mark already printed */
  const edge = T.rush + 0.18;
  tl.set(top.layer, { zIndex: 9 }, T.rush);
  tl.to(top.root, { x: rushTo.x - (top.box.x + top.box.w / 2), y: rushTo.y - (top.box.y + top.box.h / 2), scale: rushScale, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  tl.fromTo(top.inner, { scaleX: 1 }, { scaleX: 0.6, duration: edge - T.rush, ease: "power2.in", immediateRender: false }, T.rush);
  tl.fromTo(top.root, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: "none", immediateRender: false }, edge);
  [cards[0], cards[1]].forEach((c, k) => {
    tl.to(c.root, { scale: scale * 0.8, opacity: 0, x: `+=${k ? awayDx : -awayDx}`, y: "+=80", duration: 0.34, ease: "power2.in" }, T.rush + 0.02);
  });
  return { top, edge };
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

  /* ---------- row 02: "Finding a place / in Nigeria", in WORDS on a soft scrim; the cards are gone ---------- */
  const bandTop = WORDS.y + 56;
  const band = ctx.el("div", {
    class: "abs",
    style: {
      /* round 5: a soft scrim from the top, no edge (was a hard-edged band) */
      left: "0px", top: "0px", width: `${W}px`, height: "700px", zIndex: "10",
      background: "linear-gradient(180deg, rgb(2 6 40 / 0.7) 0%, rgb(2 6 40 / 0.45) 55%, rgb(2 6 40 / 0) 100%)",
    },
  }, night);
  tl.fromTo(band, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: "power2.out" }, T.finding - 0.12);
  tl.to(band, { opacity: 0, duration: 0.28, ease: "power2.in" }, T.shouldnt + 0.02);

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
  /* On "shouldn't" they fade in place (0.2 s), never flying past the frame's edge over the cards. */
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

  /* ---------- row 03: the stack, the riffle, the sway, the rush ---------- */
  /* the cards become opaque as they gather */
  cards.forEach((c) => tl.fromTo(c.body, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, T.shouldnt - 0.05));
  const { edge } = riffle(ctx, T, cards, { C: { x: 540, y: 720 }, scale: 0.9, rushTo: { x: 540, y: 960 }, rushScale: 2.6, awayDx: 160 });

  /* ================= the Vallo card: rows 03-04 ================= */
  const vallo = ctx.scene("a-vallo", edge, T.widen + 0.8, { z: 2 });
  const back = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, borderRadius: "84px", transformOrigin: "540px 960px",
      background: `radial-gradient(58% 34% at 50% 45.8%, rgb(0 105 254 / 0.62) 0%, rgb(0 72 190 / 0.28) 46%, rgb(0 40 120 / 0) 78%),
        radial-gradient(120% 70% at 50% 110%, rgb(0 63 152 / 0.45) 0%, rgb(0 63 152 / 0) 60%),
        linear-gradient(170deg, #03104f 0%, #020a36 48%, #010623 100%)`,
      boxShadow: "inset 0 0 0 4px rgb(92 159 255 / 0.55), inset 0 0 90px rgb(0 105 254 / 0.35)",
    },
  }, vallo);
  /* The Vallo card is cut in on one frame as the rushing card leaves (round 5), its mark already printed. */
  tl.fromTo(back, { scaleX: 0.86, scaleY: 0.86 }, { scaleX: 1.1, scaleY: 1.1, duration: T.drop - edge, ease: "power3.out" }, edge);

  /* Row 04: the mark is printed on the card's back as it opens, so the drop lands a mark that is
     already there; the ring draws, the wordmark rises on "Vallo"; a slow drift through the hold. */
  const MARK = { cx: 540, cy: 880, w: 380 };
  const markH = (MARK.w * 587) / 614;
  const onBack = { w: MARK.w / 1.1, cy: 960 + (MARK.cy - 960) / 1.1 };
  const backMark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${540 - onBack.w / 2}px`, top: `${onBack.cy - (onBack.w * 587) / 614 / 2}px`, width: `${onBack.w}px`, height: `${(onBack.w * 587) / 614}px` } }, back);
  /* The mark and wordmark sit above the opening day (their own layer), so the iris opens from behind
     them as they rush past the camera: no seed of the screen shows before the disc is wide. */
  const logoScene = ctx.scene("a-logo", T.drop - 0.02, T.widen + 0.45, { z: 15 });
  const logo = ctx.el("div", { class: "fill", style: { transformOrigin: `${MARK.cx}px ${MARK.cy}px` } }, logoScene);
  const mark = ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: `${MARK.cx - MARK.w / 2}px`, top: `${MARK.cy - markH / 2}px`, width: `${MARK.w}px`, height: `${markH}px`, visibility: "hidden" } }, logo);
  ctx.onFrame((t) => {
    const landed = t >= T.drop;
    backMark.style.visibility = landed ? "hidden" : "inherit";
    mark.style.visibility = landed ? "inherit" : "hidden";
  });
  /* the drop: the mark takes the landing as a small pulse */
  tl.fromTo(mark, { scale: 1 }, { scale: 1.06, duration: 0.12, ease: "power2.out", immediateRender: false }, T.drop);
  tl.fromTo(mark, { scale: 1.06 }, { scale: 1, duration: 0.42, ease: "power2.inOut", immediateRender: false }, T.drop + 0.12);
  const { ring, dots } = burst(ctx, vallo, { cx: MARK.cx, cy: MARK.cy, r: 285, t: T.drop + 0.06, clearBy: 7.9, color: SKY, stroke: 4, count: 16, seed: 12, dur: 0.75 });
  logo.appendChild(dots);
  const WM = { w: 470 };
  const wmH = (WM.w * 167) / 758;
  const wordmark = ctx.img(ctx.src.brand("vallo-wordmark.png"), { class: "abs", style: { left: `${540 - WM.w / 2}px`, top: "1236px", width: `${WM.w}px`, height: `${wmH}px` } }, logo);
  tl.fromTo(wordmark, { y: 46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "land" }, T.vallo - 0.04);
  tl.fromTo(logo, { scale: 1 }, { scale: 1.03, duration: T.widen - T.drop, ease: "drift" }, T.drop);
  /* Just before the iris opens, the mark and the wordmark rush past the camera through it. */
  tl.fromTo(mark, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "power1.in", immediateRender: false }, T.widen - 0.12);
  tl.fromTo(mark, { scale: 1 }, { scale: 1.15, duration: 0.1, ease: "power1.in", immediateRender: false }, T.widen - 0.12);
  tl.fromTo(wordmark, { scale: 1, opacity: 1 }, { scale: 1.15, opacity: 0, duration: 0.1, ease: "power1.in", immediateRender: false }, T.widen - 0.12);

  /* ================= the iris opens onto daylight ================= */
  /* It opens from a point at the mark's centre onto the device, already rising in place behind it.
     The ring holds at r 285 until the iris reaches it, then rides its edge out. */
  const R0 = 285;
  const R1 = 1240;
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
    Object.assign(edgeRing.style, { left: `${MARK.cx - r}px`, top: `${MARK.cy - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, opacity: String(1 - ctx.progress(t, openEnd - 0.25, openEnd)) });
  });
  /** Clips a day layer to the opening window until it covers the frame. */
  /* (`lag` px: a layer whose disc trails the ground's, so the first frames show clean mist only) */
  const clipDay = (node, lag = 0) => ctx.onFrame((t) => {
    const r = t < T.widen ? 0 : Math.max(0, radius(t) - lag);
    node.style.clipPath = t < openEnd ? `circle(${r.toFixed(1)}px at ${MARK.cx}px ${MARK.cy}px)` : "none";
  });

  return { clipDay, openEnd, cards };
}
