/**
 * Mobile rows 20 to 22 (42.69 to 49.04), on the warm ground.
 *   20  stays-lt: Hotels and Shortlets light as named and lift beside the
 *       phone; on "resorts" Lagoon Crest Resort's card rises out of the phone;
 *       it turns over into the calendar.
 *   21  October 2026: taps on 16 and 19, the range sweeps, "3 nights" pops;
 *       the chip becomes "16 Oct → 19 Oct · 3 nights" and drops.
 *   22  the phone (stays-dates-lt, British dates) takes the chip; the results
 *       settle around it as cards, and "Room booked" (Example) comes off the
 *       dates chip on "taps". Then everything lifts away and night comes.
 */
import {
  DW, NAVY, INK2, ELECTRIC, SHADOW, ramp, kf, mix, track, screenPage, showDuring, cropBody, quadDriver, displayQuad,
  rectQuad, lerpQuad, shiftQuad, placeQuad, exampleChip, photoExample, iconPlate, pressAt, ripple, glassCard,
} from "./b-kit.js";

/* stays-lt (display px). */
const HOTELS = { x: 50, y: 1612, w: 590, h: 343 };
const SHORTLETS = { x: 680, y: 1612, w: 590, h: 343 };
/* stay-light: the resort's photo band. */
const PHOTO = { x: 0, y: 360, w: 1320, h: 565 };
/* stays-dates-lt: the two date fields. */
const FIELDS = { x: 50, y: 987, w: 1220, h: 175 };

/** A chip: a lucide icon plate and a label (white glass, the section's shadow). */
function chip(ctx, parent, { icon, text, size = 34 }) {
  const el = glassCard(ctx, parent, { w: null, radius: 999, shadow: "m", style: { width: "auto", display: "flex", alignItems: "center", gap: "16px", padding: "14px 30px 14px 16px", whiteSpace: "nowrap", font: `600 ${size}px/1 Inter, sans-serif`, letterSpacing: "-0.015em" } });
  iconPlate(ctx, el, icon, { size: 56, round: true });
  ctx.el("span", { text }, el);
  el.style.visibility = "hidden";
  return el;
}

export async function stays(ctx, S, T) {
  const { tl } = ctx;
  const pL = S.pL;
  const layer = ctx.scene("b-m-stays", T.r20 - 0.3, T.r23 + 0.05, { z: 20 });
  const stayImg = ctx.src.display("stay-light");

  /* ---------- the phone ---------- */
  const pose = S.pLpose;
  pose.to(T.r20 - 0.26, 0.001, { cy: 2650, height: 1300, rx: 0, opacity: 1 }, "none");
  pose.to(T.r20 - 0.25, 0.58, { cy: 760, height: 1300 }, "glide");            // rises with stays-lt
  pose.to(T.resorts + 0.66, 0.46, { cy: 2500 }, "power2.in");                   // leaves the calendar alone
  pose.to(T.and10 + 0.42, 0.5, { cy: 640, height: 1180 }, "glide");             // PHONE_HIGH for the chip
  pose.to(T.taps + 0.74, 0.5, { cy: 2450 }, "power2.in");                       // drops as night comes

  const staysPage = screenPage(ctx, pL, ctx.src.display("stays-lt"));
  const datesPage = screenPage(ctx, pL, ctx.src.display("stays-dates-lt"));
  showDuring(ctx, staysPage.el, [[T.r20 - 0.3, T.resorts + 1.2]]);
  showDuring(ctx, datesPage.el, [[T.and10 + 0.3, T.r23 + 0.05]]);

  /* ==================== row 20: the tiles light and lift ==================== */
  const orbT = S.orbT;
  const tileAt = (r) => ({ x: 246.6 + (r.x + r.w / 2) * 0.44453, y: 122.9 + (r.y + r.h / 2) * 0.44428 });
  const hAt = tileAt(HOTELS);
  const sAt = tileAt(SHORTLETS);
  orbT.to(T.hotels - 0.34, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(T.hotels - 0.34, 0.3, { x: hAt.x + 40, y: hAt.y + 10 }, "glide");
  pressAt(ctx, S.orb, T.hotels, { sound: null });
  orbT.to(T.hotels + 0.2, 0.5, { x: sAt.x + 40, y: sAt.y + 10 }, "glide");
  pressAt(ctx, S.orb, T.shortlets, { sound: null });
  orbT.to(T.shortlets + 0.14, 0.36, { x: 1060, y: 1180 }, "glide");
  orbT.to(T.shortlets + 0.2, 0.2, { opacity: 0 }, "power1.in");

  const tiles = [
    { r: HOTELS, t: T.hotels, target: { x: 34, y: 610, rot: -4 } },
    { r: SHORTLETS, t: T.shortlets, target: { x: 640, y: 870, rot: 4 } },
  ];
  const SC = 0.56;
  for (const [i, tile] of tiles.entries()) {
    /* the tile lights under the glass: a blue edge and a ripple where it was touched */
    const lit = ctx.el("div", { class: "abs", style: { left: `${tile.r.x}px`, top: `${tile.r.y}px`, width: `${tile.r.w}px`, height: `${tile.r.h}px`, borderRadius: "50px", boxShadow: `inset 0 0 0 7px ${ELECTRIC}`, background: "rgb(0 105 254 / 0.05)", opacity: "0" } }, staysPage.el);
    tl.fromTo(lit, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out", immediateRender: false }, tile.t);
    ripple(ctx, staysPage.el, { x: tile.r.x + tile.r.w / 2 + 90, y: tile.r.y + tile.r.h / 2 + 22, t: tile.t, sound: "tap_soft", offset: -2 });
    /* and lifts off beside the phone, 3D icon and all */
    const body = cropBody(ctx, layer, { src: ctx.src.display("stays-lt"), crop: tile.r, iw: DW, radius: 50, shadow: SHADOW.m, bg: "#fff" });
    const lift0 = tile.t + 0.06;
    const lift1 = lift0 + 0.42;
    const tOut = T.resorts + 0.62 + i * 0.05;
    quadDriver(ctx, body, tile.r.w, tile.r.h, {
      t0: lift0, t1: tOut + 0.3,
      quadAt: (t) => {
        const k = ramp(ctx, t, lift0, lift1, "glide");
        const bobY = Math.sin((t - lift1) * 2.3 + i * 1.7) * 5 * ramp(ctx, t, lift1, lift1 + 0.4);
        const out = ramp(ctx, t, tOut, tOut + 0.3, "power2.in");
        const tgt = rectQuad({ x: tile.target.x + (i ? 1 : -1) * 260 * out, y: tile.target.y + bobY, w: tile.r.w * SC, h: tile.r.h * SC, rot: tile.target.rot });
        return lerpQuad(displayQuad(pL, tile.r), tgt, k);
      },
      opacityAt: (t) => 1 - ramp(ctx, t, tOut + 0.05, tOut + 0.28, "power1.in"),
    });
  }

  /* ==================== the resort card, which turns over into the calendar ==================== */
  const CARD = { w: 640, photoH: Math.round((PHOTO.h * 640) / PHOTO.w), stripH: 118 };
  const cardH = CARD.photoH + CARD.stripH;
  const CAL = { x: 90, y: 340, w: 900, h: 720 };
  const cardBox = { x: 540 - CARD.w / 2, y: 356, w: CARD.w, h: cardH };
  const flipper = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px`, perspective: "2600px", perspectiveOrigin: "540px 700px", visibility: "hidden" } }, layer);
  const inner = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px`, transformStyle: "preserve-3d" } }, flipper);
  const front = glassCard(ctx, inner, { w: CARD.w, h: cardH, radius: 36, shadow: "l", style: { overflow: "hidden", backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const photo = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${CARD.w}px`, height: `${CARD.photoH}px`, overflow: "hidden" } }, front);
  ctx.img(stayImg, { style: { position: "absolute", left: `${-PHOTO.x * (CARD.w / PHOTO.w)}px`, top: `${-PHOTO.y * (CARD.w / PHOTO.w)}px`, width: `${DW * (CARD.w / PHOTO.w)}px`, height: "auto", maxWidth: "none" } }, photo);
  photoExample(ctx, photo, { size: 22, style: { left: "20px", top: "18px" } });
  const strip = ctx.el("div", { class: "abs", style: { left: "30px", right: "30px", top: `${CARD.photoH + 20}px`, display: "flex", flexDirection: "column", gap: "10px" } }, front);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 40px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY } }, strip);
  const loc = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "8px", font: "500 27px/1 Inter, sans-serif", color: INK2 } }, strip);
  const pin = ctx.icon("map-pin", { size: 28, stroke: 2 }, loc);
  pin.style.color = ELECTRIC;
  ctx.el("span", { text: "Lekki, Lagos" }, loc);

  const back = glassCard(ctx, inner, { w: CAL.w, h: CAL.h, radius: 44, shadow: "l", style: { backfaceVisibility: "hidden", transformOrigin: "50% 50%" } });
  const cal = calendar(ctx, back, T, CAL);

  /* timeline of the card: rises out of the phone, rests, turns over into the calendar */
  const tRise0 = T.resorts - 0.02;
  const tRise1 = T.resorts + 0.42;
  const tFlip0 = T.pick - 0.28;
  const tFlip1 = tFlip0 + 0.5;
  const tCalOut0 = T.and10 + 0.36;
  const tCalOut1 = tCalOut0 + 0.4;
  ctx.sfx("card_slide", T.resorts, { offset: -2 });
  showDuring(ctx, flipper, [[tRise0, tCalOut1]]);
  ctx.onFrame((t) => {
    if (t < tRise0 || t >= tCalOut1) return;
    const rise = ramp(ctx, t, tRise0, tRise1, "land");
    const flip = ramp(ctx, t, tFlip0, tFlip1, "power3.inOut");
    const angle = 180 * flip;
    /* the card's centre travels from the phone's screen to its box, then to the calendar's centre */
    const startC = { x: 540, y: 1180 };
    const cardC = { x: cardBox.x + cardBox.w / 2, y: cardBox.y + cardBox.h / 2 + Math.sin((t - tRise1) * 2.1) * 4 * ramp(ctx, t, tRise1, tRise1 + 0.3) };
    const calC = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h / 2 };
    const cx = mix(mix(startC.x, cardC.x, rise), calC.x, flip);
    const cy = mix(mix(startC.y, cardC.y, rise), calC.y, flip);
    const fs = mix(mix(0.32, 1, rise), 1.28, flip);
    const bs = mix(CARD.w * 1.28 / CAL.w, 1, flip);
    const out = ramp(ctx, t, tCalOut0, tCalOut1, "power2.in");
    inner.style.transform = `translate(${cx.toFixed(2)}px, ${(cy - out * 120).toFixed(2)}px) rotateY(${angle.toFixed(2)}deg)`;
    front.style.transform = `translate(${-CARD.w / 2}px, ${-cardH / 2}px) scale(${fs.toFixed(4)})`;
    back.style.transform = `translate(${-CAL.w / 2}px, ${-CAL.h / 2}px) rotateY(180deg) scale(${(bs * (1 - out * 0.1)).toFixed(4)})`;
    flipper.style.opacity = String((ramp(ctx, t, tRise0, tRise0 + 0.1) * (1 - out)).toFixed(3));
  });
  front.style.left = "0px";
  back.style.left = "0px";

  /* ==================== row 21: the taps, the range, the chip ==================== */
  const tap16 = T.dates;
  const tap19 = T.dates + 0.38;
  const at16 = cal.cellCentre(16);
  const at19 = cal.cellCentre(19);
  orbT.to(T.pick - 0.1, 0.16, { opacity: 1 }, "power1.out");
  orbT.to(T.pick - 0.1, 0.36, { x: at16.x + 30, y: at16.y + 26 }, "glide");
  pressAt(ctx, S.orb, tap16, { ringParent: S.pointer, x: at16.x, y: at16.y, sound: "tap" });
  orbT.to(tap16 + 0.1, 0.26, { x: at19.x + 30, y: at19.y + 26 }, "glide");
  pressAt(ctx, S.orb, tap19, { ringParent: S.pointer, x: at19.x, y: at19.y, sound: "tap" });
  orbT.to(tap19 + 0.14, 0.4, { x: 1080, y: 1150 }, "glide");
  orbT.to(tap19 + 0.3, 0.2, { opacity: 0 }, "power1.in");
  cal.select(tap16, tap19);

  /* The chip: "3 nights" pops out of the range, grows its dates, drops into the phone's date fields. */
  const tPop = T.and10;
  const tGrowDates = tPop + 0.24;
  const tDrop0 = tCalOut0 + 0.02;
  const tDrop1 = T.r22;
  const dchip = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", height: "84px", display: "flex", alignItems: "center", gap: "0px", padding: "0 34px", borderRadius: "999px", background: `linear-gradient(160deg, #2f83ff, ${ELECTRIC} 60%, #0056d0)`, color: "#fff", font: "600 36px/1 Inter, sans-serif", letterSpacing: "-0.015em", whiteSpace: "nowrap", boxShadow: "0 22px 44px -20px rgb(0 70 200 / 0.6)", visibility: "hidden", transformOrigin: "50% 50%" } }, layer);
  const datesPart = ctx.el("span", { text: "16 Oct → 19 Oct · ", style: { display: "inline-block", overflow: "hidden", maxWidth: "0px", whiteSpace: "nowrap" } }, dchip);
  ctx.el("span", { text: "3 nights" }, dchip);
  ctx.gsap.set(dchip, { xPercent: -50, yPercent: -50 });
  const fieldsC = (t) => {
    const q = displayQuad(pL, FIELDS);
    return { x: (q[0].x + q[2].x) / 2, y: (q[0].y + q[2].y) / 2 };
  };
  ctx.sfx("pop", tPop);
  showDuring(ctx, dchip, [[tPop, T.r22 + 0.06]]);
  ctx.onFrame((t) => {
    if (t < tPop || t > T.r22 + 0.08) return;
    const pop = ctx.ease("back.out(2)")(ctx.progress(t, tPop, tPop + 0.32));
    const grow = ramp(ctx, t, tGrowDates, tGrowDates + 0.3, "power3.inOut");
    datesPart.style.maxWidth = `${(grow * 420).toFixed(1)}px`;
    const drop = ramp(ctx, t, tDrop0, tDrop1, "glide");
    const from = { x: CAL.x + CAL.w / 2, y: CAL.y + CAL.h + 4 };
    const to = fieldsC(t);
    const x = mix(from.x, to.x, drop);
    const y = mix(from.y, to.y, drop) - 140 * Math.sin(Math.PI * drop);
    const sc = mix(0.3 + 0.7 * pop, 0.86, drop);
    dchip.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;
  });

  /* ==================== row 22: the results around the phone ==================== */
  const tLand = T.r22;
  const A = chip(ctx, layer, { icon: "calendar-days", text: "16 Oct → 19 Oct" });
  const B = chip(ctx, layer, { icon: "moon", text: "3 nights" });
  const C = chip(ctx, layer, { icon: "users", text: "2 guests" });
  /* D: the resort and its price (stay-light's photo, its own words). */
  const D = glassCard(ctx, layer, { w: 330, radius: 30, shadow: "m", style: { overflow: "hidden", visibility: "hidden" } });
  const dPhoto = ctx.el("div", { style: { position: "relative", width: "330px", height: "150px", overflow: "hidden" } }, D);
  ctx.img(stayImg, { style: { position: "absolute", left: `${-PHOTO.x * (330 / PHOTO.w)}px`, top: `${-(PHOTO.y + 80) * (330 / PHOTO.w)}px`, width: `${DW * (330 / PHOTO.w)}px`, height: "auto", maxWidth: "none" } }, dPhoto);
  photoExample(ctx, dPhoto, { size: 17, style: { left: "12px", top: "12px" } });
  const dBody = ctx.el("div", { style: { padding: "16px 22px 20px", display: "flex", flexDirection: "column", gap: "8px" } }, D);
  ctx.el("div", { text: "Lagoon Crest Resort", style: { font: "600 27px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: NAVY } }, dBody);
  const price = ctx.el("div", { style: { display: "flex", alignItems: "baseline", gap: "8px" } }, dBody);
  ctx.el("span", { text: "₦150,000", style: { font: "700 32px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: "#0056d0" } }, price);
  ctx.el("span", { text: "per night", style: { font: "600 22px/1 Poppins, Inter, sans-serif", color: "#6b7080" } }, price);
  /* E: notification card 1 of 2 (Example). */
  const E = glassCard(ctx, layer, { w: null, radius: 34, shadow: "l", style: { width: "auto", display: "flex", alignItems: "center", gap: "20px", padding: "22px 28px 22px 22px", visibility: "hidden" } });
  iconPlate(ctx, E, "bed-double", { size: 76 });
  const eBody = ctx.el("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } }, E);
  ctx.el("div", { text: "Room booked", style: { font: "600 38px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY } }, eBody);
  ctx.el("div", { text: "Lagoon Crest Resort · 3 nights", style: { font: "500 27px/1.2 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, eBody);
  const eMeta = ctx.el("div", { style: { alignSelf: "flex-start", marginLeft: "10px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" } }, E);
  ctx.el("div", { text: "now", style: { font: "500 21px/1 Inter, sans-serif", color: "#8a90a0" } }, eMeta);
  exampleChip(ctx, eMeta, { size: 20 });

  /* Where each result settles (stage px, top-left), and where it comes from. */
  const place = [
    { el: A, x: 56, y: 360, from: "fields", t: tLand + 0.04, sound: null },
    { el: B, xr: 984, y: 360, from: "fields", t: tLand + 0.11, sound: true },
    { el: C, x: 56, y: 668, from: "guests", t: tLand + 0.18, sound: true },
    { el: D, xr: 984, y: 560, from: "screen", t: tLand + 0.25, sound: true },
  ];
  const tLift = T.taps + 0.66;
  const tE = T.taps;
  for (const [i, p] of place.entries()) {
    if (p.sound) ctx.sfx("pop", p.t, { offset: -4 });
    showDuring(ctx, p.el, [[p.t, T.r23]]);
    let size = null;
    ctx.onFrame((t) => {
      if (t < p.t || t >= T.r23) return;
      if (!size) size = { w: p.el.offsetWidth, h: p.el.offsetHeight };
      const k = ramp(ctx, t, p.t, p.t + 0.42, "land");
      const x1 = p.xr != null ? p.xr - size.w : p.x;
      const y1 = p.y + Math.sin((t - p.t) * 2.2 + i * 1.3) * 4 * ramp(ctx, t, p.t + 0.4, p.t + 0.8);
      const src = fieldsC(t);
      const x0 = src.x - size.w / 2;
      const y0 = src.y - size.h / 2 + (p.from === "guests" ? 115 : p.from === "screen" ? 250 : 0);
      const lift = ramp(ctx, t, tLift + i * 0.06, tLift + i * 0.06 + 0.4, "power2.in");
      const s = mix(0.5, 1, k);
      const x = mix(x0, x1, k);
      const y = mix(y0, y1, k) - lift * 520;
      p.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
      p.el.style.opacity = String((ramp(ctx, t, p.t, p.t + 0.08) * (1 - lift)).toFixed(3));
    });
  }
  /* E comes off the dates chip (A) on "taps", with the chime. */
  ctx.sfx("chime_notify", tE);
  showDuring(ctx, E, [[tE, T.r23]]);
  let eSize = null;
  ctx.onFrame((t) => {
    if (t < tE || t >= T.r23) return;
    if (!eSize) eSize = { w: E.offsetWidth, h: E.offsetHeight };
    const k = ramp(ctx, t, tE, tE + 0.5, "land");
    const x1 = 540 - eSize.w / 2;
    const y1 = 930 + Math.sin((t - tE) * 2) * 4 * ramp(ctx, t, tE + 0.5, tE + 0.9);
    const x0 = 56;
    const y0 = 360;
    const lift = ramp(ctx, t, tLift + 0.24, tLift + 0.64, "power2.in");
    const s = mix(0.4, 1, k);
    E.style.transformOrigin = "0 0";
    E.style.transform = `translate(${mix(x0, x1, k).toFixed(2)}px, ${(mix(y0, y1, k) - lift * 620).toFixed(2)}px) scale(${s.toFixed(4)})`;
    E.style.opacity = String((ramp(ctx, t, tE, tE + 0.1) * (1 - lift)).toFixed(3));
  });
  for (const p of place) p.el.style.transformOrigin = "50% 50%";
}

/**
 * The October 2026 calendar on the resort card's back (900 x 720). Oct 1
 * 2026 is a Thursday. select(t16, t19) lights 16, then 19, then sweeps the
 * range between them.
 */
function calendar(ctx, parent, T, CAL) {
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
  /* the range band (under the numbers) */
  const band1 = ctx.el("div", { class: "abs", style: { left: `${cellC(16).x}px`, top: `${cellC(16).y - 40}px`, width: `${CAL.w - PAD - cellC(16).x + 6}px`, height: "80px", background: "rgb(0 105 254 / 0.12)", borderRadius: "0 40px 40px 0", transformOrigin: "0 50%", opacity: "0" } }, parent);
  const band2 = ctx.el("div", { class: "abs", style: { left: `${PAD - 6}px`, top: `${cellC(19).y - 40}px`, width: `${cellC(19).x - PAD + 6}px`, height: "80px", background: "rgb(0 105 254 / 0.12)", borderRadius: "40px 0 0 40px", transformOrigin: "0 50%", opacity: "0" } }, parent);
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
      tl.fromTo(band1, { scaleX: 0, opacity: 1 }, { scaleX: 1, opacity: 1, duration: 0.14, ease: "power2.in", immediateRender: false }, t19 + 0.02);
      tl.fromTo(band2, { scaleX: 0, opacity: 1 }, { scaleX: 1, opacity: 1, duration: 0.14, ease: "power2.out", immediateRender: false }, t19 + 0.16);
      showDuring(ctx, band1, [[t19 + 0.02, 999]]);
      showDuring(ctx, band2, [[t19 + 0.16, 999]]);
    },
  };
}
