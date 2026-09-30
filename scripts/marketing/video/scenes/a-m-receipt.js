/**
 * Mobile rows 11-13 (23.08-30.58): Signature 1. On "call" the cost section
 * lifts off the glass and becomes a receipt with six empty slots; the lines
 * print as they are named; the amounts fly into the total, which rolls and
 * lands on ₦26,100,000 on "right"; card 1 answers; card 1 leaves to the top
 * right and the receipt folds into the Maitama villa card, which flies to
 * the phone (PHONE_HIGH, thread-light). Section b lands it (handoffs.md).
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, odometer, squiggle, bodyFromImage } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW, displayRectQuad, rectQuad, lerpQuad, placeOnQuad, LINES, TOTAL, naira } from "./a-common.js";

const W = 1080;
const H = 1920;

/* The hand-off to section b (scenes/handoffs.md, "A -> B"). */
export const VILLA = {
  crop: { x: 48, y: 1602, w: 1095, h: 786, iw: 1320 }, // thread-light display px: the Maitama card, border included
  scale: 0.40338, // display px -> stage px on the phone at PHONE_HIGH
  land: { x: 293.06, y: 707.75 }, // its box's top-left on the phone at PHONE_HIGH (w 441.70, h 317.06)
  from: { x: 26.1, y: -166.3, scale: 1.55, rotation: -4 }, // the fold's end: offsets from the landing box, scale about its centre
  t0: 30.2, // the flight (A draws t < 30.577, B draws t >= 30.577)
  dur: 0.6,
  ease: "glide",
};

export function buildReceiptMobile(ctx, T, product) {
  const { tl } = ctx;
  const { P, p } = product;
  const R = LAYOUT.mobile.RECEIPT; // x 90, y 340, w 900, h 860
  const END = T.end;

  /* ---------- the phone sinks and dims under the receipt, then comes back with the thread ---------- */
  tl.to(P, { cy: 1500, height: 1180, opacity: 0.3, duration: 1.05, ease: "power3.inOut" }, T.call + 0.05);
  const thread = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", visibility: "hidden" } }, p.screen);
  ctx.img(ctx.src.display("thread-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, thread);
  const threadIn = T.there + 0.2;
  tl.set(thread, { visibility: "hidden" }, 0);
  tl.set(thread, { visibility: "visible" }, threadIn);
  tl.to(P, { cy: 640, height: 1180, opacity: 1, duration: 0.8, ease: "power3.inOut" }, threadIn + 0.1);

  /* ---------- the receipt ---------- */
  const scene = ctx.scene("a-receipt", T.call - 0.02, VILLA.t0 + 0.12, { z: 8 });
  const shell = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${R.w}px`, height: `${R.h}px`, transformOrigin: "0 0" } }, scene);
  const surface = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", background: "#fff", boxShadow: SHADOW, border: "1px solid rgb(11 18 48 / 0.06)" } }, shell);
  /* The skin: the screen's own cost section (listing-cost-light), stretched into the receipt's box so it maps back to the glass at the lift's start. */
  const SKIN = { x: 20, y: 470, w: 1280, h: 2020 };
  const skinWrap = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", overflow: "hidden" } }, shell);
  ctx.img(ctx.src.display("listing-cost-light"), {
    class: "abs",
    style: { left: `${(-SKIN.x * R.w) / SKIN.w}px`, top: `${(-SKIN.y * R.h) / SKIN.h}px`, width: `${(1320 * R.w) / SKIN.w}px`, height: `${(2868 * R.h) / SKIN.h}px`, maxWidth: "none" },
  }, skinWrap);
  const body = ctx.el("div", { class: "abs", style: { inset: "0px" } }, shell);

  /* Header: the product's own section title, and the listing. */
  const PAD = 90;
  ctx.el("div", { class: "abs", text: "What you will actually pay", style: { left: `${PAD}px`, top: "50px", font: "700 44px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY } }, body);
  ctx.el("div", { class: "abs", text: "Four bedroom villa in Maitama, Abuja", style: { left: `${PAD}px`, top: "112px", font: "500 26px/1.2 Inter, sans-serif", color: "#5b6475" } }, body);
  const perf = (y) => {
    ctx.el("div", { class: "abs", style: { left: "40px", right: "40px", top: `${y}px`, height: "0px", borderTop: "3px dashed #e2e6ee" } }, body);
  };
  perf(172);

  /* Six slots: empty at first (two soft bars), printed as they are named. */
  const SLOT0 = 196;
  const SLOT_H = 86;
  const RIGHT = R.w - PAD; // amounts right-aligned at stage x 900
  const slots = LINES.map((line, k) => {
    const top = SLOT0 + k * SLOT_H;
    const grey = line.amount == null;
    const bars = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${top}px`, height: `${SLOT_H}px` } }, body);
    ctx.el("div", { class: "abs", style: { left: `${PAD}px`, top: "24px", width: `${k === 5 ? 330 : 190 + (k % 2) * 40}px`, height: "20px", borderRadius: "10px", background: "#eef1f6" } }, bars);
    if (!grey) ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: "24px", width: `${k === 0 ? 200 : 150}px`, height: "20px", borderRadius: "10px", background: "#eef1f6" } }, bars);
    const row = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${top}px`, height: `${SLOT_H}px` } }, body);
    ctx.el("div", { class: "abs", text: line.label, style: { left: `${PAD}px`, top: "14px", font: "600 31px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: grey ? "#8a93a5" : NAVY, whiteSpace: "nowrap" } }, row);
    if (line.note) ctx.el("div", { class: "abs", text: line.note, style: { left: `${PAD}px`, top: "52px", font: "500 23px/1.2 Inter, sans-serif", color: "#6b7385", whiteSpace: "nowrap" } }, row);
    let amount = null;
    if (!grey) amount = ctx.el("div", { class: "abs", text: naira(line.amount), style: { right: `${PAD}px`, top: "13px", font: "700 33px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, row);
    const sweep = ctx.el("div", { class: "abs", style: { left: "0px", top: "6px", width: "340px", height: `${SLOT_H - 12}px`, background: "linear-gradient(90deg, rgb(0 105 254 / 0), rgb(0 105 254 / 0.10) 50%, rgb(0 105 254 / 0))", opacity: 0 } }, row);
    return { bars, row, amount, top, sweep };
  });
  /* Each line slides in from the right under a light sweep, as it is named. */
  slots.forEach((s, k) => {
    const t = T.lines[k];
    tl.fromTo(s.bars, { opacity: 1 }, { opacity: 0, duration: 0.14, ease: "power1.out" }, t - 0.02);
    tl.fromTo(s.row, { x: 70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.42, ease: "power3.out" }, t - 0.04);
    tl.fromTo(s.sweep, { x: -340, opacity: 1 }, { x: R.w, opacity: 1, duration: 0.5, ease: "power2.inOut" }, t - 0.04);
  });

  /* The total: a label, the Example chip, and an odometer that lands on "right". */
  perf(718);
  const totalTop = 736;
  ctx.el("div", { class: "abs", text: "Total to move in", style: { left: `${PAD}px`, top: `${totalTop + 12}px`, font: "600 30px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY } }, body);
  const chip = ctx.el("div", { class: "abs", text: "Example", style: { left: `${PAD}px`, top: `${totalTop + 58}px`, padding: "5px 14px 6px", borderRadius: "99px", font: "600 21px/1.2 Inter, sans-serif", color: "#0056d0", background: "rgb(0 105 254 / 0.08)", border: "1px solid rgb(0 105 254 / 0.18)" } }, body);
  const blank = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${totalTop + 20}px`, width: "380px", height: "64px", borderRadius: "14px", border: "3px dashed #dfe4ee" } }, body);
  const odoWrap = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${totalTop + 10}px`, height: "84px" } }, body);
  const roll0 = T.flies[0] + 0.3;
  const odo = odometer(ctx, odoWrap, { value: TOTAL, t0: roll0, t1: T.right, prefix: "₦", fontSize: 78, color: ELECTRIC, className: "display" });
  Object.assign(odo.style, { position: "relative", letterSpacing: "-0.02em" });
  tl.fromTo(odoWrap, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, roll0 - 0.04);
  tl.fromTo(blank, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power1.out" }, roll0 - 0.06);
  tl.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.right + 0.02);
  /* the underline under "right there": drawn under the total */
  const under = squiggle(ctx, body, { x: R.w - PAD - 470, y: totalTop + 96, w: 470, t: T.right + 0.04, dur: 0.5, color: ELECTRIC, stroke: 7 });
  under.style.opacity = "1";

  /* The five amounts fly one by one into the total slot, each with a tick. */
  slots.forEach((s, k) => {
    if (!s.amount || k > 4) return;
    const fly = ctx.el("div", { class: "abs", text: naira(LINES[k].amount), style: { right: `${PAD}px`, top: `${s.top + 13}px`, font: "700 33px/1.2 Inter, sans-serif", color: ELECTRIC, whiteSpace: "nowrap", opacity: 0 } }, body);
    const t0 = T.flies[k];
    const dy = totalTop + 30 - (s.top + 13);
    tl.fromTo(fly, { x: 0, y: 0, opacity: 0, scale: 1 }, { opacity: 1, duration: 0.06, ease: "none" }, t0);
    tl.fromTo(fly, { x: 0 }, { x: -120, duration: 0.3, ease: "sine.inOut" }, t0);
    tl.fromTo(fly, { y: 0 }, { y: dy, duration: 0.3, ease: "power2.in" }, t0);
    tl.fromTo(fly, { scale: 1 }, { scale: 0.7, duration: 0.3, ease: "power2.in" }, t0);
    tl.to(fly, { opacity: 0, duration: 0.08, ease: "none" }, t0 + 0.24);
    tl.fromTo(s.amount, { color: NAVY }, { color: "#9aa3b4", duration: 0.2, ease: "power1.out" }, t0 + 0.02);
  });

  /* ---------- the lift (row 11): off the glass, into the receipt box ---------- */
  const lift = { t0: T.call, t1: T.call + 1.1 };
  const recRect = rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w, R.h, 0);
  let settle = 0;
  ctx.onFrame((t) => {
    if (t < lift.t0 - 0.01 || t >= VILLA.t0 + 0.12) return;
    const k = ctx.ease("glide")(ctx.progress(t, lift.t0, lift.t1));
    const from = displayRectQuad(P, W, H, SKIN);
    /* a slow settle after the flight: the last millimetres, and a breath */
    settle = 1 + 0.012 * (1 - ctx.ease("power2.out")(ctx.progress(t, lift.t1, lift.t1 + 0.9)));
    const to = rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w * settle, R.h * settle, 0);
    placeOnQuad(shell, R.w, R.h, lerpQuad(from, to, k));
  });
  /* the skin gives way to the empty receipt during the flight */
  tl.fromTo(skinWrap, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.inOut" }, lift.t0 + 0.12);
  tl.fromTo(body, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.inOut" }, lift.t0 + 0.3);
  tl.fromTo(surface, { borderRadius: "24px" }, { borderRadius: "44px", duration: 0.8, ease: "power2.out" }, lift.t0);

  /* ---------- card 1 answers (row 13) ---------- */
  const cardScene = ctx.scene("a-card1", T.there - 0.4, END, { z: 9 });
  const box = { x: 230, y: 454, w: 620, h: 170 };
  const card = questionCard(ctx, cardScene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize: 40 });
  card.front.style.justifyContent = "center";
  card.back.style.justifyContent = "center";
  card.back.style.textAlign = "center";
  card.back.style.fontSize = "33px";
  card.back.style.lineHeight = "1.22";
  const swing = T.there - 0.26;
  tl.fromTo(card.root, { x: 620, y: -560, rotation: 26, opacity: 1 }, { x: 0, y: 0, rotation: -3, duration: 0.44, ease: "back.out(1.15)" }, swing);
  card.turn(T.there + 0.02, { sound: null });
  const out = T.there + 0.93;
  tl.to(card.root, { x: 760, y: -640, rotation: 24, scale: 0.9, duration: 0.36, ease: "power3.in" }, out);

  /* ---------- the fold: the receipt becomes the Maitama villa card ---------- */
  const fold = { t0: out + 0.04, t1: VILLA.t0 };
  const landW = VILLA.crop.w * VILLA.scale;
  const landH = VILLA.crop.h * VILLA.scale;
  const cx0 = VILLA.land.x + landW / 2 + VILLA.from.x;
  const cy0 = VILLA.land.y + landH / 2 + VILLA.from.y;
  const foldTo = rectQuad(cx0, cy0, landW * VILLA.from.scale, landH * VILLA.from.scale, VILLA.from.rotation);
  ctx.onFrame((t) => {
    if (t < fold.t0 || t >= VILLA.t0 + 0.12) return;
    const k = ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
    placeOnQuad(shell, R.w, R.h, lerpQuad(rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w, R.h, 0), foldTo, k));
  });
  tl.to(body, { opacity: 0, duration: 0.14, ease: "power1.in" }, fold.t0);

  /* The villa card (identical in section b): at the fold's end it takes over, then flies. */
  const villaScene = ctx.scene("a-villa", fold.t0 + 0.05, END, { z: 11 });
  const villa = bodyFromImage(ctx, villaScene, { src: ctx.src.display("thread-light"), crop: VILLA.crop, scale: VILLA.scale, x: VILLA.land.x, y: VILLA.land.y, radius: 19.4, light: true });
  villa.style.transformOrigin = "50% 50%";
  tl.fromTo(villa, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out" }, fold.t1 - 0.1);
  tl.fromTo(villa, { x: VILLA.from.x, y: VILLA.from.y, scale: VILLA.from.scale, rotation: VILLA.from.rotation }, { x: 0, y: 0, scale: 1, rotation: 0, duration: VILLA.dur, ease: VILLA.ease }, VILLA.t0);
  tl.to(shell, { opacity: 0, duration: 0.1, ease: "none" }, fold.t1 - 0.02);

  return { card, villa, shell };
}
