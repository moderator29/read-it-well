/**
 * Mobile rows 14 to 18: talking (30.58 to 40.96), storyboard v3.1.
 *   14  the villa card lands on the thread's Maitama card; the phone dims and
 *       "owner", "landlord", "agent" land in WORDS, each pushing the last out;
 *       the last shrinks into the pill ("Talk straight to the lister").
 *   15  the phone pushes in on the thread's lower half; the composer lifts off
 *       below its place; the member's real message types; send; the bubble
 *       flies up into its place with its tick.
 *   16  the share sheet rises; "Send in a Vallo chat" lifts in place and is
 *       pressed on "listings"; the Maitama villa (what the sheet shares) flies
 *       off; the sheet closes and the phone slides right.
 *   17  the day card swings in over the phone's left edge; its pages turn to
 *       Saturday; on "inspection" 11:00 AM stamps with "Inspection set".
 *   18  back to the inbox (PHONE_HERO); the day card docks as the unread dot;
 *       the menu opens the drawer at 40.6 and the phone pushes toward FLIP.
 */
import { LAYOUT } from "./layout.js";
import {
  DW, DH, NAVY, ELECTRIC, SHADOW, ramp, kf, mix, track, screenPage, showDuring, box, cropBody, quadDriver,
  displayQuad, quadAtPose, rectQuad, lerpQuad, shiftQuad, placeQuad, mapQuad, exampleChip, pressAt, ripple, measure,
} from "./b-kit.js";

/* thread-light (display px). */
const MAITAMA = { x: 52, y: 1602, w: 1088, h: 784 };
const BUBBLE = { x: 117, y: 2398, w: 1026, h: 239 };
const TICK = { x: 1040, y: 2562, w: 54, h: 44 };
const BAR = { x: 0, y: 2690, w: 1320, h: 178 };
/* listing-share-lt: the sheet and its "Send in a Vallo chat" row. */
const SHEET_TOP = 1962;
const SENDROW = { x: 28, y: 2316, w: 1264, h: 290 };
/* messages-lt: the unread dot and the menu; drawer-light: FLIP's chevron. */
const DOT = { x: 200, y: 1439, w: 32, h: 32 };
const MENU = { x: 100, y: 275 };
export const FLIP = { x: 983, y: 2748 };
const DRAWER_W = 1103;

/* Section a's last frame (A -> B in handoffs.md): the phone and the villa card. */
export const A_OUT = {
  phone: { cx: 540, cy: 1500, height: 960, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 },
  villa: { x: 190, y: 560, w: 700, h: 504, rot: 0 },
};

const MESSAGE = "I like these two as well. Could we view all three on Saturday morning?";

export async function talk(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const pL = S.pL;
  const thread = ctx.src.display("thread-light");
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  const HERO = { cx: L.PHONE_HERO.cx, cy: L.PHONE_HERO.cy, height: L.PHONE_HERO.height };
  const PUSH = { cx: 540, cy: 505, height: 1180 };
  const RIGHT = { cx: 700, cy: 790, height: 960, ry: -8 };
  const FLIPPOSE = { cx: 540, cy: 233, height: 1500 };

  const over = ctx.scene("b-m-talk", T.r14, T.r19 + 0.1, { z: 20 });
  const type = ctx.scene("b-m-talk-type", T.r14, T.r15 + 0.1, { z: 30 });

  /* ---------- the phone ---------- */
  const pose = track(ctx, pL.pose, { ...A_OUT.phone });
  pose.to(T.r14, 0.52, { ...HIGH, opacity: 1 }, "glide");                          // up to PHONE_HIGH as the card flies in
  pose.to(T.owner - 0.2, 0.34, { height: 920, cy: 800 }, "power2.inOut");            // settles back, dimmed, for the words
  pose.to(T.r15 - 0.3, 0.46, PUSH, "power2.inOut");                                  // pushes in on the thread's lower half
  pose.to(T.chat + 0.3, 0.47, RIGHT, "glide");                                       // slides right for the day card
  pose.to(T.r18 - 0.25, 0.56, { ...HERO, ry: 0 }, "power2.inOut");                   // PHONE_HERO, the inbox
  pose.to(T.place + 0.08, 0.62, FLIPPOSE, "power2.inOut");                           // toward FLIP as the drawer opens
  S.pLpose = pose;
  S.FLIPPOSE = FLIPPOSE;

  /* ---------- the screen's pages (in DOM order: under to over) ---------- */
  const msgs = screenPage(ctx, pL, ctx.src.display("messages-lt"));
  const th = screenPage(ctx, pL, thread);
  const shareBg = screenPage(ctx, pL, ctx.src.display("listing-share-lt"));
  const shareSheet = screenPage(ctx, pL, ctx.src.display("listing-share-lt"));
  shareBg.img.style.clipPath = `inset(0px 0px ${DH - SHEET_TOP - 12}px 0px)`;
  shareSheet.img.style.clipPath = `inset(${SHEET_TOP}px 0px 0px 0px)`;
  const drawerDim = screenPage(ctx, pL, null, { bg: "rgb(18 22 40 / 0.3)" });
  const drawer = screenPage(ctx, pL, ctx.src.display("drawer-light"));
  drawer.img.style.clipPath = `inset(0px ${DW - DRAWER_W}px 0px 0px round 0px 100px 100px 0px)`;
  const status = screenPage(ctx, pL, ctx.src.display("messages-lt"));
  status.img.style.clipPath = `inset(0px 0px ${DH - 186}px 0px)`;
  showDuring(ctx, th.el, [[T.r14, T.r18 + 0.3]]);
  showDuring(ctx, msgs.el, [[T.r18 - 0.25, T.r19 + 1.1]]);
  showDuring(ctx, shareBg.el, [[T.r16, T.listings + 0.45]]);
  showDuring(ctx, shareSheet.el, [[T.r16, T.listings + 0.45]]);
  const tMenu = T.place + 0.33;
  const tDrawer = tMenu + 0.08;
  showDuring(ctx, drawerDim.el, [[tDrawer, T.r19 + 1.1]]);
  showDuring(ctx, drawer.el, [[tDrawer, T.r19 + 1.1]]);
  showDuring(ctx, status.el, [[tDrawer, T.r19 + 1.1]]);
  S.drawerPage = drawer;

  /* Row 14: a white wash dims the thread while the words land. */
  const wash = box(ctx, th.el, { x: 0, y: 0, w: DW, h: DH, style: { background: "#ffffff", opacity: "0", zIndex: "60" } });
  tl.fromTo(wash, { opacity: 0 }, { opacity: 0.8, duration: 0.3, ease: "power2.inOut", immediateRender: false }, T.owner - 0.2);
  tl.fromTo(wash, { opacity: 0.8 }, { opacity: 0, duration: 0.4, ease: "power2.inOut", immediateRender: false }, T.r15 - 0.3);

  /* The member's bubble is not sent yet: the thread's own bubble waits under a patch. */
  const tLandBubble = T.app + 0.4;
  const bubblePatch = box(ctx, th.el, { x: BUBBLE.x - 16, y: BUBBLE.y - 10, w: BUBBLE.w + 32, h: BUBBLE.h + 20, style: { background: "#f3f4f1" } });
  const tickPatch = box(ctx, th.el, { ...TICK, style: { background: "rgb(0 96 232)", borderRadius: "8px" } });
  showDuring(ctx, bubblePatch, [[0, tLandBubble]]);
  showDuring(ctx, tickPatch, [[tLandBubble, T.r18]]);
  tl.fromTo(tickPatch, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", immediateRender: false }, tLandBubble + 0.08);

  /* Row 18: back to the inbox (the thread slides off right, the inbox comes in from the left). */
  const tBack = T.r18 - 0.2;
  th.el.style.boxShadow = "-30px 0 60px -20px rgb(16 32 80 / 0.25)";
  tl.fromTo(th.el, { x: 0 }, { x: DW, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);
  ctx.gsap.set(msgs.el, { x: -DW * 0.3 });
  tl.fromTo(msgs.el, { x: -DW * 0.3 }, { x: 0, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);

  /* Row 16: the share sheet rises over the thread, then closes. */
  const sheetY = (t) => kf(ctx, t, [[T.r16, DH - SHEET_TOP + 20], [T.r16 + 0.26, 0, "power3.out"], [T.listings + 0.11, 0], [T.listings + 0.4, DH - SHEET_TOP + 20, "power2.in"]]);
  ctx.onFrame((t) => {
    if (t < T.r16 || t > T.listings + 0.45) return;
    shareSheet.el.style.transform = `translateY(${sheetY(t).toFixed(1)}px)`;
    shareBg.el.style.opacity = String((ramp(ctx, t, T.r16, T.r16 + 0.18, "power1.out") * (1 - ramp(ctx, t, T.listings + 0.13, T.listings + 0.36, "power1.in"))).toFixed(3));
  });

  /* Row 18: the drawer slides in over a dimmed inbox. */
  ctx.gsap.set(drawer.el, { x: -DRAWER_W });
  tl.fromTo(drawer.el, { x: -DRAWER_W }, { x: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, tDrawer);
  tl.fromTo(drawerDim.el, { opacity: 0 }, { opacity: 1, duration: 0.34, ease: "power1.out", immediateRender: false }, tDrawer);

  /* ==================== row 14 ==================== */

  /* The villa card (section a's folded receipt) flies in and lands on its twin in the thread. */
  const tLand = T.r14 + 0.52;
  const villa = cropBody(ctx, over, { src: thread, crop: MAITAMA, iw: DW, radius: 40, shadow: SHADOW.l });
  quadDriver(ctx, villa, MAITAMA.w, MAITAMA.h, {
    t0: T.r14, t1: tLand + 0.16,
    quadAt: (t) => {
      const k = ramp(ctx, t, T.r14, tLand, "glide");
      const q = lerpQuad(rectQuad(A_OUT.villa), displayQuad(pL, MAITAMA), k);
      return shiftQuad(q, 0, -60 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, tLand, tLand + 0.14, "power1.out"),
  });
  ctx.sfx("card_slide", 30.8);

  /* "owner", "landlord", "agent" land in WORDS over the dimmed phone, each pushing the last out. */
  const W = L.WORDS;
  const words = [
    { text: "owner", blue: true, y: 712, t: T.owner, from: -1 },
    { text: "landlord", blue: false, y: 792, t: T.landlord, from: 1 },
    { text: "agent", blue: false, y: 748, t: T.agent, from: -1 },
  ].map((w) => {
    const el = ctx.el("div", { class: "abs", text: w.text, style: { left: "0px", top: "0px", font: "700 150px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: w.blue ? ELECTRIC : NAVY, whiteSpace: "nowrap" } }, type);
    ctx.gsap.set(el, { xPercent: -50, yPercent: -50, x: w.from * 1400, y: w.y });
    return { ...w, el };
  });
  /* One size for all three, the widest ("landlord") fitted to 820 px (the safe width with air). */
  let fitted = false;
  ctx.onFrame(() => {
    if (fitted) return;
    const size = Math.min(160, (820 / measure("landlord", "700 100px Poppins")) * 100);
    const sizes = [size * 1.04, size, size * 0.97];
    words.forEach((w, i) => (w.el.style.fontSize = `${sizes[i].toFixed(1)}px`));
    fitted = true;
  });
  const cx = [W.x + W.w / 2 - 24, W.x + W.w / 2 + 20, W.x + W.w / 2 - 12];
  words.forEach((w, i) => {
    tl.fromTo(w.el, { x: w.from * 1400, rotation: w.from * 5 }, { x: cx[i], rotation: w.from * -1.5, duration: 0.6, ease: "land", immediateRender: false }, w.t - 0.16);
    const next = words[i + 1];
    if (next) tl.fromTo(w.el, { x: cx[i], rotation: w.from * -1.5 }, { x: next.from * 1400, rotation: next.from * 8, duration: 0.34, ease: "leave", immediateRender: false }, next.t - 0.1);
    ctx.sfx("pop_low", w.t, { offset: -4 });
  });
  /* The last word shrinks into the chapter pill's place as the pill takes over. */
  const last = words[2].el;
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  tl.fromTo(last, { y: words[2].y, scale: 1 }, { y: pillY, scale: 0.3, duration: 0.3, ease: "power3.inOut", immediateRender: false }, T.r15 - 0.3);
  tl.fromTo(last, { x: cx[2] }, { x: 540, duration: 0.3, ease: "power3.inOut", immediateRender: false }, T.r15 - 0.3);
  tl.fromTo(last, { opacity: 1 }, { opacity: 0, duration: 0.09, ease: "power1.in", immediateRender: false }, T.r15 - 0.04);

  /* ==================== row 15 ==================== */

  /* The composer, re-drawn from the capture at display px; it lifts off to just below its place. */
  const comp = ctx.el("div", {
    class: "abs",
    style: { left: "0px", top: "0px", width: `${DW}px`, height: `${BAR.h}px`, transformOrigin: "0 0", background: "#f3f4f1", borderRadius: "54px", visibility: "hidden" },
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
  const BOTTOM = 1212;
  const compTarget = (h) => rectQuad({ x: 60, y: BOTTOM - h * SC, w: DW * SC, h: h * SC });
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
    comp.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const h = compH(t);
    if (h !== lastH) {
      comp.style.height = `${h.toFixed(2)}px`;
      field.style.height = `${(125 + h - BAR.h).toFixed(2)}px`;
      lastH = h;
    }
    placeQuad(comp, DW, h, compQuad(t, h));
    comp.style.boxShadow = t < tLift + 0.1 || t > tSink + 0.16 ? "none" : SHADOW.l;
    const n = t < tType0 ? 0 : t >= tSend ? (t < tSend + 0.02 ? MESSAGE.length : 0) : Math.round(MESSAGE.length * ramp(ctx, t, tType0, tType1, "power1.inOut"));
    typedText.textContent = MESSAGE.slice(0, n);
    ph.style.opacity = t < tType0 || t >= tSend + 0.34 ? "1" : "0";
    caret.style.visibility = t >= tLift + 0.05 && t < tSend && (t < tType1 || Math.floor((t - tType1) * 4) % 2 === 0) ? "inherit" : "hidden";
  });
  for (let k = 0; k < 8; k += 1) ctx.sfx(`type_key_${(k % 6) + 1}`, tType0 + ((tType1 - tType0) * k) / 7.4, { offset: -6 });

  tl.fromTo(send, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.out", immediateRender: false }, T.the7 - 0.02);
  tl.fromTo(send, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, T.the7 + 0.07);

  /* The bubble leaves the field and flies up into its place in the thread. */
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
      const from = [m(245, fieldTop + 30), m(1090, fieldTop + 30), m(1090, fieldTop + 158), m(245, fieldTop + 158)];
      const k = ramp(ctx, t, tSend, tLandBubble, "glide");
      return shiftQuad(lerpQuad(from, displayQuad(pL, BUBBLE), k), 0, -40 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => ramp(ctx, t, tSend, tSend + 0.06, "power1.out") * (1 - ramp(ctx, t, tLandBubble, tLandBubble + 0.08, "power1.out")),
  });
  ctx.sfx("bubble_send", tSend);

  /* ==================== row 16 ==================== */

  /* "Send in a Vallo chat" lifts in place off the sheet and is pressed on "listings". */
  const shareSrc = ctx.src.display("listing-share-lt");
  const sendRow = cropBody(ctx, over, { src: shareSrc, crop: SENDROW, iw: DW, radius: 34, bg: "#fff" });
  const flash = ctx.el("div", { class: "fill", style: { background: "rgb(0 105 254 / 0.12)", opacity: "0" } }, sendRow);
  const tRowLift = T.r16 + 0.17;
  quadDriver(ctx, sendRow, SENDROW.w, SENDROW.h, {
    t0: tRowLift, t1: T.listings + 0.36,
    quadAt: (t) => {
      const q = displayQuad(pL, { ...SENDROW, y: SENDROW.y + sheetY(t) });
      const k = ramp(ctx, t, tRowLift, tRowLift + 0.14, "power3.out") * (1 - ramp(ctx, t, T.listings + 0.1, T.listings + 0.3, "power2.in"));
      const dip = 0.035 * Math.sin(Math.PI * ramp(ctx, t, T.listings - 0.04, T.listings + 0.2, "power1.inOut"));
      const s = 1 + 0.06 * k - dip;
      const c0 = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
      const c = { x: c0.x, y: c0.y - 12 * k };
      return q.map((p) => ({ x: c.x + (p.x - c0.x) * s, y: c.y + (p.y - c0.y) * s }));
    },
  });
  ctx.onFrame((t) => {
    if (t < tRowLift || t > T.listings + 0.36) return;
    sendRow.style.boxShadow = ramp(ctx, t, tRowLift, tRowLift + 0.1) * (1 - ramp(ctx, t, T.listings + 0.1, T.listings + 0.25)) > 0.5 ? SHADOW.m : "none";
  });
  tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power1.out", immediateRender: false }, T.listings);
  tl.fromTo(flash, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, T.listings + 0.08);

  /* The Maitama villa (the card the sheet shares) comes off the press and flies away: sent. */
  const tFly0 = T.listings + 0.08;
  const tFly1 = T.chat - 0.02;
  const flyer = cropBody(ctx, over, { src: thread, crop: MAITAMA, iw: DW, radius: 40, shadow: SHADOW.l });
  quadDriver(ctx, flyer, MAITAMA.w, MAITAMA.h, {
    t0: tFly0, t1: tFly1,
    quadAt: (t) => {
      const k = ramp(ctx, t, tFly0, tFly1, "power2.in");
      const up = ramp(ctx, t, tFly0, tFly0 + 0.3, "power3.out");
      const w = mix(170, 440, up);
      const x = mix(540, 1260, k) - w / 2;
      const y = mix(mix(919, 760, up), -260, k) - (w * 0.72) / 2;
      return rectQuad({ x, y, w, h: w * (MAITAMA.h / MAITAMA.w), rot: mix(-4, 12, k) });
    },
    opacityAt: (t) => ramp(ctx, t, tFly0, tFly0 + 0.06),
  });
  ctx.sfx("card_slide", 35.6, { offset: -2 });
  ctx.sfx("bubble_send", 36.1, { offset: -2 });

  /* ==================== row 17 ==================== */
  const day = dayCard(ctx, over, T);

  /* ==================== row 18 ==================== */

  /* The day card docks into the inbox row as its unread dot. */
  const tDock = 39.2;
  const dot = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "30px", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", transformOrigin: "0 0", visibility: "hidden", boxShadow: SHADOW.s } }, over);
  const dotIcon = ctx.el("div", { style: { display: "grid", placeItems: "center" } }, dot);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, dotIcon);
  const tChip0 = day.tOut1;
  quadDriver(ctx, dot, 100, 100, {
    t0: tChip0 - 0.02, t1: tDock + 0.04,
    quadAt: (t) => {
      const k = ramp(ctx, t, tChip0, tDock, "glide");
      const target = displayQuad(pL, DOT);
      const tc = { x: (target[0].x + target[2].x) / 2, y: (target[0].y + target[2].y) / 2 };
      const size = mix(day.chipSize, Math.hypot(target[1].x - target[0].x, target[1].y - target[0].y), k);
      const x = mix(day.chipAt.x, tc.x, k);
      const y = mix(day.chipAt.y, tc.y, k) - 80 * Math.sin(Math.PI * k);
      return rectQuad({ x: x - size / 2, y: y - size / 2, w: size, h: size });
    },
  });
  ctx.onFrame((t) => {
    if (t < tChip0 - 0.02 || t > tDock + 0.05) return;
    const k = ramp(ctx, t, tChip0 + 0.1, tDock - 0.05, "power2.in");
    dot.style.borderRadius = `${mix(30, 50, k).toFixed(1)}px`;
    dotIcon.style.opacity = String((1 - ramp(ctx, t, tChip0 + 0.1, tChip0 + 0.35)).toFixed(3));
  });
  const ring = box(ctx, msgs.el, { x: DOT.x + 16 - 60, y: DOT.y + 16 - 60, w: 120, h: 120, style: { borderRadius: "50%", border: `6px solid ${ELECTRIC}`, opacity: "0" } });
  tl.fromTo(ring, { scale: 0.25, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, tDock);
  showDuring(ctx, ring, [[tDock, tDock + 0.6]]);
  ctx.sfx("pop", tDock, { offset: -2 });

  /* ==================== the pointer ==================== */
  const orbT = track(ctx, S.orb, { x: 1180, y: 1100, opacity: 0 });
  S.orbT = orbT;
  const sendAt = { x: 60 + 1206 * SC, y: BOTTOM - 90.5 * SC };
  orbT.to(T.right + 0.1, 0.12, { opacity: 1 }, "power1.out");
  orbT.to(T.right + 0.1, 0.46, { x: sendAt.x, y: sendAt.y }, "glide");
  pressAt(ctx, S.orb, T.the7, { ringParent: S.pointer, x: sendAt.x, y: sendAt.y, sound: "tap" });
  orbT.to(T.app + 0.08, 0.42, { x: 1000, y: 1060 }, "glide");
  /* the row's chevron at the pushed pose */
  const rowQ = displayQuad(pL, { x: 1180, y: 2440, w: 40, h: 40 }, quadAtPose(pL, PUSH));
  const rowAt = { x: rowQ[0].x, y: rowQ[0].y + 10 };
  orbT.to(T.r16 + 0.04, 0.3, { x: rowAt.x, y: rowAt.y }, "glide");
  pressAt(ctx, S.orb, T.listings, { ringParent: S.pointer, x: rowAt.x, y: rowAt.y, sound: "tap" });
  orbT.to(T.listings + 0.12, 0.4, { x: 1040, y: 1000 }, "glide");
  orbT.to(T.listings + 0.3, 0.22, { opacity: 0 }, "power1.in");
  /* Row 18: the menu, which opens the drawer. */
  const menuQ = displayQuad(pL, { x: MENU.x, y: MENU.y, w: 1, h: 1 }, quadAtPose(pL, HERO));
  const menuAt = { x: menuQ[0].x + 18, y: menuQ[0].y + 16 };
  orbT.to(tMenu - 0.42, 0.14, { opacity: 1 }, "power1.out");
  orbT.to(tMenu - 0.42, 0.38, { x: menuAt.x, y: menuAt.y }, "glide");
  pressAt(ctx, S.orb, tMenu, { sound: null });
  ripple(ctx, msgs.el, { x: MENU.x, y: MENU.y, t: tMenu, size: 200, sound: "tap_soft", offset: -6 });
  /* then on to FLIP, where row 19 presses it */
  const flipQ = displayQuad(pL, { x: FLIP.x, y: FLIP.y, w: 1, h: 1 }, quadAtPose(pL, FLIPPOSE));
  S.flipAt = { x: flipQ[0].x, y: flipQ[0].y };
  orbT.to(tMenu + 0.12, 0.8, { x: S.flipAt.x + 16, y: S.flipAt.y + 12 }, "glide");
}

/**
 * Row 17: the day card (x 60 to 530, y 500 to 940), beside the phone's left
 * edge. Its pages turn to Saturday; on "inspection" 11:00 AM stamps in with
 * "Inspection set" and the Example chip. Then it shrinks into a chip that
 * docks in row 18.
 */
function dayCard(ctx, parent, T) {
  const { tl } = ctx;
  const W = 470;
  const H = 440;
  const X = 60;
  const Y = 500;
  const tIn = T.r17 - 0.1;
  const wrap = ctx.el("div", { class: "abs", style: { left: `${X}px`, top: `${Y}px`, width: `${W}px`, height: `${H}px`, perspective: "1600px", visibility: "hidden" } }, parent);
  const card = ctx.el("div", {
    class: "abs",
    style: { inset: "0px", borderRadius: "36px", background: "#fff", boxShadow: SHADOW.l, overflow: "hidden", transformStyle: "preserve-3d", border: "1px solid rgb(255 255 255 / 0.9)" },
  }, wrap);
  const BAND = 124;
  const days = ["Thursday", "Friday", "Saturday"];
  const pages = days.map((d, i) => {
    const pg = ctx.el("div", { class: "abs", style: { inset: "0px", background: "#fff", transformOrigin: "50% 0%", backfaceVisibility: "hidden", zIndex: String(10 - i) } }, card);
    const band = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: "0px", height: `${BAND}px`, background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 55%, #0052d6)`, display: "flex", alignItems: "center", justifyContent: "center" } }, pg);
    ctx.el("div", { text: d, style: { font: "700 52px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#fff", transform: "translateY(3px)" } }, band);
    for (let r = 0; r < 3; r += 1) box(ctx, pg, { x: 48, y: BAND + 80 + r * 74, w: W - 96, h: 2, style: { background: "rgb(16 32 80 / 0.07)" } });
    return pg;
  });
  const sat = pages[2];
  const time = ctx.el("div", { class: "abs", text: "11:00 AM", style: { left: "0px", right: "0px", top: `${BAND + 58}px`, textAlign: "center", font: "700 92px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.04em", color: NAVY, opacity: "0", background: "#fff" } }, sat);
  const row = ctx.el("div", { class: "abs", style: { left: "0px", right: "0px", top: `${BAND + 196}px`, display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", opacity: "0", background: "#fff", padding: "10px 0" } }, sat);
  const plate = ctx.el("span", { style: { width: "42px", height: "42px", borderRadius: "13px", display: "grid", placeItems: "center", background: "rgb(0 105 254 / 0.1)", color: ELECTRIC, flex: "none" } }, row);
  ctx.icon("check", { size: 28, stroke: 3 }, plate);
  ctx.el("span", { text: "Inspection set", style: { font: "600 34px/1 Inter, sans-serif", letterSpacing: "-0.015em", color: NAVY } }, row);
  exampleChip(ctx, row, { size: 20 });

  tl.fromTo(wrap, { x: -520, y: 60, rotation: -14 }, { x: 0, y: 0, rotation: -2.5, duration: 0.42, ease: "land", immediateRender: false }, tIn);
  tl.fromTo(card, { rotationY: 36 }, { rotationY: 0, duration: 0.42, ease: "power3.out", immediateRender: false }, tIn);
  ctx.sfx("card_slide", 36.95, { offset: -2 });
  [T.r17 + 0.02, T.r17 + 0.12].forEach((tf, i) => {
    tl.fromTo(pages[i], { rotationX: 0 }, { rotationX: 96, duration: 0.14, ease: "power2.in", immediateRender: false }, tf);
  });
  tl.fromTo(time, { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power4.out", immediateRender: false }, T.inspection);
  ctx.sfx("stamp", T.inspection);
  tl.fromTo(row, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, ease: "power3.out", immediateRender: false }, T.inspection + 0.12);

  /* out: it shrinks toward the inbox row and becomes the docking chip */
  const tOut0 = T.keep - 0.1;
  const tOut1 = T.r18 - 0.02;
  const chipSize = 100;
  const chipAt = { x: X + W / 2 - 40, y: Y + H / 2 + 150 };
  tl.fromTo(wrap, { x: 0, y: 0, scale: 1, rotation: -2.5 }, { x: chipAt.x - (X + W / 2), y: chipAt.y - (Y + H / 2), scale: chipSize / H, rotation: 0, duration: tOut1 - tOut0, ease: "power3.inOut", immediateRender: false }, tOut0);
  tl.fromTo(card, { borderRadius: 36 }, { borderRadius: 140, duration: tOut1 - tOut0, ease: "power2.in", immediateRender: false }, tOut0);
  const face = ctx.el("div", { class: "abs", style: { inset: "0px", zIndex: "20", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", opacity: "0" } }, card);
  const faceIcon = ctx.el("div", { style: { display: "grid", placeItems: "center", transform: `scale(${H / chipSize})` } }, face);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, faceIcon);
  tl.fromTo(face, { opacity: 0 }, { opacity: 1, duration: (tOut1 - tOut0) * 0.45, ease: "power1.inOut", immediateRender: false }, tOut0 + (tOut1 - tOut0) * 0.5);
  showDuring(ctx, wrap, [[tIn, tOut1 + 0.02]]);
  return { wrap, tOut1, chipAt, chipSize: (chipSize / H) * W };
}
