/**
 * Mobile rows 20 to 22 (42.69 to 49.04), storyboard v3.2, one pose held.
 * The phone rises into PHONE_HIGH at 42.85 and stays there to 48.80.
 *   20  stays-lt: Hotels lights and lifts in place on "hotels" (43.40), then
 *       Shortlets on "shortlets"; each leaves an empty slot, never a copy.
 *       On "resorts" Lagoon Crest Resort's card rises out of the featured
 *       row and sits over the phone's left edge.
 *   21-22 (one row) the phone dims; the card turns over into the October
 *       calendar (its caption keeps the resort's name); taps on 16 and 19,
 *       the range sweeps, "3 nights" pops; the screen swaps under the
 *       calendar to stays-dates-lt; the calendar lifts away and the chip,
 *       grown to its dates, lands in the date fields on "book". "Room
 *       booked" (Example) comes off the chip on "room" and settles as a
 *       notification at the top of the screen; the price comes out of "Show
 *       prices for these dates" beside the Guests field. Then everything
 *       goes, clear before "Going" (49.04).
 */
import { LAYOUT } from "./layout.js";
import {
  DW, NAVY, INK2, ELECTRIC, SHADOW, ramp, mix, screenPage, showDuring, box, cropBody, quadDriver, displayQuad, quadAtPose,
  exampleChip, photoExample, iconPlate, pressAt, ripple, glassCard, monthCalendar,
} from "./b-kit.js";

/* stays-lt (display px). */
const HOTELS = { x: 50, y: 1612, w: 590, h: 343 };
const SHORTLETS = { x: 680, y: 1612, w: 590, h: 343 };
const FEATURED = { x: 50, y: 2600, w: 800, h: 268 };
const PAGE_BG = "rgb(243 244 241)";
/* stay-light: the resort's photo band. */
const PHOTO = { x: 0, y: 360, w: 1320, h: 565 };
/* stays-dates-lt: the two date fields, the button, the empty place right of Guests, the top slot for a notification. */
const FIELDS = { x: 50, y: 987, w: 1220, h: 175 };
const BUTTON = { x: 50, y: 1485, w: 1220, h: 130 };
const BESIDE_GUESTS = { x: 680, y: 1245, w: 590, h: 210 };
const TOP_SLOT = { x: 40, y: 230, w: 1240, h: 260 };

export async function stays(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const pL = S.pL;
  const layer = ctx.scene("b-m-stays", T.r20 - 0.3, T.r23 + 0.3, { z: 20 });
  const stayImg = ctx.src.display("stay-light");
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };

  /* ---------- the clock ---------- */
  const tRise = 43.15;                       // the phone rises as the title starts for the pill (round 4)
  const tHotels = 43.72;                     // at the end of "hotels", once the phone is up
  const tShortlets = T.shortlets + 0.24;     // 43.98, inside "shortlets"
  const tDim = T.pick - 0.33;                // 45.10: the phone dims under the card
  const tFlip0 = T.pick - 0.28;              // 45.15: the card turns into the calendar
  const tFlip1 = tFlip0 + 0.5;
  const tap16 = T.dates;                     // 45.72
  const tap19 = T.dates + 0.38;              // 46.10
  const tPop = T.and10;                      // 46.39: "3 nights"
  const tCalOut0 = tPop + 0.06;              // 46.45: the calendar lifts away; the screen swaps under it
  const tCalOut1 = tCalOut0 + 0.12;          // round 4: a scale-and-fade exit, done before the date page shows (no ghost)
  const tGrow0 = tPop + 0.06;                // the chip's width grows first, its dates fade in once it is complete
  const tGrow1 = tGrow0 + 0.2;
  const tDrop0 = T.book;                     // 46.52: the chip drops into the fields
  const tDrop1 = T.room;                     // 46.79
  const tE = tDrop1 + 0.03;                  // "Room booked" comes off the chip, on "room"
  const tPrice = T.few - 0.08;               // 47.25: the price comes out of "Show prices"
  const tAway = T.r23 - 0.24;                // 48.80: all gone by 49.02

  /* ---------- the phone: one pose from 42.87 to 48.80 ---------- */
  const pose = S.pLpose;
  pose.to(tRise - 0.01, 0.001, { cx: HIGH.cx, cy: 2650, height: HIGH.height, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(tRise, 0.5, HIGH, "glide");
  pose.to(tAway, 0.22, { cy: 2650 }, "power2.in");

  const staysPage = screenPage(ctx, pL, ctx.src.display("stays-lt"));
  const datesPage = screenPage(ctx, pL, ctx.src.display("stays-dates-lt"));
  showDuring(ctx, staysPage.el, [[tRise - 0.02, tCalOut1 + 0.02]]);
  showDuring(ctx, datesPage.el, [[tCalOut1, T.r23 + 0.3]]);
  /* the wash that dims the phone under the card and the calendar */
  const wash = screenPage(ctx, pL, null, { bg: "#ffffff" });
  wash.el.style.zIndex = "60";
  showDuring(ctx, wash.el, [[tDim, tCalOut1 + 0.24]]);
  ctx.gsap.set(wash.el, { opacity: 0 });
  tl.fromTo(wash.el, { opacity: 0 }, { opacity: 0.85, duration: 0.3, ease: "power2.inOut", immediateRender: false }, tDim);
  tl.fromTo(wash.el, { opacity: 0.85 }, { opacity: 0, duration: 0.22, ease: "power2.inOut", immediateRender: false }, tCalOut1);

  /* ==================== row 20: the tiles light and lift in place, one at a time ==================== */
  const orbT = S.orbT;
  const qH = quadAtPose(pL, HIGH);
  const at = (x, y) => {
    const q = displayQuad(pL, { x, y, w: 1, h: 1 }, qH);
    return q[0];
  };
  const hAt = at(HOTELS.x + 330, HOTELS.y + 190);
  const sAt = at(SHORTLETS.x + 330, SHORTLETS.y + 190);
  /* the pointer comes back on the Hotels tile itself, never alone on the mist */
  orbT.to(tHotels - 0.17, 0.001, { x: hAt.x + 50, y: hAt.y + 70 }, "none");
  orbT.to(tHotels - 0.16, 0.12, { opacity: 1 }, "power1.out");
  orbT.to(tHotels - 0.16, 0.16, { x: hAt.x + 10, y: hAt.y + 8 }, "glide");
  pressAt(ctx, S.orb, tHotels, { sound: null });
  orbT.to(tHotels + 0.06, 0.18, { x: sAt.x + 10, y: sAt.y + 8 }, "glide");
  pressAt(ctx, S.orb, tShortlets, { sound: null });
  orbT.to(tShortlets + 0.14, 0.36, { x: 900, y: 1210, opacity: 0 }, "power2.in");

  const tiles = [
    { r: HOTELS, t: tHotels, back: tShortlets + 0.02 },
    { r: SHORTLETS, t: tShortlets, back: T.resorts - 0.04 },
  ];
  for (const tile of tiles) {
    const up0 = tile.t + 0.02;
    const up1 = up0 + 0.34;
    const down1 = tile.back + 0.3;
    /* the tile's slot on the phone, empty while it is lifted */
    const slot = box(ctx, staysPage.el, { ...tile.r, style: { background: PAGE_BG, borderRadius: "50px", boxShadow: "inset 0 2px 8px rgb(16 32 80 / 0.08)" } });
    showDuring(ctx, slot, [[up0, down1]]);
    ripple(ctx, staysPage.el, { x: tile.r.x + tile.r.w / 2 + 40, y: tile.r.y + tile.r.h / 2, t: tile.t, sound: "tap_soft", offset: -2 });
    const body = cropBody(ctx, layer, { src: ctx.src.display("stays-lt"), crop: tile.r, iw: DW, radius: 50, bg: "#fff" });
    const lit = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "50px", boxShadow: `inset 0 0 0 7px ${ELECTRIC}`, background: "rgb(0 105 254 / 0.04)", opacity: "0" } }, body);
    tl.fromTo(lit, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out", immediateRender: false }, tile.t);
    tl.fromTo(lit, { opacity: 1 }, { opacity: 0, duration: 0.24, ease: "power1.in", immediateRender: false }, tile.back);
    quadDriver(ctx, body, tile.r.w, tile.r.h, {
      t0: up0, t1: down1,
      quadAt: (t) => {
        const u = ramp(ctx, t, up0, up1, "land") * (1 - ramp(ctx, t, tile.back, down1, "power2.inOut"));
        const q = displayQuad(pL, tile.r);
        const c0 = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
        const s = 1 + 0.06 * u;
        return q.map((p) => ({ x: c0.x + (p.x - c0.x) * s, y: c0.y - 14 * u + (p.y - c0.y) * s }));
      },
    });
    ctx.onFrame((t) => {
      if (t < up0 || t > down1) return;
      body.style.boxShadow = ramp(ctx, t, up0, up0 + 0.1) * (1 - ramp(ctx, t, tile.back + 0.1, down1)) > 0.3 ? SHADOW.m : "none";
    });
  }

  /* ==================== the resort card, which turns over into the calendar ==================== */
  const CW = 560;
  const photoH = Math.round((PHOTO.h * CW) / PHOTO.w);
  const cardH = photoH + 92;
  const CAL = { x: 90, y: 400, w: 900, h: 720 };
  const cardC = { x: L.BODY_LEFT.x + CW / 2, y: 780 };
  const flipper = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px`, perspective: "2600px", perspectiveOrigin: "540px 760px", visibility: "hidden" } }, layer);
  const inner = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "0px", height: "0px", transformStyle: "preserve-3d" } }, flipper);
  const front = glassCard(ctx, inner, { w: CW, h: cardH, radius: 30, shadow: "l", style: { overflow: "hidden", backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const photo = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CW}px`, height: `${photoH}px`, overflow: "hidden" } }, front);
  ctx.img(stayImg, { style: { position: "absolute", left: `${-PHOTO.x * (CW / PHOTO.w)}px`, top: `${-PHOTO.y * (CW / PHOTO.w)}px`, width: `${DW * (CW / PHOTO.w)}px`, height: "auto", maxWidth: "none" } }, photo);
  photoExample(ctx, photo, { size: 18, style: { left: "14px", top: "14px" } });
  const strip = ctx.el("div", { class: "abs", style: { left: "24px", right: "24px", top: `${photoH + 18}px`, display: "flex", flexDirection: "column", gap: "10px" } }, front);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 30px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, strip);
  const loc = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "6px", font: "500 22px/1 Inter, sans-serif", color: INK2 } }, strip);
  const pin = ctx.icon("map-pin", { size: 22, stroke: 2 }, loc);
  pin.style.color = ELECTRIC;
  ctx.el("span", { text: "Lekki, Lagos" }, loc);
  const back = glassCard(ctx, inner, { w: CAL.w, h: CAL.h, radius: 44, shadow: "l", style: { backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const cal = monthCalendar(ctx, back, CAL, { pad: 56, caption: "Lagoon Crest Resort · Lekki, Lagos", captionTop: 44, captionSize: 26, headTop: 88, head: 52, wkTop: 182, wk: 26, num: 34, row0: 236, rowH: 92, dot: 82 });

  const tRise0 = T.resorts - 0.02;
  const tRise1 = T.resorts + 0.42;
  ctx.sfx("card_slide", T.resorts, { offset: -2 });
  showDuring(ctx, flipper, [[tRise0, tCalOut1]]);
  const start = at(FEATURED.x + FEATURED.w / 2, FEATURED.y + 60);
  ctx.onFrame((t) => {
    if (t < tRise0 || t >= tCalOut1) return;
    const rise = ramp(ctx, t, tRise0, tRise1, "land");
    const flip = ramp(ctx, t, tFlip0, tFlip1, "power3.inOut");
    const calC = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h / 2 };
    const cx = mix(mix(start.x, cardC.x, rise), calC.x, flip);
    const cy = mix(mix(start.y, cardC.y, rise), calC.y, flip);
    const fs = mix(mix(0.4, 1, rise), (CAL.w * 0.62) / CW, flip);
    const bs = mix(0.62, 1, flip);
    const out = ramp(ctx, t, tCalOut0, tCalOut1, "power1.in");
    inner.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px) rotateY(${(180 * flip).toFixed(2)}deg)`;
    front.style.transform = `translate(${-CW / 2}px, ${-cardH / 2}px) scale(${fs.toFixed(4)})`;
    back.style.transform = `translate(${-CAL.w / 2}px, ${-CAL.h / 2}px) rotateY(180deg) scale(${(bs * (1 - out * 0.1)).toFixed(4)})`;
    flipper.style.opacity = String((ramp(ctx, t, tRise0, tRise0 + 0.1) * (1 - out)).toFixed(3));
  });

  /* ==================== row 21: the taps, the range ==================== */
  const at16 = cal.cellCentre(16);
  const at19 = cal.cellCentre(19);
  orbT.to(T.pick - 0.16, 0.14, { opacity: 1 }, "power1.out");
  orbT.to(T.pick - 0.16, 0.4, { x: at16.x + 10, y: at16.y + 8 }, "glide");
  pressAt(ctx, S.orb, tap16, { ringParent: S.pointer, x: at16.x, y: at16.y, sound: "tap" });
  orbT.to(tap16 + 0.1, 0.26, { x: at19.x + 10, y: at19.y + 8 }, "glide");
  pressAt(ctx, S.orb, tap19, { ringParent: S.pointer, x: at19.x, y: at19.y, sound: "tap" });
  orbT.to(tap19 + 0.14, 0.4, { x: 900, y: 1210, opacity: 0 }, "power2.in");
  cal.select(tap16, tap19, T.r23);

  /* The chip: "3 nights" pops out of the range; its width grows, then its dates fade in, whole; it lands in the date fields. */
  const dchip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", height: "84px", display: "flex", alignItems: "center", padding: "0 34px", borderRadius: "999px", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, color: "#fff", font: "600 36px/1 Inter, sans-serif", letterSpacing: "-0.015em", whiteSpace: "nowrap", boxShadow: "0 22px 44px -20px rgb(0 70 200 / 0.6)", visibility: "hidden" } }, layer);
  const datesPart = ctx.el("span", { style: { display: "inline-flex", alignItems: "center", overflow: "hidden", maxWidth: "0px", whiteSpace: "nowrap", opacity: "0" } }, dchip);
  ctx.el("span", { text: "16 Oct" }, datesPart);
  const arrow = ctx.icon("arrow-right", { size: 25, stroke: 2.4 }, datesPart);
  arrow.style.margin = "0 10px";
  ctx.el("span", { text: "19 Oct", style: { marginRight: "12px" } }, datesPart);
  ctx.el("span", { text: "·", style: { marginRight: "12px" } }, datesPart);
  ctx.el("span", { text: "3 nights" }, dchip);
  const fieldsC = () => {
    const q = displayQuad(pL, FIELDS);
    return { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
  };
  ctx.sfx("pop", tPop);
  showDuring(ctx, dchip, [[tPop, tDrop1 + 0.1]]);
  let full = null;
  ctx.onFrame((t) => {
    if (t < tPop || t > tDrop1 + 0.12) return;
    if (full == null) {
      datesPart.style.maxWidth = "none";
      full = datesPart.offsetWidth;
      datesPart.style.maxWidth = "0px";
    }
    const pop = ctx.ease("back.out(2)")(ctx.progress(t, tPop, tPop + 0.3));
    const grow = ramp(ctx, t, tGrow0, tGrow1, "power3.inOut");
    datesPart.style.maxWidth = `${(grow * full).toFixed(1)}px`;
    datesPart.style.opacity = ramp(ctx, t, tGrow1 - 0.01, tGrow1 + 0.11, "power1.out").toFixed(3);
    const drop = ramp(ctx, t, tDrop0, tDrop1, "glide");
    const from = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h + 4 };
    const to = fieldsC();
    const x = mix(from.x, to.x, drop);
    const y = mix(from.y, to.y, drop) - 90 * Math.sin(Math.PI * drop);
    const sc = mix(0.3 + 0.7 * pop, 0.62, drop);
    dchip.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) scale(${sc.toFixed(4)})`;
    dchip.style.opacity = String((1 - ramp(ctx, t, tDrop1 - 0.02, tDrop1 + 0.08)).toFixed(3));
  });

  /* ==================== the results: "Room booked" and the price ==================== */
  const qd = quadAtPose(pL, HIGH);
  const R = (r) => {
    const q = displayQuad(pL, r, qd);
    return { x: q[0].x, y: q[0].y, w: q[1].x - q[0].x, h: q[3].y - q[0].y };
  };
  const top = R(TOP_SLOT);
  const beside = R(BESIDE_GUESTS);
  const btn = R(BUTTON);

  /* E: notification card 1 of 2 (Example), at the top of the screen, where a notification sits. */
  const E = glassCard(ctx, layer, { w: top.w, h: top.h, radius: 30, shadow: "l", style: { display: "flex", alignItems: "center", gap: "16px", padding: "0 22px", visibility: "hidden" } });
  iconPlate(ctx, E, "bed-double", { size: 60 });
  const eText = ctx.el("div", { style: { display: "flex", flexDirection: "column", gap: "9px", minWidth: "0" } }, E);
  ctx.el("div", { text: "Room booked", style: { font: "600 31px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, eText);
  ctx.el("div", { text: "Lagoon Crest Resort · 3 nights", style: { font: "500 21px/1.2 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, eText);
  const eMeta = ctx.el("div", { style: { marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" } }, E);
  exampleChip(ctx, eMeta, { size: 17 });
  ctx.el("span", { text: "now", style: { font: "500 18px/1 Inter, sans-serif", color: "#7a8090" } }, eMeta);
  E.style.transformOrigin = "50% 50%";

  /* D: the price, beside the Guests field (an empty place on the screen), out of "Show prices for these dates" */
  const DWd = Math.round(beside.w + 44);
  const D = glassCard(ctx, layer, { w: DWd, radius: 24, shadow: "m", style: { display: "flex", flexDirection: "column", gap: "8px", padding: "16px 20px 16px", visibility: "hidden" } });
  const dTop = ctx.el("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } }, D);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 21px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: NAVY, whiteSpace: "nowrap" } }, dTop);
  exampleChip(ctx, dTop, { size: 15 });
  const dPrice = ctx.el("div", { style: { display: "flex", alignItems: "baseline", gap: "8px" } }, D);
  ctx.el("span", { text: "₦150,000", style: { font: "700 33px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#0056d0" } }, dPrice);
  ctx.el("span", { text: "per night", style: { font: "600 18px/1 Poppins, Inter, sans-serif", color: "#6b7080" } }, dPrice);
  D.style.transformOrigin = "50% 50%";

  ctx.sfx("chime_notify", tE);
  ctx.sfx("pop", tPrice, { offset: -4 });
  const cards = [
    { el: E, t: tE, from: () => fieldsC(), to: { x: top.x + top.w / 2, y: top.y + top.h / 2 }, out0: tAway },
    { el: D, t: tPrice, from: () => ({ x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 }), to: { x: beside.x + DWd / 2 - 8, y: beside.y + beside.h / 2 }, out0: tAway - 0.06 },
  ];
  for (const [i, c] of cards.entries()) {
    const end = c.out0 + 0.24;
    showDuring(ctx, c.el, [[c.t, end]]);
    let size = null;
    ctx.onFrame((t) => {
      if (t < c.t || t >= end) return;
      if (!size) size = { w: c.el.offsetWidth, h: c.el.offsetHeight };
      const k = ramp(ctx, t, c.t, c.t + 0.3, "land");
      const away = ramp(ctx, t, c.out0, c.out0 + 0.22, "power2.in");
      const f = c.from();
      const bob = Math.sin((t - c.t) * 2.1 + i * 1.4) * 2 * ramp(ctx, t, c.t + 0.3, c.t + 0.7);
      const x = mix(f.x, c.to.x, k);
      const y = mix(f.y, c.to.y, k) + bob - away * 420;
      c.el.style.transform = `translate(${(x - size.w / 2).toFixed(2)}px, ${(y - size.h / 2).toFixed(2)}px) scale(${mix(0.3, 1, k).toFixed(4)})`;
      c.el.style.opacity = String((ramp(ctx, t, c.t, c.t + 0.08) * (1 - away)).toFixed(3));
    });
  }
}
