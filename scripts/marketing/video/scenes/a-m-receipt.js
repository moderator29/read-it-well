/**
 * Mobile rows 11-13 (23.08-30.58): Signature 1. On "call" the cost section
 * lifts off the glass toward the camera and becomes a receipt with six empty
 * slots; the lines print as they are named; the amounts fly into the total,
 * which rolls and lands on ₦26,100,000 on "right"; card 1 answers and leaves
 * to the top right; the receipt folds into the Maitama villa card, at rest
 * on section b's A_OUT rect at 30.577 (scenes/handoffs.md, "A -> B").
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, squiggle } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW_L, displayRectQuad, rectQuad, lerpQuad, placeOnQuad, LINES, TOTAL, naira, rollNumber, measure, cropCanvas } from "./a-common.js";

const W = 1080;
const H = 1920;

/* The hand-off to section b: b-m-talk.js A_OUT, recorded in handoffs.md. */
export const A_OUT = {
  phone: { cx: 540, cy: 1500, height: 1180, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 },
  villa: { x: 160, y: 498, w: 760, h: 548 },
  crop: { x: 52, y: 1602, w: 1088, h: 784 }, // thread-light display px: the Maitama card
};

export async function buildReceiptMobile(ctx, T, product) {
  const { tl } = ctx;
  const { P, p } = product;
  const R = LAYOUT.mobile.RECEIPT; // x 90, y 390, w 900, h 820
  const END = T.end;

  /* ---------- the phone sinks and dims under the receipt; the thread comes up on it while it is dim ---------- */
  tl.to(P, { cx: A_OUT.phone.cx, cy: A_OUT.phone.cy, height: A_OUT.phone.height, rx: 0, ry: 0, rz: 0, duration: 1.05, ease: "power3.inOut" }, T.call + 0.05);
  tl.to(P, { opacity: A_OUT.phone.opacity, duration: 0.3, ease: "power2.out" }, T.call - 0.06);
  const thread = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", visibility: "hidden", zIndex: "45" } }, p.screen);
  ctx.img(ctx.src.display("thread-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, thread);
  const threadIn = T.there + 0.2;
  ctx.onFrame((t) => {
    const on = t >= threadIn;
    if ((thread.style.visibility !== "hidden") !== on) thread.style.visibility = on ? "inherit" : "hidden";
  });

  /* ---------- the receipt ---------- */
  const scene = ctx.scene("a-receipt", T.call - 0.02, END, { z: 9 });
  const shell = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${R.w}px`, height: `${R.h}px`, transformOrigin: "0 0" } }, scene);
  const surface = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", background: "#fff", boxShadow: SHADOW_L, border: "1px solid rgb(11 18 48 / 0.06)" } }, shell);
  /* The skin: the screen's own cost section (listing-cost-light), stretched into the receipt's box so it maps back onto the glass at the lift's start. */
  const SKIN = { x: 20, y: 470, w: 1280, h: 2020 };
  const skinWrap = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "44px", overflow: "hidden" } }, shell);
  await cropCanvas(ctx, ctx.src.display("listing-cost-light"), SKIN, { parent: skinWrap, style: { width: `${R.w}px`, height: `${R.h}px` } });
  const body = ctx.el("div", { class: "abs", style: { inset: "0px" } }, shell);

  /* Header: the product's own section title, and the listing. */
  const PAD = 90; // labels start at stage x 180; amounts end at stage x 900
  ctx.el("div", { class: "abs", text: "What you will actually pay", style: { left: `${PAD}px`, top: "44px", font: "700 42px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY, whiteSpace: "nowrap" } }, body);
  ctx.el("div", { class: "abs", text: "Four bedroom villa in Maitama, Abuja", style: { left: `${PAD}px`, top: "98px", font: "500 25px/1.2 Inter, sans-serif", color: "#5b6475", whiteSpace: "nowrap" } }, body);
  const perf = (y) => ctx.el("div", { class: "abs", style: { left: "44px", right: "44px", top: `${y}px`, height: "0px", borderTop: "3px dashed #e2e6ee" } }, body);
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
    ctx.el("div", { class: "abs", text: line.label, style: { left: `${PAD}px`, top: "12px", font: "600 30px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: grey ? "#7d8698" : NAVY, whiteSpace: "nowrap" } }, row);
    if (line.note) ctx.el("div", { class: "abs", text: line.note, style: { left: `${PAD}px`, top: "48px", font: "500 22px/1.2 Inter, sans-serif", color: "#646c7e", whiteSpace: "nowrap" } }, row);
    let amount = null;
    if (!grey) amount = ctx.el("div", { class: "abs", text: naira(line.amount), style: { right: `${PAD}px`, top: "11px", font: "700 32px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, row);
    const sweep = ctx.el("div", { class: "abs", style: { left: "0px", top: "4px", width: "320px", height: `${SLOT_H - 8}px`, background: "linear-gradient(90deg, rgb(0 105 254 / 0), rgb(0 105 254 / 0.09) 50%, rgb(0 105 254 / 0))", visibility: "hidden" } }, body);
    sweep.style.top = `${top + 4}px`;
    return { bars, row, amount, top, sweep };
  });
  /* Each line slides in from the right under a light sweep, as it is named. */
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
  ctx.el("div", { class: "abs", text: "Total to move in", style: { left: `${PAD}px`, top: `${TT + 18}px`, font: "600 30px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, whiteSpace: "nowrap" } }, body);
  const chip = ctx.el("div", { class: "abs", text: "Example", style: { left: `${PAD}px`, top: `${TT + 64}px`, padding: "5px 14px 6px", borderRadius: "99px", font: "600 21px/1.2 Inter, sans-serif", color: "#0056d0", background: "rgb(0 105 254 / 0.08)", border: "1px solid rgb(0 105 254 / 0.18)", opacity: "0" } }, body);
  const totalFont = "700 64px Poppins";
  const totalW = measure("₦26,100,000", totalFont, -0.02);
  const blank = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 24}px`, width: `${Math.round(totalW)}px`, height: "60px", borderRadius: "14px", border: "3px dashed #dfe4ee" } }, body);
  const odoWrap = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 20}px`, letterSpacing: "-0.02em", opacity: "0" } }, body);
  const roll0 = T.flies[0] + 0.28;
  rollNumber(ctx, odoWrap, { value: TOTAL, t0: roll0, t1: T.right, font: `${totalFont}, Inter, sans-serif`, color: ELECTRIC });
  tl.fromTo(odoWrap, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, roll0 - 0.02);
  tl.fromTo(blank, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "power1.out" }, roll0 - 0.04);
  tl.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.right + 0.02);
  /* the underline under "right there": drawn under the total */
  squiggle(ctx, body, { x: R.w - PAD - totalW, y: TT + 96, w: totalW, t: T.right + 0.06, dur: 0.5, color: ELECTRIC, stroke: 6 });

  /* The five amounts fly one by one into the total slot, each with a tick: out into the right
     margin, shrinking, down past the other amounts (never across them), and into the total. */
  slots.forEach((s, k) => {
    if (!s.amount) return;
    const fly = ctx.el("div", { class: "abs", text: naira(LINES[k].amount), style: { right: `${PAD}px`, top: `${s.top + 11}px`, font: "700 32px/1.2 Inter, sans-serif", color: ELECTRIC, whiteSpace: "nowrap", visibility: "hidden", transformOrigin: "100% 50%" } }, body);
    const t0 = T.flies[k];
    const dy = TT + 44 - (s.top + 11);
    ctx.onFrame((t) => {
      const u = ctx.progress(t, t0, t0 + 0.3);
      const on = u > 0 && u < 1;
      fly.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const out = ctx.ease("power2.out")(ctx.progress(u, 0, 0.3));
      const down = ctx.ease("power2.inOut")(ctx.progress(u, 0.18, 0.86));
      const back = ctx.ease("power2.in")(ctx.progress(u, 0.8, 1));
      const x = 62 * out - 70 * back;
      const y = dy * down;
      const sc = 1 - 0.7 * out;
      fly.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${sc.toFixed(3)})`;
      fly.style.opacity = String(Math.min(1, u * 10) * (1 - ctx.progress(u, 0.84, 1)));
    });
    tl.fromTo(s.amount, { color: NAVY }, { color: "#9aa3b4", duration: 0.2, ease: "power1.out" }, t0 + 0.02);
  });

  /* ---------- the lift (row 11): off the glass, toward the camera, into the receipt box ---------- */
  const lift = { t0: T.call, t1: T.call + 1.1 };
  ctx.onFrame((t) => {
    if (t < lift.t0 - 0.01 || t >= fold.t0) return;
    const k = ctx.ease("glide")(ctx.progress(t, lift.t0, lift.t1));
    const from = displayRectQuad(P, W, H, SKIN);
    /* a slow settle after the flight: the last millimetres */
    const settle = 1 + 0.012 * (1 - ctx.ease("power2.out")(ctx.progress(t, lift.t1, lift.t1 + 0.9)));
    const to = rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w * settle, R.h * settle, 0);
    placeOnQuad(shell, R.w, R.h, lerpQuad(from, to, k));
  });
  /* the skin gives way to the empty receipt during the flight */
  tl.fromTo(skinWrap, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: "power1.inOut" }, lift.t0 + 0.12);
  tl.fromTo(body, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.inOut" }, lift.t0 + 0.3);
  tl.fromTo(surface, { borderRadius: "24px" }, { borderRadius: "44px", duration: 0.8, ease: "power2.out" }, lift.t0);

  /* ---------- card 1 answers (row 13) ---------- */
  const cardScene = ctx.scene("a-card1", T.there - 0.4, END, { z: 10 });
  const box = { x: 230, y: 470, w: 620, h: 170 };
  const card = questionCard(ctx, cardScene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize: 40 });
  Object.assign(card.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card.back.style, { justifyContent: "center", textAlign: "center", fontSize: "33px", lineHeight: "1.22", textWrap: "balance" });
  const swing = T.there - 0.26;
  tl.fromTo(card.root, { x: 620, y: -560, rotation: 26, opacity: 1 }, { x: 0, y: 0, rotation: -3, duration: 0.44, ease: "back.out(1.15)" }, swing);
  card.turn(T.there + 0.02, { sound: null });
  const out = T.there + 0.93;
  tl.to(card.root, { x: 760, y: -660, rotation: 24, scale: 0.9, duration: 0.36, ease: "power3.in" }, out);

  /* ---------- the fold: the receipt becomes the Maitama villa card, at rest on A_OUT at 30.577 ---------- */
  const fold = { t0: out + 0.05, t1: END };
  const villaQ = rectQuad(A_OUT.villa.x + A_OUT.villa.w / 2, A_OUT.villa.y + A_OUT.villa.h / 2, A_OUT.villa.w, A_OUT.villa.h, 0);
  const recQ = rectQuad(R.x + R.w / 2, R.y + R.h / 2, R.w, R.h, 0);
  ctx.onFrame((t) => {
    if (t < fold.t0 || t >= END) return;
    const k = ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
    placeOnQuad(shell, R.w, R.h, lerpQuad(recQ, villaQ, k));
  });
  tl.to(body, { opacity: 0, duration: 0.14, ease: "power1.in" }, fold.t0);
  /* The villa card (identical to section b's): it fades in over the folding shell and comes to rest on the rect. */
  const villa = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${A_OUT.crop.w}px`, height: `${A_OUT.crop.h}px`, transformOrigin: "0 0", overflow: "hidden", borderRadius: "40px", boxShadow: SHADOW_L, visibility: "hidden" } }, scene);
  await cropCanvas(ctx, ctx.src.display("thread-light"), A_OUT.crop, { parent: villa });
  /* The card keeps its own aspect, centred on the folding shell, and fades in as the fold closes. */
  const ratio = A_OUT.villa.h / A_OUT.villa.w;
  const cardQ = (k) => {
    const w = R.w + (A_OUT.villa.w - R.w) * k;
    const cx = R.x + R.w / 2 + (A_OUT.villa.x + A_OUT.villa.w / 2 - (R.x + R.w / 2)) * k;
    const cy = R.y + R.h / 2 + (A_OUT.villa.y + A_OUT.villa.h / 2 - (R.y + R.h / 2)) * k;
    return rectQuad(cx, cy, w, w * ratio, 0);
  };
  ctx.onFrame((t) => {
    const on = t >= fold.t0 && t < END;
    villa.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const k = ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
    placeOnQuad(villa, A_OUT.crop.w, A_OUT.crop.h, cardQ(k));
    const a = ctx.clamp((k - 0.2) / 0.45);
    villa.style.opacity = String(a);
    surface.style.opacity = String(1 - ctx.clamp((k - 0.5) / 0.3));
  });

  return { card, villa, shell };
}
