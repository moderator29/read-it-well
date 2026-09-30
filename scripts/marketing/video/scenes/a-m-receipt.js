/**
 * Mobile rows 11-13 (23.08-30.58): Signature 1. On "call" the cost section
 * lifts off the glass toward the camera and becomes a receipt with six empty
 * slots, while the phone fades away (nothing ghosts under the receipt); the
 * lines print as they are named; the amounts arc into the total, which rolls
 * and lands on ₦26,100,000 on "right"; card 1, under the receipt, turns to its
 * answer as the total lands and leaves for the top right at the very end; the
 * receipt folds into the Maitama villa card in one scaling move, at rest on
 * section b's A_OUT rect at 30.577 (scenes/handoffs.md, "A -> B"), with the
 * phone back under it at 30%.
 */
import { QUESTIONS } from "./layout.js";
import { questionCard, squiggle } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW_L, displayRectQuad, rectQuad, lerpQuad, placeOnQuad, LINES, TOTAL, naira, rollNumber, measure, cropCanvas, freshLayers } from "./a-common.js";
import { PUSH_REST } from "./a-m-product.js";

const W = 1080;
const H = 1920;

/* The hand-off to section b: b-m-talk.js A_OUT, recorded in handoffs.md. */
export const A_OUT = {
  phone: { cx: 540, cy: 1500, height: 1180, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 },
  villa: { x: 160, y: 498, w: 760, h: 548 },
  crop: { x: 52, y: 1602, w: 1088, h: 784 }, // thread-light display px: the Maitama card
};

/* The receipt: centred, inside x 150-930 (its slow push keeps it inside x 940), under the pill and
   clear of the captions. (layout.js RECEIPT, 90-990, ran into the platform-button column.) */
export const RECEIPT_M = { x: 150, y: 390, w: 780, h: 820 };

export async function buildReceiptMobile(ctx, T, product) {
  const { tl } = ctx;
  const { P, p } = product;
  const R = RECEIPT_M;
  const END = T.end;
  const ir = { immediateRender: false };

  /* ---------- the phone sinks and fades out under the lift; it comes back at 30% only as the fold lands ---------- */
  /* (fromTo from where row 10's drift leaves it, so the pose chain holds whichever way the film is sought) */
  tl.fromTo(P, { cx: PUSH_REST.cx, cy: PUSH_REST.cy, height: PUSH_REST.height, rx: 0, ry: 0, rz: 0 }, { cx: A_OUT.phone.cx, cy: A_OUT.phone.cy, height: A_OUT.phone.height, rx: 0, ry: 0, rz: 0, duration: 1.05, ease: "power3.inOut", ...ir }, T.call + 0.05);
  tl.fromTo(P, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power2.out", ...ir }, T.call - 0.06);
  tl.fromTo(P, { opacity: 0 }, { opacity: A_OUT.phone.opacity, duration: 0.35, ease: "power1.inOut", ...ir }, END - 0.37);
  /* the thread comes up on the phone while it is invisible */
  const thread = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", visibility: "hidden", zIndex: "45" } }, p.screen);
  ctx.img(ctx.src.display("thread-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, thread);
  /* The member's own message is sent in section b (row 15): its bubble stays under the same patch
     section b lays over it (b-m-talk.js), so the cut at 30.577 is clean. */
  ctx.el("div", { class: "abs", style: { left: "101px", top: "2395px", width: "1058px", height: "252px", background: "#f3f4f1" } }, thread);
  const threadIn = T.there + 0.2;
  ctx.onFrame((t) => {
    const on = t >= threadIn;
    if ((thread.style.visibility !== "hidden") !== on) thread.style.visibility = on ? "inherit" : "hidden";
  });

  /* ---------- the receipt: a shell (surface and skin, which morph) and a body (the content, which only ever scales evenly) ---------- */
  const scene = ctx.scene("a-receipt", T.call - 0.02, END, { z: 9 });
  const shell = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${R.w}px`, height: `${R.h}px`, transformOrigin: "0 0" } }, scene);
  const surface = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", background: "#fff", boxShadow: SHADOW_L, border: "1px solid rgb(11 18 48 / 0.06)" } }, shell);
  /* The skin: the screen's own cost section (listing-cost-light), stretched into the receipt's box so it maps back onto the glass at the lift's start. */
  const SKIN = { x: 20, y: 470, w: 1280, h: 2020 };
  const skinWrap = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", overflow: "hidden" } }, shell);
  await cropCanvas(ctx, ctx.src.display("listing-cost-light"), SKIN, { parent: skinWrap, style: { width: `${R.w}px`, height: `${R.h}px` } });
  /* the body clips its own sweeps and entries to the receipt's shape */
  const body = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${R.w}px`, height: `${R.h}px`, transformOrigin: "0 0", overflow: "hidden", borderRadius: "44px" } }, scene);

  /* Header: the product's own section title, and the listing. */
  const PAD = 66; // labels start at stage x 216; amounts end at stage x 864
  ctx.el("div", { class: "abs", text: "What you will actually pay", style: { left: `${PAD}px`, top: "44px", font: "700 42px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY, whiteSpace: "nowrap" } }, body);
  ctx.el("div", { class: "abs", text: "Four bedroom villa in Maitama, Abuja", style: { left: `${PAD}px`, top: "98px", font: "500 25px/1.2 Inter, sans-serif", color: "#5b6475", whiteSpace: "nowrap" } }, body);
  const perf = (y) => ctx.el("div", { class: "abs", style: { left: "40px", right: "40px", top: `${y}px`, height: "0px", borderTop: "3px dashed #e2e6ee" } }, body);
  perf(146);

  /* Six slots: empty at first (two soft bars), printed as they are named. */
  const SLOT0 = 164;
  const SLOT_H = 78;
  const slots = LINES.map((line, k) => {
    const top = SLOT0 + k * SLOT_H;
    const grey = line.amount == null;
    const bars = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${top}px`, height: `${SLOT_H}px` } }, body);
    ctx.el("div", { class: "abs", style: { left: `${PAD}px`, top: "22px", width: `${grey ? 330 : 190 + (k % 2) * 40}px`, height: "18px", borderRadius: "9px", background: "#eef1f6" } }, bars);
    if (!grey) ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: "22px", width: `${k === 0 ? 200 : 150}px`, height: "18px", borderRadius: "9px", background: "#eef1f6" } }, bars);
    const row = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${top}px`, height: `${SLOT_H}px`, opacity: "0" } }, body);
    ctx.el("div", { class: "abs", text: line.label, style: { left: `${PAD}px`, top: "12px", font: "600 28px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: grey ? "#7d8698" : NAVY, whiteSpace: "nowrap" } }, row);
    if (line.note) ctx.el("div", { class: "abs", text: line.note, style: { left: `${PAD}px`, top: "47px", font: "500 22px/1.2 Inter, sans-serif", color: "#646c7e", whiteSpace: "nowrap" } }, row);
    let amount = null;
    if (!grey) amount = ctx.el("div", { class: "abs", text: naira(line.amount), style: { right: `${PAD}px`, top: "11px", font: "700 32px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, row);
    const sweep = ctx.el("div", { class: "abs", style: { left: "0px", top: `${top + 4}px`, width: "320px", height: `${SLOT_H - 8}px`, background: "linear-gradient(90deg, rgb(0 105 254 / 0), rgb(0 105 254 / 0.09) 50%, rgb(0 105 254 / 0))", visibility: "hidden" } }, body);
    return { bars, row, amount, top, sweep };
  });
  /* Each line slides in from the right under a light sweep, as it is named (both clipped by the body). */
  slots.forEach((s, k) => {
    const t = T.lines[k];
    tl.fromTo(s.bars, { opacity: 1 }, { opacity: 0, duration: 0.14, ease: "power1.out" }, t - 0.02);
    tl.fromTo(s.row, { x: 64, opacity: 0 }, { x: 0, opacity: 1, duration: 0.42, ease: "power3.out" }, t - 0.04);
    ctx.onFrame((tt) => {
      const u = ctx.progress(tt, t - 0.04, t + 0.46);
      const on = u > 0 && u < 1;
      s.sweep.style.visibility = on ? "inherit" : "hidden";
      if (on) s.sweep.style.transform = `translateX(${(-320 + ctx.ease("power2.inOut")(u) * (R.w + 320)).toFixed(1)}px)`;
    });
  });

  /* The total: its label, a blank slot, the odometer that lands on "right", then the Example chip and the underline. */
  perf(652);
  const TT = 670;
  ctx.el("div", { class: "abs", text: "Total to move in", style: { left: `${PAD}px`, top: `${TT + 18}px`, font: "600 28px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, whiteSpace: "nowrap" } }, body);
  const chip = ctx.el("div", { class: "abs", text: "Example", style: { left: `${PAD}px`, top: `${TT + 62}px`, padding: "5px 14px 6px", borderRadius: "99px", font: "600 21px/1.2 Inter, sans-serif", color: "#0056d0", background: "rgb(0 105 254 / 0.08)", border: "1px solid rgb(0 105 254 / 0.18)", opacity: "0" } }, body);
  const totalFont = "700 60px Poppins";
  const totalW = measure("₦26,100,000", totalFont, -0.02);
  const blank = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 24}px`, width: `${Math.round(totalW)}px`, height: "58px", borderRadius: "14px", border: "3px dashed #dfe4ee" } }, body);
  const odoWrap = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 20}px`, letterSpacing: "-0.02em", opacity: "0" } }, body);
  const roll0 = T.flies[0] + 0.28;
  rollNumber(ctx, odoWrap, { value: TOTAL, t0: roll0, t1: T.right, font: `${totalFont}, Inter, sans-serif`, color: ELECTRIC });
  tl.fromTo(odoWrap, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, roll0 - 0.02);
  tl.fromTo(blank, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "power1.out" }, roll0 - 0.04);
  tl.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.right + 0.02);
  /* the underline under "right there": drawn under the total */
  squiggle(ctx, body, { x: R.w - PAD - totalW, y: TT + 92, w: totalW, t: T.right + 0.06, dur: 0.5, color: ELECTRIC, stroke: 6 });

  /* The five amounts fly one by one into the total, each with a tick: a copy lifts off its line and
     arcs through the empty lane between the labels and the amounts (never across other text), at
     three quarters of its size or more, into the total slot. */
  const BULGE = 170;
  slots.forEach((s, k) => {
    if (!s.amount) return;
    const fly = ctx.el("div", { class: "abs", text: naira(LINES[k].amount), style: { right: `${PAD}px`, top: `${s.top + 11}px`, font: "700 32px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: ELECTRIC, whiteSpace: "nowrap", visibility: "hidden", transformOrigin: "100% 50%" } }, body);
    const t0 = T.flies[k];
    const dy = TT + 30 - (s.top + 11);
    ctx.onFrame((t) => {
      const raw = ctx.progress(t, t0, t0 + 0.5);
      const on = raw > 0 && raw < 1;
      fly.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const u = ctx.ease("power2.inOut")(raw);
      const x = -4 * BULGE * u * (1 - u);
      const y = dy * u;
      const sc = 1 - 0.28 * u;
      fly.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      fly.style.opacity = String(Math.min(1, raw * 8) * (1 - ctx.progress(raw, 0.82, 1)));
    });
    tl.fromTo(s.amount, { color: NAVY }, { color: "#9aa3b4", duration: 0.2, ease: "power1.out" }, t0 + 0.02);
  });

  /* ---------- the lift (row 11), the slow push through rows 12-13, and the fold ---------- */
  const lift = { t0: T.call, t1: T.call + 1.1 };
  const fold = { t0: T.cardOut - 0.26, t1: END };
  const V = A_OUT.villa;
  const PUSH_END = 1.02;
  const rest = (t) => {
    const s = 1 + (PUSH_END - 1) * ctx.ease("drift")(ctx.progress(t, lift.t1, fold.t0));
    return rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w * s, R.h * s, 0);
  };
  const restEnd = rest(fold.t0);
  const villaQ = rectQuad(V.x + V.w / 2, V.y + V.h / 2, V.w, V.h, 0);
  /* the villa card (identical to section b's), which the receipt becomes */
  const villa = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${A_OUT.crop.w}px`, height: `${A_OUT.crop.h}px`, transformOrigin: "0 0", overflow: "hidden", borderRadius: "40px", boxShadow: SHADOW_L, visibility: "hidden" } }, scene);
  await cropCanvas(ctx, ctx.src.display("thread-light"), A_OUT.crop, { parent: villa });
  const XF = 0.2; // the cross-fade into the villa card: the fold's last 0.2 s
  const RAD = { from: 44 * PUSH_END, to: 40 * (V.w / A_OUT.crop.w) };
  ctx.onFrame((t) => {
    if (t < fold.t0) {
      /* the lift, then the push: shell and body share one quad */
      const k = ctx.ease("glide")(ctx.progress(t, lift.t0, lift.t1));
      const q = lerpQuad(displayRectQuad(P, W, H, SKIN), rest(t), k);
      placeOnQuad(shell, R.w, R.h, q);
      placeOnQuad(body, R.w, R.h, q);
      surface.style.opacity = "1";
      surface.style.borderRadius = `${(24 + 20 * ctx.ease("power2.out")(ctx.progress(t, lift.t0, lift.t0 + 0.8))).toFixed(2)}px`;
      /* the empty receipt appears as the skin gives way during the flight */
      body.style.opacity = String(ctx.ease("power1.inOut")(ctx.progress(t, lift.t0 + 0.3, lift.t0 + 0.7)));
      villa.style.visibility = "hidden";
      return;
    }
    /* the fold: one move, power3.inOut. The surface morphs to the villa rect; the content scales evenly
       (to the villa's height) about the surface's centre; the villa card fades in over the last 0.2 s. */
    const k = ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
    const q = lerpQuad(restEnd, villaQ, k);
    placeOnQuad(shell, R.w, R.h, q);
    const w = q[1].x - q[0].x;
    const h = q[3].y - q[0].y;
    const c = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
    const sBody = PUSH_END + (V.h / R.h - PUSH_END) * k;
    placeOnQuad(body, R.w, R.h, rectQuad(c.x, c.y, R.w * sBody, R.h * sBody, 0));
    const r = RAD.from + (RAD.to - RAD.from) * k;
    surface.style.borderRadius = `${(r * R.w / w).toFixed(2)}px / ${(r * R.h / h).toFixed(2)}px`;
    const x = ctx.progress(t, fold.t1 - XF, fold.t1);
    villa.style.visibility = x > 0 ? "inherit" : "hidden";
    const vw = w;
    placeOnQuad(villa, A_OUT.crop.w, A_OUT.crop.h, rectQuad(c.x, c.y, vw, vw * (V.h / V.w), 0));
    villa.style.opacity = String(x);
    surface.style.opacity = String(1 - x);
    body.style.opacity = String(1 - x);
  });
  /* the skin gives way to the empty receipt during the flight (the body's opacity, like the shell's
     transform and the surface's radius and opacity, belongs to the hook above, for every frame) */
  tl.fromTo(skinWrap, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.inOut" }, lift.t0 + 0.12);

  /* ---------- card 1 (row 13): under the receipt, clear of its lines and of the captions ---------- */
  const cardScene = ctx.scene("a-card1", T.cardIn, END, { z: 10 });
  const box = { x: 230, y: 1380, w: 620, h: 170 };
  const card = questionCard(ctx, cardScene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize: 40 });
  Object.assign(card.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card.back.style, { justifyContent: "center", textAlign: "center", fontSize: "33px", lineHeight: "1.22", textWrap: "balance" });
  freshLayers(ctx, [card.root], { from: T.cardIn, to: END });
  /* in from the right edge (wholly off frame at its first frame) as "all added up" begins */
  tl.fromTo(card.root, { x: 900, rotation: 14 }, { x: 0, rotation: -2, duration: 0.5, ease: "back.out(1.2)" }, T.cardIn);
  tl.fromTo(card.root, { y: 60 }, { y: 0, duration: 0.5, ease: "power3.out" }, T.cardIn);
  /* it turns as the total lands on "right": the answer is readable from about 28.84 */
  card.turn(T.cardTurn, { sound: null });
  /* and leaves for the top right in the section's last 0.22 s: right first, then up (never over the
     folding card), to section c's start: centre (1300, -105), 24 deg, 0.9, answer side up */
  const cx0 = box.x + box.w / 2;
  const cy0 = box.y + box.h / 2;
  tl.fromTo(card.root, { x: 0, rotation: -2, scale: 1 }, { x: 1300 - cx0, rotation: 24, scale: 0.9, duration: 0.2, ease: "power2.out", ...ir }, T.cardOut);
  tl.fromTo(card.root, { y: 0 }, { y: -105 - cy0, duration: 0.2, ease: "power3.in", ...ir }, T.cardOut);

  return { card, villa, shell };
}
