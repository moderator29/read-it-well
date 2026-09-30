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
  /* On "shouldn't" they fade in place (0.2 s), never flying past the frame's edge over the cards. */
  [...w1, ...w2].forEach((s) => tl.fromTo(s, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.in", immediateRender: false }, T.shouldnt - 0.1));

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
  /* the cards become opaque as they gather */
  cards.forEach((c) => tl.fromTo(c.body, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, T.shouldnt - 0.05));
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
  /* (a flat turn to the edge: CSS 3D is raster-cached by Chromium differently depending on seek order) */
  tl.fromTo(mid.inner, { scaleX: 1 }, { scaleX: 0.02, duration: edge - T.rush, ease: "power2.in" }, T.rush);
  [cards[0], cards[2]].forEach((c, k) => {
    tl.to(c.root, { scale: 0.7, opacity: 0, x: `+=${k ? 160 : -160}`, y: "+=90", duration: 0.34, ease: "power2.in" }, T.rush + 0.02);
  });

  /* ================= the Vallo card: rows 03-04 ================= */
  const vallo = ctx.scene("a-vallo", edge - 0.02, T.widen + 0.8, { z: 2 });
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
  /* The card opens from its edge (flat, like the rush that turned the question card to its edge). */
  tl.fromTo(back, { scaleX: 0.02, scaleY: 0.3 }, { scaleX: 1.1, scaleY: 1.1, duration: T.drop - edge, ease: "power3.out" }, edge);

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
  tl.fromTo(mark, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power2.in", immediateRender: false }, T.widen - 0.05);
  tl.fromTo(mark, { scale: 1 }, { scale: 1.35, duration: 0.45, ease: "power2.in", immediateRender: false }, T.widen - 0.05);
  tl.fromTo(wordmark, { scale: 1, opacity: 1 }, { scale: 1.35, opacity: 0, duration: 0.45, ease: "power2.in", immediateRender: false }, T.widen - 0.05);

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
  const clipDay = (node) => ctx.onFrame((t) => {
    const r = t < T.widen ? 0 : radius(t);
    node.style.clipPath = t < openEnd ? `circle(${r.toFixed(1)}px at ${MARK.cx}px ${MARK.cy}px)` : "none";
  });

  return { clipDay, openEnd, cards };
}
