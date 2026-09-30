/**
 * Desktop rows 20 to 22 (42.69 to 49.04), storyboard v3.1, on the warm wash.
 *   D20  d-stays-lt at WINDOW_HERO (the back of the window that turned over
 *        in D19): the pointer passes over Hotels and Shortlets as named, and
 *        each tile lifts in place as a body, its 3D icon with it. On
 *        "resorts" Lagoon Crest Resort's card (the photo of d-stay-lt) rises
 *        out of the page's featured row into RIGHT_PANEL as the window moves
 *        to WINDOW_LEFT; it turns over into the October calendar.
 *   D21-22 (one row) the pointer clicks 16 and 19, the range fills, "3
 *        nights" pops out; the window folds into a strip of d-stays-dates-lt
 *        (its date fields and button only, at the hero scale: no count, no
 *        price), the chip lands in the fields; the results settle under the
 *        fields they answer; "Room booked" (Example) stays readable 1.5 s.
 *        Then everything lifts away into the dusk.
 */
import { NAVY, INK2, ELECTRIC, SHADOW, ramp, mix, showDuring, box, cropBody, quadDriver, rectQuad, pressAt, glassCard, iconPlate, exampleChip, photoExample, monthCalendar } from "./b-kit.js";
import { CW, CH } from "./b-desktop.js";

/* d-stays-lt (CSS px of the 1440 x 900 page). */
const HOTELS = { x: 296, y: 478, w: 550, h: 115 };
const SHORTLETS = { x: 858, y: 478, w: 550, h: 115 };
const FEATURED = { x: 300, y: 826, w: 278, h: 74 }; // the first featured stay, at the page's bottom edge
const PAGE_BG = "#f1f2ed";
/* d-stay-lt, capture px: the resort's photo, clear of the page's buttons and chips. */
const PHOTO = { x: 720, y: 140, w: 1880, h: 800 };
const PHOTO_D = { x: 820, y: 140, w: 1680, h: 800 }; // the same, narrower, for the price card
/* d-stays-dates-lt: the strip's view (the fields and the button), the fields, the columns. */
const STRIP = { viewLeft: 320, viewW: 1064, viewTop: 196, viewH: 104 };
const FIELDS = { x: 340, y: 228, w: 505, h: 57 }; // Check in and Check out
const COL = { checkIn: 340, checkOut: 600, guests: 858, guestsR: 1100, button: 1117, buttonR: 1363 };
const STRIP_TOP = 250;

export async function deskStays(ctx, S, T) {
  const { tl } = ctx;
  const { L } = S;
  const RP = L.RIGHT_PANEL;
  const wvT = S.wvT;
  const cards = S.cards;
  const orbT = S.orbT;
  const cam0 = { s: 1, fx: 960, fy: 540, tx: 960, ty: 540 };
  const full = { viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  const heroWv = { ...S.wv, cx: S.HERO.cx, cy: S.HERO.cy, s: S.HERO.s, ...full };

  /* ---------- the window's pages ---------- */
  const staysSrc = ctx.src.capture("d-stays-lt");
  const staySrc = ctx.src.capture("d-stay-lt");
  const tHotels = ctx.beat(75.5);            // 43.56, inside "hotels"
  const tShortlets = T.shortlets + 0.1;      // 43.84
  const tPop = T.and10;                      // 46.39: "3 nights"
  const tFold0 = tPop + 0.01;                // the window folds into its strip
  const tFold1 = tFold0 + 0.4;
  const tFade = tFold0 + 0.22;               // then the dates page fades in, the fold >80% done
  const pStays = S.page("d-stays-lt", [[S.tSwap, tFold1 + 0.1]]);
  const pDates = S.page("d-stays-dates-lt", [[tFade, T.r23 + 0.3]]);
  /* never below CSS y 302: the capture's results row (with its own prices) never paints */
  pDates.style.clipPath = "inset(0px 0px 598px 0px)";
  ctx.gsap.set(pDates, { opacity: 0 });
  tl.fromTo(pDates, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.inOut", immediateRender: false }, tFade);

  /* ==================== D20: the tiles lift in place ==================== */
  const tiles = [
    { r: HOTELS, t: tHotels, back: tShortlets + 0.02 },
    { r: SHORTLETS, t: tShortlets, back: T.resorts - 0.04 },
  ];
  for (const tile of tiles) {
    const crop = { x: tile.r.x * 2, y: tile.r.y * 2, w: tile.r.w * 2, h: tile.r.h * 2 };
    const up0 = tile.t + 0.02;
    const up1 = up0 + 0.36;
    const down1 = tile.back + 0.3;
    /* the tile's slot in the page, while it is lifted */
    const slot = box(ctx, pStays, { ...tile.r, style: { background: PAGE_BG, borderRadius: "16px", boxShadow: "inset 0 1px 4px rgb(16 32 80 / 0.08)" } });
    showDuring(ctx, slot, [[up0, down1]]);
    const body = cropBody(ctx, cards, { src: staysSrc, crop, iw: 2880, radius: 32, shadow: SHADOW.m });
    const lit = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "32px", boxShadow: `inset 0 0 0 5px ${ELECTRIC}`, background: "rgb(0 105 254 / 0.04)", opacity: "0" } }, body);
    tl.fromTo(lit, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out", immediateRender: false }, tile.t);
    tl.fromTo(lit, { opacity: 1 }, { opacity: 0, duration: 0.24, ease: "power1.in", immediateRender: false }, tile.back);
    quadDriver(ctx, body, crop.w, crop.h, {
      t0: up0, t1: down1,
      quadAt: (t) => {
        const u = ramp(ctx, t, up0, up1, "land") * (1 - ramp(ctx, t, tile.back, down1, "power2.inOut"));
        const q = S.rectQuad(tile.r);
        const w = q[1].x - q[0].x;
        const h = q[3].y - q[0].y;
        return rectQuad({ x: q[0].x, y: q[0].y - 14 * u, w, h, s: 1 + 0.06 * u });
      },
    });
  }
  /* the pointer passes over each tile as it is named */
  const tileAt = (r) => S.toStageAt(heroWv, cam0, r.x + 170, r.y + 64);
  const hAt = tileAt(HOTELS);
  const sAt = tileAt(SHORTLETS);
  orbT.to(tHotels - 0.42, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(tHotels - 0.42, 0.4, { x: hAt.x + 14, y: hAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, tHotels, { sound: "tap_soft", offset: -2 });
  orbT.to(tHotels + 0.08, 0.24, { x: sAt.x + 14, y: sAt.y + 12 }, "glide");
  pressAt(ctx, S.orb, tShortlets, { sound: "tap_soft", offset: -2 });
  orbT.to(tShortlets + 0.16, 0.42, { x: 1990, y: 980 }, "power2.in");
  orbT.to(tShortlets + 0.3, 0.2, { opacity: 0 }, "power1.in");

  /* D20 -> D21: to the side as the resort card rises */
  /* the window stays at the hero scale; its right third softens under the card and the calendar */
  S.veilDuring(T.resorts - 0.1, tPop + 0.2);

  /* ==================== the resort card, which turns over into the calendar ==================== */
  const FW = 560;
  const fk = FW / PHOTO.w;
  const photoH = Math.round(PHOTO.h * fk);
  const cardH = photoH + 104;
  const CAL = { x: RP.x + 10, y: 176, w: 660, h: 540 };
  const calC = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h / 2 };
  const cardC = { x: RP.x + RP.w / 2, y: 470 };
  const flipper = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px`, perspective: "2600px", perspectiveOrigin: `${calC.x}px ${calC.y}px`, visibility: "hidden" } }, cards);
  const inner = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "0px", height: "0px", transformStyle: "preserve-3d" } }, flipper);
  const front = glassCard(ctx, inner, { w: FW, h: cardH, radius: 28, shadow: "l", style: { overflow: "hidden", backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const photo = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${FW}px`, height: `${photoH}px`, overflow: "hidden" } }, front);
  ctx.img(staySrc, { style: { position: "absolute", left: `${-PHOTO.x * fk}px`, top: `${-PHOTO.y * fk}px`, width: `${2880 * fk}px`, height: "auto", maxWidth: "none" } }, photo);
  photoExample(ctx, photo, { size: 18, style: { left: "14px", top: "14px" } });
  const strip = ctx.el("div", { class: "abs", style: { left: "24px", right: "24px", top: `${photoH + 20}px`, display: "flex", flexDirection: "column", gap: "10px" } }, front);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 30px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, strip);
  const loc = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "6px", font: "500 22px/1 Inter, sans-serif", color: INK2 } }, strip);
  const pin = ctx.icon("map-pin", { size: 22, stroke: 2 }, loc);
  pin.style.color = ELECTRIC;
  ctx.el("span", { text: "Lekki, Lagos" }, loc);
  const back = glassCard(ctx, inner, { w: CAL.w, h: CAL.h, radius: 36, shadow: "l", style: { backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const cal = monthCalendar(ctx, back, CAL, { pad: 41, caption: "Lagoon Crest Resort · Lekki, Lagos", captionTop: 30, captionSize: 20, headTop: 62, head: 38, wkTop: 128, wk: 19, num: 25, row0: 166, rowH: 70, dot: 62 });

  const tRise0 = T.resorts - 0.02;
  const tRise1 = T.resorts + 0.5;
  const tFlip0 = T.pick - 0.28;
  const tFlip1 = tFlip0 + 0.5;
  const tCalOut0 = tPop + 0.06;
  const tCalOut1 = tCalOut0 + 0.3;
  ctx.sfx("card_slide", T.resorts, { offset: -2 });
  showDuring(ctx, flipper, [[tRise0, tCalOut1]]);
  ctx.onFrame((t) => {
    if (t < tRise0 || t >= tCalOut1) return;
    const q = S.rectQuad(FEATURED);
    const start = { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
    const rise = ramp(ctx, t, tRise0, tRise1, "land");
    const flip = ramp(ctx, t, tFlip0, tFlip1, "power3.inOut");
    const bob = Math.sin((t - tRise1) * 2.1) * 3 * ramp(ctx, t, tRise1, tRise1 + 0.3) * (1 - flip);
    const cx = mix(mix(start.x, cardC.x, rise), calC.x, flip);
    const cy = mix(mix(start.y, cardC.y, rise), calC.y, flip) + bob;
    const fs = mix(mix((q[1].x - q[0].x) / FW, 1, rise), (CAL.w * 0.62) / FW, flip);
    const bs = mix(0.62, 1, flip);
    const out = ramp(ctx, t, tCalOut0, tCalOut1, "power2.in");
    inner.style.transform = `translate(${cx.toFixed(2)}px, ${(cy - out * 140).toFixed(2)}px) rotateY(${(180 * flip).toFixed(2)}deg)`;
    front.style.transform = `translate(${-FW / 2}px, ${-cardH / 2}px) scale(${fs.toFixed(4)})`;
    back.style.transform = `translate(${-CAL.w / 2}px, ${-CAL.h / 2}px) rotateY(180deg) scale(${(bs * (1 - out * 0.08)).toFixed(4)})`;
    flipper.style.opacity = String((ramp(ctx, t, tRise0, tRise0 + 0.12) * (1 - out)).toFixed(3));
  });

  /* ==================== D21: the clicks, the range ==================== */
  const tap16 = T.dates;
  const tap19 = T.dates + 0.38;
  const at16 = cal.cellCentre(16);
  const at19 = cal.cellCentre(19);
  orbT.to(T.pick - 0.14, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(T.pick - 0.14, 0.4, { x: at16.x + 14, y: at16.y + 12 }, "glide");
  pressAt(ctx, S.orb, tap16, { ringParent: S.pointer, x: at16.x, y: at16.y, sound: "tap" });
  orbT.to(tap16 + 0.1, 0.26, { x: at19.x + 14, y: at19.y + 12 }, "glide");
  pressAt(ctx, S.orb, tap19, { ringParent: S.pointer, x: at19.x, y: at19.y, sound: "tap" });
  orbT.to(tap19 + 0.14, 0.42, { x: 1990, y: 900 }, "power2.in");
  orbT.to(tap19 + 0.3, 0.2, { opacity: 0 }, "power1.in");
  cal.select(tap16, tap19, T.r23);

  /* ==================== D22: the window folds into the strip; the chip lands ==================== */
  const sH = (56 + STRIP.viewH) * S.HERO.s;
  const stripWv = { cx: 960, cy: STRIP_TOP + sH / 2, s: S.HERO.s, ry: 0, opacity: 1, ...STRIP };
  wvT.to(tFold0, tFold1 - tFold0, { cx: stripWv.cx, cy: stripWv.cy, s: stripWv.s, ...STRIP }, "glide");
  /* everything lifts away before "Going" (49.04) */
  const tAway = T.r23 - 0.24;
  wvT.to(tAway - 0.06, 0.22, { cy: stripWv.cy - 420, opacity: 0 }, "power2.in");
  const P = (x, y) => S.toStageAt(stripWv, cam0, x, y);
  const fieldsC = P(FIELDS.x + FIELDS.w / 2, FIELDS.y + FIELDS.h / 2);

  const tGrow0 = tPop + 0.06;
  const tGrow1 = tGrow0 + 0.2;
  const tDrop0 = T.book;
  const tDrop1 = T.room;
  const dchip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", height: "70px", display: "flex", alignItems: "center", padding: "0 30px", borderRadius: "999px", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, color: "#fff", font: "600 30px/1 Inter, sans-serif", letterSpacing: "-0.015em", whiteSpace: "nowrap", boxShadow: "0 22px 44px -20px rgb(0 70 200 / 0.6)", visibility: "hidden" } }, cards);
  const datesPart = ctx.el("span", { style: { display: "inline-flex", alignItems: "center", overflow: "hidden", maxWidth: "0px", whiteSpace: "nowrap", opacity: "0" } }, dchip);
  ctx.el("span", { text: "16 Oct" }, datesPart);
  const arrow = ctx.icon("arrow-right", { size: 21, stroke: 2.4 }, datesPart);
  arrow.style.margin = "0 8px";
  ctx.el("span", { text: "19 Oct", style: { marginRight: "10px" } }, datesPart);
  ctx.el("span", { text: "·", style: { marginRight: "10px" } }, datesPart);
  ctx.el("span", { text: "3 nights" }, dchip);
  ctx.sfx("pop", tPop);
  showDuring(ctx, dchip, [[tPop, tDrop1 + 0.08]]);
  let fullW = null;
  ctx.onFrame((t) => {
    if (t < tPop || t > tDrop1 + 0.1) return;
    if (fullW == null) {
      datesPart.style.maxWidth = "none";
      fullW = datesPart.offsetWidth;
    }
    const pop = ctx.ease("back.out(2)")(ctx.progress(t, tPop, tPop + 0.3));
    const grow = ramp(ctx, t, tGrow0, tGrow1, "power3.inOut");
    datesPart.style.maxWidth = `${(grow * fullW).toFixed(1)}px`;
    /* the width first; the dates fade in only once it is complete, so no part of a date ever shows */
    datesPart.style.opacity = ramp(ctx, t, tGrow1 - 0.01, tGrow1 + 0.11, "power1.out").toFixed(3);
    const drop = ramp(ctx, t, tDrop0, tDrop1, "glide");
    const from = { x: calC.x, y: CAL.y + CAL.h + 4 };
    const x = mix(from.x, fieldsC.x, drop);
    const y = mix(from.y, fieldsC.y, drop) - 110 * Math.sin(Math.PI * drop);
    const sc = mix(0.3 + 0.7 * pop, 0.74, drop);
    dchip.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) translate(-50%, -50%) scale(${sc.toFixed(4)})`;
    dchip.style.opacity = String((1 - ramp(ctx, t, tDrop1 - 0.02, tDrop1 + 0.06)).toFixed(3));
  });

  /* ==================== the results, each under the field it answers ==================== */
  const colX = { a: P(COL.checkIn, 0).x, b: P(COL.checkOut, 0).x, c: P(COL.guests, 0).x, cR: P(COL.guestsR, 0).x, d: P(COL.button, 0).x, dR: P(COL.buttonR, 0).x };
  const Y0 = P(0, STRIP.viewTop + STRIP.viewH).y + 42;
  const DH = 250;
  const EH = 150;
  /* D: the price, under "Show prices for these dates" */
  const DW2 = colX.dR - colX.d;
  const D = glassCard(ctx, cards, { w: DW2, h: DH, radius: 24, shadow: "m", style: { overflow: "hidden", visibility: "hidden" } });
  const dk = DW2 / PHOTO_D.w;
  const dPh = Math.round(PHOTO_D.h * dk);
  const dPhoto = ctx.el("div", { style: { position: "relative", width: `${DW2}px`, height: `${dPh}px`, overflow: "hidden" } }, D);
  ctx.img(staySrc, { style: { position: "absolute", left: `${-PHOTO_D.x * dk}px`, top: `${-PHOTO_D.y * dk}px`, width: `${2880 * dk}px`, height: "auto", maxWidth: "none" } }, dPhoto);
  photoExample(ctx, dPhoto, { size: 15, style: { left: "10px", top: "10px" } });
  const dBody = ctx.el("div", { style: { padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: "6px" } }, D);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 22px/1.15 Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: NAVY, whiteSpace: "nowrap" } }, dBody);
  ctx.el("div", { text: "₦150,000", style: { font: "700 32px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#0056d0" } }, dBody);
  ctx.el("div", { text: "per night", style: { font: "600 18px/1 Poppins, Inter, sans-serif", color: "#6b7080" } }, dBody);
  /* E: notification card 1 of 2 (Example), under the three fields */
  const EW = colX.cR - colX.a;
  const E = glassCard(ctx, cards, { w: EW, h: EH, radius: 28, shadow: "l", style: { display: "flex", alignItems: "center", gap: "22px", padding: "0 32px 0 30px", visibility: "hidden" } });
  iconPlate(ctx, E, "bed-double", { size: 76 });
  const eText = ctx.el("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, E);
  ctx.el("div", { text: "Room booked", style: { font: "600 38px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, eText);
  ctx.el("div", { text: "Lagoon Crest Resort · 3 nights", style: { font: "500 25px/1.2 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, eText);
  const eMeta = ctx.el("div", { style: { marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" } }, E);
  exampleChip(ctx, eMeta, { size: 19 });
  ctx.el("span", { text: "now", style: { font: "500 20px/1 Inter, sans-serif", color: "#8a90a0" } }, eMeta);

  const tE = tDrop1 + 0.03;                  // "Room booked" comes off the chip, on "room"
  const tPrice = T.few - 0.08;               // the price comes out of "Show prices"
  /* each result comes out of the field it answers (the price out of "Show prices"), so nothing crosses */
  const fy = FIELDS.y + FIELDS.h / 2;
  const items = [
    { el: E, x: colX.a, y: Y0, t: tE, sound: null, from: fieldsC },
    { el: D, x: colX.d, y: Y0, t: tPrice, sound: "pop", from: P((COL.button + COL.buttonR) / 2, fy) },
  ];
  ctx.sfx("chime_notify", tE);
  for (const [i, it] of items.entries()) {
    if (it.sound) ctx.sfx(it.sound, it.t, { offset: -4 });
    const out0 = it.el === E ? tAway : tAway - 0.06; // the price first, "Room booked" just after: all gone by 49.02
    const end = out0 + 0.24;
    it.el.style.transformOrigin = "0 0";
    showDuring(ctx, it.el, [[it.t, end]]);
    let size = null;
    ctx.onFrame((t) => {
      if (t < it.t || t >= end) return;
      if (!size) size = { w: it.el.offsetWidth, h: it.el.offsetHeight };
      const k = ramp(ctx, t, it.t, it.t + 0.44, "land");
      const away = ramp(ctx, t, out0, out0 + 0.22, "power2.in");
      const s = mix(0.4, 1, k);
      const bob = Math.sin((t - it.t) * 2.2 + i * 1.3) * 2.5 * ramp(ctx, t, it.t + 0.44, it.t + 0.84);
      const x = mix(it.from.x - (size.w * s) / 2, it.x, k);
      const y = mix(it.from.y - (size.h * s) / 2, it.y, k) + bob - away * 480;
      it.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
      it.el.style.opacity = String((ramp(ctx, t, it.t, it.t + 0.08) * (1 - away)).toFixed(3));
    });
  }
}
