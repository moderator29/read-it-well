/**
 * Desktop rows 11-13 (23.08-30.58): Signature 1. On "call" the page dims and
 * its cost rows lift in place toward the camera (the line names and amounts
 * only, never the "Paid to / Kept by" column) and restack as the receipt in
 * RECEIPT; the lines light as they are named, with their percentages beside
 * them; the amounts fly into the total, which rolls and lands on ₦26,100,000
 * on "right"; card 1 answers at the right edge and leaves to the top right;
 * the receipt folds into the Maitama villa card, at rest at 30.577, beside
 * the window at WINDOW_LEFT on d-thread-lt (scenes/handoffs.md, "A -> B").
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, squiggle } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW_L, rectQuad, lerpQuad, placeOnQuad, LINES, TOTAL, naira, rollNumber, measure, cropCanvas } from "./a-common.js";
import { LOW_REST, LEFT, cssToStage } from "./a-d-product.js";

/* The hand-off to section b (handoffs.md, desktop). */
export const D_OUT = {
  villa: { x: 1206, y: 330, w: 600, h: 405.5 },
  crop: { x: 1884, y: 980, w: 796, h: 538 }, // d-thread-lt capture px: the Maitama card
};

/* d-listing-cost-lt, capture px (2880 wide): what may lift. */
const TITLE = { x: 675, y: 222, w: 606, h: 60 };
const NAMES = [
  { x: 822, y: 434, w: 180, h: 40 },
  { x: 821, y: 570, w: 164, h: 40 },
  { x: 822, y: 750, w: 133, h: 40 },
  { x: 821, y: 930, w: 210, h: 40 },
  { x: 821, y: 1110, w: 395, h: 40 },
  { x: 821, y: 1308, w: 214, h: 40 },
];
const AMOUNTS = [
  { x: 1771, y: 457, w: 192, h: 38 },
  { x: 1789, y: 615, w: 174, h: 38 },
  { x: 1789, y: 795, w: 174, h: 38 },
  { x: 1815, y: 975, w: 148, h: 38 },
  { x: 1789, y: 1153, w: 174, h: 38 },
  { x: 1792, y: 1308, w: 170, h: 36 },
];

export async function buildReceiptDesktop(ctx, T, product) {
  const { tl } = ctx;
  const { win, R } = product;
  const RC = LAYOUT.desktop.RECEIPT; // x 560, y 140, w 800, h 740
  const END = T.end;
  const src = ctx.src.capture("d-listing-cost-lt");

  /* ---------- the page dims; later the window goes to WINDOW_LEFT and shows the thread ---------- */
  const dim = ctx.el("div", { class: "abs", style: { inset: "0px", background: "rgb(11 18 48)", opacity: "0", zIndex: "30" } }, win.content);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 0.55, duration: 0.5, ease: "power2.out" }, T.call);
  const thread = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", overflow: "hidden", visibility: "hidden", zIndex: "20" } }, win.content);
  ctx.img(ctx.src.capture("d-thread-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, thread);
  const threadIn = T.there + 0.2;
  ctx.onFrame((t) => {
    const on = t >= threadIn;
    if ((thread.style.visibility !== "hidden") !== on) thread.style.visibility = on ? "inherit" : "hidden";
  });
  tl.fromTo(R, { x: LOW_REST.x, y: LOW_REST.y, scale: LOW_REST.s }, { x: LEFT.x, y: LEFT.y, scale: LEFT.s, duration: 0.8, ease: "power3.inOut", immediateRender: false }, threadIn + 0.1);
  tl.to(dim, { opacity: 0, duration: 0.4, ease: "power2.inOut" }, END - 0.5);

  /* ---------- the receipt ---------- */
  const scene = ctx.scene("a-receipt", T.call - 0.02, END, { z: 9 });
  const shell = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${RC.w}px`, height: `${RC.h}px`, transformOrigin: "0 0" } }, scene);
  const surface = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", background: "#fff", boxShadow: SHADOW_L, border: "1px solid rgb(11 18 48 / 0.06)" } }, shell);
  const body = ctx.el("div", { class: "abs", style: { inset: "0px" } }, shell);
  const PAD = 60;
  const RIGHT = RC.w - PAD; // amounts end at stage x 1300
  const perf = (y) => ctx.el("div", { class: "abs", style: { left: "36px", right: "36px", top: `${y}px`, height: "0px", borderTop: "3px dashed #e2e6ee" } }, body);
  ctx.el("div", { class: "abs", text: "Four bedroom villa in Maitama, Abuja", style: { left: `${PAD}px`, top: "118px", font: "500 24px/1.2 Inter, sans-serif", color: "#5b6475", whiteSpace: "nowrap" } }, body);
  perf(162);
  const ROW0 = 184;
  const ROW_H = 72;
  const rows = LINES.map((line, k) => {
    const top = ROW0 + k * ROW_H;
    const band = ctx.el("div", { class: "abs", style: { left: "24px", right: "24px", top: `${top}px`, height: `${ROW_H - 8}px`, borderRadius: "16px", background: "rgb(0 105 254 / 0.07)", opacity: "0" } }, body);
    const noteText = line.note && line.note !== "(refundable)" ? line.note : null;
    const note = noteText ? ctx.el("div", { class: "abs", text: noteText, style: { left: `${PAD + NAMES[k].w + 18}px`, top: `${top + 20}px`, font: "500 22px/1.2 Inter, sans-serif", color: "#646c7e", whiteSpace: "nowrap", opacity: "0" } }, body) : null;
    return { top, band, note };
  });
  perf(ROW0 + 6 * ROW_H + 6);
  const TT = ROW0 + 6 * ROW_H + 22;
  ctx.el("div", { class: "abs", text: "Total to move in", style: { left: `${PAD}px`, top: `${TT + 6}px`, font: "600 28px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, whiteSpace: "nowrap" } }, body);
  const chip = ctx.el("div", { class: "abs", text: "Example", style: { left: `${PAD}px`, top: `${TT + 48}px`, padding: "4px 13px 5px", borderRadius: "99px", font: "600 20px/1.2 Inter, sans-serif", color: "#0056d0", background: "rgb(0 105 254 / 0.08)", border: "1px solid rgb(0 105 254 / 0.18)", opacity: "0" } }, body);
  const totalFont = "700 60px Poppins";
  const totalW = measure("₦26,100,000", totalFont, -0.02);
  const blank = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 6}px`, width: `${Math.round(totalW)}px`, height: "58px", borderRadius: "12px", border: "3px dashed #dfe4ee" } }, body);
  const odoWrap = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 2}px`, opacity: "0" } }, body);
  const roll0 = T.flies[0] + 0.28;
  rollNumber(ctx, odoWrap, { value: TOTAL, t0: roll0, t1: T.right, font: `${totalFont}, Inter, sans-serif`, color: ELECTRIC });
  tl.fromTo(odoWrap, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, roll0 - 0.02);
  tl.fromTo(blank, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "power1.out" }, roll0 - 0.04);
  tl.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.right + 0.02);
  squiggle(ctx, body, { x: RC.w - PAD - totalW, y: TT + 70, w: totalW, t: T.right + 0.06, dur: 0.5, color: ELECTRIC, stroke: 6 });

  /* The surface materialises under the lifting pieces (its transform comes only from the frame hook below). */
  tl.fromTo(shell, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, T.call + 0.3);

  /* ---------- the pieces: the title, the line names and the amounts lift off the page ---------- */
  const piece = async (box, toX, toY, { align = "left", scale = 1 } = {}) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${box.w}px`, height: `${box.h}px`, transformOrigin: "0 0", overflow: "hidden", visibility: "hidden" } }, scene);
    await cropCanvas(ctx, src, box, { parent: el });
    const w = box.w * scale;
    const h = box.h * scale;
    const x = align === "right" ? toX - w : toX;
    return { el, box, to: rectQuad(x + w / 2, toY + h / 2, w, h, 0) };
  };
  const pieces = [];
  /* The title lifts as live type (on the page it sits on the grey ground, so a crop would carry a grey box). */
  const title = ctx.el("div", { class: "abs", text: "What you will actually pay", style: { left: "0px", top: "0px", width: `${TITLE.w}px`, height: `${TITLE.h}px`, transformOrigin: "0 0", font: "600 50px/60px Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } }, scene);
  const titleW = measure("What you will actually pay", "600 50px Poppins", -0.02);
  title.style.width = `${Math.ceil(titleW) + 8}px`;
  const tBox = { ...TITLE, w: Math.ceil(titleW) + 8 };
  pieces.push({ el: title, box: tBox, to: rectQuad(RC.x + PAD + tBox.w / 2 - 2, RC.y + 44 + TITLE.h / 2, tBox.w, TITLE.h, 0), delay: 0, row: -1 });
  for (let k = 0; k < LINES.length; k += 1) {
    const y = RC.y + ROW0 + k * ROW_H + 12;
    pieces.push({ ...(await piece(NAMES[k], RC.x + PAD - 6, y)), delay: 0.05 + k * 0.045, row: k });
    pieces.push({ ...(await piece(AMOUNTS[k], RC.x + RIGHT + 6, y, { align: "right" })), delay: 0.07 + k * 0.045, row: k, amount: true });
  }
  const lift = { t0: T.call + 0.02, dur: 1.0 };
  pieces.forEach((pc) => {
    const onPage = () => {
      const f = { x: Number(ctx.gsap.getProperty(R, "x")), y: Number(ctx.gsap.getProperty(R, "y")), s: Number(ctx.gsap.getProperty(R, "scale")) };
      const a = cssToStage(f, pc.box.x / 2, pc.box.y / 2);
      const w = (pc.box.w / 2) * f.s;
      const h = (pc.box.h / 2) * f.s;
      return rectQuad(a.x + w / 2, a.y + h / 2, w, h, 0);
    };
    let from = null;
    ctx.onFrame((t) => {
      const on = t >= lift.t0 + pc.delay && t < fold.t0 + 0.12;
      pc.el.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      from = onPage();
      const k = ctx.ease("glide")(ctx.progress(t, lift.t0 + pc.delay, lift.t0 + pc.delay + lift.dur));
      const arc = -40 * Math.sin(Math.PI * k);
      placeOnQuad(pc.el, pc.box.w, pc.box.h, lerpQuad(from, pc.to, k).map((p) => ({ x: p.x, y: p.y + arc })));
      /* named lines are bright; the rest wait, a little dim (row 12) */
      const lit = pc.row < 0 ? 1 : ctx.progress(t, T.lines[pc.row] - 0.04, T.lines[pc.row] + 0.2);
      const dimK = pc.row < 0 ? 1 : 0.34 + 0.66 * lit;
      pc.el.style.opacity = String(dimK * (1 - ctx.progress(t, fold.t0, fold.t0 + 0.12)));
    });
  });
  /* Row 12: each line lights as it is named, its percentage beside it. */
  rows.forEach((r, k) => {
    const t = T.lines[k];
    tl.fromTo(r.band, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" }, t - 0.04);
    tl.to(r.band, { opacity: 0, duration: 0.5, ease: "power1.inOut" }, t + 0.45);
    if (r.note) tl.fromTo(r.note, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, t + 0.02);
  });

  /* Row 13: the five amounts fly into the total, down the right margin. */
  LINES.forEach((line, k) => {
    if (line.amount == null) return;
    const top = ROW0 + k * ROW_H + 12;
    const fly = ctx.el("div", { class: "abs", text: naira(line.amount), style: { right: `${PAD - 6}px`, top: `${top}px`, font: "700 28px/1.2 Inter, sans-serif", color: ELECTRIC, whiteSpace: "nowrap", visibility: "hidden", transformOrigin: "100% 50%" } }, body);
    const t0 = T.flies[k];
    const dy = TT + 14 - top;
    ctx.onFrame((t) => {
      const u = ctx.progress(t, t0, t0 + 0.3);
      const on = u > 0 && u < 1;
      fly.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const out = ctx.ease("power2.out")(ctx.progress(u, 0, 0.3));
      const down = ctx.ease("power2.inOut")(ctx.progress(u, 0.18, 0.86));
      const back = ctx.ease("power2.in")(ctx.progress(u, 0.8, 1));
      fly.style.transform = `translate(${(46 * out - 56 * back).toFixed(1)}px, ${(dy * down).toFixed(1)}px) scale(${(1 - 0.72 * out).toFixed(3)})`;
      fly.style.opacity = String(Math.min(1, u * 10) * (1 - ctx.progress(u, 0.84, 1)));
    });
  });

  /* ---------- card 1 answers at the right edge ---------- */
  const cardScene = ctx.scene("a-card1", T.there - 0.26, END, { z: 10 });
  const box = { x: 1250, y: 150, w: 600, h: 160 };
  const card = questionCard(ctx, cardScene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize: 38 });
  Object.assign(card.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card.back.style, { justifyContent: "center", textAlign: "center", fontSize: "31px", lineHeight: "1.22", textWrap: "balance" });
  tl.fromTo(card.root, { x: 520, y: -460, rotation: 24 }, { x: 0, y: 0, rotation: 3, duration: 0.44, ease: "back.out(1.15)" }, T.there - 0.26);
  card.turn(T.there + 0.02, { sound: null });
  const out = T.there + 0.93;
  tl.to(card.root, { x: 520, y: -560, rotation: 22, scale: 0.9, duration: 0.36, ease: "power3.in" }, out);

  /* ---------- the fold: the receipt becomes the Maitama villa card, at rest at 30.577 ---------- */
  const fold = { t0: out + 0.05, t1: END };
  const V = D_OUT.villa;
  const ratio = V.h / V.w;
  const cardQ = (k) => {
    const w = RC.w + (V.w - RC.w) * k;
    const cx = RC.x + RC.w / 2 + (V.x + V.w / 2 - (RC.x + RC.w / 2)) * k;
    const cy = RC.y + RC.h / 2 + (V.y + V.h / 2 - (RC.y + RC.h / 2)) * k;
    return rectQuad(cx, cy, w, w * ratio, 0);
  };
  const shellQ = (k) => lerpQuad(rectQuad(RC.x + RC.w / 2, RC.y + RC.h / 2, RC.w, RC.h, 0), rectQuad(V.x + V.w / 2, V.y + V.h / 2, V.w, V.h, 0), k);
  const villa = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${D_OUT.crop.w}px`, height: `${D_OUT.crop.h}px`, transformOrigin: "0 0", overflow: "hidden", borderRadius: "26px", boxShadow: SHADOW_L, visibility: "hidden" } }, scene);
  await cropCanvas(ctx, ctx.src.capture("d-thread-lt"), D_OUT.crop, { parent: villa });
  ctx.onFrame((t) => {
    if (t < fold.t0 || t >= END) {
      villa.style.visibility = "hidden";
      const m = 0.96 + 0.04 * ctx.ease("power2.out")(ctx.progress(t, T.call + 0.3, T.call + 0.9));
      placeOnQuad(shell, RC.w, RC.h, rectQuad(RC.x + RC.w / 2, RC.y + RC.h / 2, RC.w * m, RC.h * m, 0));
      surface.style.opacity = "1";
      return;
    }
    const k = ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
    placeOnQuad(shell, RC.w, RC.h, shellQ(k));
    villa.style.visibility = "inherit";
    placeOnQuad(villa, D_OUT.crop.w, D_OUT.crop.h, cardQ(k));
    villa.style.opacity = String(ctx.clamp((k - 0.2) / 0.45));
    surface.style.opacity = String(1 - ctx.clamp((k - 0.5) / 0.3));
  });
  tl.to(body, { opacity: 0, duration: 0.14, ease: "power1.in" }, fold.t0);

  return { card, villa, shell };
}
