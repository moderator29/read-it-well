/**
 * Mobile rows 05-10 (8.19-23.08): the phone in daylight (STORYBOARD v3.2).
 * One phone size throughout (h 1400, layout.js PHONE_HERO / PHONE_HIGH); a push
 * onto a control goes beyond it and returns.
 *   05  the phone rises to PHONE_HERO behind the closed iris; its screen swaps
 *       on each word.
 *   06  the phone drops away; "One app." lands on clean mist, the Property |
 *       Stays tabs of messages-lt rise under it as the one body, then "One
 *       account."; all three leave together before row 07.
 *   07  the question lands as one object, rests, and becomes the pill; the
 *       phone rises pushed in on the home screen's tiles; Rent is pressed.
 *   08  search across Nigeria: the phone low in the frame (it runs off the
 *       bottom), the outline drawn above it, the cities lighting in time.
 *   09  a push onto the Villas tile for its press; the pull back to
 *       PHONE_HIGH, where the phone's own Apply counts 52 -> 3; Apply on "need".
 *   10  PHONE_HIGH; the cost section opens straight on "see", scrolled so its
 *       six lines sit above the captions; a slow drift through the hold.
 * Nothing is lifted off the phone here, so no UI is ever shown twice, and the
 * pointer never covers what it presses.
 */
import { LAYOUT } from "./layout.js";
import { phone } from "../engine/phone.js";
import { orb } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW, MIST, displayToStage, rectQuad, placeOnQuad, nigeriaOutline, CITIES, pressAt, rippleAt, fitSize, measure, cropCanvas, stayTabs } from "./a-common.js";

const W = 1080;
const H = 1920;
const L = LAYOUT.mobile;
/* v3.2: one phone size for the whole film. HERO: display y 394-1766; HIGH: 264-1636 (the pill on
   its status bar). */
export const HERO = { ...L.PHONE_HERO };
export const HIGH = { ...L.PHONE_HIGH };
/* Row 07's push onto the home screen's tiles (1.29x; display top at y 336, just under the pill;
   the Rent tile at y 1468). */
const PUSH_TOP = { cx: 540, cy: 1218, height: 1800 };
/* Row 08 (v3.3): the phone stays at PHONE_HERO; the Nigeria outline draws large behind its top, faint. */
const LOW08 = { ...HERO };
/* Row 09's push onto the Property type grid (1.5x; display top at y 289, so the pill sits on the
   status bar; the Villas tile at y 1007). */
const VILLAS_PUSH = { cx: 510, cy: 1318, height: 2100 };
/* ...and its slow drift through the press (1.4%, about the display's top), so the hold is never still */
const VILLAS_DRIFT = { cx: 510, cy: 1318 + 15, height: 2130 };
/* Row 09 after the press: the one size, raised so the Apply button ends above y 1500 (v3.3: what the
   voice names sits above the captions); the pill is held off meanwhile (the sheet's title passes under it). */
const SHEET = { cx: 540, cy: 830, height: HERO.height };
/* Row 10 (v3.3): the one size at PHONE_HIGH, the cost section scrolled up (ROW10_SCROLL) so its six
   lines sit at y 610-1360, above the captions (1520); a slow 12 px rise through the hold. */
export const ROW10_SCROLL = 0;
/* Round 4: raised so the sticky bar's button ends at the caption band (1520) and the title clears the pill, the page
   unscrolled: its six lines at y 550-1310, its title just under the pill. */
const ROW10 = { cx: 540, cy: 838, height: HIGH.height };
export const PUSH_REST = { cx: 540, cy: ROW10.cy - 12, height: HIGH.height + 24 };
/* Off frame, between the drop (row 06) and the rise (row 07): the pose is re-set here unseen. */
const PARK = { cx: 540, cy: 3200, height: PUSH_TOP.height };
const SB = 186; // the status bar in every display
const Z = { mist: 3, map: 4, phone: 5, bodies: 7, words: 8, pointer: 12 };

export async function buildProductMobile(ctx, T, open) {
  const { tl } = ctx;
  const END = T.end;
  const flat = { rx: 0, ry: 0, rz: 0, fov: 24 };
  const pose = (p) => ({ ...p, ...flat, ry: p.ry ?? 0 });

  /* ================= the ground and the phone ================= */
  /* Both start before the iris opens (8.19): clipDay keeps them hidden until it does. */
  const mistScene = ctx.scene("a-mist", T.riseAt - 0.05, END, { z: Z.mist });
  const mist = ctx.el("div", { class: "fill", style: { background: MIST } }, mistScene);
  open.clipDay(mist);

  const phoneScene = ctx.scene("a-phone", T.riseAt - 0.05, END, { z: Z.phone });
  const phoneWrap = ctx.el("div", { class: "fill" }, phoneScene);
  open.clipDay(phoneWrap);
  const p = phone(ctx, { model: "island", parent: phoneWrap, env: "light", edge: "#f3f4f1" });
  await Promise.all(ctx.pending ?? []);
  /* The engine maps the display with a matrix3d: a composited layer, whose raster scale Chrome may
     keep from an earlier frame, so a frame's pixels could depend on the order frames are rendered.
     Putting the display back in its place after each seek (this hook runs after the phone's own)
     gives Chrome a fresh layer, rastered for this frame alone. */
  let placed = "";
  ctx.onFrame(() => {
    const fr = p.frame;
    if (!fr || !fr.parentNode || fr.style.visibility === "hidden") return;
    /* only when the mapping changed: a layer built for this very mapping needs no rebuilding */
    const key = `${fr.style.transform}|${fr.style.clipPath}`;
    if (key === placed) return;
    placed = key;
    fr.parentNode.insertBefore(fr, fr.nextSibling);
  });
  const RISE = HERO.cy + 900;
  Object.assign(p.pose, { ...HERO, ...flat, cy: RISE, rx: 16, ry: -6, opacity: 1 });
  const P = p.pose;

  /* The pose, row by row (GSAP on p.pose only). Each tween names the same properties in its from and
     its to (GSAP ignores a from-only property on a plain object), each starts where the one before it
     on that property ended, none overlap, and only the first renders at build: any frame is the same
     whichever way the film is sought. */
  const ir = { immediateRender: false };
  /* 04 -> 05: rising behind the closed iris, nearly in place when it opens (8.19). */
  tl.fromTo(P, { cy: RISE, rx: 16 }, { cy: HERO.cy, rx: 0, duration: 1.05, ease: "power3.out" }, T.riseAt);
  tl.fromTo(P, { ry: -6 }, { ry: 6, duration: T.dropAt - T.homes, ease: "sine.inOut", ...ir }, T.homes);
  /* 06: the phone drops away as the row opens; the words land on clean mist. */
  tl.fromTo(P, { cy: HERO.cy, rx: 0, ry: 6 }, { cy: 2800, rx: 10, ry: 0, duration: 0.32, ease: "power3.in", ...ir }, T.dropAt);
  /* unseen, far below the frame: the pose row 07 rises from */
  tl.fromTo(P, { cy: 2800, rx: 10, height: HERO.height }, { cy: PARK.cy, rx: 12, height: PARK.height, duration: 0.01, ease: "none", ...ir }, T.dropAt + 1.2);
  /* 07: it rises only behind the shrinking question, pushed in on the home screen's tiles. */
  tl.fromTo(P, { cy: PARK.cy, rx: 12 }, { cy: PUSH_TOP.cy, rx: 0, duration: 0.38, ease: "power3.out", ...ir }, T.riseB);
  /* 07 -> 08: back to the one size, low in the frame, as the search page slides in. */
  tl.fromTo(P, { cx: PUSH_TOP.cx, cy: PUSH_TOP.cy, height: PUSH_TOP.height }, { cx: LOW08.cx, cy: LOW08.cy, height: LOW08.height, duration: 0.6, ease: "glide", ...ir }, T.toSearch + 0.06);
  /* 08 -> 09: the sheet rises and the camera pushes onto the Property type grid. */
  tl.fromTo(P, { cx: LOW08.cx, cy: LOW08.cy, height: LOW08.height }, { cx: VILLAS_PUSH.cx, cy: VILLAS_PUSH.cy, height: VILLAS_PUSH.height, duration: 0.6, ease: "power2.inOut", ...ir }, T.villasPush);
  /* 09: after the Villas press, back to the one size (PHONE_HIGH): the whole sheet, Apply at its foot. */
  tl.fromTo(P, { cy: VILLAS_PUSH.cy, height: VILLAS_PUSH.height }, { cy: VILLAS_DRIFT.cy, height: VILLAS_DRIFT.height, duration: T.pullBack - (T.villasPush + 0.6), ease: "sine.inOut", ...ir }, T.villasPush + 0.6);
  tl.fromTo(P, { cx: VILLAS_DRIFT.cx, cy: VILLAS_DRIFT.cy, height: VILLAS_DRIFT.height }, { cx: SHEET.cx, cy: SHEET.cy, height: SHEET.height, duration: 0.45, ease: "power2.inOut", ...ir }, T.pullBack);
  ctx.hidePill(T.pullBack, T.open + 0.3);
  /* 10: down to PHONE_HIGH as the cost section opens */
  tl.fromTo(P, { cx: SHEET.cx, cy: SHEET.cy, height: SHEET.height }, { cx: ROW10.cx, cy: ROW10.cy, height: ROW10.height, duration: 0.55, ease: "power2.inOut", ...ir }, T.need + 0.04);
  /* 10: the phone stays at PHONE_HIGH for the costs; a slow rise through the hold. */
  tl.fromTo(P, { cy: ROW10.cy, height: ROW10.height }, { cy: PUSH_REST.cy, height: PUSH_REST.height, duration: T.call - (T.need + 0.6), ease: "sine.inOut", ...ir }, T.need + 0.6);

  /* ================= the screens (under the glass) ================= */
  /** A page: a full display; its own status bar is drawn fixed on top (a slide never moves it). */
  const page = (id, { bg = "#fff" } = {}) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", background: bg, visibility: "hidden" } }, p.screen);
    const img = id ? ctx.img(ctx.src.display(id), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, el) : null;
    return { el, img, id };
  };
  const bars = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: `${SB}px`, overflow: "hidden", zIndex: "40" } }, p.screen);
  const barOf = async (id) => {
    const b = ctx.el("div", { class: "abs", style: { inset: "0px", visibility: "hidden" } }, bars);
    await cropCanvas(ctx, ctx.src.display(id), { x: 0, y: 0, w: 1320, h: SB }, { parent: b });
    return b;
  };
  /** Visibility by time (a frame hook: no history). */
  const during = (el, ranges) => ctx.onFrame((t) => {
    const on = ranges.some(([a, b]) => t >= a && t < b);
    if ((el.style.visibility !== "hidden") !== on) el.style.visibility = on ? "inherit" : "hidden";
  });
  /** An iOS push: `to` slides in from the right over `from`, which parts to the left and dims. */
  const slide = (from, to, t, dur = 0.42) => {
    tl.fromTo(to.el, { x: 1320 }, { x: 0, duration: dur, ease: "power3.out" }, t);
    tl.fromTo(from.el, { x: 0, filter: "brightness(1)" }, { x: -420, filter: "brightness(0.92)", duration: dur, ease: "power3.out" }, t);
  };

  const home1 = page("home-light");
  const home2 = home1; // one page, two visits
  const stay = page("stay-light");
  const stays = page("stays-light");
  const rest = page("restaurant-light");
  const search = page("search-lt", { bg: "#f3f4f1" });
  const sheet = page(null, { bg: "transparent" });
  const listing = page(null, { bg: "#f3f4f1" });
  const homeBack = T.rows[6];
  during(home1.el, [[T.riseAt - 0.05, T.hotels + 0.45], [homeBack, T.toSearch + 0.45]]);
  during(stay.el, [[T.hotels, T.shortlets + 0.45]]);
  during(stays.el, [[T.shortlets, T.restaurants + 0.45]]);
  during(rest.el, [[T.restaurants, T.dropAt + 0.5]]);
  during(search.el, [[T.toSearch, T.open + 0.4]]);
  during(sheet.el, [[T.filterPress + 0.02, T.open + 0.4]]);
  during(listing.el, [[T.open, END + 1]]);
  slide(home1, stay, T.hotels);
  slide(stay, stays, T.shortlets);
  slide(stays, rest, T.restaurants);
  /* The home page comes back for row 07: put it back in place while the phone is away (a fromTo from
     where the first slide left it, so the chain holds whichever way the film is sought). */
  tl.fromTo(home1.el, { x: -420, filter: "brightness(0.92)" }, { x: 0, filter: "brightness(1)", duration: 0.01, ease: "none", ...ir }, homeBack - 0.2);
  slide(home2, search, T.toSearch);
  /* The status bars: always the current page's, never sliding. */
  during(await barOf("home-light"), [[T.riseAt - 0.05, T.hotels], [homeBack, T.toSearch]]);
  during(await barOf("stay-light"), [[T.hotels, T.shortlets]]);
  during(await barOf("stays-light"), [[T.shortlets, T.restaurants]]);
  during(await barOf("restaurant-light"), [[T.restaurants, T.dropAt + 0.5]]);
  during(await barOf("search-lt"), [[T.toSearch, T.filterPress + 0.02]]);
  during(await barOf("filters-lt"), [[T.filterPress + 0.02, T.open]]);
  during(await barOf("listing-cost-light"), [[T.open, END + 1]]);

  /* ================= row 06: one app, one account ================= */
  const wordsScene = ctx.scene("a-words", T.dropAt, T.qDone + 0.1, { z: Z.words });
  const WD = L.WORDS; // x 44, y 520, w 896, h 520
  const inner = WD.w - 56;
  const bigLine = (parts, size, { left = null, right = null, top }, parent = wordsScene) => {
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
  /* One group, drifting slowly (1.00 -> 1.025) through the row, so the hold never freezes. */
  const ROW6 = { x: 540, y: 840 };
  const group6 = ctx.el("div", { class: "fill", style: { transformOrigin: `${ROW6.x}px ${ROW6.y}px` } }, wordsScene);
  const drift6 = (t) => 1 + 0.025 * ctx.ease("drift")(ctx.progress(t, T.oneAppIn, T.row6Out + 0.24));
  ctx.onFrame((t) => { group6.style.transform = `scale(${drift6(t).toFixed(5)})`; });
  const sA = fitSize("One app.", "700 {}px Poppins", 132, inner, -0.035);
  const sB = fitSize("One account.", "700 {}px Poppins", 124, inner, -0.035);
  /* the three sit centred in the frame (the captions are off here) */
  /* round 4: centred optically (words at y ~700 / ~840, the switch at 980), held in place */
  const yA = 627;
  const yB = yA + Math.round(sA * 1.02);
  const oneApp = bigLine([["One", true], [" app.", false]], sA, { left: WD.x + 28, top: yA }, group6).el;
  const oneAcc = bigLine([["One", true], [" account.", false]], sB, { right: W - (WD.x + WD.w - 28), top: yB }, group6).el;
  oneApp.style.transformOrigin = "0% 60%";
  oneAcc.style.transformOrigin = "100% 60%";
  tl.fromTo(oneApp, { x: -150, opacity: 0, rotation: -4 }, { x: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "land" }, T.oneAppIn);
  tl.fromTo(oneAcc, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: "land" }, T.oneAccIn);
  /* All three cut out on one frame at 14.6, as row 07's question cuts in (round 5). */
  tl.fromTo(oneApp, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: "none", ...ir }, T.row6Out);
  tl.fromTo(oneAcc, { opacity: 1 }, { opacity: 0, duration: 0.01, ease: "none", ...ir }, T.row6Out);

  /* The one body: the inbox's real Property | Stays tabs (messages-lt), two worlds in one app. It
     rises from below once "One app." is still, and leaves with the words. */
  const bodies = ctx.scene("a-bodies", T.dropAt, T.row6Out + 0.4, { z: Z.bodies });
  const TABS = { w: 620, h: 86 };
  const tabs = stayTabs(ctx, bodies, { w: TABS.w, h: TABS.h, font: 33 }).el;
  const tabsTo = { cx: 540, cy: 980, s: 1 };
  const tabsT = { up0: T.tabsUp, up1: T.tabsUp + 0.5, down0: T.row6Out - 0.001, down1: T.row6Out };
  ctx.onFrame((t) => {
    const on = t >= tabsT.up0 && t < tabsT.down1;
    tabs.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const up = ctx.ease("back.out(1.2)")(ctx.progress(t, tabsT.up0, tabsT.up1));
    const down = ctx.ease("power2.in")(ctx.progress(t, tabsT.down0, tabsT.down1));
    const d = drift6(t);
    const cy = tabsTo.cy + 40 * (1 - up) + 40 * down;
    const pos = { x: ROW6.x + (tabsTo.cx - ROW6.x) * d, y: ROW6.y + (cy - ROW6.y) * d };
    placeOnQuad(tabs, TABS.w, TABS.h, rectQuad(pos.x, pos.y, TABS.w * tabsTo.s * d, TABS.h * tabsTo.s * d, 0));
    tabs.style.opacity = String(Math.min(up * 1.6, 1) * (1 - down));
  });

  /* ================= row 07: the question, as one object, into the pill ================= */
  const sL = fitSize("Looking for", "700 {}px Poppins", 126, inner, -0.035);
  const sH = fitSize("a home?", "700 {}px Poppins", 132, inner, -0.035);
  const y1 = WD.y + 40;
  const y2 = y1 + Math.round(sL * 1.04);
  const qGroup = ctx.el("div", { class: "fill", style: { opacity: "0" } }, wordsScene);
  bigLine([["Looking for", false]], sL, { left: WD.x + 28, top: y1 }, qGroup);
  const q2 = bigLine([["a ", false], ["home", false], ["?", false]], sH, { right: W - (WD.x + WD.w - 28), top: y2 }, qGroup);
  /* "home" turns blue on the word */
  tl.fromTo(q2.spans[1], { color: NAVY }, { color: ELECTRIC, duration: 0.16, ease: "power1.out", ...ir }, T.home);
  /* the group's centre, and the pill's */
  const qc = { x: 540, y: (y1 + y2 + sH) / 2 };
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  qGroup.style.transformOrigin = `${qc.x}px ${qc.y}px`;
  tl.fromTo(qGroup, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: T.qRest - T.qIn, ease: "land" }, T.qIn);
  /* at rest from T.qRest to T.qShrink, then scaled as one into the pill by 16.21 */
  /* a slow drift through the rest (1.5%/s), so the reading hold is never still */
  tl.fromTo(qGroup, { scale: 1 }, { scale: 1.02, duration: T.qShrink - T.qRest, ease: "none", ...ir }, T.qRest);
  tl.fromTo(qGroup, { y: 0, scale: 1.02 }, { y: pillY - qc.y, scale: 0.26, duration: T.qDone - T.qShrink, ease: "power2.inOut", ...ir }, T.qShrink);
  tl.fromTo(qGroup, { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "power1.in", ...ir }, T.qDone - 0.08);

  /* ================= the pointer (hovering above the glass) ================= */
  /* It comes in only once the phone is at rest, and presses beside what it names, never on it. */
  const pointerScene = ctx.scene("a-pointer", T.riseB, T.need + 0.7, { z: Z.pointer });
  const pointer = orb(ctx, pointerScene);
  const RENT_D = { x: 524, y: 1840 };
  const rentAt = displayToStage(pose(PUSH_TOP), W, H, RENT_D.x + 105, RENT_D.y - 20);
  tl.fromTo(pointer, { x: 1160, y: 1560 }, { x: rentAt.x, y: rentAt.y, duration: 0.28, ease: "glide" }, T.rentPress - 0.3);
  pressAt(ctx, pointer, T.rentPress, { parent: pointerScene, x: rentAt.x, y: rentAt.y });
  rippleAt(ctx, home2.el, { x: RENT_D.x, y: RENT_D.y, t: T.rentPress, size: 300 });
  tl.to(pointer, { x: 1160, y: 1080, duration: 0.45, ease: "power2.in" }, T.toSearch + 0.02);

  /* ================= row 08: search across Nigeria ================= */
  /* The page scrolls: the whole web view (search-lt-full, 880 wide) moves up under the fixed status bar and nav. */
  const SCROLL = 210;
  const web = ctx.el("div", { class: "abs", style: { left: "0px", top: `${SB}px`, width: "1320px", height: `${2868 - SB}px`, overflow: "hidden", background: "#f3f4f1" } }, search.el);
  /* the whole-page capture (880 wide, 2x), cropped once to the part the scroll can show */
  const fullH = Math.ceil((2868 - SB + 260) / 1.5);
  const full = await cropCanvas(ctx, ctx.src.capture("search-lt-full"), { x: 0, y: 0, w: 880, h: fullH }, { parent: web, style: { width: "1320px", height: `${fullH * 1.5}px` } });
  const NAV = 2440;
  await cropCanvas(ctx, ctx.src.display("search-lt"), { x: 0, y: NAV, w: 1320, h: 2868 - NAV }, { parent: search.el, style: { top: `${NAV}px` } });
  const scrollT = { t0: T.search - 0.3, t1: T.nigeria5 + 0.2 };
  tl.fromTo(full, { y: 0 }, { y: -SCROLL, duration: scrollT.t1 - scrollT.t0, ease: "power2.inOut" }, scrollT.t0);

  /* The Nigeria outline, large and faint behind the top of the phone (v3.3: the phone keeps its size),
     drawn as it is said; the five cities light in time (those clear of the phone show: Kano above it,
     Lagos and Ibadan at its left). Dots only (a label must stay readable for 1.2 s). */
  const mapScene = ctx.scene("a-map", T.rows[7] - 0.2, T.filterPress + 0.45, { z: Z.map });
  const MAP = { x: 60, y: 100, w: 960 };
  const ng = await nigeriaOutline(MAP);
  const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${W}px`, height: `${H}px` } }, mapScene);
  svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${ng.d}" stroke="${ELECTRIC}" stroke-opacity="0.3" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
  const path = svg.querySelector("path");
  tl.fromTo(path, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.05, ease: "power2.inOut" }, T.rows[7] - 0.1);
  tl.to(svg, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.filterPress);
  CITIES.forEach((c, k) => {
    const pt = ng.proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${pt.x - 9}px`, top: `${pt.y - 9}px`, width: "18px", height: "18px", borderRadius: "50%", background: ELECTRIC, boxShadow: "0 0 0 6px rgb(0 105 254 / 0.16)" } }, svg);
    tl.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)" }, T.dots[k]);
  });

  /* The filter button, pressed at 18.30 (display px, on the scrolled page); the pointer sits just left of it. */
  const FILTER_D = { x: 1195, y: 481 - SCROLL };
  const filterAt = displayToStage(pose(LOW08), W, H, FILTER_D.x - 120, FILTER_D.y + 30);
  tl.fromTo(pointer, { x: 1160, y: 1080 }, { x: filterAt.x, y: filterAt.y, duration: 0.52, ease: "glide", ...ir }, T.filterPress - 0.6);
  pressAt(ctx, pointer, T.filterPress, { parent: pointerScene, x: filterAt.x, y: filterAt.y });
  rippleAt(ctx, search.el, { x: FILTER_D.x, y: FILTER_D.y, t: T.filterPress, size: 230 });

  /* ================= row 09: filter by exactly what you need ================= */
  buildFilters(ctx, T, { sheet, pointer, pointerScene, pose });

  /* ================= row 10: the Maitama villa's costs, straight on "see" ================= */
  /* listing-cost-light shows the cost section; the exact total card is not on it. Its sticky bar shows
     the product's own short "₦26.1m move-in total", as the search list does: never lifted, enlarged or
     held alone before the receipt lands ₦26,100,000 at 28.87. */
  /* The page, scrolled: its header (status bar and tabs) and its sticky bar stay; the cost section
     moves up ROW10_SCROLL display px (the gap it leaves above the sticky bar is the page's own ground). */
  const HEAD = 330;
  const STICKY = 2480;
  await cropCanvas(ctx, ctx.src.display("listing-cost-light"), { x: 0, y: HEAD, w: 1320, h: STICKY - HEAD }, { parent: listing.el, style: { top: `${HEAD - ROW10_SCROLL}px` } });
  const head = await cropCanvas(ctx, ctx.src.display("listing-cost-light"), { x: 0, y: 0, w: 1320, h: HEAD }, { parent: listing.el });
  head.style.zIndex = "2";
  const sticky = await cropCanvas(ctx, ctx.src.display("listing-cost-light"), { x: 0, y: STICKY, w: 1320, h: 2868 - STICKY }, { parent: listing.el, style: { top: `${STICKY}px` } });
  sticky.style.zIndex = "2";
  tl.fromTo(listing.el, { x: 1320 }, { x: 0, duration: 0.4, ease: "power3.out" }, T.open);

  return { p, P, listing, phoneScene, mistScene, pointer, pointerScene };
}

/* ---------- row 09 ---------- */

/**
 * The filter sheet: the real `filters-lt` (All, Apply (52)) rises while the camera pushes onto the
 * Property type grid. Villas is pressed on the glass on "exactly": the grid takes the real
 * `filters-villas-lt` state (Villas lit, All off). The camera pulls back to PHONE_HIGH, and the
 * phone's own Apply button counts 52 -> 3 as it comes into view (the button is redrawn in place for
 * the whole sheet, so the count can roll); it is pressed on "need".
 */
function buildFilters(ctx, T, { sheet, pointer, pointerScene, pose }) {
  const { tl } = ctx;
  const TOP = 150;
  const dim = ctx.el("div", { class: "abs", style: { inset: "0px", background: "rgb(11 18 48 / 0.28)" } }, sheet.el);
  const card = ctx.el("div", { class: "abs", style: { left: "0px", top: `${TOP}px`, width: "1320px", height: `${2868 - TOP}px`, overflow: "hidden", borderRadius: "56px 56px 0 0", background: "#fff" } }, sheet.el);
  ctx.img(ctx.src.display("filters-lt"), { class: "abs", style: { left: "0px", top: `${-TOP}px`, width: "1320px", height: "2868px" } }, card);
  /* the new state, first in the grid only (Villas lit, All off), then everywhere */
  const GRID = { y0: 460, y1: 1400 };
  const gridOn = ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "0px", top: `${-TOP}px`, width: "1320px", height: "2868px", clipPath: `inset(${GRID.y0}px 0px ${2868 - GRID.y1}px 0px)` } }, card);
  const allOn = ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "0px", top: `${-TOP}px`, width: "1320px", height: "2868px" } }, card);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, T.filterPress + 0.02);
  tl.fromTo(card, { y: 2700 }, { y: 0, duration: 0.46, ease: "power3.out" }, T.filterPress + 0.02);
  tl.fromTo(gridOn, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "power1.out" }, T.exactly + 0.02);
  const VILLAS_D = { x: 245, y: 1000 };
  rippleAt(ctx, card, { x: VILLAS_D.x, y: VILLAS_D.y - TOP, t: T.exactly, size: 300 });

  /* ---------- the phone's own Apply button, redrawn in place so its count can roll ---------- */
  const APPLY = { x: 573, y: 2641, w: 699, h: 179 };
  const grad = "linear-gradient(180deg, #4491ff 0%, #1a74ff 4%, #0b6cff 34%, #0065fb 66%, #015eec 100%)";
  const btn = ctx.el("div", {
    class: "abs",
    style: {
      left: `${APPLY.x}px`, top: `${APPLY.y - TOP}px`, width: `${APPLY.w}px`, height: `${APPLY.h}px`, borderRadius: "40px", background: grad,
      display: "flex", alignItems: "center", justifyContent: "center", font: "600 54px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em", zIndex: "2",
    },
  }, card);
  ctx.el("span", { text: "Apply (", style: { whiteSpace: "pre" } }, btn);
  const w52 = measure("52", "600 54px Inter", -0.01);
  const w3 = measure("3", "600 54px Inter", -0.01);
  const count = ctx.el("span", { style: { position: "relative", display: "inline-block", height: "1.12em", overflow: "hidden", width: `${w52}px` } }, btn);
  const c52 = ctx.el("span", { text: "52", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  const c3 = ctx.el("span", { text: "3", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  ctx.el("span", { text: ")" }, btn);
  tl.fromTo(c52, { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, duration: 0.2, ease: "power3.in" }, T.countRoll);
  tl.fromTo(c3, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: "back.out(2)" }, T.countRoll + 0.12);
  tl.fromTo(count, { width: w52 }, { width: w3, duration: 0.24, ease: "power3.inOut" }, T.countRoll + 0.1);
  tl.fromTo(allOn, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" }, T.countRoll + 0.1);
  /* pressed on "need" (a small dip), at its right end, clear of the label */
  tl.fromTo(btn, { scale: 1 }, { scale: 0.965, duration: 0.08, ease: "power2.out" }, T.need - 0.04);
  tl.fromTo(btn, { scale: 0.965 }, { scale: 1, duration: 0.3, ease: "back.out(2)", immediateRender: false }, T.need + 0.04);
  const HIT_D = { x: 1150, y: 2745 };
  rippleAt(ctx, card, { x: HIT_D.x, y: HIT_D.y - TOP, t: T.need, size: 260 });

  /* The pointer: to the Villas tile from the start of the push, pressed at its lower right (the icon
     and the label stay clear); then to Apply's right end once the phone is back at PHONE_HIGH. */
  const villasAt = displayToStage(pose({ ...VILLAS_PUSH, cy: VILLAS_PUSH.cy + 11, height: 2122 }), 1080, 1920, VILLAS_D.x + 140, VILLAS_D.y + 70);
  tl.to(pointer, { x: villasAt.x, y: villasAt.y, duration: 0.8, ease: "glide" }, T.villasPush);
  pressAt(ctx, pointer, T.exactly, { parent: pointerScene, x: villasAt.x, y: villasAt.y });
  const hit = displayToStage(pose(SHEET), 1080, 1920, HIT_D.x, HIT_D.y);
  tl.to(pointer, { x: hit.x, y: hit.y, duration: 0.55, ease: "glide" }, T.pullBack + 0.12);
  pressAt(ctx, pointer, T.need, { parent: pointerScene, x: hit.x, y: hit.y });
  tl.to(pointer, { x: 1180, y: 1300, opacity: 0, duration: 0.4, ease: "power2.in" }, T.need + 0.16);
}
