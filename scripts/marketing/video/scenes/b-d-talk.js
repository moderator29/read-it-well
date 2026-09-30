/**
 * Desktop rows 14 to 19 (30.58 to 42.69), storyboard v3.1.
 *   D14  d-thread-lt at WINDOW_LEFT: the villa card lands on the thread's
 *        Maitama card; "owner", "landlord", "agent" land in RIGHT_PANEL; a
 *        2.5x push onto the composer.
 *   D15  the composer, echoed large at the bottom of RIGHT_PANEL, types the
 *        member's real message; the pointer clicks send; the bubble flies
 *        into the thread.
 *   D16  d-listing-share-lt: a 2.5x push onto "Send in a Vallo chat"; the
 *        click; the Maitama villa (what the sheet shares) flies off; the
 *        sheet closes onto the listing (d-listing-lt).
 *   D17  the day card in RIGHT_PANEL turns to Saturday, 11:00 AM stamps.
 *   D18  d-messages-lt at WINDOW_HERO: the day card docks as the unread dot;
 *        the camera pushes toward the sidebar's FLIP "Switch to Stays".
 *   D19  the click on "Planning": the window turns over to d-stays-lt as the
 *        warm light blooms from the click; "Planning a trip?" lands in its
 *        ring at the left, then shrinks into the pill ("Book a room").
 */
import { questionCard } from "../engine/components.js";
import { QUESTIONS } from "./layout.js";
import { NAVY, ELECTRIC, SHADOW, ramp, kf, mix, showDuring, box, cropBody, quadDriver, rectQuad, lerpQuad, shiftQuad, pressAt, dayCard, measure, ringOut } from "./b-kit.js";
import { CW, CH } from "./b-desktop.js";

/* d-thread-lt (CSS px of the 1440 x 900 page); crops are in capture px (2880 wide). */
const MAITAMA = { x: 942, y: 490, w: 398, h: 269 };
const MAITAMA_CROP = { x: 1884, y: 980, w: 796, h: 538 };
const BUBBLE = { x: 857, y: 764, w: 483, h: 59 };
const BUBBLE_CROP = { x: 1714, y: 1528, w: 966, h: 118 };
const TICK = { x: 1308.5, y: 800.5, w: 14, h: 11 }; // the tick only, clear of "02:42"
/* d-listing-share-lt: the sheet and its "Send in a Vallo chat" row. */
const SHEET = { x: 448, y: 617, w: 543, h: 283 };
const SENDROW = { x: 474, y: 726, w: 492, h: 80 };
const SENDCHEV = { x: 951, y: 765 };
/* d-messages-lt: the unread dot; the sidebar's FLIP card and its chevron. */
const DOT = { x: 458.6, y: 376.6 };
const FLIP_C = { x: 131, y: 822 };
const FLIP_CHEV = { x: 229, y: 820 };

/* Section a's last frame on desktop (A -> B in handoffs.md). */
const A_VILLA = { x: 1206, y: 330, w: 600, h: 405.5 };

const MESSAGE = "I like these two as well. Could we view all three on Saturday morning?";

export async function deskTalk(ctx, S, T) {
  const { tl } = ctx;
  const { L } = S;
  const RP = L.RIGHT_PANEL;
  const cam = S.camT;
  const wvT = S.wvT;
  const cards = S.cards;
  const type = S.type;
  const thread = ctx.src.capture("d-thread-lt");

  /* ---------- the window's pages ---------- */
  const tLandBubble = T.app + 0.4;
  const tClose0 = T.chat + 0.11;             // 36.26: the sheet closes after the press on "chat"
  const tClose1 = T.chat + 0.4;
  const tBack = T.r18 + 0.05;                // 38.70: to the inbox, at the hero scale
  const tClick = T.planning - 0.3;           // 41.24: pressed before the word, so the frame is clear as "Planning" rises
  const tTurn0 = T.planning + 0.3;               // 41.84: the window turns over at TURN
  S.tSwap = tTurn0 + 0.26;                   // 42.10: its back is d-stays-lt
  const pThread = S.page("d-thread-lt", [[T.r14, T.share + 0.2]]);
  const pShare = S.page("d-listing-share-lt", [[T.share, tClose1 + 0.1]]);
  const pListing = S.page("d-listing-lt", [[tClose0, tBack + 0.5]]);
  const pMsgs = S.page("d-messages-lt", [[tBack, S.tSwap]]);
  S.pMsgs = pMsgs;
  /* the member's bubble is not sent yet */
  /* (clear of the Maitama card's shadow just above the bubble) */
  const patch = box(ctx, pThread, { x: BUBBLE.x - 6, y: BUBBLE.y - 1, w: BUBBLE.w + 12, h: BUBBLE.h + 5, style: { background: "#f3f4f1" } });
  showDuring(ctx, patch, [[0, tLandBubble]]); // at full opacity from the cut (section a covers it from 29.39)
  const tick = box(ctx, pThread, { ...TICK, style: { background: "rgb(0 96 232)", borderRadius: "4px" } });
  showDuring(ctx, tick, [[tLandBubble, T.r16 + 0.2]]);
  tl.fromTo(tick, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", immediateRender: false }, tLandBubble + 0.08);
  /* the sheet: the page's backdrop with a notch where the sheet sits, and the sheet sliding up */
  const shareImg = pShare.querySelector("img");
  shareImg.style.clipPath = `polygon(0px 0px, ${CW}px 0px, ${CW}px ${CH}px, ${SHEET.x + SHEET.w}px ${CH}px, ${SHEET.x + SHEET.w}px ${SHEET.y}px, ${SHEET.x}px ${SHEET.y}px, ${SHEET.x}px ${CH}px, 0px ${CH}px)`;
  const notch = box(ctx, pShare, { x: SHEET.x, y: SHEET.y, w: SHEET.w, h: SHEET.h, style: { background: "#9fa1a8" } });
  pShare.insertBefore(notch, shareImg);
  const sheet = ctx.img(ctx.src.capture("d-listing-share-lt"), { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px`, clipPath: `inset(${SHEET.y}px ${CW - SHEET.x - SHEET.w}px 0px ${SHEET.x}px round 16px 16px 0px 0px)` } }, pShare);
  const sheetY = (t) => kf(ctx, t, [[T.share, SHEET.h + 10], [T.share + 0.26, 0, "power3.out"], [tClose0, 0], [tClose1, SHEET.h + 10, "power2.in"]]);
  const rowFlash = box(ctx, pShare, { ...SENDROW, style: { background: "rgb(0 105 254 / 0.1)", borderRadius: "12px", opacity: "0" } });
  ctx.onFrame((t) => {
    if (t < T.share || t > tClose1 + 0.1) return;
    const y = sheetY(t);
    sheet.style.transform = `translateY(${y.toFixed(2)}px)`;
    rowFlash.style.transform = `translateY(${y.toFixed(2)}px)`;
    pShare.style.opacity = String(ramp(ctx, t, T.share, T.share + 0.16, "power1.out").toFixed(3));
  });
  tl.fromTo(rowFlash, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power1.out", immediateRender: false }, T.chat);
  tl.fromTo(rowFlash, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, T.chat + 0.08);
  /* the listing comes back unblurred as the sheet closes */
  ctx.gsap.set(pListing, { opacity: 0 });
  tl.fromTo(pListing, { opacity: 0 }, { opacity: 1, duration: 0.26, ease: "power1.inOut", immediateRender: false }, tClose0);

  /* ==================== D14 ==================== */
  /* the window grows from section a's side window to the hero as the villa card lands (v3.3: never a thumbnail) */
  wvT.to(T.r14, 0.52, { cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, "glide");
  S.veilDuring(T.owner - 0.2, T.share + 0.05);
  S.veilDuring(T.r17 - 0.15, T.r18 + 0.45);
  const tLand = T.r14 + 0.52;
  const villa = cropBody(ctx, cards, { src: thread, crop: MAITAMA_CROP, iw: 2880, radius: 26, shadow: SHADOW.l, canvas: true });
  quadDriver(ctx, villa, MAITAMA_CROP.w, MAITAMA_CROP.h, {
    t0: T.r14, t1: tLand + 0.16,
    quadAt: (t) => {
      const k = ramp(ctx, t, T.r14, tLand, "glide");
      const q = lerpQuad(rectQuad(A_VILLA), S.rectQuad(MAITAMA), k);
      return shiftQuad(q, 0, -50 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, tLand, tLand + 0.14, "power1.out"),
  });
  ctx.sfx("card_slide", ctx.beat(53.4)); // 30.81

  /* Card 1, taken over from section a at the cut in its end state (answer side up, right of where the
     receipt was), so its answer reads to 31.30; then it leaves for the top right, where row 31 brings it back. */
  const card1Out = ctx.beat(54.25); // 31.30
  const C1 = { x: 1384, y: 150, w: 500, h: 160 };
  const card1 = questionCard(ctx, cards, { q: QUESTIONS[0].q, a: QUESTIONS[0].a, box: C1, fontSize: 34 });
  Object.assign(card1.front.style, { justifyContent: "center", textAlign: "center", textWrap: "balance" });
  Object.assign(card1.back.style, { justifyContent: "center", textAlign: "center", fontSize: "28px", lineHeight: "1.22", textWrap: "balance" });
  /* the answer on two set lines, never ragged */
  card1.back.querySelector("span").innerHTML = "₦26,100,000 to move in.<br>Seen before a single call.";
  card1.turn(T.r14 - 5, { sound: null }); // already turned at the cut
  const c1c = { x: C1.x + C1.w / 2, y: C1.y + C1.h / 2 };
  ctx.gsap.set(card1.root, { transformOrigin: "50% 50%", rotation: 3 });
  tl.fromTo(card1.root, { x: 0, y: 0, rotation: 3, scale: 1 }, { x: 2070 - c1c.x, y: -330 - c1c.y, rotation: 22, scale: 0.9, duration: 0.36, ease: "power2.in", immediateRender: false }, card1Out);
  showDuring(ctx, card1.root, [[T.r14, card1Out + 0.4]]);

  /* owner, landlord, agent land in RIGHT_PANEL, one at a time, each at its own height and size */
  const words = [
    { text: "owner", blue: true, t: T.owner, y: 318, k: 1.04, dx: 0 },
    { text: "landlord", blue: false, t: T.landlord, y: 470, k: 1, dx: 28 },
    { text: "agent", blue: false, t: T.agent, y: 626, k: 0.97, dx: 10 },
  ].map((w) => {
    const mask = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", overflow: "hidden", padding: "0.1em 0.06em 0.18em", visibility: "hidden" } }, type);
    const el = ctx.el("div", { text: w.text, style: { font: "700 120px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: w.blue ? ELECTRIC : NAVY, whiteSpace: "nowrap" } }, mask);
    return { ...w, mask, el };
  });
  let wSize = null;
  const tFly = T.inside + 0.4;               // 34.40: they fade out together (no flight into the pill)
  ctx.onFrame((t) => {
    if (t < T.r14 || t > tFly + 0.4) {
      words.forEach((w) => (w.mask.style.visibility = "hidden"));
      return;
    }
    if (!wSize) {
      wSize = Math.min(126, (560 / measure("landlord", "700 100px Poppins")) * 100);
      words.forEach((w) => (w.el.style.fontSize = `${(wSize * w.k).toFixed(1)}px`));
    }
    words.forEach((w, i) => {
      const k = ramp(ctx, t, w.t - 0.06, w.t + 0.34, "land");
      const out = ramp(ctx, t, tFly, tFly + 0.24, "power2.in");
      const on = t >= w.t - 0.06 && out < 0.999;
      w.mask.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      w.el.style.transform = `translateY(${((1 - k) * 110).toFixed(2)}%)`;
      w.mask.style.transform = `translate(${(RP.x + 40 + w.dx).toFixed(2)}px, ${(w.y - wSize * 0.62 + 30 * out).toFixed(2)}px)`;
      w.mask.style.opacity = (1 - out).toFixed(3);
    });
  });
  words.forEach((w) => ctx.sfx("pop_low", w.t, { offset: -4 }));

  /* (no push onto the empty composer: the echo in RIGHT_PANEL is the close-up) */

  /* ==================== D15: the echo in RIGHT_PANEL ==================== */
  const echo = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${RP.w - 40}px`, display: "flex", alignItems: "flex-end", gap: "14px", padding: "16px", borderRadius: "34px", background: "#f3f4f1", boxShadow: SHADOW.l, visibility: "hidden" } }, cards);
  const eImg = ctx.el("div", { style: { flex: "none", width: "62px", height: "62px", borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#0066fe", boxShadow: "0 4px 12px -6px rgb(16 32 80 / 0.25)" } }, echo);
  ctx.icon("image", { size: 28, stroke: 2 }, eImg);
  const eField = ctx.el("div", { style: { flex: "1", minHeight: "62px", borderRadius: "22px", background: "#fff", padding: "14px 20px", font: "400 25px/34px Inter, sans-serif", color: NAVY, letterSpacing: "-0.01em", boxShadow: "0 4px 12px -8px rgb(16 32 80 / 0.2)" } }, echo);
  const ePh = ctx.el("span", { text: "Type a message", style: { color: "#6b7280" } }, eField);
  const eText = ctx.el("span", {}, eField);
  /* a zero-width caret, so it never wraps to a line of its own */
  const eCaret = ctx.el("span", { style: { display: "inline-block", width: "0px", height: "30px", verticalAlign: "-7px", position: "relative" } }, eField);
  ctx.el("span", { style: { position: "absolute", left: "2px", top: "0px", width: "3px", height: "30px", background: ELECTRIC, borderRadius: "2px" } }, eCaret);
  const eSend = ctx.el("div", { style: { flex: "none", width: "62px", height: "62px", borderRadius: "18px", background: "#0042a2", display: "grid", placeItems: "center", color: "rgb(210 225 255 / 0.85)" } }, echo);
  ctx.icon("arrow-up-right", { size: 30, stroke: 2.2 }, eSend);
  const tEcho = T.r15 - 0.02;
  const tType0 = T.r15 + 0.05;
  const tType1 = T.inside + 0.3;
  const tSend = T.app;
  const tEchoOut = tLandBubble + 0.02;
  const ECHO_BOTTOM = 872;
  let eH = null;
  showDuring(ctx, echo, [[tEcho, tEchoOut + 0.3]]);
  ctx.onFrame((t) => {
    if (t < tEcho || t > tEchoOut + 0.3) return;
    const n = t < tType0 ? 0 : t >= tSend ? 0 : Math.round(MESSAGE.length * ramp(ctx, t, tType0, tType1, "power1.inOut"));
    eText.textContent = MESSAGE.slice(0, n);
    ePh.style.display = n > 0 || (t >= tType0 && t < tSend) ? "none" : "inline";
    eCaret.style.visibility = t >= tType0 && t < tSend && (t < tType1 || Math.floor((t - tType1) * 4) % 2 === 0) ? "inherit" : "hidden";
    eH = echo.offsetHeight;
    const k = ramp(ctx, t, tEcho, tEcho + 0.4, "land");
    const out = ramp(ctx, t, tEchoOut, tEchoOut + 0.28, "power2.in");
    echo.style.transform = `translate(${RP.x + 20}px, ${(ECHO_BOTTOM - eH + (1 - k) * 90 + out * 60).toFixed(2)}px)`;
    echo.style.opacity = String((Math.min(1, k * 1.6) * (1 - out)).toFixed(3));
  });
  tl.fromTo(eSend, { scale: 1 }, { scale: 0.88, duration: 0.08, ease: "power2.out", immediateRender: false }, T.the7 - 0.02);
  tl.fromTo(eSend, { scale: 0.88 }, { scale: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, T.the7 + 0.07);
  for (let k = 0; k < 8; k += 1) ctx.sfx(`type_key_${(k % 6) + 1}`, tType0 + ((tType1 - tType0) * k) / 7.4, { offset: -6 });

  /* the bubble: from the echo's field into its place in the thread */
  const bubble = cropBody(ctx, cards, { src: thread, crop: BUBBLE_CROP, iw: 2880, shadow: SHADOW.m });
  bubble.style.borderRadius = "36px 36px 10px 36px";
  box(ctx, bubble, { x: (TICK.x - BUBBLE.x) * 2, y: (TICK.y - BUBBLE.y) * 2, w: TICK.w * 2, h: TICK.h * 2, style: { background: "rgb(0 96 232)" } });
  quadDriver(ctx, bubble, BUBBLE_CROP.w, BUBBLE_CROP.h, {
    t0: tSend, t1: tLandBubble + 0.1,
    quadAt: (t) => {
      const r = eField.getBoundingClientRect();
      const from = rectQuad({ x: r.x, y: r.y, w: r.width, h: r.height });
      const k = ramp(ctx, t, tSend, tLandBubble, "glide");
      return shiftQuad(lerpQuad(from, S.rectQuad(BUBBLE), k), 0, -50 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => ramp(ctx, t, tSend, tSend + 0.06) * (1 - ramp(ctx, t, tLandBubble, tLandBubble + 0.08)),
  });
  ctx.sfx("bubble_send", tSend);

  /* ==================== D16: the share ==================== */
  const heroWv0 = { ...S.wv, cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s };
  const rowW = S.toStageAt(heroWv0, { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 }, SENDROW.x + SENDROW.w / 2, SENDROW.y + SENDROW.h / 2);
  /* 1.8 x the hero's 1.111 = 2.0: the capture's own pixels */
  const PUSH16 = { s: 1.8, fx: rowW.x, fy: rowW.y, tx: 900, ty: 520 };
  cam.to(T.share, 0.5, PUSH16, "power3.inOut"); // after the echo has gone; settled by 35.75
  cam.to(T.chat + 0.15, 0.46, { s: 1, tx: rowW.x, ty: rowW.y }, "power2.inOut");
  const chev = S.toStageAt(heroWv0, PUSH16, SENDCHEV.x, SENDCHEV.y);
  ctx.hidePill(T.share, T.chat + 0.61);
  const flyer = cropBody(ctx, cards, { src: thread, crop: MAITAMA_CROP, iw: 2880, radius: 26, shadow: SHADOW.l });
  const tFly0 = T.chat + 0.08;
  const tFly1 = T.chat + 0.55;
  quadDriver(ctx, flyer, MAITAMA_CROP.w, MAITAMA_CROP.h, {
    t0: tFly0, t1: tFly1,
    quadAt: (t) => {
      /* after the press, it rises from the top edge of the sheet and arcs away along the top: never over the sheet's text */
      const k = ramp(ctx, t, tFly0, tFly1, "power2.in");
      const up = ramp(ctx, t, tFly0, tFly0 + 0.3, "power3.out");
      const w = mix(160, 320, up);
      const x = mix(chev.x - 260, 2150, k) - w / 2;
      const y = mix(mix(230, 130, up), -380, k) - (w * 0.676) / 2;
      return rectQuad({ x, y, w, h: w * (MAITAMA_CROP.h / MAITAMA_CROP.w), rot: mix(-3, 10, k) });
    },
    opacityAt: (t) => ramp(ctx, t, tFly0, tFly0 + 0.06),
  });
  ctx.sfx("card_slide", tFly0, { offset: -2 });

  /* ==================== D17: the day card in RIGHT_PANEL ==================== */
  const k17 = 1.2;
  const DX = RP.x + (RP.w - 470 * k17) / 2;
  const DY = RP.y + 70;
  const day = dayCard(ctx, cards, T, { X: DX, Y: DY, k: k17, chipAt: { x: DX + 150, y: DY + 470 }, tIn: T.r17 - 0.1, tOut0: T.r18, tOut1: T.r18 + 0.42 });
  ctx.sfx("card_slide", ctx.beat(64.05), { offset: -2 }); // 36.95
  ctx.sfx("stamp", T.inspection);

  /* ==================== D18: the inbox, the dock, the push toward FLIP ==================== */
  wvT.to(tBack, 0.5, { cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, "power2.inOut");
  ctx.gsap.set(pMsgs, { opacity: 0 });
  tl.fromTo(pMsgs, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut", immediateRender: false }, tBack);
  const tDock = ctx.beat(68.3); // 39.40
  const heroCam = { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 };
  const dotAt = S.toStageAt({ ...S.wv, cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, heroCam, DOT.x, DOT.y);
  const chip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "30px", background: `linear-gradient(160deg, #3d8bff, ${ELECTRIC} 60%, #0050d0)`, display: "grid", placeItems: "center", color: "#fff", transformOrigin: "0 0", visibility: "hidden", boxShadow: SHADOW.s } }, cards);
  const chipIcon = ctx.el("div", { style: { display: "grid", placeItems: "center" } }, chip);
  ctx.icon("calendar-check", { size: 50, stroke: 2.2 }, chipIcon);
  quadDriver(ctx, chip, 100, 100, {
    t0: day.tOut1 - 0.02, t1: tDock + 0.04,
    quadAt: (t) => {
      const k = ramp(ctx, t, day.tOut1, tDock, "glide");
      const size = mix(day.chipSize, 12, k);
      const x = mix(day.chipAt.x, dotAt.x, k);
      const y = mix(day.chipAt.y, dotAt.y, k) - 120 * Math.sin(Math.PI * k);
      return rectQuad({ x: x - size / 2, y: y - size / 2, w: size, h: size });
    },
  });
  ctx.onFrame((t) => {
    if (t < day.tOut1 - 0.02 || t > tDock + 0.05) return;
    chip.style.borderRadius = `${mix(30, 50, ramp(ctx, t, day.tOut1 + 0.1, tDock - 0.05, "power2.in")).toFixed(1)}px`;
    chipIcon.style.opacity = String((1 - ramp(ctx, t, day.tOut1 + 0.1, day.tOut1 + 0.35)).toFixed(3));
  });
  /* (no ring at the dot: v3.1 keeps rings to rows 04, 19 and 23) */
  ctx.sfx("pop", tDock, { offset: -2 });
  /* the push toward FLIP: 1.8 x 1.111 = 2.0, the capture's own pixels; FLIP at the right third, above y 1000,
     with the window's edge and the mist on the left (the title lands there), not a slab of empty page */
  const flipW = { x: S.HERO.cx + (FLIP_C.x - CW / 2) * S.HERO.s, y: S.HERO.cy + (56 + FLIP_C.y - (CH + 56) / 2) * S.HERO.s };
  const PUSH18 = { s: 1.8, fx: flipW.x, fy: flipW.y, tx: 330, ty: 860 };   // the window's lower-left quadrant fills the frame
  ctx.hidePill(T.place + 0.18, T.r19 + 0.02);
  cam.to(T.place + 0.18, 0.66, PUSH18, "power2.inOut");

  /* ==================== D19: the switch ==================== */
  const heroWv = { ...S.wv, cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s };
  const chevAt = S.toStageAt(heroWv, PUSH18, FLIP_CHEV.x, FLIP_CHEV.y);
  ctx.sfx("whoosh_long", T.r19, { offset: -2 });
  ctx.sfx("toggle_on", tClick, { offset: 4 });
  /* the camera pulls back as the window turns over to Stays and moves right, clear of the title */
  cam.to(tClick + 0.04, 0.32, { s: 1, tx: flipW.x, ty: flipW.y }, "power2.inOut");   // back to 1x by 41.60
  /* the side scale (as in D14, D16 and D26), at the right: clear of the title at the left */
  const TURN = { cx: 1920 - 80 - (CW / 2) * S.LEFT.s, cy: S.LEFT.cy, s: S.LEFT.s };
  wvT.to(tClick + 0.04, 0.26, TURN, "power2.inOut");                                  // at TURN by 41.54
  wvT.to(tTurn0, 0.26, { ry: 90 }, "power2.in");                                        // the turn, in place, 41.84-42.36
  wvT.to(S.tSwap, 0.001, { ry: -90 }, "none");
  wvT.to(S.tSwap + 0.001, 0.26, { ry: 0 }, "power2.out");
  const tHold = ctx.beat(74.55);                                                         // 43.01
  wvT.to(tHold + 0.04, 0.5, { cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, "glide");    // rises to the hero at 43.05-43.55

  /* "Planning / a trip?" at the left, over the mist, in a ring that circles the words only */
  const TC = { x: 350, y: 560 };
  const RR = 300;
  const title = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "700px", textAlign: "center", fontFamily: "Poppins, Inter, sans-serif", fontWeight: "700", letterSpacing: "-0.035em", lineHeight: "1.06", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } }, type);
  const l1 = ctx.el("div", {}, title);
  const l2 = ctx.el("div", {}, title);
  const wordEl = (parent, text, color, t, gap = false) => {
    const mask = ctx.el("span", { style: { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.39em", margin: "-0.06em -0.04em -0.39em", marginLeft: gap ? "0.22em" : "0" } }, parent);
    const w = ctx.el("span", { text, style: { display: "inline-block", color } }, mask);
    ctx.gsap.set(w, { yPercent: 118 });
    tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.34, ease: "land", immediateRender: false }, t);
  };
  wordEl(l1, "Planning", NAVY, T.planning);
  wordEl(l2, "a", NAVY, T.a9);
  wordEl(l2, "trip?", ELECTRIC, T.trip, true);
  let tSize = null;
  const tShrink1 = tHold + 0.3;
  showDuring(ctx, title, [[T.planning - 0.02, tShrink1 + 0.04]]);
  ctx.onFrame((t) => {
    if (t < T.planning - 0.02 || t > tShrink1 + 0.05) return;
    if (!tSize) {
      const wP = measure("Planning", "700 100px Poppins") / 100;
      tSize = Math.min(120, 440 / wP);
      while (Math.hypot((wP * tSize) / 2, 1.06 * tSize) > RR - 34) tSize -= 1;
      title.style.fontSize = `${tSize.toFixed(1)}px`;
    }
    const k = ramp(ctx, t, tHold, tShrink1, "power3.inOut");
    const cx = mix(TC.x, 960, k);
    const cy = mix(TC.y, 66, k);
    title.style.transformOrigin = "350px 50%";
    title.style.transform = `translate(${(cx - 350).toFixed(2)}px, ${(cy - tSize * 1.06).toFixed(2)}px) scale(${mix(1, 0.2, k).toFixed(4)})`;
    title.style.opacity = String((1 - ramp(ctx, t, tShrink1 - 0.06, tShrink1 + 0.02)).toFixed(3));
  });
  const ringWrap = ctx.el("div", { class: "fill" }, type);
  ringOut(ctx, ringWrap, { cx: TC.x, cy: TC.y, r: RR, t: T.planning + 0.06, dots: 8, seed: 19, stroke: 4 });
  ringWrap.style.transformOrigin = `${TC.x}px ${TC.y}px`;
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9, duration: 0.28, ease: "power2.in", immediateRender: false }, tHold - 0.04);
  showDuring(ctx, ringWrap, [[T.planning, tHold + 0.26]]);

  /* ==================== the pointer ==================== */
  const o = S.orbT;
  const sendAt = { x: RP.x + 20 + (RP.w - 40) - 16 - 31, y: ECHO_BOTTOM - 16 - 31 };
  o.to(T.right + 0.1, 0.14, { opacity: 1 }, "power1.out");
  o.to(T.right + 0.1, 0.46, { x: sendAt.x + 14, y: sendAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, T.the7, { ringParent: S.pointer, x: sendAt.x, y: sendAt.y, sound: "tap" });
  o.to(T.share + 0.05, 0.5, { x: chev.x + 16, y: chev.y + 12 }, "glide");     // there by 35.80
  pressAt(ctx, S.orb, T.chat, { ringParent: S.pointer, x: chev.x, y: chev.y, sound: "tap" });
  o.to(T.chat + 0.14, 0.4, { x: 1700, y: 860 }, "glide");
  o.to(T.chat + 0.3, 0.2, { opacity: 0 }, "power1.in");
  o.to(T.r19 - 0.4, 0.16, { opacity: 1 }, "power1.out");
  o.to(T.r19 - 0.4, 0.6, { x: chevAt.x + 16, y: chevAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, tClick, { ringParent: S.pointer, x: chevAt.x, y: chevAt.y, sound: null });
  o.to(tClick + 0.14, 0.34, { x: chevAt.x + 260, y: chevAt.y + 260, opacity: 0 }, "power2.in");
}
