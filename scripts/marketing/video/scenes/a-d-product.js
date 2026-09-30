/**
 * Desktop rows 05-10 (8.19-23.08): the browser window at vallospaces.com.
 *   05  the window rises through the ring; its page swaps on each word.
 *   06  "One app." / "One account." over the veiled window; the inbox's
 *       Property | Stays tabs rise under them, then settle back.
 *   07  "Looking for a home?"; the window rises; the pointer clicks Rent.
 *   08  the window at the left scrolls the results; Nigeria draws in RIGHT_PANEL.
 *   09  the filters: a push onto the drawer; Villas on "exactly"; the Apply
 *       button echoed large in RIGHT_PANEL, 52 -> 3; Apply on "need".
 *   10  the Maitama villa, whipped down to its costs; the hero framing lowered
 *       so the total card stays below the frame until the receipt lands it.
 */
import { LAYOUT } from "./layout.js";
import { browserWindow, orb } from "../engine/components.js";
import { NAVY, ELECTRIC, SHADOW, MIST, nigeriaOutline, CITIES, pressAt, fitSize, measure, rectQuad, lerpQuad, placeOnQuad, cropCanvas, scrollBlur, whip } from "./a-common.js";

const W = 1920;
const H = 1080;
const L = LAYOUT.desktop;
const BAR = 56; // the window's top bar (CSS px)
export const HERO = { x: L.WINDOW_HERO.x, y: L.WINDOW_HERO.y, s: L.WINDOW_HERO.width / 1440 };
export const LEFT = { x: L.WINDOW_LEFT.x, y: L.WINDOW_LEFT.y, s: L.WINDOW_LEFT.width / 1440 };
/* Row 10: the hero window lowered, so the page's total card (css y 710) sits below the frame. */
export const LOW = { x: HERO.x, y: 238, s: HERO.s };
/* Row 09: the push onto the filter drawer (the capture at 1:1 at most: css scale <= 2). */
const PUSHF = { x: -1180, y: -24, s: 1.5 };
const Z = { mist: 3, map: 4, window: 5, veil: 6, bodies: 7, words: 8, pointer: 12 };

/** Stage point of a css point in the window at a framing. */
export const cssToStage = (f, x, y) => ({ x: f.x + x * f.s, y: f.y + (BAR + y) * f.s });

export async function buildProductDesktop(ctx, T, open) {
  const { tl } = ctx;
  const END = T.end;

  /* ================= the ground and the window ================= */
  const mistScene = ctx.scene("a-mist", T.widen, END, { z: Z.mist });
  const mist = ctx.el("div", { class: "fill", style: { background: MIST } }, mistScene);
  open.clipDay(mist);

  const winScene = ctx.scene("a-window", T.widen, END, { z: Z.window });
  const winWrap = ctx.el("div", { class: "fill" }, winScene);
  open.clipDay(winWrap);
  const win = browserWindow(ctx, { parent: winWrap, width: L.WINDOW_HERO.width, theme: "light", url: "vallospaces.com" });
  win.root.style.boxShadow = "0 60px 120px -50px rgb(16 32 80 / 0.42), 0 18px 40px -22px rgb(16 32 80 / 0.22), 0 0 0 1px rgb(16 32 80 / 0.07)";
  const R = win.root;
  const at = (f) => ({ x: f.x, y: f.y, scale: f.s });

  /* The framing, row by row (x, y, scale of the window's root; origin 0 0). */
  tl.fromTo(R, { x: HERO.x, y: 760, scale: HERO.s }, { y: HERO.y, duration: 1.05, ease: "power3.out" }, T.widen + 0.02);
  /* 06 -> 07: the window drops away for the chapter's words, then rises again. */
  tl.to(R, { y: 1260, duration: 0.32, ease: "power3.in" }, T.rows[6] - 0.36);
  tl.fromTo(R, { ...at(HERO), y: 1200 }, { y: HERO.y, duration: 0.42, ease: "power3.out", immediateRender: false }, T.pill1 - 0.5);
  /* 07 -> 08: to the left, the side window. */
  tl.to(R, { ...at(LEFT), duration: 0.6, ease: "glide" }, T.buy + 0.08);
  /* 08 -> 09: the push onto the drawer. */
  tl.to(R, { ...at(PUSHF), duration: 0.62, ease: "power3.inOut" }, T.filterPress + 0.16);
  /* 09 -> 10: back out to the lowered hero framing as the listing opens. */
  tl.to(R, { ...at(LOW), duration: 0.9, ease: "power3.inOut" }, T.need + 0.12);
  tl.to(R, { y: LOW.y - 10, duration: T.call - T.movein, ease: "sine.inOut" }, T.movein);

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
  const home2 = home1; // one page, two visits
  const stay = page("d-stay-lt");
  const stays = page("d-stays-light");
  const rest = page("d-restaurant-lt");
  const msgs = page("d-messages-lt");
  const search = page(null);
  const filt = page(null);
  const listing = page(null);
  during(home1.el, [[T.widen, T.hotels + 0.3], [T.rows[6] + 0.3, T.buy + 0.3]]);
  during(stay.el, [[T.hotels, T.shortlets + 0.3]]);
  during(stays.el, [[T.shortlets, T.restaurants + 0.3]]);
  during(rest.el, [[T.restaurants, T.rows[5] + 0.5]]);
  during(msgs.el, [[T.rows[5] + 0.3, T.rows[6] + 0.3]]);
  during(search.el, [[T.buy, T.filterPress + 0.5]]);
  during(filt.el, [[T.filterPress + 0.02, T.need + 0.5]]);
  during(listing.el, [[T.need + 0.08, END + 1]]);
  go(stay, T.hotels);
  go(stays, T.shortlets);
  go(rest, T.restaurants);
  go(msgs, T.rows[5] + 0.3);
  go(search, T.buy);

  /* ================= row 06: one app, one account ================= */
  const veilScene = ctx.scene("a-veil", T.rows[5], T.rows[6] + 0.2, { z: Z.veil });
  const veil = ctx.el("div", { class: "fill", style: { background: "#f6f9ff" } }, veilScene);
  tl.fromTo(veil, { opacity: 0 }, { opacity: 0.86, duration: 0.42, ease: "power2.out" }, T.rows[5]);
  tl.to(veil, { opacity: 0, duration: 0.28, ease: "power2.inOut" }, T.accountEnd + 0.14);

  const wordsScene = ctx.scene("a-words", T.rows[5], T.pill1 + 0.3, { z: Z.words });
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
  const sA = fitSize("One app.", "700 {}px Poppins", 150, 900, -0.035);
  const sB = fitSize("One account.", "700 {}px Poppins", 142, 1100, -0.035);
  const oneApp = bigLine([["One", true], [" app.", false]], sA, { left: 400, top: 250 });
  const oneAcc = bigLine([["One", true], [" account.", false]], sB, { right: W - 1520, top: 250 + Math.round(sA * 1.02) });
  tl.fromTo(oneApp, { x: -180, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: "land" }, T.one1 - 0.08);
  tl.fromTo(oneAcc, { x: 180, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: "land" }, T.one2 - 0.08);
  /* They leave before the veil lifts: words never sit on a live screen. */
  tl.to(oneApp, { x: -280, duration: 0.24, ease: "power2.in" }, T.accountEnd - 0.08);
  tl.to(oneApp, { opacity: 0, duration: 0.18, ease: "power1.out" }, T.accountEnd - 0.04);
  tl.to(oneAcc, { x: 280, duration: 0.24, ease: "power2.in" }, T.accountEnd - 0.05);
  tl.to(oneAcc, { opacity: 0, duration: 0.18, ease: "power1.out" }, T.accountEnd - 0.01);

  /* The one body: the inbox's real Property | Stays tabs (d-messages-lt, css 410-1300 x 192-230). */
  const bodies = ctx.scene("a-bodies", T.rows[5], T.need + 0.8, { z: Z.bodies });
  const TABS = { x: 820, y: 382, w: 1780, h: 80 }; // capture px
  const tabs = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${TABS.w}px`, height: `${TABS.h}px`, transformOrigin: "0 0", borderRadius: "40px", overflow: "hidden", visibility: "hidden" } }, bodies);
  await cropCanvas(ctx, ctx.src.capture("d-messages-lt"), TABS, { parent: tabs });
  const tabsShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", boxShadow: SHADOW } }, tabs);
  const tabsTo = { cx: 960, cy: 250 + Math.round(sA * 1.02) + Math.round(sB * 1.0) + 90, s: 0.62 };
  const tabsT = { up0: T.tabsUp, up1: T.tabsUp + 0.5, down0: T.accountEnd + 0.04, down1: T.accountEnd + 0.36 };
  ctx.onFrame((t) => {
    const on = t >= tabsT.up0 && t < tabsT.down1;
    tabs.style.visibility = on ? "inherit" : "hidden";
    if (!on) return;
    const f = { x: Number(ctx.gsap.getProperty(R, "x")), y: Number(ctx.gsap.getProperty(R, "y")), s: Number(ctx.gsap.getProperty(R, "scale")) };
    const a = cssToStage(f, TABS.x / 2, TABS.y / 2);
    const from = rectQuad(a.x + (TABS.w / 2) * f.s / 2, a.y + (TABS.h / 2) * f.s / 2, (TABS.w / 2) * f.s, (TABS.h / 2) * f.s, 0);
    const to = rectQuad(tabsTo.cx, tabsTo.cy, TABS.w * tabsTo.s, TABS.h * tabsTo.s, 0);
    const k = ctx.ease("back.out(1.2)")(ctx.progress(t, tabsT.up0, tabsT.up1)) * (1 - ctx.ease("power3.inOut")(ctx.progress(t, tabsT.down0, tabsT.down1)));
    placeOnQuad(tabs, TABS.w, TABS.h, lerpQuad(from, to, k));
    tabsShadow.style.opacity = String(Math.min(1, k * 1.4));
  });

  /* ================= row 07: "Looking for a home?" -> the pill ================= */
  const sQ = fitSize("Looking for a home?", "700 {}px Poppins", 132, 1560, -0.035);
  const qLine = ctx.el("div", {
    class: "abs",
    style: { left: "0px", right: "0px", top: "420px", textAlign: "center", whiteSpace: "nowrap", font: `700 ${sQ}px/1 Poppins, Inter, sans-serif`, letterSpacing: "-0.035em", color: NAVY, transformOrigin: "960px 50%" },
  }, wordsScene);
  const qa = ctx.el("span", { text: "Looking for ", style: { display: "inline-block", whiteSpace: "pre" } }, qLine);
  const qb = ctx.el("span", { style: { display: "inline-block", whiteSpace: "pre" } }, qLine);
  ctx.el("span", { text: "a " }, qb);
  ctx.el("span", { text: "home", style: { color: ELECTRIC } }, qb);
  ctx.el("span", { text: "?" }, qb);
  tl.fromTo(qa, { x: -160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, T.looking - 0.06);
  tl.fromTo(qb, { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "land" }, T.home - 0.1);
  const pillY = (L.PILL.top + L.PILL.bottom) / 2;
  tl.to(qLine, { y: pillY - (420 + sQ * 0.55), scale: 0.24, duration: 0.4, ease: "power2.inOut" }, T.pill1 - 0.66);
  tl.to(qLine, { opacity: 0, duration: 0.12, ease: "power1.in" }, T.pill1 - 0.34);

  /* ================= the pointer ================= */
  const pointerScene = ctx.scene("a-pointer", T.rows[6] + 0.3, T.need + 0.7, { z: Z.pointer });
  const pointer = orb(ctx, pointerScene);
  const rentAt = cssToStage(HERO, 720, 578);
  tl.fromTo(pointer, { x: 2000, y: 1000 }, { x: rentAt.x, y: rentAt.y, duration: 0.6, ease: "glide" }, T.rentPress - 0.66);
  pressAt(ctx, pointer, T.rentPress, { parent: pointerScene, x: rentAt.x, y: rentAt.y });
  tl.to(pointer, { x: 2000, y: 800, duration: 0.45, ease: "power2.in" }, T.buy + 0.04);

  /* ================= row 08: the results scroll; Nigeria draws in RIGHT_PANEL ================= */
  const SCROLL = 300;
  /* the page's top 900 + 300 css px (the whole-page capture, cropped once) */
  const sImg = await cropCanvas(ctx, ctx.src.capture("d-search-full-lt-full"), { x: 0, y: 0, w: 2880, h: 2 * (900 + SCROLL) }, { parent: search.el, style: { width: "1440px", height: `${900 + SCROLL}px` } });
  /* the sidebar stays; the main column scrolls down through the results, then back to the top for "More" */
  await cropCanvas(ctx, ctx.src.capture("d-search-full-lt"), { x: 0, y: 0, w: 524, h: 1800 }, { parent: search.el, style: { width: "262px", height: "900px" } });
  tl.fromTo(sImg, { y: 0 }, { y: -SCROLL, duration: 0.9, ease: "power2.inOut" }, T.search - 0.3);
  tl.to(sImg, { y: 0, duration: 0.38, ease: "power3.inOut" }, T.filterPress - 0.56);

  const mapScene = ctx.scene("a-map", T.rows[7] - 0.2, T.filterPress + 0.45, { z: Z.map });
  const P = L.RIGHT_PANEL; // x 1160, y 150, w 680, h 730
  const MAP = { x: P.x + 50, y: P.y + 120, w: 560 };
  const ng = await nigeriaOutline(MAP);
  const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${W}px`, height: `${H}px` } }, mapScene);
  svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${ng.d}" stroke="${ELECTRIC}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
  const path = svg.querySelector("path");
  tl.fromTo(path, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.05, ease: "power2.inOut" }, T.rows[7] - 0.1);
  tl.to(svg, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.filterPress);
  const sideOf = { Lagos: "below", Abuja: "right", Kano: "right", "Port Harcourt": "right", Ibadan: "above" };
  CITIES.forEach((c, k) => {
    const pt = ng.proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${pt.x - 9}px`, top: `${pt.y - 9}px`, width: "18px", height: "18px", borderRadius: "50%", background: ELECTRIC, boxShadow: "0 0 0 6px rgb(0 105 254 / 0.16)" } }, svg);
    const sd = sideOf[c.name];
    const label = ctx.el("div", {
      class: "abs",
      text: c.name,
      style: {
        font: "600 26px/1 Inter, sans-serif", color: NAVY, whiteSpace: "nowrap", letterSpacing: "-0.01em",
        ...(sd === "right" ? { left: `${pt.x + 18}px`, top: `${pt.y - 13}px` } : {}),
        ...(sd === "above" ? { left: `${pt.x - 14}px`, top: `${pt.y - 46}px` } : {}),
        ...(sd === "below" ? { left: `${pt.x - 14}px`, top: `${pt.y + 18}px` } : {}),
      },
    }, svg);
    const t = T.dots[k];
    tl.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)" }, t);
    tl.fromTo(label, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, t + 0.03);
  });

  /* "More" (the filters), clicked at 18.30. */
  const moreAt = cssToStage(LEFT, 724, 100);
  tl.fromTo(pointer, { x: 1300, y: 700 }, { x: moreAt.x, y: moreAt.y, duration: 0.55, ease: "glide", immediateRender: false }, T.filterPress - 0.62);
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

  const villasAt = cssToStage(PUSHF, 1362, 182);
  tl.to(pointer, { x: villasAt.x, y: villasAt.y, duration: 0.6, ease: "glide" }, T.exactly - 0.7);
  pressAt(ctx, pointer, T.exactly, { parent: pointerScene, x: villasAt.x, y: villasAt.y });

  /* The Apply button, echoed large in RIGHT_PANEL (re-drawn from the capture), its count rolling 52 -> 3. */
  const grad = "linear-gradient(180deg, #1a74ff 0%, #3c93ff 1.5%, #1974ff 5%, #0b6cff 34%, #0065fb 66%, #015eec 100%)";
  const EW = 560;
  const EH = 150;
  const echo = ctx.el("div", {
    class: "abs",
    style: {
      left: `${P.x + (P.w - EW) / 2}px`, top: "470px", width: `${EW}px`, height: `${EH}px`, borderRadius: "34px", background: grad, boxShadow: SHADOW,
      display: "flex", alignItems: "center", justifyContent: "center", font: "600 50px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em", opacity: 0,
    },
  }, bodies);
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
  const applyAt = { x: P.x + P.w / 2 + 110, y: 470 + EH / 2 };
  tl.to(pointer, { x: applyAt.x, y: applyAt.y, duration: 0.55, ease: "glide" }, T.need - 0.66);
  pressAt(ctx, pointer, T.need, { parent: pointerScene, x: applyAt.x, y: applyAt.y });
  tl.to(echo, { scale: 0.96, duration: 0.08, ease: "power2.out" }, T.need - 0.04);
  tl.to(echo, { scale: 0.9, opacity: 0, y: 20, duration: 0.28, ease: "power2.in" }, T.need + 0.1);
  tl.to(pointer, { x: 2000, y: 1000, opacity: 0, duration: 0.4, ease: "power2.in" }, T.need + 0.16);

  /* ================= row 10: the Maitama villa, whipped down to its costs ================= */
  /* The sidebar stays; the main column scrolls from the listing's top (d-listing-lt) to its costs (d-listing-cost-lt). */
  const MAIN = 262;
  const mainWin = ctx.el("div", { class: "abs", style: { left: `${MAIN}px`, top: "0px", width: `${1440 - MAIN}px`, height: "900px", overflow: "hidden" } }, listing.el);
  const lA = ctx.img(ctx.src.capture("d-listing-lt"), { class: "abs", style: { left: `${-MAIN}px`, top: "0px", width: "1440px", height: "900px", maxWidth: "none" } }, mainWin);
  const lB = ctx.img(ctx.src.capture("d-listing-cost-lt"), { class: "abs", style: { left: `${-MAIN}px`, top: "0px", width: "1440px", height: "900px", maxWidth: "none" } }, mainWin);
  await cropCanvas(ctx, ctx.src.capture("d-listing-lt"), { x: 0, y: 0, w: 2 * MAIN, h: 1800 }, { parent: listing.el, style: { width: `${MAIN}px`, height: "900px" } });
  tl.fromTo(listing.el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" }, T.need + 0.08);
  /* v3.1: the move-in total is never readable before 28.87. At rest it sits below the frame (the
     lowered framing); it crosses the frame only in the whip's fast first quarter, under its motion blur. */
  const dur = T.movein - T.flick;
  tl.fromTo(lA, { y: 0 }, { y: -900, duration: dur, ease: whip.ease }, T.flick);
  tl.fromTo(lB, { y: 900 }, { y: 0, duration: dur, ease: whip.ease }, T.flick);
  scrollBlur(ctx, mainWin, (t) => (900 / dur) * whip.slope(ctx.progress(t, T.flick, T.movein)), { k: 0.65, max: 24 });

  return { win, R, listing, pointer, pointerScene, mistScene, winScene, bodies };
}
