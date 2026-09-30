/**
 * Desktop rows 05-10 (8.19-23.08): the browser window at vallospaces.com.
 *   05  the window rises behind the closed iris, so the ring opens onto it; its
 *       page swaps on each word; a slow 2% push (raised 40 px by the
 *       restaurant page, so the caption never meets its Example notice).
 *   06  the window drops away; "One app." lands on clean mist, the inbox's
 *       Property | Stays tabs rise under it as the one body, then "One
 *       account."; all three leave together before row 07.
 *   07  "Looking for a home?" lands as one line, rests, and becomes the pill;
 *       the window rises pushed in 2x onto the home tiles; Rent is clicked.
 *   08  the results at the hero scale (the sidebar out at the left), and
 *       Nigeria drawn in the room at the right, the cities lighting in time.
 *   09  "More": the drawer, and a 2x push onto it; Villas on "exactly"; the
 *       Apply button echoed large beside it, 52 -> 3; Apply on "need".
 *   10  the pull out to the lowered hero framing, then the cost section
 *       (d-listing-cost-lt) straight in, its total card below the frame.
 * Captures are 2x: a css scale of 2.0 shows them 1:1.
 */
import { LAYOUT } from "./layout.js";
import { browserWindow, orb } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW, MIST, nigeriaOutline, CITIES, pressAt, fitSize, measure, rectQuad, placeOnQuad, cropCanvas } from "./a-common.js";

const W = 1920;
const H = 1080;
const L = LAYOUT.desktop;
const BAR = 56; // the window's top bar (CSS px)
export const HERO = { x: L.WINDOW_HERO.x, y: L.WINDOW_HERO.y, s: L.WINDOW_HERO.width / 1440 };
export const LEFT = { x: L.WINDOW_LEFT.x, y: L.WINDOW_LEFT.y, s: L.WINDOW_LEFT.width / 1440 };
/* Row 05's slow push: 2% about the frame's centre, and raised 40 px by the restaurant page. */
const H5 = { x: 960 - (960 - HERO.x) * 1.02, y: 540 - (540 - HERO.y) * 1.02 - 40, s: HERO.s * 1.02 };
/* Row 07's push onto the home tiles: css scale 2.0 (the 2x captures at 1:1), Rent at (960, 640). */
const RENT_PUSH = { x: -484, y: -616, s: 2 };
/* ...and where it rises from, unseen below the frame. */
const PARK = { x: RENT_PUSH.x, y: RENT_PUSH.y + 1700, s: 2 };
/* Row 08: the results at the hero scale, the sidebar out at the left, room for the map at the right. */
const LEFT08 = { x: -282, y: 100, s: HERO.s };
/* Row 09's push onto the drawer: css scale 2.0; its close button clears the pill. */
const PUSHF = { x: -1826, y: -40, s: 2 };
/* Row 10: the hero framing lowered, so the page's total card (css y 710) sits below the frame... */
export const LOW = { x: HERO.x, y: 238, s: HERO.s };
/* ...and its slow drift: a 0.8% push about (960, 400), which only takes the card further down. */
export const LOW_REST = { x: 960 - (960 - LOW.x) * 1.008, y: 400 - (400 - LOW.y) * 1.008, s: 1.12 };
const Z = { mist: 3, map: 4, window: 5, bodies: 7, words: 8, pointer: 12 };

/** Stage point of a css point in the window at a framing. */
export const cssToStage = (f, x, y) => ({ x: f.x + x * f.s, y: f.y + (BAR + y) * f.s });

export async function buildProductDesktop(ctx, T, open) {
  const { tl } = ctx;
  const END = T.end;
  const ir = { immediateRender: false };

  /* ================= the ground and the window ================= */
  /* Both start before the iris opens (8.19): clipDay keeps them hidden until it does. */
  const mistScene = ctx.scene("a-mist", T.riseAt - 0.05, END, { z: Z.mist });
  const mist = ctx.el("div", { class: "fill", style: { background: MIST } }, mistScene);
  open.clipDay(mist);

  const winScene = ctx.scene("a-window", T.riseAt - 0.05, END, { z: Z.window });
  const winWrap = ctx.el("div", { class: "fill" }, winScene);
  open.clipDay(winWrap);
  const win = browserWindow(ctx, { parent: winWrap, width: L.WINDOW_HERO.width, theme: "light", url: "vallospaces.com" });
  win.root.style.boxShadow = "0 60px 120px -50px rgb(16 32 80 / 0.42), 0 18px 40px -22px rgb(16 32 80 / 0.22), 0 0 0 1px rgb(16 32 80 / 0.07)";
  const R = win.root;

  /* The framing, row by row (x, y, scale of the window's root; origin 0 0). Each tween names all
     three in its from and its to, starts where the one before it ended, and none overlap: any frame
     is the same whichever way the film is sought. */
  const F = (f, y = f.y) => ({ x: f.x, y, scale: f.s });
  const riseD = T.qShrink + 0.15;
  /* 04 -> 05: rising behind the closed iris, nearly in place when it opens (8.19); then the slow push. */
  tl.fromTo(R, F(HERO, 760), { ...F(HERO), duration: 1.05, ease: "power3.out" }, T.riseAt);
  tl.fromTo(R, F(HERO), { ...F(H5), duration: T.dropAt - 0.04 - (T.riseAt + 1.06), ease: "sine.inOut", ...ir }, T.riseAt + 1.06);
  /* 06: the window drops away as the row opens; the words land on clean mist. */
  tl.fromTo(R, F(H5), { ...F(H5, 1260), duration: 0.32, ease: "power3.in", ...ir }, T.dropAt);
  /* unseen, below the frame: the framing row 07 rises from */
  tl.fromTo(R, F(H5, 1260), { ...F(PARK), duration: 0.01, ease: "none", ...ir }, T.dropAt + 1.2);
  /* 07: it rises only behind the shrinking question, pushed in on the home tiles. */
  tl.fromTo(R, F(PARK), { ...F(RENT_PUSH), duration: 0.4, ease: "power3.out", ...ir }, riseD);
  /* 07 -> 08: out to the results, as the search page comes up. */
  tl.fromTo(R, F(RENT_PUSH), { ...F(LEFT08), duration: 0.6, ease: "glide", ...ir }, T.toSearch + 0.06);
  /* 08 -> 09: the push onto the drawer. */
  tl.fromTo(R, F(LEFT08), { ...F(PUSHF), duration: 0.62, ease: "power3.inOut", ...ir }, T.villasPush);
  /* 09 -> 10: back out to the lowered hero framing first; the listing comes in once it is there. */
  tl.fromTo(R, F(PUSHF), { ...F(LOW), duration: T.open - (T.need + 0.1), ease: "power3.inOut", ...ir }, T.need + 0.1);
  tl.fromTo(R, F(LOW), { ...F(LOW_REST), duration: T.call - T.movein, ease: "sine.inOut", ...ir }, T.movein);

  /* ================= the pages ================= */
  const page = (id, { bg = "#f3f4f1" } = {}) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", overflow: "hidden", background: bg, visibility: "hidden" } }, win.content);
    const img = id ? ctx.img(ctx.src.capture(id), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, el) : null;
    return { el, img, id };
  };
  const during = (el, ranges) => ctx.onFrame((t) => {
    const on = ranges.some(([a, b]) => t >= a && t < b);
    if ((el.style.visibility !== "hidden") !== on) el.style.visibility = on ? "inherit" : "hidden";
  });
  /** A navigation: the new page fades up over the old one. */
  const go = (to, t, dur = 0.26) => tl.fromTo(to.el, { opacity: 0 }, { opacity: 1, duration: dur, ease: "power1.inOut" }, t);

  const home1 = page("d-home-light");
  const stay = page("d-stay-lt");
  const stays = page("d-stays-light");
  const rest = page("d-restaurant-lt");
  const search = page("d-search-full-lt");
  const filt = page(null);
  const listing = page("d-listing-cost-lt");
  during(home1.el, [[T.riseAt - 0.05, T.hotels + 0.3], [T.dropAt + 1.2, T.toSearch + 0.3]]);
  during(stay.el, [[T.hotels, T.shortlets + 0.3]]);
  during(stays.el, [[T.shortlets, T.restaurants + 0.3]]);
  during(rest.el, [[T.restaurants, T.dropAt + 0.5]]);
  during(search.el, [[T.toSearch, T.filterPress + 0.5]]);
  during(filt.el, [[T.filterPress + 0.02, T.open + 0.3]]);
  during(listing.el, [[T.open, END + 1]]);
  go(stay, T.hotels);
  go(stays, T.shortlets);
  go(rest, T.restaurants);
  go(search, T.toSearch);
  go(listing, T.open, 0.22);

  /* ================= row 06: one app, one account ================= */
  const wordsScene = ctx.scene("a-words", T.dropAt, T.pill1 + 0.3, { z: Z.words });
  /* One group, drifting slowly (1.00 -> 1.025) through the row, so the hold never freezes. */
  const ROW6 = { x: 960, y: 480 };
  const group6 = ctx.el("div", { class: "fill", style: { transformOrigin: `${ROW6.x}px ${ROW6.y}px` } }, wordsScene);
  const drift6 = (t) => 1 + 0.025 * ctx.ease("drift")(ctx.progress(t, T.oneAppIn, T.row6Out + 0.24));
  ctx.onFrame((t) => { group6.style.transform = `scale(${drift6(t).toFixed(5)})`; });
  const bigLine = (parts, size, { left = null, right = null, top }, parent) => {
    const el = ctx.el("div", {
      class: "abs",
      style: {
        top: `${top}px`, ...(left != null ? { left: `${left}px` } : {}), ...(right != null ? { right: `${right}px` } : {}), whiteSpace: "nowrap",
        font: `700 ${size}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color: NAVY,
      },
    }, parent);
    const spans = parts.map(([t, blue]) => ctx.el("span", { text: t, style: blue ? { color: ELECTRIC } : {} }, el));
    return { el, spans };
  };
  const sA = fitSize("One app.", "700 {}px Poppins", 150, 900, -0.035);
  const sB = fitSize("One account.", "700 {}px Poppins", 142, 1100, -0.035);
  const yA = 230;
  const yB = yA + Math.round(sA * 1.02);
  const oneApp = bigLine([["One", true], [" app.", false]], sA, { left: 400, top: yA }, group6).el;
  const oneAcc = bigLine([["One", true], [" account.", false]], sB, { right: W - 1520, top: yB }, group6).el;
  oneApp.style.transformOrigin = "0% 60%";
  oneAcc.style.transformOrigin = "100% 60%";
  tl.fromTo(oneApp, { x: -180, opacity: 0, rotation: -3 }, { x: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "land" }, T.oneAppIn);
  tl.fromTo(oneAcc, { x: 180, opacity: 0, rotation: 3 }, { x: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "land" }, T.oneAccIn);
  /* All three leave together, 0.46 s before row 07's question. */
  tl.fromTo(oneApp, { x: 0 }, { x: -260, duration: 0.24, ease: "power2.in", ...ir }, T.row6Out);
  tl.fromTo(oneApp, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power1.out", ...ir }, T.row6Out + 0.04);
  tl.fromTo(oneAcc, { x: 0 }, { x: 260, duration: 0.24, ease: "power2.in", ...ir }, T.row6Out);
  tl.fromTo(oneAcc, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power1.out", ...ir }, T.row6Out + 0.04);

  /* The one body: the inbox's real Property | Stays tabs (d-messages-lt), two worlds in one app. It
     rises from below once "One app." is still, and leaves with the words. */
  const bodies = ctx.scene("a-bodies", T.dropAt, T.row6Out + 0.4, { z: Z.bodies });
  const TABS = { x: 820, y: 382, w: 1780, h: 80 }; // capture px
  const tabs = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${TABS.w}px`, height: `${TABS.h}px`, transformOrigin: "0 0", borderRadius: "40px", overflow: "hidden", visibility: "hidden" } }, bodies);
  await cropCanvas(ctx, ctx.src.capture("d-messages-lt"), TABS, { parent: tabs });
  ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", boxShadow: SHADOW } }, tabs);
  const tabsTo = { cx: 960, cy: yB + Math.round(sB * 1.0) + 96, s: 0.75 };
  const tabsT = { up0: T.tabsUp, up1: T.tabsUp + 0.5, down0: T.row6Out, down1: T.row6Out + 0.28 };
  ctx.onFrame((t) => {
    const on = t >= tabsT.up0 && t < tabsT.down1;
    tabs.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const up = ctx.ease("back.out(1.2)")(ctx.progress(t, tabsT.up0, tabsT.up1));
    const down = ctx.ease("power2.in")(ctx.progress(t, tabsT.down0, tabsT.down1));
    const d = drift6(t);
    const cy = tabsTo.cy + 220 * (1 - up) + 200 * down;
    const pos = { x: ROW6.x + (tabsTo.cx - ROW6.x) * d, y: ROW6.y + (cy - ROW6.y) * d };
    placeOnQuad(tabs, TABS.w, TABS.h, rectQuad(pos.x, pos.y, TABS.w * tabsTo.s * d, TABS.h * tabsTo.s * d, 0));
    tabs.style.opacity = String(Math.min(up * 1.6, 1) * (1 - down));
  });

  /* ================= row 07: "Looking for a home?", as one object, into the pill ================= */
  const sQ = fitSize("Looking for a home?", "700 {}px Poppins", 132, 1560, -0.035);
  const QTOP = 420;
  const qLine = ctx.el("div", {
    class: "abs",
    style: { left: "0px", right: "0px", top: `${QTOP}px`, textAlign: "center", whiteSpace: "nowrap", font: `700 ${sQ}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color: NAVY, opacity: "0" },
  }, wordsScene);
  ctx.el("span", { text: "Looking for a " }, qLine);
  const qHome = ctx.el("span", { text: "home" }, qLine);
  ctx.el("span", { text: "?" }, qLine);
  /* "home" turns blue on the word */
  tl.fromTo(qHome, { color: NAVY }, { color: ELECTRIC, duration: 0.16, ease: "power1.out", ...ir }, T.home);
  const qcY = QTOP + sQ * 0.55;
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  qLine.style.transformOrigin = `960px ${sQ * 0.55}px`;
  tl.fromTo(qLine, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: T.qRest - T.qIn, ease: "land" }, T.qIn);
  /* at rest from T.qRest to T.qShrink, then scaled as one into the pill by 16.21 */
  tl.fromTo(qLine, { y: 0, scale: 1 }, { y: pillY - qcY, scale: 0.24, duration: T.pill1 - T.qShrink, ease: "power2.inOut", ...ir }, T.qShrink);
  tl.fromTo(qLine, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "power1.in", ...ir }, T.pill1 - 0.08);

  /* ================= the pointer ================= */
  /* It comes in only once the window is at rest, and clicks beside what it names, never on it. */
  const pointerScene = ctx.scene("a-pointer", T.qShrink, T.need + 0.7, { z: Z.pointer });
  const pointer = orb(ctx, pointerScene);
  const rentAt = cssToStage(RENT_PUSH, 790, 600);
  tl.fromTo(pointer, { x: 2000, y: 900 }, { x: rentAt.x, y: rentAt.y, duration: 0.26, ease: "glide" }, T.rentPress - 0.3);
  pressAt(ctx, pointer, T.rentPress, { parent: pointerScene, x: rentAt.x, y: rentAt.y });
  /* It leaves by the left edge (the map is about to draw on the right) and comes back that way. */
  tl.to(pointer, { x: -120, y: 520, duration: 0.45, ease: "power2.in" }, T.toSearch + 0.02);

  /* ================= row 08: the results; Nigeria draws at the right ================= */
  const mapScene = ctx.scene("a-map", T.rows[7] - 0.2, T.filterPress + 0.45, { z: Z.map });
  const MAP = { x: 1390, y: 290, w: 440 };
  const ng = await nigeriaOutline(MAP);
  const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${W}px`, height: `${H}px` } }, mapScene);
  svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${ng.d}" stroke="${ELECTRIC}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
  const path = svg.querySelector("path");
  tl.fromTo(path, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.05, ease: "power2.inOut" }, T.rows[7] - 0.1);
  tl.to(svg, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.filterPress);
  /* dots only (v3.2: a label must stay readable for 1.2 s, and the last city lights 0.1 s before the drawer) */
  CITIES.forEach((c, k) => {
    const pt = ng.proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${pt.x - 9}px`, top: `${pt.y - 9}px`, width: "18px", height: "18px", borderRadius: "50%", background: ELECTRIC, boxShadow: "0 0 0 6px rgb(0 105 254 / 0.16)" } }, svg);
    tl.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)" }, T.dots[k]);
  });

  /* "More" (the filters), clicked at 18.30, at its lower right. */
  const moreAt = cssToStage(LEFT08, 768, 124);
  tl.fromTo(pointer, { x: -120, y: 520 }, { x: moreAt.x, y: moreAt.y, duration: 0.55, ease: "glide", ...ir }, T.filterPress - 0.62);
  pressAt(ctx, pointer, T.filterPress, { parent: pointerScene, x: moreAt.x, y: moreAt.y });

  /* ================= row 09: the filters ================= */
  /* The page behind blurs (the capture's own backdrop), and the drawer slides in from the right. */
  const DRAWER = 993; // css x where the drawer starts
  const backOff = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", overflow: "hidden" } }, filt.el);
  ctx.img(ctx.src.capture("d-filters-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px", clipPath: `inset(0px ${1440 - DRAWER}px 0px 0px)` } }, backOff);
  const drawer = ctx.el("div", { class: "abs", style: { left: `${DRAWER}px`, top: "0px", width: `${1440 - DRAWER}px`, height: "900px", overflow: "hidden" } }, filt.el);
  const DBOX = { x: 2 * DRAWER, y: 0, w: 2880 - 2 * DRAWER, h: 1800 };
  await cropCanvas(ctx, ctx.src.capture("d-filters-lt"), DBOX, { parent: drawer, style: { width: `${1440 - DRAWER}px`, height: "900px" } });
  const drawerOn = await cropCanvas(ctx, ctx.src.capture("d-filters-villas-lt"), DBOX, { parent: drawer, style: { width: `${1440 - DRAWER}px`, height: "900px" } });
  tl.fromTo(filt.el, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: "power1.out" }, T.filterPress + 0.02);
  tl.fromTo(drawer, { x: 1440 - DRAWER }, { x: 0, duration: 0.44, ease: "power3.out" }, T.filterPress + 0.02);
  tl.fromTo(drawerOn, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "power1.out" }, T.exactly + 0.02);

  /* Villas (css 1320-1405 x 140-222), clicked at its lower right, clear of the icon and the label. */
  const villasAt = cssToStage(PUSHF, 1396, 214);
  tl.to(pointer, { x: villasAt.x, y: villasAt.y, duration: 0.6, ease: "glide" }, T.villasPush + 0.2);
  pressAt(ctx, pointer, T.exactly, { parent: pointerScene, x: villasAt.x, y: villasAt.y });

  /* The Apply button, echoed large in the room beside the drawer (the drawer's own Apply is below the
     frame at this push, so it is never shown twice), its count rolling 52 -> 3. */
  const grad = "linear-gradient(180deg, #4491ff 0%, #1a74ff 4%, #0b6cff 34%, #0065fb 66%, #015eec 100%)";
  const EW = 560;
  const EH = 150;
  const room = { x0: PUSHF.x + 1440 * PUSHF.s, x1: W };
  const echoBox = { x: (room.x0 + room.x1) / 2 - EW / 2, y: 447 };
  const echo = ctx.el("div", {
    class: "abs",
    style: {
      left: `${echoBox.x}px`, top: `${echoBox.y}px`, width: `${EW}px`, height: `${EH}px`, borderRadius: "34px", background: grad, boxShadow: SHADOW,
      display: "flex", alignItems: "center", justifyContent: "center", font: "600 50px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em", opacity: 0,
    },
  }, pointerScene);
  echo.style.zIndex = "1";
  ctx.el("span", { text: "Apply (", style: { whiteSpace: "pre" } }, echo);
  const w52 = measure("52", "600 50px Inter", -0.01);
  const w3 = measure("3", "600 50px Inter", -0.01);
  const count = ctx.el("span", { style: { position: "relative", display: "inline-block", height: "1.12em", overflow: "hidden", width: `${w52}px` } }, echo);
  const c52 = ctx.el("span", { text: "52", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  const c3 = ctx.el("span", { text: "3", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  ctx.el("span", { text: ")" }, echo);
  tl.fromTo(echo, { opacity: 0, scale: 0.9, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" }, T.filterPress + 0.62);
  tl.fromTo(c52, { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, duration: 0.3, ease: "power3.in" }, T.countRoll);
  tl.fromTo(c3, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.42, ease: "back.out(2)" }, T.countRoll + 0.22);
  tl.fromTo(count, { width: w52 }, { width: w3, duration: 0.3, ease: "power3.inOut" }, T.countRoll + 0.18);
  const applyAt = { x: echoBox.x + EW / 2 + 178, y: echoBox.y + EH / 2 + 18 };
  tl.to(pointer, { x: applyAt.x, y: applyAt.y, duration: 0.55, ease: "glide" }, T.need - 0.66);
  pressAt(ctx, pointer, T.need, { parent: pointerScene, x: applyAt.x, y: applyAt.y });
  tl.fromTo(echo, { scale: 1 }, { scale: 0.96, duration: 0.08, ease: "power2.out", ...ir }, T.need - 0.04);
  tl.fromTo(echo, { scale: 0.96, opacity: 1, y: 0 }, { scale: 0.9, opacity: 0, y: 20, duration: 0.28, ease: "power2.in", ...ir }, T.need + 0.1);
  tl.to(pointer, { x: 2000, y: 1000, opacity: 0, duration: 0.4, ease: "power2.in" }, T.need + 0.16);

  /* ================= row 10: the Maitama villa's costs, straight in ================= */
  /* v3.1: the move-in total is never readable before 28.87. d-listing-cost-lt opens on "What you will
     actually pay" once the window is back at the lowered framing, where the total card (css y 710)
     sits below the frame; the drift only takes it further down. */

  return { win, R, listing, pointer, pointerScene, mistScene, winScene };
}
