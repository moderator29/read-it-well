/**
 * Desktop rows 11-13 (23.08-30.58): Signature 1. On "call" the page dims, and
 * its cost rows' names and amounts (never the "Paid to / Kept by" column) and
 * the section title lift in place toward the camera as live type, restacking
 * as the receipt in RECEIPT; their originals leave the page as they lift, so
 * nothing shows twice. The surface fades in under them. Unnamed lines wait at
 * 15% and each lights as it is named; the amounts arc into the total, which
 * rolls and lands on ₦26,100,000 on "right". Card 1 waits at the right of the
 * receipt with its question from the settle, opens on its answer as the total
 * lands, and leaves for the top right in the last 0.2 s. Under the fold (one
 * scaling move into the Maitama villa card, at rest at 30.577) the window goes
 * to WINDOW_LEFT on d-thread-lt, undimmed (scenes/handoffs.md, "A -> B").
 */
import { LAYOUT, QUESTIONS } from "./layout.js";
import { questionCard, squiggle } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW_L, rectQuad, lerpQuad, placeOnQuad, LINES, TOTAL, naira, rollNumber, measure, cropCanvas, freshLayers } from "./a-common.js";
import { LOW_REST, LEFT, cssToStage } from "./a-d-product.js";

/* The hand-off to section b (handoffs.md, desktop). */
export const D_OUT = {
  villa: { x: 1206, y: 330, w: 600, h: 405.5 },
  crop: { x: 1884, y: 980, w: 796, h: 538 }, // d-thread-lt capture px: the Maitama card
};

const GREY = "#7d8698";
/* d-listing-cost-lt, css px (the capture's ink, measured): what lifts, and where it sits on the page. */
const PAGE_TITLE = { x: 340, y: 110.25, size: 25 }; // ink 340.5-636.5 x 114-137.5
const PAGE_NAMES = [220, 288, 378, 468, 558, 657].map((ink) => ({ x: 413.5, y: ink - 1.9, size: 14 }));
const PAGE_AMOUNTS = [231.5, 310.5, 400.5, 490.5, 579.5, 658].map((ink, k) => ({ right: k === 5 ? 977.75 : 978, y: ink - 1.9, size: 14 }));
/* The page's own words for each line (the grey part is the page's own qualifier). */
const NAME_TEXT = [["Rent", " (yearly)"], ["Agency fee", ""], ["Legal fee", ""], ["Agreement fee", ""], ["Caution deposit", " (refundable)"], ["Service charge", ""]];
/* The originals, patched as they lift (capture px / 2, with a margin; white on the card, grey page on the title). */
const PATCHES = [
  { x: 338, y: 110, w: 302, h: 32, bg: "#f3f4f1" },
  ...[[440, 467, 995], [576, 603, 978], [756, 783, 948], [936, 963, 1024], [1116, 1143, 1209], [1314, 1341, 1028]].map(([y0, y1, x1]) => ({ x: 412, y: y0 / 2 - 2, w: x1 / 2 - 412 + 3, h: (y1 - y0) / 2 + 4, bg: "#fff" })),
  ...[[1777, 463, 488], [1795, 621, 646], [1795, 801, 826], [1821, 981, 1006], [1792, 1159, 1184], [1798, 1316, 1335]].map(([x0, y0, y1]) => ({ x: x0 / 2 - 2, y: y0 / 2 - 2, w: 980 - x0 / 2 + 2, h: (y1 - y0) / 2 + 4, bg: "#fff" })),
];

export async function buildReceiptDesktop(ctx, T, product) {
  const { tl } = ctx;
  const { win, R, listing } = product;
  const RC = LAYOUT.desktop.RECEIPT; // x 560, y 140, w 800, h 740
  const END = T.end;
  const ir = { immediateRender: false };
  const framing = () => ({ x: Number(ctx.gsap.getProperty(R, "x")), y: Number(ctx.gsap.getProperty(R, "y")), s: Number(ctx.gsap.getProperty(R, "scale")) });

  /* ---------- the page: it dims first; its lifted pieces leave it as they lift ---------- */
  const patches = PATCHES.map((b) => ctx.el("div", { class: "abs", style: { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, background: b.bg, visibility: "hidden", zIndex: "5" } }, listing.el));
  ctx.onFrame((t) => {
    const on = t >= T.call;
    for (const n of patches) if ((n.style.visibility !== "hidden") !== on) n.style.visibility = on ? "inherit" : "hidden";
  });
  const dim = ctx.el("div", { class: "abs", style: { inset: "0px", background: "rgb(11 18 48)", opacity: "0", zIndex: "30" } }, win.content);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 0.55, duration: 0.22, ease: "power2.out" }, T.call);

  /* ---------- the receipt: a shell (the surface, which morphs in the fold) and a body (the content,
     which only ever scales evenly); the lifted pieces live in the body, so they fold with it ---------- */
  const scene = ctx.scene("a-receipt", T.call, END, { z: 9 });
  const shell = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${RC.w}px`, height: `${RC.h}px`, transformOrigin: "0 0" } }, scene);
  const surface = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", background: "#fff", boxShadow: SHADOW_L, border: "1px solid rgb(11 18 48 / 0.06)", opacity: "0" } }, shell);
  const body = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${RC.w}px`, height: `${RC.h}px`, transformOrigin: "0 0" } }, scene);
  /* what the receipt prints itself (it fades in with the surface) */
  const print = ctx.el("div", { class: "abs", style: { inset: "0px", opacity: "0" } }, body);
  const PAD = 56;
  const RIGHT = RC.w - PAD; // amounts end at stage x 1304
  const perf = (y) => ctx.el("div", { class: "abs", style: { left: "36px", right: "36px", top: `${y}px`, height: "0px", borderTop: "3px dashed #e2e6ee" } }, print);
  ctx.el("div", { class: "abs", text: "Four bedroom villa in Maitama, Abuja", style: { left: `${PAD}px`, top: "100px", font: "500 24px/1.2 Inter, sans-serif", color: "#5b6475", whiteSpace: "nowrap" } }, print);
  perf(148);
  const ROW0 = 166;
  const ROW_H = 72;
  const NAME_FONT = "600 28px Inter";
  const rows = LINES.map((line, k) => {
    const top = ROW0 + k * ROW_H;
    const band = ctx.el("div", { class: "abs", style: { left: "24px", right: "24px", top: `${top + 2}px`, height: `${ROW_H - 8}px`, borderRadius: "16px", background: "rgb(0 105 254 / 0.08)", opacity: "0" } }, print);
    const noteText = line.note && line.note !== "(refundable)" ? line.note : null;
    const nameW = measure(NAME_TEXT[k][0], NAME_FONT, -0.01) + (NAME_TEXT[k][1] ? measure(NAME_TEXT[k][1], "500 28px Inter", -0.01) : 0);
    const note = noteText ? ctx.el("div", { class: "abs", text: noteText, style: { left: `${PAD + nameW + 16}px`, top: `${top + 21}px`, font: "500 22px/1.2 Inter, sans-serif", color: "#646c7e", whiteSpace: "nowrap", opacity: "0" } }, print) : null;
    return { top, band, note };
  });
  perf(ROW0 + 6 * ROW_H + 14);
  const TT = ROW0 + 6 * ROW_H + 32;
  ctx.el("div", { class: "abs", text: "Total to move in", style: { left: `${PAD}px`, top: `${TT + 8}px`, font: "600 28px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: NAVY, whiteSpace: "nowrap" } }, print);
  const chip = ctx.el("div", { class: "abs", text: "Example", style: { left: `${PAD}px`, top: `${TT + 50}px`, padding: "4px 13px 5px", borderRadius: "99px", font: "600 20px/1.2 Inter, sans-serif", color: "#0056d0", background: "rgb(0 105 254 / 0.08)", border: "1px solid rgb(0 105 254 / 0.18)", opacity: "0" } }, print);
  const totalFont = "700 60px Poppins";
  const totalW = measure("₦26,100,000", totalFont, -0.02);
  const blank = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 8}px`, width: `${Math.round(totalW)}px`, height: "58px", borderRadius: "12px", border: "3px dashed #dfe4ee" } }, print);
  const odoWrap = ctx.el("div", { class: "abs", style: { right: `${PAD}px`, top: `${TT + 4}px`, opacity: "0" } }, print);
  const roll0 = T.flies[0] + 0.28;
  rollNumber(ctx, odoWrap, { value: TOTAL, t0: roll0, t1: T.right, font: `${totalFont}, Inter, sans-serif`, color: ELECTRIC });
  tl.fromTo(odoWrap, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, roll0 - 0.02);
  tl.fromTo(blank, { opacity: 1 }, { opacity: 0, duration: 0.16, ease: "power1.out" }, roll0 - 0.04);
  tl.fromTo(chip, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, T.right + 0.02);
  squiggle(ctx, print, { x: RC.w - PAD - totalW, y: TT + 74, w: totalW, t: T.right + 0.06, dur: 0.5, color: ELECTRIC, stroke: 6 });

  /* ---------- the geometry: the lift, the settle, the slow push, the fold ---------- */
  const lift = { t0: T.call + 0.04, dur: 0.9, stagger: 0.03 };
  const settle = { t0: T.call + 0.2, t1: T.call + 1.0 };
  const liftEnd = lift.t0 + 0.07 + 5 * lift.stagger + lift.dur;
  const fold = { t0: T.cardOut - 0.26, t1: END };
  const PUSH_END = 1.02;
  const V = D_OUT.villa;
  const restS = (t) => (0.97 + 0.03 * ctx.ease("power2.out")(ctx.progress(t, settle.t0, settle.t1))) * (1 + (PUSH_END - 1) * ctx.ease("drift")(ctx.progress(t, liftEnd, fold.t0)));
  const C0 = { x: RC.x + RC.w / 2, y: RC.y + RC.h / 2 };
  const CV = { x: V.x + V.w / 2, y: V.y + V.h / 2 };
  const foldK = (t) => ctx.ease("power3.inOut")(ctx.progress(t, fold.t0, fold.t1));
  /** The body's top-left and scale at t (the pieces are placed in its frame). */
  const bodyFrame = (t) => {
    if (t < fold.t0) {
      const s = restS(t);
      return { x: C0.x - (RC.w * s) / 2, y: C0.y - (RC.h * s) / 2, s };
    }
    const k = foldK(t);
    const s = PUSH_END + (V.h / RC.h - PUSH_END) * k;
    const c = { x: C0.x + (CV.x - C0.x) * k, y: C0.y + (CV.y - C0.y) * k };
    return { x: c.x - (RC.w * s) / 2, y: c.y - (RC.h * s) / 2, s };
  };
  const restEnd = rectQuad(C0.x, C0.y, RC.w * PUSH_END, RC.h * PUSH_END, 0);
  const villaQ = rectQuad(CV.x, CV.y, V.w, V.h, 0);
  /* the villa card (identical to section b's), which the receipt becomes */
  const villa = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${D_OUT.crop.w}px`, height: `${D_OUT.crop.h}px`, transformOrigin: "0 0", overflow: "hidden", borderRadius: "26px", boxShadow: SHADOW_L, visibility: "hidden" } }, scene);
  await cropCanvas(ctx, ctx.src.capture("d-thread-lt"), D_OUT.crop, { parent: villa });
  const XF = 0.2; // the cross-fade into the villa card: the fold's last 0.2 s
  const RAD = { from: 40 * PUSH_END, to: 26 * (V.w / D_OUT.crop.w) };
  /* One hook owns the shell's and the body's transforms, the surface's opacity and radius, the
     printed content's opacity and the villa card's, for every frame. */
  ctx.onFrame((t) => {
    const bf = bodyFrame(t);
    placeOnQuad(body, RC.w, RC.h, rectQuad(bf.x + (RC.w * bf.s) / 2, bf.y + (RC.h * bf.s) / 2, RC.w * bf.s, RC.h * bf.s, 0));
    if (t < fold.t0) {
      placeOnQuad(shell, RC.w, RC.h, rectQuad(C0.x, C0.y, RC.w * bf.s, RC.h * bf.s, 0));
      const a = ctx.ease("power1.out")(ctx.progress(t, settle.t0, settle.t0 + 0.25));
      surface.style.opacity = String(a);
      surface.style.borderRadius = "40px";
      print.style.opacity = String(a);
      villa.style.visibility = "hidden";
      return;
    }
    const k = foldK(t);
    const q = lerpQuad(restEnd, villaQ, k);
    placeOnQuad(shell, RC.w, RC.h, q);
    const w = q[1].x - q[0].x;
    const h = q[3].y - q[0].y;
    const r = RAD.from + (RAD.to - RAD.from) * k;
    surface.style.borderRadius = `${((r * RC.w) / w).toFixed(2)}px / ${((r * RC.h) / h).toFixed(2)}px`;
    const x = ctx.progress(t, fold.t1 - XF, fold.t1);
    villa.style.visibility = x > 0 ? "inherit" : "hidden";
    const c = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
    placeOnQuad(villa, D_OUT.crop.w, D_OUT.crop.h, rectQuad(c.x, c.y, w, w * (V.h / V.w), 0));
    villa.style.opacity = String(x);
    surface.style.opacity = String(1 - x);
    print.style.opacity = String(1 - x);
  });

  /* ---------- the pieces: the title, the six names and the six amounts, as live type ---------- */
  const pieces = [];
  const piece = (parts, weight, size, { from, to, row, align = "left", t0, family = "Inter", ls = -0.01 }) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", transformOrigin: "0 0", whiteSpace: "nowrap", font: `${weight} ${size}px/1 ${family}, Inter, sans-serif`, letterSpacing: `${ls}em`, color: NAVY, visibility: "hidden" } }, body);
    parts.forEach(([text, grey]) => ctx.el("span", { text, style: grey ? { color: GREY, fontWeight: "500" } : {} }, el));
    const width = parts.reduce((s, [text, grey]) => s + measure(text, `${grey ? 500 : weight} ${size}px ${family}`, ls), 0);
    const pc = { el, from, to, row, align, t0, size, width };
    pieces.push(pc);
    return pc;
  };
  piece([["What you will actually pay", false]], "600", 44, { from: PAGE_TITLE, to: { x: PAD, y: 34 }, row: -1, t0: lift.t0, family: "Poppins", ls: -0.02 });
  const amountEls = [];
  LINES.forEach((line, k) => {
    const top = ROW0 + k * ROW_H + 18;
    const t0 = lift.t0 + 0.04 + k * lift.stagger;
    const parts = NAME_TEXT[k].filter((s) => s).map((s, i) => [s, i === 1]);
    piece(parts, "600", 28, { from: PAGE_NAMES[k], to: { x: PAD, y: top }, row: k, t0 });
    amountEls[k] = line.amount != null
      ? piece([[naira(line.amount), false]], "700", 28, { from: PAGE_AMOUNTS[k], to: { right: RIGHT, y: top }, row: k, align: "right", t0: t0 + 0.02 })
      : piece([["Not declared", true]], "600", 28, { from: PAGE_AMOUNTS[k], to: { right: RIGHT, y: top }, row: k, align: "right", t0: t0 + 0.02 });
  });
  /* Each piece: from its place on the page (the live framing) to its place on the receipt, in the
     body's frame; the rows arrive at 15% and light as they are named, with a small pop. */
  pieces.forEach((pc) => {
    ctx.onFrame((t) => {
      const on = t >= T.call && t < END;
      pc.el.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const bf = bodyFrame(t);
      const f = framing();
      const k = ctx.ease("glide")(ctx.progress(t, pc.t0, pc.t0 + lift.dur));
      /* the page: stage point of the piece's anchor, then into the body's frame */
      const sPage = (pc.from.size * f.s) / pc.size / bf.s;
      const aPage = pc.align === "right" ? cssToStage(f, pc.from.right, pc.from.y) : cssToStage(f, pc.from.x, pc.from.y);
      const pageL = { x: (aPage.x - bf.x) / bf.s, y: (aPage.y - bf.y) / bf.s };
      const toL = pc.align === "right" ? { x: pc.to.right, y: pc.to.y } : { x: pc.to.x, y: pc.to.y };
      const lit = pc.row < 0 ? 1 : ctx.progress(t, T.lines[pc.row] - 0.04, T.lines[pc.row] + 0.16);
      const pop = pc.row < 0 ? 1 : 1 + 0.03 * Math.sin(Math.PI * ctx.progress(t, T.lines[pc.row] - 0.04, T.lines[pc.row] + 0.3));
      const s0 = sPage + (1 - sPage) * k;
      const s = s0 * pop;
      const ax = pageL.x + (toL.x - pageL.x) * k;
      const ay = pageL.y + (toL.y - pageL.y) * k - (36 * Math.sin(Math.PI * k)) / bf.s;
      /* the anchor is the piece's left end, or its right end for an amount; the pop grows about the line's middle */
      const left = pc.align === "right" ? ax - pc.width * s : ax;
      const dy = (pc.size * (s - s0)) / 2;
      pc.el.style.transform = `translate(${left.toFixed(2)}px, ${(ay - dy).toFixed(2)}px) scale(${s.toFixed(5)})`;
      const land = 1 + (0.15 - 1) * k;
      pc.el.style.opacity = String(pc.row < 0 ? 1 : land + (1 - land) * lit);
    });
  });
  /* Row 12: each line lights as it is named, its percentage beside it. */
  rows.forEach((r, k) => {
    const t = T.lines[k];
    tl.fromTo(r.band, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" }, t - 0.04);
    tl.fromTo(r.band, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power1.inOut", ...ir }, t + 0.45);
    if (r.note) tl.fromTo(r.note, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, t + 0.02);
  });

  /* Row 13: the five amounts fly one by one into the total: a copy lifts off its line and arcs out to
     the right (never across the names), at 0.7 of its size or more, and down into the total slot. */
  const BULGE = 96;
  LINES.forEach((line, k) => {
    if (line.amount == null) return;
    const top = ROW0 + k * ROW_H + 18;
    const fly = ctx.el("div", { class: "abs", text: naira(line.amount), style: { right: `${PAD}px`, top: `${top}px`, font: "700 28px/1 Inter, sans-serif", letterSpacing: "-0.01em", color: ELECTRIC, whiteSpace: "nowrap", visibility: "hidden", transformOrigin: "100% 50%" } }, body);
    const t0 = T.flies[k];
    const dy = TT + 22 - top;
    ctx.onFrame((t) => {
      const raw = ctx.progress(t, t0, t0 + 0.5);
      const on = raw > 0 && raw < 1;
      fly.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const u = ctx.ease("power2.inOut")(raw);
      fly.style.transform = `translate(${(4 * BULGE * u * (1 - u)).toFixed(1)}px, ${(dy * u).toFixed(1)}px) scale(${(1 - 0.3 * u).toFixed(3)})`;
      fly.style.opacity = String(Math.min(1, raw * 8) * (1 - ctx.progress(raw, 0.82, 1)));
    });
    tl.fromTo(amountEls[k].el, { color: NAVY }, { color: "#9aa3b4", duration: 0.2, ease: "power1.out" }, t0 + 0.02);
  });

  /* ---------- card 1: at the right of the receipt, clear of its lines ---------- */
  const cardScene = ctx.scene("a-card1", T.cardIn, END, { z: 10 });
  const box = { x: 1384, y: 150, w: 500, h: 160 };
  const card = questionCard(ctx, cardScene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box, fontSize: 34 });
  Object.assign(card.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card.back.style, { justifyContent: "center", textAlign: "center", fontSize: "28px", lineHeight: "1.22", textWrap: "balance" });
  freshLayers(ctx, [card.root], { from: T.cardIn, to: END });
  /* in from the top right (wholly off frame at its first frame) as the receipt settles; its question
     stays still through the print (v3.2: 1.25 s at least) */
  tl.fromTo(card.root, { x: 520, y: -420, rotation: 22 }, { x: 0, y: 0, rotation: 3, duration: 0.5, ease: "back.out(1.15)" }, T.cardIn);
  /* its answer opens exactly as the total lands on "right" (28.87) */
  card.turn(T.cardTurn, { sound: null });
  /* and it leaves for the top right in the section's last 0.2 s, to section c's start: centre
     (2070, -330), 22 deg, 0.9, answer side up */
  const c0 = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  tl.fromTo(card.root, { x: 0, y: 0, rotation: 3, scale: 1 }, { x: 2070 - c0.x, y: -330 - c0.y, rotation: 22, scale: 0.9, duration: 0.2, ease: "power3.in", ...ir }, T.cardOut);

  /* ---------- under the fold: the window goes to WINDOW_LEFT on the thread, and undims ---------- */
  const thread = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", overflow: "hidden", visibility: "hidden", zIndex: "20", opacity: "0" } }, win.content);
  ctx.img(ctx.src.capture("d-thread-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, thread);
  /* The member's own message is sent in section b (row 15): its bubble stays under the same patch
     section b lays over it (b-d-talk.js), so the cut at 30.577 is clean. */
  ctx.el("div", { class: "abs", style: { left: "851px", top: "763px", width: "495px", height: "64px", background: "#f3f4f1" } }, thread);
  ctx.onFrame((t) => {
    const on = t >= fold.t0;
    if ((thread.style.visibility !== "hidden") !== on) thread.style.visibility = on ? "inherit" : "hidden";
  });
  tl.fromTo(thread, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power1.inOut" }, fold.t0);
  tl.fromTo(R, { x: LOW_REST.x, y: LOW_REST.y, scale: LOW_REST.s }, { x: LEFT.x, y: LEFT.y, scale: LEFT.s, duration: fold.t1 - fold.t0, ease: "power3.inOut", ...ir }, fold.t0);
  tl.fromTo(dim, { opacity: 0.55 }, { opacity: 0, duration: fold.t1 - fold.t0, ease: "power2.inOut", ...ir }, fold.t0);

  return { card, villa, shell };
}
