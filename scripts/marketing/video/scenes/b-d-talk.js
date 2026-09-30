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
import { ringBurst } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW, ramp, kf, mix, showDuring, box, cropBody, quadDriver, rectQuad, lerpQuad, shiftQuad, placeQuad, pressAt, dayCard, measure } from "./b-kit.js";
import { CW, CH } from "./b-desktop.js";

/* d-thread-lt (CSS px of the 1440 x 900 page); crops are in capture px (2880 wide). */
const MAITAMA = { x: 942, y: 490, w: 398, h: 269 };
const MAITAMA_CROP = { x: 1884, y: 980, w: 796, h: 538 };
const BUBBLE = { x: 857, y: 764, w: 483, h: 59 };
const BUBBLE_CROP = { x: 1714, y: 1528, w: 966, h: 118 };
const TICK = { x: 1308.5, y: 800.5, w: 14, h: 11 }; // the tick only, clear of "02:42"
const COMPOSER_C = { x: 1032, y: 870 };
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
  const pThread = S.page("d-thread-lt", [[T.r14, T.r16 + 0.1]]);
  const pShare = S.page("d-listing-share-lt", [[T.r16, T.listings + 0.5]]);
  const pListing = S.page("d-listing-lt", [[T.listings + 0.24, T.r18 - 0.1]]);
  const pMsgs = S.page("d-messages-lt", [[T.r18 - 0.3, T.planning + 0.3]]);
  S.pMsgs = pMsgs;
  /* the member's bubble is not sent yet */
  const patch = box(ctx, pThread, { x: BUBBLE.x - 6, y: BUBBLE.y - 4, w: BUBBLE.w + 12, h: BUBBLE.h + 8, style: { background: "#f3f4f1" } });
  showDuring(ctx, patch, [[0, tLandBubble]]);
  const tick = box(ctx, pThread, { ...TICK, style: { background: "rgb(0 96 232)", borderRadius: "4px" } });
  showDuring(ctx, tick, [[tLandBubble, T.r16 + 0.2]]);
  tl.fromTo(tick, { scale: 1, opacity: 1 }, { scale: 0, opacity: 0, duration: 0.16, ease: "power2.in", immediateRender: false }, tLandBubble + 0.08);
  /* the sheet: the page's backdrop with a notch where the sheet sits, and the sheet sliding up */
  const shareImg = pShare.querySelector("img");
  shareImg.style.clipPath = `polygon(0px 0px, ${CW}px 0px, ${CW}px ${CH}px, ${SHEET.x + SHEET.w}px ${CH}px, ${SHEET.x + SHEET.w}px ${SHEET.y}px, ${SHEET.x}px ${SHEET.y}px, ${SHEET.x}px ${CH}px, 0px ${CH}px)`;
  const notch = box(ctx, pShare, { x: SHEET.x, y: SHEET.y, w: SHEET.w, h: SHEET.h, style: { background: "#9fa1a8" } });
  pShare.insertBefore(notch, shareImg);
  const sheet = ctx.img(ctx.src.capture("d-listing-share-lt"), { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${CH}px`, clipPath: `inset(${SHEET.y}px ${CW - SHEET.x - SHEET.w}px 0px ${SHEET.x}px round 16px 16px 0px 0px)` } }, pShare);
  const sheetY = (t) => kf(ctx, t, [[T.r16, SHEET.h + 10], [T.r16 + 0.26, 0, "power3.out"], [T.listings + 0.11, 0], [T.listings + 0.4, SHEET.h + 10, "power2.in"]]);
  const rowFlash = box(ctx, pShare, { ...SENDROW, style: { background: "rgb(0 105 254 / 0.1)", borderRadius: "12px", opacity: "0" } });
  ctx.onFrame((t) => {
    if (t < T.r16 || t > T.listings + 0.5) return;
    const y = sheetY(t);
    sheet.style.transform = `translateY(${y.toFixed(2)}px)`;
    rowFlash.style.transform = `translateY(${y.toFixed(2)}px)`;
    pShare.style.opacity = String(ramp(ctx, t, T.r16, T.r16 + 0.16, "power1.out").toFixed(3));
  });
  tl.fromTo(rowFlash, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power1.out", immediateRender: false }, T.listings);
  tl.fromTo(rowFlash, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, T.listings + 0.08);
  /* the listing comes back unblurred as the sheet closes */
  tl.fromTo(pListing, { opacity: 0 }, { opacity: 1, duration: 0.26, ease: "power1.inOut", immediateRender: false }, T.listings + 0.24);

  /* ==================== D14 ==================== */
  const tLand = T.r14 + 0.52;
  const villa = cropBody(ctx, cards, { src: thread, crop: MAITAMA_CROP, iw: 2880, radius: 26, shadow: SHADOW.l });
  quadDriver(ctx, villa, MAITAMA_CROP.w, MAITAMA_CROP.h, {
    t0: T.r14, t1: tLand + 0.16,
    quadAt: (t) => {
      const k = ramp(ctx, t, T.r14, tLand, "glide");
      const q = lerpQuad(rectQuad(A_VILLA), S.rectQuad(MAITAMA), k);
      return shiftQuad(q, 0, -50 * Math.sin(Math.PI * k));
    },
    opacityAt: (t) => 1 - ramp(ctx, t, tLand, tLand + 0.14, "power1.out"),
  });
  ctx.sfx("card_slide", 30.8);

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
  const tFly = T.r15 - 0.34;
  ctx.onFrame((t) => {
    if (t < T.r14 || t > T.r15 + 0.1) {
      words.forEach((w) => (w.mask.style.visibility = "hidden"));
      return;
    }
    if (!wSize) {
      wSize = Math.min(126, (560 / measure("landlord", "700 100px Poppins")) * 100);
      words.forEach((w) => (w.el.style.fontSize = `${(wSize * w.k).toFixed(1)}px`));
    }
    words.forEach((w, i) => {
      const k = ramp(ctx, t, w.t - 0.06, w.t + 0.44, "land");
      const fly = ramp(ctx, t, tFly + i * 0.04, tFly + i * 0.04 + 0.3, "power3.inOut");
      const on = t >= w.t - 0.06 && fly < 0.999;
      w.mask.style.visibility = on ? "inherit" : "hidden";
      if (!on) return;
      w.el.style.transform = `translateY(${((1 - k) * 110).toFixed(2)}%)`;
      const x = mix(RP.x + 40 + w.dx, 960 - 60, fly);
      const y = mix(w.y - wSize * 0.62, 66 - wSize * 0.3, fly);
      w.mask.style.transformOrigin = "0 50%";
      w.mask.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${mix(1, 0.24, fly).toFixed(4)})`;
      w.mask.style.opacity = String((1 - ramp(ctx, t, tFly + 0.2 + i * 0.04, tFly + 0.32 + i * 0.04)).toFixed(3));
    });
  });
  words.forEach((w) => ctx.sfx("pop_low", w.t, { offset: -4 }));

  /* the 2.5x push onto the composer (WINDOW_LEFT's 0.708 x 2.5 = 1.77: the capture stays at or under its own pixels) */
  const compW = S.toStageAt(S.wv, { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 }, COMPOSER_C.x, COMPOSER_C.y);
  cam.to(T.agent + 0.02, 0.42, { s: 2.5, fx: compW.x, fy: compW.y, tx: 900, ty: 560 }, "power2.inOut");
  cam.to(T.r15 + 0.02, 0.46, { s: 1, tx: compW.x, ty: compW.y }, "power2.inOut");

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
  const rowW = S.toStageAt(S.wv, { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 }, SENDROW.x + SENDROW.w / 2, SENDROW.y + SENDROW.h / 2);
  const PUSH16 = { s: 2.5, fx: rowW.x, fy: rowW.y, tx: 900, ty: 560 };
  cam.to(T.r16 - 0.3, 0.4, PUSH16, "power2.inOut"); // settled before the pointer reaches the row
  cam.to(T.listings + 0.12, 0.46, { s: 1, tx: rowW.x, ty: rowW.y }, "power2.inOut");
  const chev = S.toStageAt(S.wv, PUSH16, SENDCHEV.x, SENDCHEV.y);
  const flyer = cropBody(ctx, cards, { src: thread, crop: MAITAMA_CROP, iw: 2880, radius: 26, shadow: SHADOW.l });
  const tFly0 = T.listings + 0.08;
  const tFly1 = T.chat - 0.02;
  quadDriver(ctx, flyer, MAITAMA_CROP.w, MAITAMA_CROP.h, {
    t0: tFly0, t1: tFly1,
    quadAt: (t) => {
      const k = ramp(ctx, t, tFly0, tFly1, "power2.in");
      const up = ramp(ctx, t, tFly0, tFly0 + 0.3, "power3.out");
      const w = mix(200, 460, up);
      const x = mix(900, 2150, k) - w / 2;
      const y = mix(mix(560, 420, up), -380, k) - (w * 0.676) / 2;
      return rectQuad({ x, y, w, h: w * (MAITAMA_CROP.h / MAITAMA_CROP.w), rot: mix(-3, 10, k) });
    },
    opacityAt: (t) => ramp(ctx, t, tFly0, tFly0 + 0.06),
  });
  ctx.sfx("card_slide", 35.6, { offset: -2 });
  ctx.sfx("bubble_send", 36.1, { offset: -2 });

  /* ==================== D17: the day card in RIGHT_PANEL ==================== */
  const k17 = 1.2;
  const DX = RP.x + (RP.w - 470 * k17) / 2;
  const DY = RP.y + 70;
  const day = dayCard(ctx, cards, T, { X: DX, Y: DY, k: k17, chipAt: { x: DX + 150, y: DY + 470 }, tIn: T.r17 - 0.1, tOut0: T.keep - 0.1, tOut1: T.r18 - 0.02 });
  ctx.sfx("card_slide", 36.95, { offset: -2 });
  ctx.sfx("stamp", T.inspection);

  /* ==================== D18: the inbox, the dock, the push toward FLIP ==================== */
  wvT.to(T.r18 - 0.3, 0.56, { cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, "power2.inOut");
  tl.fromTo(pMsgs, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.inOut", immediateRender: false }, T.r18 - 0.3);
  const tDock = 39.2;
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
  const ring = box(ctx, pMsgs, { x: DOT.x - 22, y: DOT.y - 22, w: 44, h: 44, style: { borderRadius: "50%", border: `3px solid ${ELECTRIC}`, opacity: "0" } });
  tl.fromTo(ring, { scale: 0.25, opacity: 0.9 }, { scale: 1.5, opacity: 0, duration: 0.6, ease: "power2.out", immediateRender: false }, tDock);
  showDuring(ctx, ring, [[tDock, tDock + 0.6]]);
  ctx.sfx("pop", tDock, { offset: -2 });
  /* the push toward FLIP: 1.6 x 1.111 = 1.78, at or under the capture's own pixels; FLIP sits above y 1000 */
  const flipW = { x: S.HERO.cx + (FLIP_C.x - CW / 2) * S.HERO.s, y: S.HERO.cy + (56 + FLIP_C.y - (CH + 56) / 2) * S.HERO.s };
  const PUSH18 = { s: 1.6, fx: flipW.x, fy: flipW.y, tx: 640, ty: 700 };
  cam.to(T.place + 0.18, 0.66, PUSH18, "power2.inOut");

  /* ==================== D19: the switch ==================== */
  const heroWv = { ...S.wv, cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s };
  const chevAt = S.toStageAt(heroWv, PUSH18, FLIP_CHEV.x, FLIP_CHEV.y);
  S.bloom.x = chevAt.x;
  S.bloom.y = chevAt.y;
  const tClick = T.planning;
  ctx.sfx("whoosh_long", T.r19, { offset: -2 });
  ctx.sfx("toggle_on", tClick, { offset: 4 });
  /* the camera pulls back as the window turns over to Stays and moves right, clear of the title */
  cam.to(tClick + 0.04, 0.56, { s: 1, tx: flipW.x, ty: flipW.y }, "power2.inOut");
  /* the side scale (as in D14, D16 and D26), at the right: clear of the title at the left */
  const TURN = { cx: 1920 - 80 - (CW / 2) * S.LEFT.s, cy: S.LEFT.cy, s: S.LEFT.s };
  wvT.to(tClick + 0.04, 0.56, TURN, "power2.inOut");
  wvT.to(tClick + 0.04, 0.26, { ry: 90 }, "power2.in");
  wvT.to(tClick + 0.3, 0.001, { ry: -90 }, "none");
  wvT.to(tClick + 0.301, 0.3, { ry: 0 }, "power2.out");
  wvT.to(T.r20 - 0.36, 0.5, { cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s }, "power2.inOut");
  S.tSwap = tClick + 0.3;

  /* "Planning / a trip?" at the left, in a ring that circles the words */
  const TC = { x: 350, y: 560 };
  const title = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "700px", textAlign: "center", fontFamily: "Poppins, Inter, sans-serif", fontWeight: "700", letterSpacing: "-0.035em", lineHeight: "1.06", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } }, type);
  const l1 = ctx.el("div", {}, title);
  const l2 = ctx.el("div", {}, title);
  const wordEl = (parent, text, color, t, gap = false) => {
    const mask = ctx.el("span", { style: { display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.06em 0.04em 0.14em", margin: "-0.06em -0.04em -0.14em", marginLeft: gap ? "0.22em" : "0" } }, parent);
    const w = ctx.el("span", { text, style: { display: "inline-block", color } }, mask);
    ctx.gsap.set(w, { yPercent: 118 });
    tl.fromTo(w, { yPercent: 118 }, { yPercent: 0, duration: 0.52, ease: "land", immediateRender: false }, t);
  };
  wordEl(l1, "Planning", NAVY, tClick + 0.06);
  wordEl(l2, "a", NAVY, T.a9);
  wordEl(l2, "trip?", ELECTRIC, T.trip, true);
  let tSize = null;
  const tShrink = T.r20 - 0.4;
  showDuring(ctx, title, [[tClick, T.r20 + 0.04]]);
  ctx.onFrame((t) => {
    if (t < tClick || t > T.r20 + 0.05) return;
    if (!tSize) {
      tSize = Math.min(120, (440 / measure("Planning", "700 100px Poppins")) * 100);
      title.style.fontSize = `${tSize.toFixed(1)}px`;
    }
    const k = ramp(ctx, t, tShrink, tShrink + 0.34, "power3.inOut");
    const cx = mix(TC.x, 960, k);
    const cy = mix(TC.y, 66, k);
    title.style.transformOrigin = "350px 50%";
    title.style.transform = `translate(${(cx - 350).toFixed(2)}px, ${(cy - tSize * 1.06).toFixed(2)}px) scale(${mix(1, 0.2, k).toFixed(4)})`;
    title.style.opacity = String((1 - ramp(ctx, t, T.r20 - 0.06, T.r20 + 0.02)).toFixed(3));
  });
  const ringWrap = ctx.el("div", { class: "fill" }, type);
  ringBurst(ctx, ringWrap, { cx: TC.x, cy: TC.y, r: 276, t: tClick + 0.1, dots: 12, seed: 19, stroke: 4 });
  ringWrap.style.transformOrigin = `${TC.x}px ${TC.y}px`;
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in", immediateRender: false }, tShrink - 0.06);
  showDuring(ctx, ringWrap, [[tClick, tShrink + 0.3]]);

  /* ==================== the pointer ==================== */
  const o = S.orbT;
  const sendR = () => eSend.getBoundingClientRect();
  void sendR;
  const sendAt = { x: RP.x + 20 + (RP.w - 40) - 16 - 31, y: ECHO_BOTTOM - 16 - 31 };
  o.to(T.right + 0.1, 0.14, { opacity: 1 }, "power1.out");
  o.to(T.right + 0.1, 0.46, { x: sendAt.x + 14, y: sendAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, T.the7, { ringParent: S.pointer, x: sendAt.x, y: sendAt.y, sound: "tap" });
  o.to(T.app + 0.3, 0.5, { x: chev.x + 16, y: chev.y + 12 }, "glide");
  pressAt(ctx, S.orb, T.listings, { ringParent: S.pointer, x: chev.x, y: chev.y, sound: "tap" });
  o.to(T.listings + 0.14, 0.4, { x: 1700, y: 860 }, "glide");
  o.to(T.listings + 0.3, 0.2, { opacity: 0 }, "power1.in");
  o.to(T.r19 - 0.2, 0.16, { opacity: 1 }, "power1.out");
  o.to(T.r19 - 0.2, 0.6, { x: chevAt.x + 16, y: chevAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, tClick, { ringParent: S.pointer, x: chevAt.x, y: chevAt.y, sound: null });
  o.to(tClick + 0.14, 0.34, { x: chevAt.x + 260, y: chevAt.y + 260, opacity: 0 }, "power2.in");
}
