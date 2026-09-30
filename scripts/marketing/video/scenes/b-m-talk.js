/**
 * Mobile rows 14 to 18: talking (30.58 to 40.96).
 *   14  the villa card lands on the thread's Maitama card; "owner", "landlord",
 *       "agent" push each other across the phone; the phone pushes in.
 *   15  the composer lifts off; the member's real message types; send; the
 *       bubble flies into its place with its tick.
 *   16  the share sheet rises; "Send in a Vallo chat" lifts and is pressed; the
 *       Banana Island card arcs into the thread; the phone slides right.
 *   17  the day card swings in, its pages turn to Saturday, 11:00 AM stamps.
 *   18  back to the inbox; the day card docks as the unread dot; the push
 *       toward Property | Stays.
 */
import {
  DW, DH, NAVY, ELECTRIC, SHADOW, E, ramp, kf, mix, track, screenPage, showDuring, box, cropBody, quadDriver,
  displayQuad, rectQuad, lerpQuad, shiftQuad, placeQuad, mapQuad, wordPill, exampleChip, phoneQuad, pressAt,
} from "./b-kit.js";

/* Display rects in thread-light (display px). */
const MAITAMA = { x: 52, y: 1602, w: 1088, h: 784 };
const BANANA = { x: 52, y: 806, w: 1088, h: 782 };
const BUBBLE = { x: 117, y: 2398, w: 1026, h: 239 };
const TICK = { x: 1040, y: 2562, w: 54, h: 44 };
const BAR = { x: 0, y: 2690, w: 1320, h: 178 };
/* listing-share-lt: the sheet and its "Send in a Vallo chat" row. */
const SHEET_TOP = 1962;
const SENDROW = { x: 28, y: 2316, w: 1264, h: 290 };
/* messages-lt: the unread dot on the Vallo Examples row. */
const DOT = { x: 200, y: 1439, w: 32, h: 32 };

/* Section a's last frame (A -> B in handoffs.md): the phone and the villa card. */
export const A_OUT = {
  phone: { cx: 540, cy: 1500, height: 1180, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 },
  villa: { x: 160, y: 498, w: 760, h: 548, rot: 0 },
};

const MESSAGE = "I like these two as well. Could we view all three on Saturday morning?";

export async function talk(ctx, S, T) {
  const { tl } = ctx;
  const pL = S.pL;
  const thread = ctx.src.display("thread-light");

  const over = ctx.scene("b-m-talk", T.r14, T.r19 + 0.3, { z: 20 });
  const top = ctx.scene("b-m-talk-type", T.r14, T.r15 + 0.12, { z: 30 });

  /* ---------- the phone's pose ---------- */
  const pose = track(ctx, pL.pose, { ...A_OUT.phone });
  pose.to(T.r14, 0.54, { cy: 640, opacity: 1 }, "glide");                       // up to PHONE_HIGH
  pose.to(T.agent - 0.05, 0.62, { cy: 560, height: 1560 }, "power2.inOut");      // push in on the lower half
  pose.to(T.app + 0.4, 0.46, { cy: 640, height: 1180 }, "power2.inOut");         // back to PHONE_HIGH for the share sheet
  pose.to(T.chat + 0.3, 0.47, { cx: 700, ry: -8 }, "glide");                     // slide right for the day card
  pose.to(T.r18 - 0.25, 0.56, { cx: 540, cy: 760, height: 1300, ry: 0 }, "power2.inOut"); // PHONE_HERO, the inbox
  pose.to(T.r18 + 0.56, 1.1, { height: 1340, cy: 772 }, "drift");                // a slow lean in
  pose.to(T.place + 0.18, 0.66, { cy: 1011, height: 1900 }, "power2.in");       // push toward Property | Stays
  S.pLpose = pose;

  /* ---------- the screen's pages ---------- */
  const msgs = screenPage(ctx, pL, ctx.src.display("messages-lt"));
  const th = screenPage(ctx, pL, thread);
  const shareBg = screenPage(ctx, pL, ctx.src.display("listing-share-lt"));
  const shareSheet = screenPage(ctx, pL, ctx.src.display("listing-share-lt"));
  shareBg.img.style.clipPath = `inset(0px 0px ${DH - SHEET_TOP - 12}px 0px)`;
  shareSheet.img.style.clipPath = `inset(${SHEET_TOP}px 0px 0px 0px)`;
  showDuring(ctx, th.el, [[T.r14, T.r18 + 0.3]]);
  showDuring(ctx, msgs.el, [[T.r18 - 0.25, T.r19 + 0.6]]);
  showDuring(ctx, shareBg.el, [[T.r16, T.listings + 0.45]]);
  showDuring(ctx, shareSheet.el, [[T.r16, T.listings + 0.45]]);
  S.msgsPage = msgs;

  /* The member's bubble is not sent yet: the thread's own bubble waits under a patch. */
  const bubblePatch = box(ctx, th.el, { x: BUBBLE.x - 16, y: BUBBLE.y - 10, w: BUBBLE.w + 32, h: BUBBLE.h + 20, style: { background: "#f3f4f1" } });
  const tickPatch = box(ctx, th.el, { ...TICK, style: { background: "rgb(0 96 232)", borderRadius: "8px" } });
  const tLandBubble = T.app + 0.4;
  showDuring(ctx, bubblePatch, [[0, tLandBubble]]);
  showDuring(ctx, tickPatch, [[tLandBubble, T.r17]]);
  tl.fromTo(tickPatch, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", immediateRender: false }, tLandBubble + 0.08);

  /* Row 18: back to the inbox (iOS back: the thread slides off right, the inbox comes in from the left). */
  const tBack = T.r18 - 0.2;
  tl.fromTo(th.el, { x: 0 }, { x: DW, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);
  th.el.style.boxShadow = "-30px 0 60px -20px rgb(16 32 80 / 0.25)";
  tl.fromTo(msgs.el, { x: -DW * 0.3 }, { x: 0, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);
  ctx.gsap.set(msgs.el, { x: -DW * 0.3 });

  /* Row 16: the share sheet rises over the thread, then closes. */
  const sheetY = (t) => kf(ctx, t, [[T.r16, DH - SHEET_TOP + 20], [T.r16 + 0.26, 0, "power3.out"], [T.listings + 0.11, 0], [T.listings + 0.4, DH - SHEET_TOP + 20, "power2.in"]]);
  ctx.onFrame((t) => {
    if (t < T.r16 || t > T.listings + 0.45) return;
    shareSheet.el.style.transform = `translateY(${sheetY(t).toFixed(1)}px)`;
    shareBg.el.style.opacity = String((ramp(ctx, t, T.r16, T.r16 + 0.18, "power1.out") * (1 - ramp(ctx, t, T.listings + 0.13, T.listings + 0.36, "power1.in"))).toFixed(3));
  });

  /* ==================== row 14 ==================== */

  /* The villa card (from section a's folded receipt) flies in and lands on its twin in the thread. */
  const tLand = T.r14 + 0.56;
  const villa = cropBody(ctx, over, { src: thread, crop: MAITAMA, iw: DW, radius: 40, shadow: SHADOW.l });
  quadDriver(ctx, villa, MAITAMA.w, MAITAMA.h, {
    t0: T.r14, t1: tLand + 0.16,
    quadAt: (t) => {
      const k = ramp(ctx, t, T.r14, tLand, "glide");
      const q = lerpQuad(rectQuad(A_OUT.villa), displayQuad(pL, MAITAMA), k);
      return shiftQuad(q, 0, -70 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, tLand, tLand + 0.14, "power1.out"),
  });
  ctx.sfx("card_slide", 30.8);

  /* "owner", "landlord", "agent": each lands on its word and pushes the last one out. */
  const wOwner = wordPill(ctx, top, "owner", { size: 104, color: ELECTRIC });
  const wLandlord = wordPill(ctx, top, "landlord", { size: 98 });
  const wAgent = wordPill(ctx, top, "agent", { size: 110 });
  tl.fromTo(wOwner, { x: -460, y: 372, rotation: -9, opacity: 1 }, { x: 446, y: 372, rotation: -2.5, opacity: 1, duration: 0.62, ease: "land", immediateRender: false }, T.owner - 0.17);
  tl.fromTo(wLandlord, { x: 1560, y: 386, rotation: 8, opacity: 1 }, { x: 566, y: 386, rotation: 2, opacity: 1, duration: 0.6, ease: "land", immediateRender: false }, T.landlord - 0.16);
  tl.fromTo(wOwner, { x: 446, rotation: -2.5 }, { x: -620, rotation: -10, duration: 0.36, ease: "leave", immediateRender: false }, T.landlord - 0.1);
  tl.fromTo(wAgent, { x: -480, y: 360, rotation: -8, opacity: 1 }, { x: 462, y: 360, rotation: -2, opacity: 1, duration: 0.6, ease: "land", immediateRender: false }, T.agent - 0.17);
  tl.fromTo(wLandlord, { x: 566, rotation: 2 }, { x: 1640, rotation: 10, duration: 0.36, ease: "leave", immediateRender: false }, T.agent - 0.1);
  /* The last word shrinks into the chapter pill's place ("Talk to the owner" takes over at 33.46). */
  tl.fromTo(wAgent, { x: 462, y: 360, scale: 1, rotation: -2 }, { x: 540, y: 276, scale: 0.56, rotation: 0, duration: 0.3, ease: "power3.inOut", immediateRender: false }, T.r15 - 0.27);
  tl.fromTo(wAgent, { opacity: 1 }, { opacity: 0, duration: 0.09, ease: "power1.in", immediateRender: false }, T.r15 - 0.04);
  for (const t of [T.owner, T.landlord, T.agent]) ctx.sfx("pop_low", t, { offset: -4 });

  /* ==================== row 15 ==================== */

  /* The composer, re-drawn from the capture at display px, lifted off the screen. */
  const comp = ctx.el("div", {
    class: "abs",
    style: { left: "0px", top: "0px", width: `${DW}px`, height: `${BAR.h}px`, transformOrigin: "0 0", background: "#f3f4f1", borderRadius: "54px", visibility: "hidden", boxShadow: SHADOW.l },
  }, over);
  const imgBtn = ctx.el("div", { class: "abs", style: { left: "52px", bottom: "28px", width: "125px", height: "125px", borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#0066fe", boxShadow: "0 6px 16px -8px rgb(16 32 80 / 0.25)" } }, comp);
  ctx.icon("image", { size: 54, stroke: 2 }, imgBtn);
  const field = ctx.el("div", { class: "abs", style: { left: "197px", width: "930px", bottom: "28px", height: "125px", borderRadius: "40px", background: "#fff", boxShadow: "0 6px 16px -10px rgb(16 32 80 / 0.2)" } }, comp);
  const ph = ctx.el("div", { class: "abs", text: "Type a message", style: { left: "48px", top: "36px", font: "400 50px/1 Inter, sans-serif", color: "#6b7280", letterSpacing: "-0.005em" } }, field);
  const typed = ctx.el("div", { class: "abs", style: { left: "48px", top: "30px", width: "840px", font: "400 48px/64px Inter, sans-serif", color: NAVY, letterSpacing: "-0.01em" } }, field);
  const typedText = ctx.el("span", {}, typed);
  const caret = ctx.el("span", { style: { display: "inline-block", width: "4px", height: "54px", marginLeft: "3px", verticalAlign: "-10px", background: ELECTRIC, borderRadius: "2px" } }, typed);
  const send = ctx.el("div", { class: "abs", style: { left: "1140px", bottom: "25px", width: "132px", height: "131px", borderRadius: "34px", background: "#0042a2", display: "grid", placeItems: "center", color: "rgb(210 225 255 / 0.8)", boxShadow: "inset 0 0 0 3px rgb(90 140 230 / 0.35)" } }, comp);
  ctx.icon("arrow-up-right", { size: 58, stroke: 2.2 }, send);

  const tLift = T.r15;
  const tType0 = T.r15 + 0.05;
  const tType1 = T.inside + 0.3;
  const tSend = T.app;
  const tSink = tLandBubble - 0.02;
  const GROW = 64;
  const compH = (t) => BAR.h + GROW * ramp(ctx, t, tLift + 0.02, tLift + 0.14, "power2.out") * (1 - ramp(ctx, t, tSend + 0.1, tSend + 0.34, "power2.inOut"));
  const SC = 880 / DW;
  const compTarget = (h) => rectQuad({ x: 60, y: 952 - h * SC, w: DW * SC, h: h * SC });
  const compQuad = (t, h) => {
    const up = ramp(ctx, t, tLift, tLift + 0.34, "glide");
    const down = ramp(ctx, t, tSink, tSink + 0.26, "power2.inOut");
    const k = up * (1 - down);
    const attached = displayQuad(pL, { x: BAR.x, y: BAR.y + BAR.h - h, w: DW, h });
    return lerpQuad(attached, compTarget(h), k);
  };
  let lastH = null;
  ctx.onFrame((t) => {
    const on = t >= tLift && t < tSink + 0.26;
    comp.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const h = compH(t);
    if (h !== lastH) {
      comp.style.height = `${h.toFixed(2)}px`;
      field.style.height = `${(125 + h - BAR.h).toFixed(2)}px`;
      lastH = h;
    }
    placeQuad(comp, DW, h, compQuad(t, h));
    comp.style.boxShadow = t < tLift + 0.1 || t > tSink + 0.16 ? "none" : SHADOW.l;
    /* the typing: characters in at an even hand, the caret while the field is focused */
    const n = t < tType0 ? 0 : t >= tSend ? (t < tSend + 0.02 ? MESSAGE.length : 0) : Math.round(MESSAGE.length * ramp(ctx, t, tType0, tType1, "power1.inOut"));
    typedText.textContent = MESSAGE.slice(0, n);
    ph.style.opacity = t < tType0 || t >= tSend + 0.34 ? "1" : "0";
    caret.style.visibility = t >= tLift + 0.05 && t < tSend && (t < tType1 || Math.floor((t - tType1) * 4) % 2 === 0) ? "visible" : "hidden";
  });
  for (let k = 0; k < 8; k += 1) ctx.sfx(`type_key_${(k % 6) + 1}`, tType0 + ((tType1 - tType0) * k) / 7.4, { offset: -6 });

  /* The send button dips under the pointer. */
  tl.fromTo(send, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.out", immediateRender: false }, T.the7 - 0.02);
  tl.fromTo(send, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, T.the7 + 0.07);

  /* The bubble leaves the field and flies to its place in the thread. */
  const bubble = cropBody(ctx, over, { src: thread, crop: BUBBLE, iw: DW, shadow: SHADOW.m });
  bubble.style.borderRadius = "44px 44px 12px 44px";
  box(ctx, bubble, { x: TICK.x - BUBBLE.x, y: TICK.y - BUBBLE.y, w: TICK.w, h: TICK.h, style: { background: "rgb(0 96 232)" } });
  quadDriver(ctx, bubble, BUBBLE.w, BUBBLE.h, {
    t0: tSend, t1: tLandBubble + 0.1,
    quadAt: (t) => {
      const h = compH(tSend);
      const cq = compQuad(tSend, h);
      const m = (lx, ly) => mapQuad(cq, lx / DW, ly / h);
      const fieldTop = h - 28 - (125 + h - BAR.h);
      const from = [m(245, fieldTop + 30), m(1090, fieldTop + 30), m(1090, fieldTop + 30 + 128), m(245, fieldTop + 30 + 128)];
      const k = ramp(ctx, t, tSend, tLandBubble, "glide");
      return shiftQuad(lerpQuad(from, displayQuad(pL, BUBBLE), k), 0, -60 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => ramp(ctx, t, tSend, tSend + 0.06, "power1.out") * (1 - ramp(ctx, t, tLandBubble, tLandBubble + 0.08, "power1.out")),
  });
  ctx.sfx("bubble_send", tSend);

  /* ==================== row 16 ==================== */

  /* "Send in a Vallo chat" lifts off the sheet and is pressed on "listings". */
  const shareSrc = ctx.src.display("listing-share-lt");
  const sendRow = cropBody(ctx, over, { src: shareSrc, crop: SENDROW, iw: DW, radius: 34, shadow: SHADOW.m, bg: "#fff" });
  const flash = ctx.el("div", { class: "fill", style: { background: "rgb(0 105 254 / 0.14)", opacity: "0" } }, sendRow);
  const tRowLift = T.r16 + 0.17;
  const rowTarget = rectQuad({ x: 492 - (SENDROW.w * 0.6) / 2, y: 790 - (SENDROW.h * 0.6) / 2, w: SENDROW.w * 0.6, h: SENDROW.h * 0.6, rot: -1.2 });
  const dip = (t) => 1 - 0.035 * Math.sin(Math.PI * ramp(ctx, t, T.listings - 0.04, T.listings + 0.2, "power1.inOut"));
  quadDriver(ctx, sendRow, SENDROW.w, SENDROW.h, {
    t0: tRowLift, t1: T.listings + 0.42,
    quadAt: (t) => {
      const attached = displayQuad(pL, { ...SENDROW, y: SENDROW.y + sheetY(t) });
      const k = ramp(ctx, t, tRowLift, tRowLift + 0.16, "power3.out") * (1 - ramp(ctx, t, T.listings + 0.12, T.listings + 0.36, "power2.in"));
      const q = lerpQuad(attached, rowTarget, k);
      const d = dip(t);
      const c = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
      return q.map((p) => ({ x: c.x + (p.x - c.x) * d, y: c.y + (p.y - c.y) * d }));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, T.listings + 0.3, T.listings + 0.42, "power1.in"),
  });
  tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power1.out", immediateRender: false }, T.listings);
  tl.fromTo(flash, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, T.listings + 0.08);

  /* The Banana Island card comes off the press and arcs into the thread, onto its twin. */
  const tArc0 = T.listings + 0.09;
  const tArc1 = T.chat - 0.05;
  const banana = cropBody(ctx, over, { src: thread, crop: BANANA, iw: DW, radius: 40, shadow: SHADOW.l });
  quadDriver(ctx, banana, BANANA.w, BANANA.h, {
    t0: tArc0, t1: tArc1 + 0.14,
    quadAt: (t) => {
      const k = ramp(ctx, t, tArc0, tArc1, "glide");
      const from = rectQuad({ x: 492 - 110, y: 790 - 79, w: 220, h: 158, rot: -6 });
      const q = lerpQuad(from, displayQuad(pL, BANANA), k);
      return shiftQuad(q, -40 * Math.sin(Math.PI * k), -300 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => ramp(ctx, t, tArc0, tArc0 + 0.08, "power1.out") * (1 - ramp(ctx, t, tArc1, tArc1 + 0.12, "power1.out")),
  });
  ctx.sfx("card_slide", 35.6, { offset: -2 });
  ctx.sfx("bubble_send", 36.1, { offset: -2 });

  /* ==================== row 17 ==================== */

  const day = dayCard(ctx, over, T);
  S.day = day;

  /* ==================== row 18 ==================== */

  /* The day card docks into the inbox row as its unread dot. */
  const tDock = 39.2;
  const dot = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "30px", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", transformOrigin: "0 0", visibility: "hidden", boxShadow: SHADOW.s } }, over);
  const dotIcon = ctx.el("div", { style: { display: "grid", placeItems: "center" } }, dot);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, dotIcon);
  const tChip0 = day.tOut1;
  quadDriver(ctx, dot, 100, 100, {
    t0: tChip0 - 0.05, t1: tDock + 0.04,
    quadAt: (t) => {
      const k = ramp(ctx, t, tChip0, tDock, "glide");
      const target = displayQuad(pL, DOT);
      const tc = { x: (target[0].x + target[2].x) / 2, y: (target[0].y + target[2].y) / 2 };
      const size = mix(100, Math.hypot(target[1].x - target[0].x, target[1].y - target[0].y), k);
      const cx = mix(day.chipAt.x, tc.x, k);
      const cy = mix(day.chipAt.y, tc.y, k) - 90 * Math.sin(Math.PI * k);
      return rectQuad({ x: cx - size / 2, y: cy - size / 2, w: size, h: size });
    },
  });
  ctx.onFrame((t) => {
    if (t < tChip0 - 0.05 || t > tDock + 0.05) return;
    const k = ramp(ctx, t, tChip0 + 0.1, tDock - 0.05, "power2.in");
    dot.style.borderRadius = `${mix(30, 50, k).toFixed(1)}px`;
    dotIcon.style.opacity = String((1 - ramp(ctx, t, tChip0 + 0.1, tChip0 + 0.35)).toFixed(3));
  });
  /* The row answers with one ring from the dot, under the glass. */
  const ring = box(ctx, msgs.el, { x: DOT.x + 16 - 60, y: DOT.y + 16 - 60, w: 120, h: 120, style: { borderRadius: "50%", border: `6px solid ${ELECTRIC}`, opacity: "0" } });
  tl.fromTo(ring, { scale: 0.25, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, tDock);
  showDuring(ctx, ring, [[tDock, tDock + 0.6]]);
  ctx.sfx("pop", tDock, { offset: -2 });

  /* ==================== the pointer ==================== */
  const orbT = track(ctx, S.orb, { x: 1180, y: 1060, opacity: 0 });
  const sendAt = { x: 60 + 1206 * SC, y: 952 - 90.5 * SC };
  orbT.to(T.right + 0.12, 0.12, { opacity: 1 }, "power1.out");
  orbT.to(T.right + 0.12, 0.44, { x: sendAt.x, y: sendAt.y }, "glide");
  pressAt(ctx, S.orb, T.the7, { ringParent: S.pointer, x: sendAt.x, y: sendAt.y, sound: "tap" });
  orbT.to(T.app + 0.08, 0.42, { x: 930, y: 1120 }, "glide");
  const rowAt = { x: 492 + 250, y: 790 };
  orbT.to(T.r16 + 0.04, 0.3, { x: rowAt.x, y: rowAt.y }, "glide");
  pressAt(ctx, S.orb, T.listings, { ringParent: S.pointer, x: rowAt.x, y: rowAt.y, sound: "tap" });
  orbT.to(T.listings + 0.12, 0.4, { x: 1010, y: 900 }, "glide");
  orbT.to(T.listings + 0.3, 0.22, { opacity: 0 }, "power1.in");
  S.orbT = orbT;
}

/**
 * Row 17: the day card (x 60 to 620, y 300 to 820). Its pages turn to
 * Saturday; on "inspection" 11:00 AM stamps in with "Inspection set" and the
 * Example chip. Then it shrinks into a chip that docks in row 18.
 */
function dayCard(ctx, parent, T) {
  const { tl } = ctx;
  const W = 560;
  const H = 520;
  const X = 60;
  const Y = 360;
  const tIn = T.r17 - 0.1;
  const wrap = ctx.el("div", { class: "abs", style: { left: `${X}px`, top: `${Y}px`, width: `${W}px`, height: `${H}px`, perspective: "1600px", visibility: "hidden" } }, parent);
  const card = ctx.el("div", {
    class: "abs",
    style: { inset: "0px", borderRadius: "40px", background: "#fff", boxShadow: SHADOW.l, overflow: "hidden", transformStyle: "preserve-3d", border: "1px solid rgb(255 255 255 / 0.9)" },
  }, wrap);
  const BAND = 148;
  const days = ["Thursday", "Friday", "Saturday"];
  const pages = days.map((d, i) => {
    const pg = ctx.el("div", { class: "abs", style: { inset: "0px", background: "#fff", transformOrigin: "50% 0%", backfaceVisibility: "hidden", zIndex: String(10 - i) } }, card);
    const band = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: "0px", height: `${BAND}px`, background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 55%, #0052d6)`, display: "flex", alignItems: "center", justifyContent: "center" } }, pg);
    ctx.el("div", { text: d, style: { font: "700 60px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#fff", transform: "translateY(3px)" } }, band);
    for (let r = 0; r < 3; r += 1) box(ctx, pg, { x: 56, y: BAND + 92 + r * 86, w: W - 112, h: 2, style: { background: "rgb(16 32 80 / 0.07)" } });
    return pg;
  });
  /* the Saturday page's content */
  const sat = pages[2];
  const time = ctx.el("div", { class: "abs", text: "11:00 AM", style: { left: "0px", right: "0px", top: `${BAND + 60}px`, textAlign: "center", font: "700 104px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.04em", color: NAVY, opacity: "0", background: "#fff" } }, sat);
  const row = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${BAND + 214}px`, display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", opacity: "0", background: "#fff", paddingTop: "8px" } }, sat);
  const plate = ctx.el("span", { style: { width: "46px", height: "46px", borderRadius: "14px", display: "grid", placeItems: "center", background: "rgb(0 105 254 / 0.1)", color: ELECTRIC, flex: "none" } }, row);
  ctx.icon("check", { size: 30, stroke: 3 }, plate);
  ctx.el("span", { text: "Inspection set", style: { font: "600 38px/1 Inter, sans-serif", letterSpacing: "-0.015em", color: NAVY } }, row);
  exampleChip(ctx, row, { size: 22 });

  /* in: it swings over the phone's left edge */
  tl.fromTo(wrap, { x: -560, y: 70, rotation: -16 }, { x: 0, y: 0, rotation: -3, duration: 0.42, ease: "land", immediateRender: false }, tIn);
  tl.fromTo(card, { rotationY: 38 }, { rotationY: 0, duration: 0.42, ease: "power3.out", immediateRender: false }, tIn);
  ctx.sfx("card_slide", 36.95, { offset: -2 });
  /* the pages turn up and away: Thursday, Friday, then Saturday stays */
  const flips = [T.r17 + 0.02, T.r17 + 0.12];
  flips.forEach((tf, i) => {
    tl.fromTo(pages[i], { rotationX: 0 }, { rotationX: 96, duration: 0.14, ease: "power2.in", immediateRender: false }, tf);
  });
  /* 11:00 AM stamps on "inspection" */
  tl.fromTo(time, { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power4.out", immediateRender: false }, T.inspection);
  ctx.sfx("stamp", T.inspection);
  tl.fromTo(row, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "power3.out", immediateRender: false }, T.inspection + 0.12);

  /* out: it shrinks toward the phone and hands over to the docking chip */
  const tOut0 = T.keep - 0.1;
  const tOut1 = T.r18 - 0.02;
  const chipAt = { x: X + W / 2 - 60, y: Y + H / 2 + 210 };
  tl.fromTo(wrap, { x: 0, y: 0, scale: 1, rotation: -3 }, { x: chipAt.x - (X + W / 2), y: chipAt.y - (Y + H / 2), scale: 100 / H, rotation: 0, duration: tOut1 - tOut0, ease: "power3.inOut", immediateRender: false }, tOut0);
  tl.fromTo(card, { borderRadius: 40 }, { borderRadius: 140, duration: tOut1 - tOut0, ease: "power2.in", immediateRender: false }, tOut0);
  const face = ctx.el("div", { class: "abs", style: { inset: "0px", zIndex: "20", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", opacity: "0" } }, card);
  const faceIcon = ctx.el("div", { style: { display: "grid", placeItems: "center", transform: `scale(${H / 100})` } }, face);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, faceIcon);
  tl.fromTo(face, { opacity: 0 }, { opacity: 1, duration: (tOut1 - tOut0) * 0.45, ease: "power1.inOut", immediateRender: false }, tOut0 + (tOut1 - tOut0) * 0.5);
  showDuring(ctx, wrap, [[tIn, tOut1 + 0.02]]);
  return { wrap, tOut1, chipAt };
}
