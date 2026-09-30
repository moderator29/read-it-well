/**
 * Mobile rows 20 to 22 (42.69 to 49.04), storyboard v3.1, on the warm wash.
 *   20  stays-lt (the phone at cx 640, so bodies have room on the left):
 *       Hotels, then Shortlets, light as named and lift into BODY_LEFT one at
 *       a time; on "resorts" Lagoon Crest Resort's card rises beside the
 *       phone; it turns over into the October calendar.
 *   21-22 (one row) the calendar: taps on 16 and 19, the range sweeps, "3
 *       nights" pops; the chip grows its dates and drops into the date fields
 *       of stays-dates-lt (the phone at h 760); the results settle in the body
 *       boxes; "Room booked" (Example) comes off the dates chip on "taps" and
 *       stays readable for 1.5 s. Then everything lifts away into the dusk.
 */
import { LAYOUT } from "./layout.js";
import {
  DW, NAVY, INK2, ELECTRIC, SHADOW, ramp, mix, screenPage, showDuring, cropBody, quadDriver, displayQuad, quadAtPose,
  rectQuad, lerpQuad, exampleChip, photoExample, iconPlate, pressAt, ripple, glassCard,
} from "./b-kit.js";

/* stays-lt (display px). */
const HOTELS = { x: 50, y: 1612, w: 590, h: 343 };
const SHORTLETS = { x: 680, y: 1612, w: 590, h: 343 };
/* stay-light: the resort's photo band. */
const PHOTO = { x: 0, y: 360, w: 1320, h: 565 };
/* stays-dates-lt: the two date fields. */
const FIELDS = { x: 50, y: 987, w: 1220, h: 175 };

export async function stays(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const pL = S.pL;
  const layer = ctx.scene("b-m-stays", T.r20 - 0.3, T.r23 + 0.45, { z: 20 });
  const stayImg = ctx.src.display("stay-light");
  const STAYS = { cx: 640, cy: L.PHONE_HERO.cy, height: L.PHONE_HERO.height };
  const DATES = { cx: 540, cy: 820, height: 760 };

  /* ---------- the phone ---------- */
  const pose = S.pLpose;
  pose.to(T.r20 - 0.27, 0.001, { cx: 640, cy: 2650, height: 1080, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(T.r20 - 0.26, 0.58, STAYS, "glide");                                      // rises with stays-lt
  pose.to(T.pick - 0.28, 0.44, { cy: 2650 }, "power2.in");                          // leaves the calendar alone
  pose.to(T.and10 + 0.3, 0.001, { cx: 540, height: 760 }, "none");
  pose.to(T.and10 + 0.31, 0.5, DATES, "glide");                                     // back small, with the date fields
  pose.to(T.r23 - 0.16, 0.32, { cy: 2300 }, "power3.in");                           // drops into the dusk

  const staysPage = screenPage(ctx, pL, ctx.src.display("stays-lt"));
  const datesPage = screenPage(ctx, pL, ctx.src.display("stays-dates-lt"));
  showDuring(ctx, staysPage.el, [[T.r20 - 0.3, T.pick + 0.2]]);
  showDuring(ctx, datesPage.el, [[T.and10 + 0.3, T.r23 + 0.4]]);

  /* ==================== row 20: the tiles light and lift, one at a time ==================== */
  const orbT = S.orbT;
  const q0 = quadAtPose(pL, STAYS);
  const centreOf = (r) => {
    const q = displayQuad(pL, r, q0);
    return { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
  };
  const hAt = centreOf(HOTELS);
  const sAt = centreOf(SHORTLETS);
  orbT.to(T.hotels - 0.36, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(T.hotels - 0.36, 0.32, { x: hAt.x + 36, y: hAt.y + 14 }, "glide");
  pressAt(ctx, S.orb, T.hotels, { sound: null });
  orbT.to(T.hotels + 0.22, 0.46, { x: sAt.x + 36, y: sAt.y + 14 }, "glide");
  pressAt(ctx, S.orb, T.shortlets, { sound: null });
  orbT.to(T.shortlets + 0.14, 0.36, { x: 1060, y: 1180 }, "glide");
  orbT.to(T.shortlets + 0.2, 0.2, { opacity: 0 }, "power1.in");

  /* BODY_LEFT, clear of the screen's text: right edge on the page's own side margin. */
  const leftEdge = q0[0].x + 50 * ((q0[1].x - q0[0].x) / DW);
  const BW = Math.round(leftEdge - L.BODY_LEFT.x);
  const tiles = [
    { r: HOTELS, t: T.hotels, back: T.shortlets + 0.04 },
    { r: SHORTLETS, t: T.shortlets, back: T.resorts - 0.02 },
  ];
  for (const [i, tile] of tiles.entries()) {
    const lit = ctx.el("div", { class: "abs", style: { left: `${tile.r.x}px`, top: `${tile.r.y}px`, width: `${tile.r.w}px`, height: `${tile.r.h}px`, borderRadius: "50px", boxShadow: `inset 0 0 0 7px ${ELECTRIC}`, background: "rgb(0 105 254 / 0.05)", opacity: "0" } }, staysPage.el);
    tl.fromTo(lit, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out", immediateRender: false }, tile.t);
    tl.fromTo(lit, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: "power1.in", immediateRender: false }, tile.back + 0.2);
    ripple(ctx, staysPage.el, { x: tile.r.x + tile.r.w / 2 + 90, y: tile.r.y + tile.r.h / 2 + 30, t: tile.t, sound: "tap_soft", offset: -2 });
    const body = cropBody(ctx, layer, { src: ctx.src.display("stays-lt"), crop: tile.r, iw: DW, radius: 50, shadow: SHADOW.m, bg: "#fff" });
    const lift0 = tile.t + 0.05;
    const lift1 = lift0 + 0.42;
    const sc = BW / tile.r.w;
    const target = rectQuad({ x: L.BODY_LEFT.x, y: 772 - (tile.r.h * sc) / 2, w: BW, h: tile.r.h * sc, rot: i ? 2.5 : -2.5 });
    quadDriver(ctx, body, tile.r.w, tile.r.h, {
      t0: lift0, t1: tile.back + 0.36,
      quadAt: (t) => {
        const up = ramp(ctx, t, lift0, lift1, "glide") * (1 - ramp(ctx, t, tile.back, tile.back + 0.34, "power2.inOut"));
        const bob = Math.sin((t - lift1) * 2.4 + i) * 4 * ramp(ctx, t, lift1, lift1 + 0.3);
        return lerpQuad(displayQuad(pL, tile.r), target.map((p) => ({ x: p.x, y: p.y + bob })), up);
      },
    });
    ctx.onFrame((t) => {
      if (t < lift0 || t > tile.back + 0.36) return;
      body.style.boxShadow = t > lift0 + 0.05 && t < tile.back + 0.28 ? SHADOW.m : "none";
    });
  }

  /* ==================== the resort card, which turns over into the calendar ==================== */
  const CW = BW;
  const photoH = Math.round((PHOTO.h * CW) / PHOTO.w);
  const cardH = photoH + 104;
  const CAL = { x: 90, y: 400, w: 900, h: 720 };
  const cardC = { x: L.BODY_LEFT.x + CW / 2, y: 772 };
  const flipper = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px`, perspective: "2600px", perspectiveOrigin: "540px 760px", visibility: "hidden" } }, layer);
  const inner = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "0px", height: "0px", transformStyle: "preserve-3d" } }, flipper);
  const front = glassCard(ctx, inner, { w: CW, h: cardH, radius: 30, shadow: "l", style: { overflow: "hidden", backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const photo = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${photoH}px`, overflow: "hidden" } }, front);
  ctx.img(stayImg, { style: { position: "absolute", left: `${-PHOTO.x * (CW / PHOTO.w)}px`, top: `${-PHOTO.y * (CW / PHOTO.w)}px`, width: `${DW * (CW / PHOTO.w)}px`, height: "auto", maxWidth: "none" } }, photo);
  photoExample(ctx, photo, { size: 18, style: { left: "14px", top: "14px" } });
  const strip = ctx.el("div", { class: "abs", style: { left: "22px", right: "22px", top: `${photoH + 18}px`, display: "flex", flexDirection: "column", gap: "9px" } }, front);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 30px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, strip);
  const loc = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "6px", font: "500 22px/1 Inter, sans-serif", color: INK2 } }, strip);
  const pin = ctx.icon("map-pin", { size: 22, stroke: 2 }, loc);
  pin.style.color = ELECTRIC;
  ctx.el("span", { text: "Lekki, Lagos" }, loc);
  const back = glassCard(ctx, inner, { w: CAL.w, h: CAL.h, radius: 44, shadow: "l", style: { backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const cal = calendar(ctx, back, CAL);

  const tRise0 = T.resorts - 0.02;
  const tRise1 = T.resorts + 0.42;
  const tFlip0 = T.pick - 0.28;
  const tFlip1 = tFlip0 + 0.5;
  const tCalOut0 = T.and10 + 0.34;
  const tCalOut1 = tCalOut0 + 0.36;
  ctx.sfx("card_slide", T.resorts, { offset: -2 });
  showDuring(ctx, flipper, [[tRise0, tCalOut1]]);
  const start = centreOf({ x: 60, y: 2500, w: 1200, h: 200 });
  ctx.onFrame((t) => {
    if (t < tRise0 || t >= tCalOut1) return;
    const rise = ramp(ctx, t, tRise0, tRise1, "land");
    const flip = ramp(ctx, t, tFlip0, tFlip1, "power3.inOut");
    const bob = Math.sin((t - tRise1) * 2.1) * 4 * ramp(ctx, t, tRise1, tRise1 + 0.3) * (1 - flip);
    const calC = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h / 2 };
    const cx = mix(mix(start.x, cardC.x, rise), calC.x, flip);
    const cy = mix(mix(start.y, cardC.y, rise), calC.y, flip) + bob;
    const fs = mix(mix(0.4, 1, rise), (CAL.w * 0.62) / CW, flip);
    const bs = mix(0.62, 1, flip);
    const out = ramp(ctx, t, tCalOut0, tCalOut1, "power2.in");
    inner.style.transform = `translate(${cx.toFixed(2)}px, ${(cy - out * 140).toFixed(2)}px) rotateY(${(180 * flip).toFixed(2)}deg)`;
    front.style.transform = `translate(${-CW / 2}px, ${-cardH / 2}px) scale(${fs.toFixed(4)})`;
    back.style.transform = `translate(${-CAL.w / 2}px, ${-CAL.h / 2}px) rotateY(180deg) scale(${(bs * (1 - out * 0.08)).toFixed(4)})`;
    flipper.style.opacity = String((ramp(ctx, t, tRise0, tRise0 + 0.1) * (1 - out)).toFixed(3));
  });

  /* ==================== rows 21-22: the taps, the range, the chip ==================== */
  const tap16 = T.dates;
  const tap19 = T.dates + 0.38;
  const at16 = cal.cellCentre(16);
  const at19 = cal.cellCentre(19);
  orbT.to(T.pick - 0.12, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(T.pick - 0.12, 0.38, { x: at16.x + 26, y: at16.y + 22 }, "glide");
  pressAt(ctx, S.orb, tap16, { ringParent: S.pointer, x: at16.x, y: at16.y, sound: "tap" });
  orbT.to(tap16 + 0.1, 0.26, { x: at19.x + 26, y: at19.y + 22 }, "glide");
  pressAt(ctx, S.orb, tap19, { ringParent: S.pointer, x: at19.x, y: at19.y, sound: "tap" });
  orbT.to(tap19 + 0.14, 0.4, { x: 1080, y: 1150 }, "glide");
  orbT.to(tap19 + 0.3, 0.2, { opacity: 0 }, "power1.in");
  cal.select(tap16, tap19);

  /* The chip: "3 nights" pops out of the range, grows its dates, drops into the date fields. */
  const tPop = T.and10;
  const tGrowDates = tPop + 0.22;
  const tDrop0 = tCalOut0 + 0.04;
  const tDrop1 = T.r22;
  const dchip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", height: "84px", display: "flex", alignItems: "center", padding: "0 34px", borderRadius: "999px", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, color: "#fff", font: "600 36px/1 Inter, sans-serif", letterSpacing: "-0.015em", whiteSpace: "nowrap", boxShadow: "0 22px 44px -20px rgb(0 70 200 / 0.6)", visibility: "hidden" } }, layer);
  const datesPart = ctx.el("span", { text: "16 Oct → 19 Oct · ", style: { display: "inline-block", overflow: "hidden", maxWidth: "0px", whiteSpace: "nowrap" } }, dchip);
  ctx.el("span", { text: "3 nights" }, dchip);
  const fieldsC = (t) => {
    const q = displayQuad(pL, FIELDS);
    return { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2, w: q[1].x - q[0].x };
  };
  ctx.sfx("pop", tPop);
  showDuring(ctx, dchip, [[tPop, T.r22 + 0.08]]);
  ctx.onFrame((t) => {
    if (t < tPop || t > T.r22 + 0.1) return;
    const pop = ctx.ease("back.out(2)")(ctx.progress(t, tPop, tPop + 0.32));
    const grow = ramp(ctx, t, tGrowDates, tGrowDates + 0.3, "power3.inOut");
    datesPart.style.maxWidth = `${(grow * 420).toFixed(1)}px`;
    const drop = ramp(ctx, t, tDrop0, tDrop1, "glide");
    const from = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h + 2 };
    const to = fieldsC(t);
    const x = mix(from.x, to.x, drop);
    const y = mix(from.y, to.y, drop) - 120 * Math.sin(Math.PI * drop);
    const sc = mix(0.3 + 0.7 * pop, 0.56, drop);
    dchip.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) scale(${sc.toFixed(4)})`;
    dchip.style.opacity = String((1 - ramp(ctx, t, T.r22 - 0.02, T.r22 + 0.06)).toFixed(3));
  });

  /* ==================== the results, in the body boxes ==================== */
  const qd = quadAtPose(pL, DATES);
  const dispL = qd[0].x;
  const dispR = qd[1].x;
  const leftBox = { x: L.BODY_LEFT.x, w: Math.round(dispL + 12 - L.BODY_LEFT.x) };
  const rightBox = { x: Math.round(dispR - 12), w: Math.round(L.BODY_RIGHT.x + L.BODY_RIGHT.w - (dispR - 12)) };
  const mkChip = (icon, text) => {
    const el = glassCard(ctx, layer, { w: null, radius: 999, shadow: "s", style: { width: "auto", display: "flex", alignItems: "center", gap: "12px", padding: "12px 24px 12px 12px", whiteSpace: "nowrap", font: "600 29px/1 Inter, sans-serif", letterSpacing: "-0.015em", visibility: "hidden" } });
    iconPlate(ctx, el, icon, { size: 46, round: true });
    ctx.el("span", { text }, el);
    return el;
  };
  const A = mkChip("calendar-days", "16 Oct → 19 Oct");
  const B = mkChip("moon", "3 nights");
  const C = mkChip("users", "2 guests");
  const D = glassCard(ctx, layer, { w: rightBox.w, radius: 26, shadow: "m", style: { overflow: "hidden", visibility: "hidden" } });
  const dPh = Math.round(rightBox.w * 0.48);
  const dPhoto = ctx.el("div", { style: { position: "relative", width: `${rightBox.w}px`, height: `${dPh}px`, overflow: "hidden" } }, D);
  const dScale = rightBox.w / PHOTO.w;
  ctx.img(stayImg, { style: { position: "absolute", left: "0px", top: `${-(PHOTO.y + 60) * dScale}px`, width: `${DW * dScale}px`, height: "auto", maxWidth: "none" } }, dPhoto);
  photoExample(ctx, dPhoto, { size: 15, style: { left: "10px", top: "10px" } });
  const dBody = ctx.el("div", { style: { padding: "14px 18px 18px", display: "flex", flexDirection: "column", gap: "6px" } }, D);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 21px/1.15 Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: NAVY } }, dBody);
  ctx.el("div", { text: "₦150,000", style: { font: "700 30px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#0056d0" } }, dBody);
  ctx.el("div", { text: "per night", style: { font: "600 19px/1 Poppins, Inter, sans-serif", color: "#6b7080" } }, dBody);
  /* E: notification card 1 of 2 (Example), in BODY_LEFT once the chips have folded into it. */
  const E = glassCard(ctx, layer, { w: leftBox.w, radius: 28, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "12px", padding: "22px 22px 20px", visibility: "hidden" } });
  const eTop = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "14px" } }, E);
  iconPlate(ctx, eTop, "bed-double", { size: 58 });
  ctx.el("div", { text: "Room booked", style: { font: "600 32px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, eTop);
  ctx.el("div", { html: "Lagoon Crest Resort<br>3 nights", style: { font: "500 23px/1.32 Inter, sans-serif", color: INK2 } }, E);
  const eMeta = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, E);
  exampleChip(ctx, eMeta, { size: 18 });
  ctx.el("span", { text: "now", style: { font: "500 19px/1 Inter, sans-serif", color: "#8a90a0" } }, eMeta);

  const tLand = T.r22;
  const tE = T.r22 + 0.02;
  const tAway = T.r23 - 0.14;
  const COL = { e: 404, a: 660, b: 744, c: 828, d: 470 };
  const items = [
    { el: A, box: "left", y: COL.a, t: tLand + 0.02, sound: false },
    { el: B, box: "left", y: COL.b, t: tLand + 0.08, sound: true },
    { el: C, box: "left", y: COL.c, t: tLand + 0.14, sound: true },
    { el: D, box: "right", y: COL.d, t: tLand + 0.2, sound: true },
  ];
  for (const [i, it] of items.entries()) {
    if (it.sound) ctx.sfx("pop", it.t, { offset: -4 });
    const end = tAway + 0.3 + i * 0.03;
    showDuring(ctx, it.el, [[it.t, end]]);
    let size = null;
    ctx.onFrame((t) => {
      if (t < it.t || t >= end) return;
      if (!size) size = { w: it.el.offsetWidth, h: it.el.offsetHeight };
      const k = ramp(ctx, t, it.t, it.t + 0.4, "land");
      const x1 = it.box === "left" ? leftBox.x : rightBox.x;
      const y1 = it.y + Math.sin((t - it.t) * 2.2 + i * 1.3) * 3 * ramp(ctx, t, it.t + 0.4, it.t + 0.8);
      const src = fieldsC(t);
      const away = ramp(ctx, t, tAway + i * 0.03, tAway + i * 0.03 + 0.26, "power2.in");
      const s = mix(0.4, 1, k);
      const x = mix(src.x - size.w / 2, x1, k);
      const y = mix(src.y - size.h / 2, y1, k) - away * 480;
      it.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
      it.el.style.opacity = String((ramp(ctx, t, it.t, it.t + 0.08) * (1 - away)).toFixed(3));
    });
    it.el.style.transformOrigin = "0 0";
  }
  /* "Room booked" comes off the dates chip, with the chime, and stays readable 1.5 s. */
  ctx.sfx("chime_notify", tE);
  showDuring(ctx, E, [[tE, tAway + 0.24]]);
  ctx.onFrame((t) => {
    if (t < tE || t >= tAway + 0.24) return;
    const k = ramp(ctx, t, tE, tE + 0.42, "land");
    const away = ramp(ctx, t, tAway - 0.02, tAway + 0.22, "power2.in");
    const y = mix(COL.a, COL.e, k) + Math.sin((t - tE) * 2) * 3 * ramp(ctx, t, tE + 0.4, tE + 0.8) - away * 480;
    E.style.transformOrigin = "0 0";
    E.style.transform = `translate(${leftBox.x}px, ${y.toFixed(2)}px) scale(${mix(0.7, 1, k).toFixed(4)})`;
    E.style.opacity = String((ramp(ctx, t, tE, tE + 0.1) * (1 - away)).toFixed(3));
  });
}

/**
 * The October 2026 calendar on the resort card's back (900 x 720). Oct 1
 * 2026 is a Thursday. select(t16, t19) lights 16, then 19, then sweeps the
 * range between them.
 */
function calendar(ctx, parent, CAL) {
  const { tl } = ctx;
  const PAD = 56;
  const colW = (CAL.w - PAD * 2) / 7;
  const ROW0 = 206;
  const ROWH = 94;
  const cellC = (d) => {
    const idx = d - 1 + 4;
    const r = Math.floor(idx / 7);
    const c = idx % 7;
    return { x: PAD + colW * (c + 0.5), y: ROW0 + ROWH * (r + 0.5), r, c };
  };
  const head = ctx.el("div", { class: "abs", style: { left: `${PAD}px`, right: `${PAD}px`, top: "50px", display: "flex", alignItems: "center", justifyContent: "space-between" } }, parent);
  ctx.el("div", { text: "October 2026", style: { font: "700 52px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY } }, head);
  const nav = ctx.el("div", { style: { display: "flex", gap: "14px" } }, head);
  for (const n of ["chevron-left", "chevron-right"]) iconPlate(ctx, nav, n, { size: 56, round: true });
  ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].forEach((d, i) => {
    ctx.el("div", { class: "abs", text: d, style: { left: `${PAD + colW * i}px`, width: `${colW}px`, top: "150px", textAlign: "center", font: "600 26px/1 Inter, sans-serif", color: "#8a90a0" } }, parent);
  });
  const band1 = ctx.el("div", { class: "abs", style: { left: `${cellC(16).x}px`, top: `${cellC(16).y - 40}px`, width: `${CAL.w - PAD - cellC(16).x + 6}px`, height: "80px", background: "rgb(0 105 254 / 0.12)", borderRadius: "0 40px 40px 0", transformOrigin: "0 50%", visibility: "hidden" } }, parent);
  const band2 = ctx.el("div", { class: "abs", style: { left: `${PAD - 6}px`, top: `${cellC(19).y - 40}px`, width: `${cellC(19).x - PAD + 6}px`, height: "80px", background: "rgb(0 105 254 / 0.12)", borderRadius: "40px 0 0 40px", transformOrigin: "0 50%", visibility: "hidden" } }, parent);
  const dots = {};
  for (const d of [16, 19]) {
    const c = cellC(d);
    dots[d] = ctx.el("div", { class: "abs", style: { left: `${c.x - 42}px`, top: `${c.y - 42}px`, width: "84px", height: "84px", borderRadius: "50%", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, boxShadow: "0 10px 22px -10px rgb(0 80 220 / 0.6)", opacity: "0" } }, parent);
  }
  const nums = {};
  for (let d = 1; d <= 31; d += 1) {
    const c = cellC(d);
    nums[d] = ctx.el("div", { class: "abs", text: String(d), style: { left: `${c.x - 45}px`, width: "90px", top: `${c.y - 18}px`, textAlign: "center", font: "600 34px/36px Inter, sans-serif", color: NAVY, fontVariantNumeric: "tabular-nums" } }, parent);
  }
  return {
    cellCentre: (d) => {
      const c = cellC(d);
      return { x: CAL.x + c.x, y: CAL.y + c.y };
    },
    select(t16, t19) {
      for (const [d, t] of [[16, t16], [19, t19]]) {
        tl.fromTo(dots[d], { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2.2)", immediateRender: false }, t);
        tl.fromTo(nums[d], { color: NAVY }, { color: "#ffffff", duration: 0.1, ease: "power1.out", immediateRender: false }, t + 0.02);
      }
      tl.fromTo(band1, { scaleX: 0 }, { scaleX: 1, duration: 0.14, ease: "power2.in", immediateRender: false }, t19 + 0.02);
      tl.fromTo(band2, { scaleX: 0 }, { scaleX: 1, duration: 0.14, ease: "power2.out", immediateRender: false }, t19 + 0.16);
      showDuring(ctx, band1, [[t19 + 0.02, 999]]);
      showDuring(ctx, band2, [[t19 + 0.16, 999]]);
    },
  };
}
