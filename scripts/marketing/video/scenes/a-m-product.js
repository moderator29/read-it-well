/**
 * Mobile rows 05-10 (8.19-23.08): the phone in daylight (v3.1).
 *   05  the phone rises through the ring; its screen swaps on each word.
 *   06  "One app." / "One account." land in WORDS over the dimmed phone; the
 *       Property | Stays tabs of messages-lt rise under them, then settle back.
 *   07  "Looking for / a home?" in WORDS; the phone rises; Rent is pressed.
 *   08  search across Nigeria: the page scrolls, the outline draws, the cities light.
 *   09  the Apply button is the one lifted body; Villas is pressed; 52 -> 3.
 *   10  the Maitama villa opens and flicks down to its costs; the push.
 */
import { LAYOUT } from "./layout.js";
import { phone } from "../engine/phone.js";
import { orb } from "../engine/components.js";
import {
  NAVY, ELECTRIC, SHADOW, MIST, displayToStage, displayRectQuad, rectQuad, lerpQuad, placeOnQuad,
  nigeriaOutline, CITIES, pressAt, rippleAt, fitSize, measure,
} from "./a-common.js";

const W = 1080;
const H = 1920;
const L = LAYOUT.mobile;
export const HERO = { ...L.PHONE_HERO };
export const HIGH = { ...L.PHONE_HIGH };
/* Row 08's three-quarter turn, row 09's shift (room for the one body at the right), row 10's push. */
const TURN = { cx: 640, cy: HIGH.cy, height: HIGH.height, ry: -14 };
const SHIFT = { cx: 410, cy: HIGH.cy, height: HIGH.height };
export const PUSH = { cx: 540, cy: 849, height: 1141 };
const SB = 186; // the status bar in every display
const Z = { mist: 3, map: 4, phone: 5, veil: 6, bodies: 7, words: 8, pointer: 12 };

export async function buildProductMobile(ctx, T, open) {
  const { tl } = ctx;
  const END = T.end;
  const flat = { rx: 0, ry: 0, rz: 0, fov: 24 };

  /* ================= the ground and the phone ================= */
  const mistScene = ctx.scene("a-mist", T.widen, END, { z: Z.mist });
  const mist = ctx.el("div", { class: "fill", style: { background: MIST } }, mistScene);
  open.clipDay(mist);

  const phoneScene = ctx.scene("a-phone", T.widen, END, { z: Z.phone });
  const phoneWrap = ctx.el("div", { class: "fill" }, phoneScene);
  open.clipDay(phoneWrap);
  const p = phone(ctx, { model: "island", parent: phoneWrap, env: "light", edge: "#f3f4f1" });
  await Promise.all(ctx.pending ?? []);
  Object.assign(p.pose, { ...HERO, ...flat, opacity: 1 });
  const P = p.pose;

  /* The pose, row by row (GSAP on p.pose only). */
  tl.fromTo(P, { cx: 540, cy: 1760, height: HERO.height, rx: 16, ry: -6, rz: 0, opacity: 1 }, { cy: HERO.cy, rx: 0, duration: 1.05, ease: "power3.out" }, T.widen + 0.02);
  tl.fromTo(P, { ry: -6 }, { ry: 6, duration: T.rows[5] - T.homes + 0.2, ease: "sine.inOut" }, T.homes);
  /* 06: pushed back under the veil while the words land, then forward again. */
  tl.to(P, { ry: 0, height: HERO.height - 60, duration: 0.6, ease: "power2.inOut" }, T.rows[5] + 0.02);
  tl.to(P, { height: HERO.height, duration: 0.45, ease: "power2.out" }, T.accountEnd + 0.02);
  /* 06 -> 07: the phone drops away for the chapter's words, then rises to PHONE_HIGH. */
  tl.to(P, { cy: 2560, rx: 10, duration: 0.36, ease: "power3.in" }, T.rows[6] - 0.18);
  tl.fromTo(P, { cy: 2400, rx: 12, height: HIGH.height }, { cy: HIGH.cy, rx: 0, duration: 0.42, ease: "power3.out", immediateRender: false }, T.pill1 - 0.5);
  /* 07 -> 08: three-quarter right after the slide. */
  tl.to(P, { cx: TURN.cx, ry: TURN.ry, duration: 0.55, ease: "glide" }, T.buy + 0.1);
  /* 08 -> 09: a shift left as the sheet rises (room for the lifted Apply at the right). */
  tl.to(P, { cx: SHIFT.cx, ry: 0, duration: 0.5, ease: "glide" }, T.filterPress + 0.04);
  /* 09 -> 10: centre again as the listing opens, then the push toward the costs. */
  tl.to(P, { cx: PUSH.cx, cy: PUSH.cy, height: PUSH.height, duration: 0.9, ease: "power2.inOut" }, T.need + 0.18);
  tl.to(P, { cy: PUSH.cy + 5, height: PUSH.height + 14, duration: T.call - T.movein, ease: "sine.inOut" }, T.movein);

  /* ================= the screens (under the glass) ================= */
  /** A page: a full display; its own status bar is drawn fixed on top (a slide never moves it). */
  const page = (id, { bg = "#fff" } = {}) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", background: bg, visibility: "hidden" } }, p.screen);
    const img = id ? ctx.img(ctx.src.display(id), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, el) : null;
    return { el, img, id };
  };
  const bars = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: `${SB}px`, overflow: "hidden", zIndex: "40" } }, p.screen);
  const barOf = (id) => {
    const b = ctx.el("div", { class: "abs", style: { inset: "0px", visibility: "hidden" } }, bars);
    ctx.img(ctx.src.display(id), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, b);
    return b;
  };
  /** Visibility by time (a frame hook: no history). */
  const during = (el, ranges) => ctx.onFrame((t) => {
    const on = ranges.some(([a, b]) => t >= a && t < b);
    if ((el.style.visibility === "visible") !== on) el.style.visibility = on ? "visible" : "hidden";
  });
  /** An iOS push: `to` slides in from the right over `from`, which parts to the left and dims. */
  const slide = (from, to, t, dur = 0.42) => {
    tl.fromTo(to.el, { x: 1320 }, { x: 0, duration: dur, ease: "power3.out" }, t);
    tl.fromTo(from.el, { x: 0, filter: "brightness(1)" }, { x: -420, filter: "brightness(0.92)", duration: dur, ease: "power3.out" }, t);
  };

  const home1 = page("home-light");
  const stay = page("stay-light");
  const stays = page("stays-light");
  const rest = page("restaurant-light");
  const msgs = page("messages-lt");
  const home2 = page("home-light");
  const search = page("search-lt", { bg: "#f3f4f1" });
  const sheet = page(null, { bg: "transparent" });
  const listing = page(null, { bg: "#f3f4f1" });
  during(home1.el, [[T.widen, T.hotels + 0.45]]);
  during(stay.el, [[T.hotels, T.shortlets + 0.45]]);
  during(stays.el, [[T.shortlets, T.restaurants + 0.45]]);
  during(rest.el, [[T.restaurants, T.rows[5] + 0.3]]);
  during(msgs.el, [[T.rows[5] + 0.3, T.rows[6] + 0.3]]);
  during(home2.el, [[T.rows[6] + 0.3, T.buy + 0.45]]);
  during(search.el, [[T.buy, T.need + 0.7]]);
  during(sheet.el, [[T.filterPress + 0.02, T.need + 0.7]]);
  during(listing.el, [[T.need + 0.16, END + 1]]);
  slide(home1, stay, T.hotels);
  slide(stay, stays, T.shortlets);
  slide(stays, rest, T.restaurants);
  slide(home2, search, T.buy);
  /* The status bars: always the current page's, never sliding. */
  during(barOf("home-light"), [[T.widen, T.hotels], [T.rows[6] + 0.3, T.buy]]);
  during(barOf("stay-light"), [[T.hotels, T.shortlets]]);
  during(barOf("stays-light"), [[T.shortlets, T.restaurants]]);
  during(barOf("restaurant-light"), [[T.restaurants, T.rows[5] + 0.3]]);
  during(barOf("messages-lt"), [[T.rows[5] + 0.3, T.rows[6] + 0.3]]);
  during(barOf("search-lt"), [[T.buy, T.filterPress + 0.02]]);
  during(barOf("filters-lt"), [[T.filterPress + 0.02, T.need + 0.16]]);
  during(barOf("listing-lt"), [[T.need + 0.16, END + 1]]);

  /* ================= row 06: one app, one account ================= */
  /* The veil: the phone steps back under the mist while the words land (never type over a live screen). */
  const veilScene = ctx.scene("a-veil", T.rows[5], T.rows[6] + 0.2, { z: Z.veil });
  const veil = ctx.el("div", { class: "fill", style: { background: "#f6f9ff" } }, veilScene);
  tl.fromTo(veil, { opacity: 0 }, { opacity: 0.86, duration: 0.42, ease: "power2.out" }, T.rows[5]);
  tl.to(veil, { opacity: 0, duration: 0.34, ease: "power2.inOut" }, T.accountEnd + 0.04);

  const wordsScene = ctx.scene("a-words", T.rows[5], T.pill1 + 0.3, { z: Z.words });
  const WD = L.WORDS; // x 44, y 520, w 896, h 520
  const bigLine = (parts, size, { left = null, right = null, top }) => {
    const el = ctx.el("div", {
      class: "abs",
      style: {
        top: `${top}px`, ...(left != null ? { left: `${left}px` } : {}), ...(right != null ? { right: `${right}px` } : {}), whiteSpace: "nowrap",
        font: `700 ${size}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color: NAVY,
      },
    }, wordsScene);
    parts.forEach(([t, blue]) => ctx.el("span", { text: t, style: blue ? { color: ELECTRIC } : {} }, el));
    return el;
  };
  const inner = WD.w - 56;
  const sA = fitSize("One app.", "700 {}px Poppins", 132, inner, -0.035);
  const sB = fitSize("One account.", "700 {}px Poppins", 124, inner, -0.035);
  const yA = WD.y + 12;
  const yB = yA + Math.round(sA * 1.02);
  const oneApp = bigLine([["One", true], [" app.", false]], sA, { left: WD.x + 28, top: yA });
  const oneAcc = bigLine([["One", true], [" account.", false]], sB, { right: W - (WD.x + WD.w - 28), top: yB });
  oneApp.style.transformOrigin = "0% 60%";
  oneAcc.style.transformOrigin = "100% 60%";
  tl.fromTo(oneApp, { x: -150, opacity: 0, rotation: -4 }, { x: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "land" }, T.one1 - 0.08);
  tl.fromTo(oneAcc, { x: 150, opacity: 0, rotation: 4 }, { x: 0, opacity: 1, rotation: 0, duration: 0.55, ease: "land" }, T.one2 - 0.08);
  tl.to(oneApp, { x: -260, opacity: 0, duration: 0.26, ease: "power2.in" }, T.accountEnd + 0.02);
  tl.to(oneAcc, { x: 260, opacity: 0, duration: 0.26, ease: "power2.in" }, T.accountEnd + 0.06);

  /* The one body: the inbox's real Property | Stays tabs (messages-lt), two worlds under one account. */
  const bodies = ctx.scene("a-bodies", T.rows[5], T.need + 0.8, { z: Z.bodies });
  const TABS = { x: 26, y: 893, w: 1268, h: 124 };
  const tabs = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${TABS.w}px`, height: `${TABS.h}px`, transformOrigin: "0 0", borderRadius: "62px", overflow: "hidden", visibility: "hidden" } }, bodies);
  ctx.img(ctx.src.display("messages-lt"), { class: "abs", style: { left: `${-TABS.x}px`, top: `${-TABS.y}px`, width: "1320px", height: "2868px", maxWidth: "none" } }, tabs);
  const tabsShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "62px", boxShadow: SHADOW } }, tabs);
  const tabsTo = { cx: 540, cy: yB + Math.round(sB * 1.0) + 92, s: 0.66 };
  const tabsT = { up0: T.tabsUp, up1: T.tabsUp + 0.5, down0: T.accountEnd + 0.06, down1: T.accountEnd + 0.46 };
  ctx.onFrame((t) => {
    const on = t >= tabsT.up0 && t < tabsT.down1;
    tabs.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const from = displayRectQuad(P, W, H, TABS);
    const to = rectQuad(tabsTo.cx, tabsTo.cy, TABS.w * tabsTo.s, TABS.h * tabsTo.s, 0);
    const k = ctx.ease("back.out(1.2)")(ctx.progress(t, tabsT.up0, tabsT.up1)) * (1 - ctx.ease("power3.inOut")(ctx.progress(t, tabsT.down0, tabsT.down1)));
    placeOnQuad(tabs, TABS.w, TABS.h, lerpQuad(from, to, k));
    tabsShadow.style.opacity = String(Math.min(1, k * 1.4));
  });

  /* ================= row 07: "Looking for / a home?" -> the pill ================= */
  const sL = fitSize("Looking for", "700 {}px Poppins", 126, inner, -0.035);
  const sH = fitSize("a home?", "700 {}px Poppins", 132, inner, -0.035);
  const y1 = WD.y + 40;
  const y2 = y1 + Math.round(sL * 1.04);
  const q1 = bigLine([["Looking for", false]], sL, { left: WD.x + 28, top: y1 });
  const q2 = bigLine([["a ", false], ["home", true], ["?", false]], sH, { right: W - (WD.x + WD.w - 28), top: y2 });
  tl.fromTo(q1, { x: -150, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, T.looking - 0.06);
  tl.fromTo(q2, { x: 150, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, T.home - 0.1);
  /* They shrink into the PILL box (y 290-360) just before the chapter pill appears (16.21). */
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  q1.style.transformOrigin = "50% 50%";
  q2.style.transformOrigin = "50% 50%";
  const wq1 = measure("Looking for", `700 ${sL}px Poppins`, -0.035);
  const wq2 = measure("a home?", `700 ${sH}px Poppins`, -0.035);
  const c1 = { x: WD.x + 28 + wq1 / 2, y: y1 + sL * 0.55 };
  const c2 = { x: WD.x + WD.w - 28 - wq2 / 2, y: y2 + sH * 0.55 };
  /* ...leading the rising phone upward, so they never cross its screen. */
  tl.to(q1, { x: 540 - c1.x - 60, y: pillY - c1.y - 10, scale: 0.26, duration: 0.4, ease: "power2.inOut" }, T.pill1 - 0.66);
  tl.to(q2, { x: 540 - c2.x + 70, y: pillY - c2.y + 10, scale: 0.26, duration: 0.4, ease: "power2.inOut" }, T.pill1 - 0.64);
  tl.to([q1, q2], { opacity: 0, duration: 0.12, ease: "power1.in" }, T.pill1 - 0.34);

  /* ================= the pointer (hovering above the glass) ================= */
  const pointerScene = ctx.scene("a-pointer", T.rows[6] + 0.3, T.need + 0.7, { z: Z.pointer });
  const pointer = orb(ctx, pointerScene);
  const RENT_D = { x: 524, y: 1840 };
  const rentAt = displayToStage({ ...HIGH, ...flat }, W, H, RENT_D.x, RENT_D.y);
  tl.fromTo(pointer, { x: 1150, y: 1180 }, { x: rentAt.x, y: rentAt.y, duration: 0.6, ease: "glide" }, T.rentPress - 0.68);
  pressAt(ctx, pointer, T.rentPress, { parent: pointerScene, x: rentAt.x, y: rentAt.y });
  rippleAt(ctx, home2.el, { x: RENT_D.x, y: RENT_D.y, t: T.rentPress, size: 300 });
  tl.to(pointer, { x: 1160, y: 980, duration: 0.45, ease: "power2.in" }, T.buy + 0.02);

  /* ================= row 08: search across Nigeria ================= */
  /* The page scrolls: the whole web view (search-lt-full, 880 wide) moves up under the fixed status bar and nav. */
  const SCROLL = 210;
  const web = ctx.el("div", { class: "abs", style: { left: "0px", top: `${SB}px`, width: "1320px", height: `${2868 - SB}px`, overflow: "hidden", background: "#f3f4f1" } }, search.el);
  const full = ctx.img(ctx.src.capture("search-lt-full"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: `${(10908 * 1320) / 880}px`, maxWidth: "none" } }, web);
  const NAV = 2440;
  const nav = ctx.el("div", { class: "abs", style: { left: "0px", top: `${NAV}px`, width: "1320px", height: `${2868 - NAV}px`, overflow: "hidden" } }, search.el);
  ctx.img(ctx.src.display("search-lt"), { class: "abs", style: { left: "0px", top: `${-NAV}px`, width: "1320px", height: "2868px" } }, nav);
  const scrollT = { t0: T.search - 0.3, t1: T.nigeria5 + 0.2 };
  tl.fromTo(full, { y: 0 }, { y: -SCROLL, duration: scrollT.t1 - scrollT.t0, ease: "power2.inOut" }, scrollT.t0);

  /* The Nigeria outline, to the phone's left, drawn as it is said; the five cities light in time. */
  const mapScene = ctx.scene("a-map", T.rows[7] - 0.2, T.filterPress + 0.45, { z: Z.map });
  const MAP = { x: 52, y: 452, w: 372 };
  const ng = await nigeriaOutline(MAP);
  const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${W}px`, height: `${H}px` } }, mapScene);
  svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${ng.d}" stroke="${ELECTRIC}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
  const path = svg.querySelector("path");
  tl.fromTo(path, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.05, ease: "power2.inOut" }, T.rows[7] - 0.1);
  tl.to(svg, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.filterPress);
  const side = { Lagos: "below", Abuja: "right", Kano: "right", "Port Harcourt": "right", Ibadan: "above" };
  CITIES.forEach((c, k) => {
    const pt = ng.proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${pt.x - 8}px`, top: `${pt.y - 8}px`, width: "16px", height: "16px", borderRadius: "50%", background: ELECTRIC, boxShadow: "0 0 0 5px rgb(0 105 254 / 0.16)" } }, svg);
    const sd = side[c.name];
    const label = ctx.el("div", {
      class: "abs",
      text: c.name,
      style: {
        font: "600 25px/1 Inter, sans-serif", color: NAVY, whiteSpace: "nowrap", letterSpacing: "-0.01em",
        ...(sd === "right" ? { left: `${pt.x + 16}px`, top: `${pt.y - 12}px` } : {}),
        ...(sd === "above" ? { left: `${pt.x - 12}px`, top: `${pt.y - 42}px` } : {}),
        ...(sd === "below" ? { left: `${pt.x - 12}px`, top: `${pt.y + 16}px` } : {}),
      },
    }, svg);
    const t = T.dots[k];
    tl.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)" }, t);
    tl.fromTo(label, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, t + 0.03);
  });

  /* The filter button, pressed at 18.30 (display px, on the scrolled page). */
  const FILTER_D = { x: 1195, y: 481 - SCROLL };
  const filterAt = displayToStage({ ...TURN, rx: 0, rz: 0, fov: 24 }, W, H, FILTER_D.x, FILTER_D.y);
  tl.fromTo(pointer, { x: 1160, y: 560 }, { x: filterAt.x, y: filterAt.y, duration: 0.52, ease: "glide", immediateRender: false }, T.filterPress - 0.6);
  pressAt(ctx, pointer, T.filterPress, { parent: pointerScene, x: filterAt.x, y: filterAt.y });
  rippleAt(ctx, search.el, { x: FILTER_D.x, y: FILTER_D.y, t: T.filterPress, size: 230 });

  /* ================= row 09: filter by exactly what you need ================= */
  buildFilters(ctx, T, { P, sheet, bodies, pointer, pointerScene });

  /* ================= row 10: the Maitama villa, flicked down to its costs ================= */
  const BAR = 2490;
  const D = BAR - SB;
  const win = ctx.el("div", { class: "abs", style: { left: "0px", top: `${SB}px`, width: "1320px", height: `${D}px`, overflow: "hidden" } }, listing.el);
  const lA = ctx.img(ctx.src.display("listing-lt"), { class: "abs", style: { left: "0px", top: `${-SB}px`, width: "1320px", height: "2868px", clipPath: `inset(${SB}px 0px ${2868 - BAR}px 0px)` } }, win);
  const lB = ctx.img(ctx.src.display("listing-cost-light"), { class: "abs", style: { left: "0px", top: `${-SB}px`, width: "1320px", height: "2868px", clipPath: `inset(${SB}px 0px ${2868 - BAR}px 0px)` } }, win);
  const fixedBar = ctx.el("div", { class: "abs", style: { left: "0px", top: `${BAR}px`, width: "1320px", height: `${2868 - BAR}px`, overflow: "hidden" } }, listing.el);
  ctx.img(ctx.src.display("listing-lt"), { class: "abs", style: { left: "0px", top: `${-BAR}px`, width: "1320px", height: "2868px" } }, fixedBar);
  /* The listing arrives from the right and flicks straight down to "What you will actually pay":
     its move-in total is only ever seen in motion (v3.1: unreadable until 28.87). */
  tl.fromTo(listing.el, { x: 1320 }, { x: 0, duration: 0.36, ease: "power2.out" }, T.need + 0.16);
  tl.fromTo(lA, { y: 0 }, { y: -D, duration: T.movein - T.flick, ease: "power3.out" }, T.flick);
  tl.fromTo(lB, { y: D }, { y: 0, duration: T.movein - T.flick, ease: "power3.out" }, T.flick);

  return { p, P, listing, phoneScene, mistScene, pointer, pointerScene };
}

/* ---------- row 09 ---------- */

/**
 * The filter sheet: the real `filters-lt` (All, Apply (52)) rises; Villas is
 * pressed on the glass on "exactly" and the screen becomes the real
 * `filters-villas-lt` (Villas, Apply (3)). The one lifted body is the Apply
 * button, re-drawn from the capture, its count rolling 52 -> 3; it is
 * pressed on "need" and settles back as the listing opens.
 */
function buildFilters(ctx, T, { P, sheet, bodies, pointer, pointerScene }) {
  const { tl } = ctx;
  const TOP = 150;
  const dim = ctx.el("div", { class: "abs", style: { inset: "0px", background: "rgb(11 18 48 / 0.28)" } }, sheet.el);
  const card = ctx.el("div", { class: "abs", style: { left: "0px", top: `${TOP}px`, width: "1320px", height: `${2868 - TOP}px`, overflow: "hidden", borderRadius: "56px 56px 0 0", background: "#fff" } }, sheet.el);
  ctx.img(ctx.src.display("filters-lt"), { class: "abs", style: { left: "0px", top: `${-TOP}px`, width: "1320px", height: "2868px" } }, card);
  const imgOn = ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "0px", top: `${-TOP}px`, width: "1320px", height: "2868px" } }, card);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, T.filterPress + 0.02);
  tl.fromTo(card, { y: 2700 }, { y: 0, duration: 0.46, ease: "power3.out" }, T.filterPress + 0.02);
  /* the press: Villas lights (the real capture), All goes off, Apply (3) */
  tl.fromTo(imgOn, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "power1.out" }, T.exactly + 0.02);
  const shiftP = { ...SHIFT, rx: 0, ry: 0, rz: 0, fov: 24 };
  const VILLAS_D = { x: 245, y: 1000 };
  const villasAt = displayToStage(shiftP, 1080, 1920, VILLAS_D.x, VILLAS_D.y);
  rippleAt(ctx, card, { x: VILLAS_D.x, y: VILLAS_D.y - TOP, t: T.exactly, size: 300 });

  /* ---------- the one body: the Apply button ---------- */
  const APPLY = { x: 573, y: 2640, w: 698, h: 179 };
  const grad = "linear-gradient(180deg, #1a74ff 0%, #3c93ff 1.5%, #1974ff 5%, #0b6cff 34%, #0065fb 66%, #015eec 100%)";
  const btn = ctx.el("div", {
    class: "abs",
    style: {
      left: "0px", top: "0px", width: `${APPLY.w}px`, height: `${APPLY.h}px`, transformOrigin: "0 0", borderRadius: "40px", background: grad,
      display: "flex", alignItems: "center", justifyContent: "center", font: "600 54px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em", visibility: "hidden",
    },
  }, bodies);
  const btnShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", boxShadow: SHADOW, pointerEvents: "none" } }, btn);
  ctx.el("span", { text: "Apply (", style: { whiteSpace: "pre" } }, btn);
  const w52 = measure("52", "600 54px Inter", -0.01);
  const w3 = measure("3", "600 54px Inter", -0.01);
  const count = ctx.el("span", { style: { position: "relative", display: "inline-block", height: "1.12em", overflow: "hidden", width: `${w52}px` } }, btn);
  const c52 = ctx.el("span", { text: "52", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  const c3 = ctx.el("span", { text: "3", style: { position: "absolute", left: "0px", top: "0px", display: "block", lineHeight: "1.12em" } }, count);
  ctx.el("span", { text: ")" }, btn);
  tl.fromTo(c52, { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, duration: 0.3, ease: "power3.in" }, T.countRoll);
  tl.fromTo(c3, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.42, ease: "back.out(2)" }, T.countRoll + 0.22);
  tl.fromTo(count, { width: w52 }, { width: w3, duration: 0.3, ease: "power3.inOut" }, T.countRoll + 0.18);

  /* It lifts into the right-hand body box (the phone has shifted left: room without covering the screen). */
  const edge = SHIFT.cx + 0.32827 * 660; // the display's right edge at SHIFT
  const zone = { x0: edge - 56, x1: L.BODY_RIGHT.x + L.BODY_RIGHT.w };
  const s = (zone.x1 - zone.x0) / APPLY.w;
  const to = { cx: (zone.x0 + zone.x1) / 2, cy: 1040, s, r: 2 };
  const hit = { x: to.cx + 60, y: to.cy + 2 };
  const up = { t0: T.filterPress + 0.5, t1: T.filterPress + 0.98 };
  const back = { t0: T.need + 0.06, t1: T.need + 0.34 };
  ctx.onFrame((t) => {
    const on = t >= up.t0 && t < back.t1;
    btn.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const from = displayRectQuad(P, 1080, 1920, APPLY);
    const k1 = ctx.ease("back.out(1.2)")(ctx.progress(t, up.t0, up.t1));
    const k2 = ctx.ease("power3.in")(ctx.progress(t, back.t0, back.t1));
    const m = k1 * (1 - k2);
    const dip = 1 - 0.045 * Math.sin(Math.PI * ctx.progress(t, T.need - 0.06, T.need + 0.18));
    const hover = Math.sin((t - up.t0) * 2.2) * 3 * m;
    const q = rectQuad(to.cx, to.cy + hover, APPLY.w * to.s * dip, APPLY.h * to.s * dip, to.r);
    placeOnQuad(btn, APPLY.w, APPLY.h, lerpQuad(from, q, m));
    btnShadow.style.opacity = String(m);
  });

  /* The pointer: Villas on the glass on "exactly", then the lifted Apply on "need". */
  tl.to(pointer, { x: villasAt.x, y: villasAt.y, duration: 0.6, ease: "glide" }, T.exactly - 0.7);
  pressAt(ctx, pointer, T.exactly, { parent: pointerScene, x: villasAt.x, y: villasAt.y });
  tl.to(pointer, { x: hit.x, y: hit.y, duration: 0.55, ease: "glide" }, T.need - 0.66);
  pressAt(ctx, pointer, T.need, { parent: pointerScene, x: hit.x, y: hit.y });
  tl.to(pointer, { x: 1180, y: 1180, opacity: 0, duration: 0.4, ease: "power2.in" }, T.need + 0.16);
}
