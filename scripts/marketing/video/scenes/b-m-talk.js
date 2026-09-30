/**
 * Mobile rows 14 to 18: talking (30.58 to 40.96), storyboard v3.2.
 * One phone size (h 1400, PHONE_HIGH); pushes go beyond it and come back.
 *   14  the villa card lands on the thread's Maitama card as the phone rises,
 *       to the right, its thread live; "owner", "landlord", "agent" stack in
 *       the left column under the pill "Talk straight to the lister", which
 *       rolled in on the cut. Card 1 (taken over from section a) holds its
 *       answer to 31.30 and leaves for the top right.
 *   15  the words go; the phone pushes onto the thread's foot (the pill steps
 *       aside, v3.3); the composer lifts off its slot; the member's real
 *       message types; send on "app"; the bubble flies into its place.
 *   16  in the same push the share sheet rises: "Send in a Vallo chat" is
 *       pressed on "chat"; the Maitama villa (what the sheet shares) arcs
 *       off the row over the open sheet and is gone inside the frame; the
 *       sheet closes and the phone returns, to the right.
 *   17  the day card ("Saturday" from its arrival) swings in beside the
 *       thread ("…Saturday morning?"); on "inspection" 11:00 AM and
 *       "Inspection set" stamp in together; it holds to the row's end.
 *   18  back to the inbox, the phone recentred; the card docks as the unread
 *       dot; the menu opens the drawer; the phone pushes onto FLIP.
 */
import { questionCard } from "../engine/components.js";
import { LAYOUT, QUESTIONS } from "./layout.js";
import {
  DW, DH, NAVY, ELECTRIC, SHADOW, ramp, kf, mix, track, screenPage, showDuring, box, cropBody, quadDriver,
  displayQuad, quadAtPose, rectQuad, lerpQuad, shiftQuad, placeQuad, mapQuad, pressAt, ripple, measure, dayCard,
} from "./b-kit.js";

/* thread-light (display px). */
const MAITAMA = { x: 52, y: 1602, w: 1088, h: 784 };
const BUBBLE = { x: 117, y: 2398, w: 1026, h: 239 };
const TICK = { x: 1046, y: 2566, w: 44, h: 36 }; // the tick only, clear of "02:42"
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
  phone: { cx: 540, cy: 1500, height: 1400, rx: 0, ry: 0, rz: 0, fov: 24, opacity: 0.3 },
  villa: { x: 160, y: 498, w: 760, h: 548, rot: 0 },
};

const MESSAGE = "I like these two as well. Could we view all three on Saturday morning?";

export async function talk(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const pL = S.pL;
  const thread = ctx.src.display("thread-light");
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  /* row 14: the phone to the right (it may run off the right edge), its thread live; the words take the left column */
  const WORDS14 = { cx: 840, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  /* the push onto the thread's foot (1.5x): the composer sits just above the captions */
  const PUSH15 = { cx: 510, cy: 210, height: 2100 };
  /* the same phone, moved right so the day card has the left side (flat: a turned screen costs 2x) */
  const RIGHT17 = { cx: 700, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  /* the push onto FLIP (1.5x): the pill falls in the drawer's gap under "AI Assistant" */
  const FLIPPOSE = { cx: 540, cy: 42, height: 2100 };

  /* ---------- the clock of the rows ---------- */
  const tWordsOut = T.right + 0.22;          // 33.95: the three words go together; the push begins
  const tLift = tWordsOut + 0.1;             // 34.05: the composer lifts
  const tType0 = tWordsOut + 0.13;           // 34.08
  const tType1 = T.app - 0.08;               // 34.46
  const tPress = T.app - 0.04;               // 34.50: send
  const tSend = T.app;                       // 34.54: the bubble leaves
  const tLandBubble = T.app + 0.4;           // 34.94
  const tSink = tLandBubble - 0.02;
  const tPressRow = T.chat;                  // 36.15: "Send in a Vallo chat"
  const tFly0 = T.chat + 0.06;               // 36.21: the shared card leaves the row, over the open sheet
  const tFly1 = T.chat + 0.42;               // 36.57: sent, gone inside the frame
  const tClose0 = T.chat + 0.4;              // 36.55: then the sheet closes
  const tClose1 = T.chat + 0.69;             // 36.84
  const tSlide = T.chat + 0.45;              // 36.60: the phone returns, to the right
  const tBack = T.r18 + 0.05;                // 38.70: back to the inbox
  const tDock = ctx.beat(68.3);              // 39.40
  const tMenu = T.place + 0.33;              // 40.45
  const tDrawer = tMenu + 0.08;              // 40.53
  const tFlipPush = tDrawer + 0.07;          // 40.60

  const over = ctx.scene("b-m-talk", T.r14, T.r19 + 0.1, { z: 20 });
  const type = ctx.scene("b-m-talk-type", T.r14, T.r15 + 0.6, { z: 30 });

  /* ---------- the phone ---------- */
  const pose = track(ctx, pL.pose, { ...A_OUT.phone });
  pose.to(T.r14, 0.52, { ...WORDS14, opacity: 1 }, "glide");     // up, to the right, as the card flies in
  pose.to(tWordsOut, 0.46, PUSH15, "power2.inOut");                // the push onto the thread's foot
  pose.to(tSlide, 0.47, RIGHT17, "glide");                        // back to h 1400, to the right
  /* v3.3: the pill steps aside while a push brings screen text under it */
  ctx.hidePill(tWordsOut, tSlide + 0.42);
  ctx.hidePill(tFlipPush, T.r19 + 0.1);
  pose.to(tBack, 0.5, HIGH, "power2.inOut");                       // recentred with the inbox
  pose.to(tFlipPush, 0.6, FLIPPOSE, "power2.inOut");               // the push onto FLIP
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
  /* the account handle under the name stays covered (it is framed out anyway, as insurance) */
  box(ctx, drawer.el, { x: 52, y: 614, w: 440, h: 86, style: { background: "rgb(243 244 241)" } });
  const status = screenPage(ctx, pL, ctx.src.display("messages-lt"));
  status.img.style.clipPath = `inset(0px 0px ${DH - 186}px 0px)`;
  showDuring(ctx, th.el, [[T.r14, tBack + 0.45]]);
  showDuring(ctx, msgs.el, [[tBack, T.r19 + 1.1]]);
  showDuring(ctx, shareBg.el, [[T.share, tClose1 + 0.05]]);
  showDuring(ctx, shareSheet.el, [[T.share, tClose1 + 0.05]]);
  showDuring(ctx, drawerDim.el, [[tDrawer, T.r19 + 1.1]]);
  showDuring(ctx, drawer.el, [[tDrawer, T.r19 + 1.1]]);
  showDuring(ctx, status.el, [[tDrawer, T.r19 + 1.1]]);
  S.drawerPage = drawer;

  /* The member's bubble is not sent yet: covered from the cut (section a covers it from 29.39). */
  const bubblePatch = box(ctx, th.el, { x: BUBBLE.x - 16, y: BUBBLE.y - 3, w: BUBBLE.w + 32, h: BUBBLE.h + 13, style: { background: "#f3f4f1" } });
  showDuring(ctx, bubblePatch, [[0, tLandBubble]]);
  const tickPatch = box(ctx, th.el, { ...TICK, style: { background: "rgb(0 96 232)", borderRadius: "8px" } });
  showDuring(ctx, tickPatch, [[tLandBubble, T.r18]]);
  tl.fromTo(tickPatch, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", immediateRender: false }, tLandBubble + 0.08);
  /* the composer's own slot, empty while the composer is lifted (never the same UI twice) */
  const slot = box(ctx, th.el, { x: 0, y: BAR.y, w: DW, h: BAR.h, style: { background: "#f3f4f1", zIndex: "5" } });
  showDuring(ctx, slot, [[tLift, tSink + 0.26]]);

  /* Row 18: back to the inbox (the thread slides off right, the inbox comes in from the left). */
  th.el.style.boxShadow = "-30px 0 60px -20px rgb(16 32 80 / 0.25)";
  tl.fromTo(th.el, { x: 0 }, { x: DW, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);
  ctx.gsap.set(msgs.el, { x: -DW * 0.3 });
  tl.fromTo(msgs.el, { x: -DW * 0.3 }, { x: 0, duration: 0.42, ease: "power3.inOut", immediateRender: false }, tBack);

  /* Row 16: the share sheet rises over the thread, then closes. */
  const sheetY = (t) => kf(ctx, t, [[T.share, DH - SHEET_TOP + 20], [T.share + 0.26, 0, "power3.out"], [tClose0, 0], [tClose1, DH - SHEET_TOP + 20, "power2.in"]]);
  ctx.onFrame((t) => {
    if (t < T.share || t > tClose1 + 0.06) return;
    shareSheet.el.style.transform = `translateY(${sheetY(t).toFixed(1)}px)`;
    shareBg.el.style.opacity = String((ramp(ctx, t, T.share, T.share + 0.18, "power1.out") * (1 - ramp(ctx, t, tClose0, tClose0 + 0.24, "power1.in"))).toFixed(3));
  });
  const flash = box(ctx, shareSheet.el, { ...SENDROW, style: { background: "rgb(0 105 254 / 0.1)", borderRadius: "40px", opacity: "0" } });
  tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power1.out", immediateRender: false }, tPressRow);
  tl.fromTo(flash, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tPressRow + 0.1);

  /* Row 18: the drawer slides in over a dimmed inbox. */
  ctx.gsap.set(drawer.el, { x: -DRAWER_W });
  tl.fromTo(drawer.el, { x: -DRAWER_W }, { x: 0, duration: 0.4, ease: "power3.out", immediateRender: false }, tDrawer);
  ctx.gsap.set(drawerDim.el, { opacity: 0 });
  tl.fromTo(drawerDim.el, { opacity: 0 }, { opacity: 1, duration: 0.34, ease: "power1.out", immediateRender: false }, tDrawer);

  /* ==================== row 14 ==================== */

  /* The villa card (section a's folded receipt) flies in and lands on its twin in the thread. */
  const tLand = T.r14 + 0.52;
  const villa = cropBody(ctx, over, { src: thread, crop: MAITAMA, iw: DW, radius: 40, shadow: SHADOW.l, canvas: true });
  quadDriver(ctx, villa, MAITAMA.w, MAITAMA.h, {
    t0: T.r14, t1: tLand + 0.16,
    quadAt: (t) => {
      const k = ramp(ctx, t, T.r14, tLand, "glide");
      const q = lerpQuad(rectQuad(A_OUT.villa), displayQuad(pL, MAITAMA), k);
      return shiftQuad(q, 0, -60 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, tLand, tLand + 0.14, "power1.out"),
  });
  ctx.sfx("card_slide", ctx.beat(53.4)); // 30.81

  /* Card 1, taken over from section a at the cut in its end state (answer side up, at rest under the
     phone), so its answer reads 28.87 to 31.30; then it leaves for the top right, where row 31 brings it back. */
  const card1Out = ctx.beat(54.25); // 31.30
  const c1Scene = ctx.scene("b-m-card1", T.r14, card1Out + 0.4, { z: 25 });
  const C1 = { x: 230, y: 1246, w: 620, h: 170 };
  const card1 = questionCard(ctx, c1Scene, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box: C1, fontSize: 40 });
  Object.assign(card1.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card1.back.style, { justifyContent: "center", textAlign: "center", fontSize: "33px", lineHeight: "1.22", textWrap: "balance" });
  /* the answer on two set lines, never ragged */
  card1.back.querySelector("span").innerHTML = "₦26,100,000 to move in.<br>Seen before a single call.";
  card1.turn(T.r14 - 5, { sound: null }); // already turned at the cut
  const c1c = { x: C1.x + C1.w / 2, y: C1.y + C1.h / 2 };
  ctx.gsap.set(card1.root, { transformOrigin: "50% 50%", rotation: -2 });
  tl.fromTo(card1.root, { x: 0, rotation: -2, scale: 1 }, { x: 1300 - c1c.x, rotation: 24, scale: 0.9, duration: 0.34, ease: "power2.out", immediateRender: false }, card1Out);
  tl.fromTo(card1.root, { y: 0 }, { y: -105 - c1c.y, duration: 0.34, ease: "power3.in", immediateRender: false }, card1Out);

  /* "owner", "landlord", "agent" stack in the left column (x 60-480), clear of the phone's bezel, each entering on its word. */
  const X0 = 60;
  const words = [
    { text: "owner", blue: true, y: 640, t: T.owner, k: 1.04 },
    { text: "landlord", blue: false, y: 800, t: T.landlord, k: 1 },
    { text: "agent", blue: false, y: 960, t: T.agent, k: 0.97 },
  ].map((w) => {
    const el = ctx.el("div", { class: "abs", text: w.text, style: { left: "0px", top: "0px", font: "700 150px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: w.blue ? ELECTRIC : NAVY, whiteSpace: "nowrap", transformOrigin: "0% 50%", visibility: "hidden" } }, type);
    return { ...w, el };
  });
  let wd = null;
  ctx.onFrame((t) => {
    if (t < T.r14 || t > tWordsOut + 0.3) {
      words.forEach((w) => (w.el.style.visibility = "hidden"));
      return;
    }
    if (!wd) {
      /* one size for all three, "landlord" at most 420 px wide (x 60-480, the phone's bezel starts at 501) */
      const size = Math.min(130, (420 / measure("landlord", "700 100px Poppins")) * 100);
      words.forEach((w) => (w.el.style.fontSize = `${(size * w.k).toFixed(1)}px`));
      wd = words.map((w) => ({ w: w.el.offsetWidth, h: w.el.offsetHeight }));
    }
    const out = ramp(ctx, t, tWordsOut, tWordsOut + 0.24, "power2.in");
    words.forEach((w, i) => {
      const on = t >= w.t - 0.14 && out < 0.999;
      w.el.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      const k = ramp(ctx, t, w.t - 0.14, w.t + 0.26, "land");
      const x = mix(-wd[i].w - 40, X0, k);
      const y = w.y - wd[i].h / 2 + 40 * out;
      w.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${((1 - k) * -5).toFixed(2)}deg)`;
      w.el.style.opacity = (1 - out).toFixed(3);
    });
  });
  words.forEach((w) => ctx.sfx("pop_low", w.t, { offset: -4 }));

  /* ==================== row 15 ==================== */

  /* The composer, re-drawn from the capture at display px; it lifts off its slot at the phone's own scale. */
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
  /* a zero-width caret, so it never wraps to a line of its own */
  const caret = ctx.el("span", { style: { display: "inline-block", width: "0px", height: "54px", verticalAlign: "-10px", position: "relative" } }, typed);
  ctx.el("span", { style: { position: "absolute", left: "3px", top: "0px", width: "4px", height: "54px", background: ELECTRIC, borderRadius: "2px" } }, caret);
  const send = ctx.el("div", { class: "abs", style: { left: "1140px", bottom: "25px", width: "132px", height: "131px", borderRadius: "34px", background: "#0042a2", display: "grid", placeItems: "center", color: "rgb(210 225 255 / 0.8)", boxShadow: "inset 0 0 0 3px rgb(90 140 230 / 0.35)" } }, comp);
  ctx.icon("arrow-up-right", { size: 58, stroke: 2.2 }, send);

  const GROW = 64;
  const LIFT = 46;
  const compH = (t) => BAR.h + GROW * ramp(ctx, t, tType0 + 0.04, tType0 + 0.16, "power2.out") * (1 - ramp(ctx, t, tSend + 0.1, tSend + 0.34, "power2.inOut"));
  const liftK = (t) => ramp(ctx, t, tLift, tLift + 0.3, "glide") * (1 - ramp(ctx, t, tSink, tSink + 0.26, "power2.inOut"));
  const compQuad = (t, h, q) => shiftQuad(displayQuad(pL, { x: BAR.x, y: BAR.y + BAR.h - h, w: DW, h }, q), 0, -LIFT * liftK(t));
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
    comp.style.boxShadow = liftK(t) > 0.2 ? SHADOW.l : "none";
    const n = t < tType0 ? 0 : t >= tSend ? (t < tSend + 0.02 ? MESSAGE.length : 0) : Math.round(MESSAGE.length * ramp(ctx, t, tType0, tType1, "power1.inOut"));
    typedText.textContent = MESSAGE.slice(0, n);
    ph.style.opacity = t < tType0 || t >= tSend + 0.34 ? "1" : "0";
    caret.style.visibility = t >= tType0 && t < tSend && (t < tType1 || Math.floor((t - tType1) * 4) % 2 === 0) ? "inherit" : "hidden";
  });
  for (let k = 0; k < 8; k += 1) ctx.sfx(`type_key_${(k % 6) + 1}`, tType0 + ((tType1 - tType0) * k) / 7, { offset: -6 });
  tl.fromTo(send, { scale: 1 }, { scale: 0.9, duration: 0.08, ease: "power2.out", immediateRender: false }, tPress - 0.02);
  tl.fromTo(send, { scale: 0.9 }, { scale: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, tPress + 0.07);

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

  /* The Maitama villa (the card the sheet shares) comes off the press and flies away: sent. */
  const pushQ = quadAtPose(pL, PUSH15);
  const rowAt = mapQuad(pushQ, 1000 / DW, (SENDROW.y + 124) / DH);
  const flyer = cropBody(ctx, over, { src: thread, crop: MAITAMA, iw: DW, radius: 40, shadow: SHADOW.l });
  quadDriver(ctx, flyer, MAITAMA.w, MAITAMA.h, {
    t0: tFly0, t1: tFly1,
    quadAt: (t) => {
      /* up from the pressed row in an arc, over the sheet's blurred backdrop (the list is not on screen), to x <= 940 */
      const k = ramp(ctx, t, tFly0, tFly1, "power2.inOut");
      const w = mix(170, 360, Math.sin(Math.PI * Math.min(1, k * 1.4) / 2)) * mix(1, 0.55, ramp(ctx, t, tFly1 - 0.14, tFly1, "power2.in"));
      const x = mix(rowAt.x - 90, 760, k) - w / 2;
      const y = mix(rowAt.y, 460, k) - 120 * Math.sin(Math.PI * k) - (w * 0.72) / 2;
      return rectQuad({ x, y, w, h: w * (MAITAMA.h / MAITAMA.w), rot: mix(-4, 6, k) });
    },
    opacityAt: (t) => ramp(ctx, t, tFly0, tFly0 + 0.06) * (1 - ramp(ctx, t, tFly1 - 0.12, tFly1, "power1.in")),
  });
  ctx.sfx("card_slide", tFly0, { offset: -2 });

  /* ==================== row 17 ==================== */
  /* Narrow, at x 44-393: beside the thread, clear of its text (which starts at x 405 with the phone at cx 700). */
  const DAY = { X: 44, Y: 690, k: 0.97 };
  const day = dayCard(ctx, over, T, { X: DAY.X, Y: DAY.Y, k: DAY.k, layout: "narrow", chipAt: { x: DAY.X + (360 * DAY.k) / 2, y: DAY.Y + (400 * DAY.k) / 2 }, tIn: T.r17 - 0.1, tOut0: T.r18, tOut1: T.r18 + 0.42 });
  ctx.sfx("card_slide", ctx.beat(64.05), { offset: -2 }); // 36.95
  ctx.sfx("stamp", T.inspection);

  /* ==================== row 18 ==================== */

  /* The day card docks into the inbox row as its unread dot. */
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
    const k = ramp(ctx, t, tChip0 + 0.05, tDock - 0.05, "power2.in");
    dot.style.borderRadius = `${mix(30, 50, k).toFixed(1)}px`;
    dotIcon.style.opacity = String((1 - ramp(ctx, t, tChip0 + 0.05, tChip0 + 0.25)).toFixed(3));
  });
  ctx.sfx("pop", tDock, { offset: -2 });

  /* ==================== the pointer (kept inside x 940, the platforms' safe width) ==================== */
  const orbT = track(ctx, S.orb, { x: 900, y: 1300, opacity: 0 });
  S.orbT = orbT;
  const hPress = BAR.h + GROW;
  const sendAt = mapQuad(shiftQuad(displayQuad(pL, { x: 0, y: BAR.y + BAR.h - hPress, w: DW, h: hPress }, pushQ), 0, -LIFT), 1206 / DW, (hPress - 90.5) / hPress);
  orbT.to(tWordsOut + 0.08, 0.14, { opacity: 1 }, "power1.out");
  orbT.to(tWordsOut + 0.08, 0.36, { x: sendAt.x + 4, y: sendAt.y + 30 }, "glide");
  orbT.to(tPress - 0.1, 0.08, { x: sendAt.x, y: sendAt.y }, "power2.out");
  pressAt(ctx, S.orb, tPress, { ringParent: S.pointer, x: sendAt.x, y: sendAt.y, sound: "tap" });
  orbT.to(tPress + 0.1, 0.4, { x: sendAt.x - 40, y: sendAt.y + 70 }, "glide");
  /* to the share sheet's row, there by 35.80, pressed on "chat" */
  orbT.to(T.share + 0.12, 0.43, { x: rowAt.x + 10, y: rowAt.y + 8 }, "glide");
  orbT.to(tPressRow - 0.1, 0.08, { x: rowAt.x, y: rowAt.y }, "power2.out");
  pressAt(ctx, S.orb, tPressRow, { ringParent: S.pointer, x: rowAt.x, y: rowAt.y, sound: "tap" });
  orbT.to(tClose0, 0.3, { x: rowAt.x + 60, y: rowAt.y + 180, opacity: 0 }, "power2.in");
  /* Row 18: the menu, which opens the drawer. */
  const menuQ = displayQuad(pL, { x: MENU.x, y: MENU.y, w: 1, h: 1 }, quadAtPose(pL, HIGH));
  const menuAt = { x: menuQ[0].x + 14, y: menuQ[0].y + 12 };
  orbT.to(tMenu - 0.44, 0.14, { opacity: 1 }, "power1.out");
  orbT.to(tMenu - 0.44, 0.38, { x: menuAt.x, y: menuAt.y }, "glide");
  pressAt(ctx, S.orb, tMenu, { sound: null });
  ripple(ctx, msgs.el, { x: MENU.x, y: MENU.y, t: tMenu, size: 200, sound: "tap_soft", offset: -6 });
  /* then on to FLIP, where row 19 presses it */
  const flipQ = displayQuad(pL, { x: FLIP.x, y: FLIP.y, w: 1, h: 1 }, quadAtPose(pL, FLIPPOSE));
  S.flipAt = { x: flipQ[0].x, y: flipQ[0].y };
  orbT.to(tFlipPush + 0.1, 0.62, { x: S.flipAt.x + 12, y: S.flipAt.y + 10 }, "glide");
}
