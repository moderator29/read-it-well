/**
 * Mobile rows 05-10 (8.19-23.08): the phone in daylight. The breadth montage
 * with its word chips, "One app. One account." with the lifted Property |
 * Stays pill, the Rent press, search across Nigeria, the real filter count
 * (Apply 52 -> 3) and the Maitama villa's listing, scrolled to its costs.
 */
import { phone } from "../engine/phone.js";
import { orb, press, tap, bodyFromImage } from "../engine/components.js";
import {
  NAVY, ELECTRIC, SHADOW, SHADOW_SOFT, MIST, wordChip, projectDisplay, displayToStage, displayRectQuad, rectQuad, lerpQuad,
  placeOnQuad, nigeriaOutline, CITIES,
} from "./a-common.js";

const W = 1080;
const H = 1920;
export const HERO = { cx: 540, cy: 760, height: 1300 };
export const HIGH = { cx: 540, cy: 640, height: 1180 };
/* Row 08's three-quarter pose, row 10's push toward the costs. */
const TURN = { cx: 620, cy: 640, height: 1180, ry: -14 };
const PUSH = { cx: 540, cy: 600, height: 1360 };

export async function buildProductMobile(ctx, T, open) {
  const { tl } = ctx;
  const END = T.end;
  const pose0 = { rx: 0, ry: 0, rz: 0, fov: 24, opacity: 1 };

  /* ================= the ground and the phone ================= */
  const mistScene = ctx.scene("a-mist", T.widen, END, { z: 3 });
  const mist = ctx.el("div", { class: "fill", style: { background: MIST } }, mistScene);
  open.clipDay(mist);

  const phoneScene = ctx.scene("a-phone", T.widen, END, { z: 5 });
  const phoneWrap = ctx.el("div", { class: "fill" }, phoneScene);
  open.clipDay(phoneWrap);
  const p = phone(ctx, { model: "island", parent: phoneWrap, env: "light", edge: "#ffffff" });
  Object.assign(p.pose, { ...HERO, ...pose0 });

  /* The pose, row by row (GSAP on p.pose only). */
  const P = p.pose;
  tl.fromTo(P, { cx: 540, cy: 1780, height: 1300, rx: 18, ry: -6, rz: 0, opacity: 1 }, { cy: HERO.cy, rx: 0, duration: 1.05, ease: "power3.out" }, T.widen + 0.02);
  tl.fromTo(P, { ry: -6 }, { ry: 6, duration: T.welcome - T.homes + 0.4, ease: "sine.inOut" }, T.homes);
  tl.to(P, { ry: 0, duration: 1.4, ease: "sine.inOut" }, T.welcome + 0.5);
  /* Row 06 -> 07: up to PHONE_HIGH as the home screen pushes in. */
  tl.to(P, { cy: HIGH.cy, height: HIGH.height, duration: 0.62, ease: "glide" }, T.rows[6] - 0.5);
  /* Row 07 -> 08: three-quarter right after the slide. */
  tl.to(P, { cx: TURN.cx, ry: TURN.ry, duration: 0.6, ease: "glide" }, T.buy + 0.1);
  /* Row 08 -> 09: back to PHONE_HIGH as the filter sheet rises. */
  tl.to(P, { cx: HIGH.cx, ry: 0, duration: 0.5, ease: "glide" }, T.filterPress + 0.04);
  /* Row 10: the push toward the cost section, slow, ready for the lift. */
  tl.to(P, { cx: PUSH.cx, cy: PUSH.cy, height: PUSH.height, duration: T.call - T.movein - 0.55, ease: "power2.inOut" }, T.movein + 0.5);

  /* ================= the screens (under the glass) ================= */
  const pages = {};
  const page = (id) => {
    const el = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", background: "#fff" } }, p.screen);
    ctx.img(ctx.src.display(id), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, el);
    pages[id] = el;
    return el;
  };
  /** Shows `el` from t0 to t1 (visibility only). */
  const life = (el, t0, t1) => {
    tl.set(el, { visibility: "hidden" }, 0);
    tl.set(el, { visibility: "visible" }, Math.max(0.001, t0));
    if (t1 != null) tl.set(el, { visibility: "hidden" }, t1);
  };
  /** An iOS push: `to` slides in from the right over `from`, which parts to the left and dims. */
  const slide = (from, to, t, dur = 0.42) => {
    tl.fromTo(to, { x: 1320 }, { x: 0, duration: dur, ease: "power3.out" }, t);
    tl.fromTo(from, { x: 0, filter: "brightness(1)" }, { x: -420, filter: "brightness(0.9)", duration: dur, ease: "power3.out" }, t);
  };

  const home1 = page("home-light");
  const stays = page("stays-light");
  const rest = page("restaurant-light");
  const welcome = page("welcome-1-lt");
  const home2 = page("home-light");
  const search = page("search-light");
  const sheetPage = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden" } }, p.screen);
  const listing = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden", background: "#f3f4f1" } }, p.screen);

  life(home1, T.widen, T.hotels + 0.45);
  life(stays, T.hotels, T.restaurants + 0.45);
  life(rest, T.restaurants, T.welcome + 0.45);
  life(welcome, T.welcome, T.rows[6] + 0.02);
  life(home2, T.rows[6] - 0.42, T.buy + 0.45);
  life(search, T.buy, T.need + 0.75);
  life(sheetPage, T.filterPress + 0.02, T.need + 0.75);
  life(listing, T.need + 0.28, null);
  slide(home1, stays, T.hotels);
  slide(stays, rest, T.restaurants);
  slide(rest, welcome, T.welcome);
  slide(home2, search, T.buy);
  /* Row 06 -> 07: the welcome gives way and the home screen pushes in. */
  tl.fromTo(home2, { scale: 1.1, opacity: 0, transformOrigin: "50% 45%" }, { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" }, T.rows[6] - 0.42);

  /* Row 05: the Hotels tile, then the Shortlets tile, lit (display px). */
  const lit = (box, t0, t1) => {
    const ring = ctx.el("div", {
      class: "abs",
      style: {
        left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, borderRadius: "42px",
        border: `8px solid ${ELECTRIC}`, background: "rgb(0 105 254 / 0.07)", boxShadow: "0 0 0 10px rgb(0 105 254 / 0.12)",
      },
    }, stays);
    tl.fromTo(ring, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, t0);
    if (t1) tl.to(ring, { opacity: 0, duration: 0.2, ease: "power2.out" }, t1);
  };
  lit({ x: 43, y: 1608, w: 603, h: 350 }, T.hotels + 0.3, T.shortlets);
  lit({ x: 673, y: 1608, w: 604, h: 350 }, T.shortlets, null);

  /* ================= big words: chips (rows 05-07) ================= */
  const words = ctx.scene("a-words", T.homes - 0.1, T.pill1 + 0.3, { z: 7 });
  const wordsWrap = ctx.el("div", { class: "fill" }, words);
  open.clipDay(wordsWrap);

  /* Row 05: one word at a time, alternating sides, each replacing the last. */
  const chipSpec = [
    { parts: [["Homes", true], [",", false]], size: 128, x: 60, y: 296, anchor: "left", r: -3, t0: T.homes, t1: T.hotels },
    { parts: [["hotels", true], [",", false]], size: 122, x: 940, y: 330, anchor: "right", r: 2.5, t0: T.hotels, t1: T.shortlets },
    { parts: [["shortlets", true]], size: 126, x: 60, y: 300, anchor: "left", r: -2, t0: T.shortlets, t1: T.restaurants },
    { parts: [["restaurants", true], ["…", false]], size: 112, x: 940, y: 322, anchor: "right", r: 2, t0: T.restaurants, t1: T.welcome + 0.34 },
  ];
  chipSpec.forEach((c, k) => {
    const { root } = wordChip(ctx, wordsWrap, { parts: c.parts, size: c.size, x: c.x, y: c.y, anchor: c.anchor });
    root.style.transformOrigin = c.anchor === "right" ? "100% 50%" : "0% 50%";
    const side = c.anchor === "right" ? 1 : -1;
    tl.fromTo(root, { x: side * 120, y: 30, rotation: c.r + side * 6, scale: 0.86, opacity: 0 }, { x: 0, y: 0, rotation: c.r, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.35)" }, c.t0 - 0.08);
    tl.to(root, { x: side * 90, y: -60, rotation: c.r + side * 5, scale: 0.9, opacity: 0, duration: 0.22, ease: "power2.in" }, c.t1 - 0.14);
  });

  /* ================= row 06: one app, one account ================= */
  const bodies = ctx.scene("a-bodies", T.all - 0.2, T.need + 0.6, { z: 6 });
  /* The Property | Stays pill, lifted off welcome-1-lt (display x 384-936, y 1989-2121) and shown large beside the phone. */
  const PILLD = { x: 384, y: 1989, w: 552, h: 132 };
  const pillBody = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${PILLD.w}px`, height: `${PILLD.h}px`, transformOrigin: "0 0", borderRadius: "66px", overflow: "hidden" } }, bodies);
  ctx.img(ctx.src.display("welcome-1-lt"), { class: "abs", style: { left: `${-PILLD.x}px`, top: `${-PILLD.y}px`, width: "1320px", height: "2868px", maxWidth: "none" } }, pillBody);
  const pillShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "66px", boxShadow: SHADOW, pointerEvents: "none" } }, pillBody);
  const pillTarget = { cx: 560, cy: 612, s: 0.62, r: -3 };
  const lift = { t0: T.all + 0.02, t1: T.one1 + 0.02, back0: T.accountEnd + 0.12, back1: T.accountEnd + 0.52 };
  ctx.onFrame((t) => {
    const on = t >= lift.t0 - 0.001 && t < lift.back1;
    pillBody.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    const from = displayRectQuad(P, W, H, PILLD);
    const to = rectQuad(pillTarget.cx, pillTarget.cy, PILLD.w * pillTarget.s, PILLD.h * pillTarget.s, pillTarget.r);
    const up = ctx.ease("back.out(1.3)")(ctx.progress(t, lift.t0, lift.t1));
    const down = ctx.ease("power3.inOut")(ctx.progress(t, lift.back0, lift.back1));
    const k = up * (1 - down);
    const hover = Math.sin((t - lift.t1) * 2.2) * 5 * k;
    placeOnQuad(pillBody, PILLD.w, PILLD.h, lerpQuad(from, to.map((q) => ({ x: q.x, y: q.y + hover })), k));
    pillShadow.style.opacity = String(k);
  });

  /* "One app." from the left, "One account." from the right, above the lifted pill. */
  const oneApp = wordChip(ctx, wordsWrap, { parts: [["One", true], [" app.", false]], size: 100, x: 70, y: 280, anchor: "left" });
  const oneAcc = wordChip(ctx, wordsWrap, { parts: [["One", true], [" account.", false]], size: 100, x: 940, y: 402, anchor: "right" });
  oneApp.root.style.transformOrigin = "0% 50%";
  oneAcc.root.style.transformOrigin = "100% 50%";
  tl.fromTo(oneApp.root, { x: -160, rotation: -8, opacity: 0, scale: 0.9 }, { x: 0, rotation: -2, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.3)" }, T.one1 - 0.08);
  tl.fromTo(oneAcc.root, { x: 160, rotation: 8, opacity: 0, scale: 0.9 }, { x: 0, rotation: 2, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.3)" }, T.one2 - 0.08);
  tl.to(oneApp.root, { x: -140, opacity: 0, duration: 0.26, ease: "power2.in" }, lift.back0);
  tl.to(oneAcc.root, { x: 140, opacity: 0, duration: 0.26, ease: "power2.in" }, lift.back0 + 0.04);

  /* ================= row 07: "Looking for a home?" -> the pill ================= */
  const q = ctx.el("div", {
    class: "abs",
    style: {
      left: "540px", top: "282px", zIndex: "3", whiteSpace: "nowrap",
      padding: "18px 40px 24px", borderRadius: "40px", background: "rgb(255 255 255 / 0.97)", boxShadow: SHADOW,
      border: "1px solid rgb(11 18 48 / 0.05)", font: "700 82px/1.06 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: NAVY,
    },
  }, wordsWrap);
  const qWords = [["Looking", T.looking], ["for", T.for4], ["a", T.home - 0.03], ["home", T.home, true], ["?", T.home + 0.12]];
  qWords.forEach(([text, t, blue], k) => {
    const s = ctx.el("span", { text: k < qWords.length - 2 ? `${text} ` : text, style: { display: "inline-block", whiteSpace: "pre", ...(blue ? { color: ELECTRIC } : {}) } }, q);
    tl.fromTo(s, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, ease: "power3.out" }, t - 0.05);
  });
  tl.fromTo(q, { scale: 0.92, opacity: 0, xPercent: -50, x: 0 }, { scale: 1, opacity: 1, xPercent: -50, duration: 0.4, ease: "back.out(1.4)" }, T.looking - 0.1);
  /* It shrinks into the PILL box (y 236-316) as the chapter pill takes over. */
  tl.to(q, { y: -26, scale: 0.4, duration: 0.3, ease: "power3.in" }, T.pill1 - 0.3);
  tl.to(q, { opacity: 0, duration: 0.12, ease: "power1.in" }, T.pill1 - 0.1);

  /* ================= the pointer (hovering above the glass) ================= */
  const pointerScene = ctx.scene("a-pointer", T.rows[6] + 0.2, T.need + 0.6, { z: 10 });
  const pointer = orb(ctx, pointerScene);
  const RENT_D = { x: 524, y: 1840 };
  const rentAt = displayToStage({ ...HIGH, ...pose0 }, W, H, RENT_D.x, RENT_D.y);
  const FILTER_D = { x: 1195, y: 481 };
  const filterAt = displayToStage({ ...TURN, rx: 0, rz: 0, fov: 24 }, W, H, FILTER_D.x, FILTER_D.y);
  tl.fromTo(pointer, { x: 1150, y: 1060, opacity: 1 }, { x: rentAt.x, y: rentAt.y, duration: 0.62, ease: "glide" }, T.rent - 0.72);
  press(ctx, pointer, T.rent, { ringParent: pointerScene, x: rentAt.x, y: rentAt.y, sound: null });
  tap(ctx, home2, { x: RENT_D.x, y: RENT_D.y, t: T.rent, size: 300, sound: null });
  tl.to(pointer, { x: 1160, y: 900, duration: 0.5, ease: "power2.in" }, T.buy);
  /* Row 08: to the filter button, pressed at 18.30. */
  tl.fromTo(pointer, { x: 1160, y: 520 }, { x: filterAt.x, y: filterAt.y, duration: 0.55, ease: "glide" }, T.filterPress - 0.62);
  press(ctx, pointer, T.filterPress, { ringParent: pointerScene, x: filterAt.x, y: filterAt.y, sound: null });
  tap(ctx, search, { x: FILTER_D.x, y: FILTER_D.y, t: T.filterPress, size: 240, sound: null });

  /* ================= row 08: search across Nigeria ================= */
  /* The results settle up into place as the screen arrives (the list scrolls; the header stays). */
  const listCut = 1190;
  const listWin = ctx.el("div", { class: "abs", style: { left: "0px", top: `${listCut}px`, width: "1320px", height: `${2868 - listCut}px`, overflow: "hidden", background: "#f3f4f1" } }, search);
  const listImg = ctx.img(ctx.src.display("search-light"), { class: "abs", style: { left: "0px", top: `${-listCut}px`, width: "1320px", height: "2868px" } }, listWin);
  /* keep the floating nav bar and Map button fixed on top */
  const navCut = 2430;
  const nav = ctx.el("div", { class: "abs", style: { left: "0px", top: `${navCut}px`, width: "1320px", height: `${2868 - navCut}px`, overflow: "hidden" } }, search);
  ctx.img(ctx.src.display("search-light"), { class: "abs", style: { left: "0px", top: `${-navCut}px`, width: "1320px", height: "2868px" } }, nav);
  tl.fromTo(listImg, { y: 260 }, { y: 0, duration: 1.1, ease: "power3.out" }, T.buy + 0.12);

  /* The Nigeria outline to the phone's left (behind it), drawn as it is said, with the five cities. */
  const mapScene = ctx.scene("a-map", T.rows[7] - 0.2, T.filterPress + 0.5, { z: 4 });
  const MAP = { x: 46, y: 372, w: 560 };
  const ng = await nigeriaOutline(MAP);
  const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${W}px`, height: `${H}px` } }, mapScene);
  svg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"><path d="${ng.d}" stroke="${ELECTRIC}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="rgb(0 105 254 / 0)"/></svg>`;
  const path = svg.querySelector("path");
  tl.fromTo(path, { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 1.1, ease: "power2.inOut" }, T.rows[7] - 0.05);
  tl.fromTo(path, { attr: { fill: "rgb(0 105 254 / 0)" } }, { attr: { fill: "rgb(0 105 254 / 0.05)" }, duration: 0.5, ease: "power1.out" }, T.rows[7] + 0.9);
  tl.to(svg, { opacity: 0, duration: 0.3, ease: "power2.in" }, T.filterPress);
  const labelSide = { Lagos: "below", Abuja: "left", Kano: "left", "Port Harcourt": "right", Ibadan: "above" };
  CITIES.forEach((c, k) => {
    const pt = ng.proj(c.lon, c.lat);
    const dot = ctx.el("div", { class: "abs", style: { left: `${pt.x - 9}px`, top: `${pt.y - 9}px`, width: "18px", height: "18px", borderRadius: "50%", background: ELECTRIC, boxShadow: "0 0 0 6px rgb(0 105 254 / 0.16)" } }, svg);
    const side = labelSide[c.name];
    const label = ctx.el("div", {
      class: "abs",
      text: c.name,
      style: {
        font: "600 26px/1 Inter, sans-serif", color: NAVY, whiteSpace: "nowrap", letterSpacing: "-0.01em",
        ...(side === "left" ? { right: `${W - pt.x + 18}px`, top: `${pt.y - 13}px` } : {}),
        ...(side === "right" ? { left: `${pt.x + 18}px`, top: `${pt.y - 13}px` } : {}),
        ...(side === "above" ? { left: `${pt.x - 10}px`, top: `${pt.y - 46}px` } : {}),
        ...(side === "below" ? { left: `${pt.x - 10}px`, top: `${pt.y + 20}px` } : {}),
      },
    }, svg);
    const t = T.dots[k];
    tl.fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)" }, t);
    tl.fromTo(label, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, t + 0.03);
  });

  /* The two result cards lift off the list (Maitama, Banana Island) and drop back as the sheet rises. */
  const CARDS = [
    { x: 48, y: 1212, w: 594, h: 1204, to: { cx: 548, cy: 760, rot: -3 } },
    { x: 679, y: 1212, w: 594, h: 1204, to: { cx: 818, cy: 700, rot: 3 } },
  ];
  const liftT = { t0: T.search + 0.1, t1: T.search + 0.62, b0: T.filterPress - 0.34, b1: T.filterPress - 0.04 };
  const cardScale = 0.47;
  CARDS.forEach((c, k) => {
    const body = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${c.w}px`, height: `${c.h}px`, transformOrigin: "0 0", borderRadius: "40px", overflow: "hidden", background: "#fff" } }, bodies);
    ctx.img(ctx.src.display("search-light"), { class: "abs", style: { left: `${-c.x}px`, top: `${-c.y}px`, width: "1320px", height: "2868px", maxWidth: "none" } }, body);
    const sh = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", boxShadow: SHADOW, pointerEvents: "none" } }, body);
    const t0 = liftT.t0 + k * 0.12;
    ctx.onFrame((t) => {
      const on = t >= t0 && t < liftT.b1;
      body.style.visibility = on ? "visible" : "hidden";
      if (!on) return;
      /* where the card sits on the glass right now (the list has its own scroll) */
      const scrollY = Number(ctx.gsap.getProperty(listImg, "y")) || 0;
      const from = displayRectQuad(P, W, H, { x: c.x, y: c.y + scrollY, w: c.w, h: c.h });
      const to = rectQuad(c.to.cx, c.to.cy, c.w * cardScale, c.h * cardScale, c.to.rot);
      const k1 = ctx.ease("back.out(1.2)")(ctx.progress(t, t0, t0 + (liftT.t1 - liftT.t0)));
      const k2 = ctx.ease("power3.in")(ctx.progress(t, liftT.b0 + k * 0.04, liftT.b1));
      const m = k1 * (1 - k2);
      const hover = Math.sin((t - t0) * 2.4 + k) * 4 * m;
      placeOnQuad(body, c.w, c.h, lerpQuad(from, to.map((pt) => ({ x: pt.x, y: pt.y + hover })), m));
      sh.style.opacity = String(m);
    });
  });

  /* ================= row 09: filter by exactly what you need ================= */
  buildFilters(ctx, T, { p, P, sheetPage, bodies, pointer, pointerScene, search });

  /* ================= row 10: the Maitama villa's listing, scrolled to its costs ================= */
  const SB = 186; // status bar
  const BAR = 2490; // the sticky move-in bar
  const listingWin = ctx.el("div", { class: "abs", style: { left: "0px", top: `${SB}px`, width: "1320px", height: `${BAR - SB}px`, overflow: "hidden" } }, listing);
  const lA = ctx.img(ctx.src.display("listing-lt"), { class: "abs", style: { left: "0px", top: `${-SB}px`, width: "1320px", height: "2868px" } }, listingWin);
  const lB = ctx.img(ctx.src.display("listing-cost-light"), { class: "abs", style: { left: "0px", top: `${-SB}px`, width: "1320px", height: "2868px" } }, listingWin);
  const fixedTop = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: `${SB}px`, overflow: "hidden" } }, listing);
  ctx.img(ctx.src.display("listing-cost-light"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, fixedTop);
  const fixedBar = ctx.el("div", { class: "abs", style: { left: "0px", top: `${BAR}px`, width: "1320px", height: `${2868 - BAR}px`, overflow: "hidden" } }, listing);
  ctx.img(ctx.src.display("listing-lt"), { class: "abs", style: { left: "0px", top: `${-BAR}px`, width: "1320px", height: "2868px" } }, fixedBar);
  const D = BAR - SB;
  tl.fromTo(lA, { y: 0 }, { y: -D, duration: 0.62, ease: "power3.inOut" }, T.movein - 0.05);
  tl.fromTo(lB, { y: D }, { y: 0, duration: 0.62, ease: "power3.inOut" }, T.movein - 0.05);
  /* the listing arrives (a push from the right, over the sheet) */
  tl.fromTo(listing, { x: 1320 }, { x: 0, duration: 0.44, ease: "power3.out" }, T.need + 0.28);

  return { p, P, pages, listing, phoneScene, bodies, pointer, pointerScene, mistScene, HIGH, PUSH };
}

/* ---------- row 09 ---------- */

/**
 * The filter sheet. The light capture of the unselected sheet failed
 * (filters-lt shows "upstream request failed"), so the sheet is the real
 * filters-villas-lt capture with its pre-press state re-drawn on top from the
 * same capture's own parts and the product's real values (FACTS.md: "Apply
 * (52)" with every type, `filters`): All selected, Villas not, Apply (52).
 */
function buildFilters(ctx, T, { P, sheetPage, bodies, pointer, pointerScene }) {
  const { tl } = ctx;
  const SHEET_TOP = 150;
  const sheetWin = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", overflow: "hidden" } }, sheetPage);
  const dim = ctx.el("div", { class: "abs", style: { inset: "0px", background: "rgb(11 18 48 / 0.28)" } }, sheetWin);
  const sheet = ctx.el("div", { class: "abs", style: { left: "0px", top: `${SHEET_TOP}px`, width: "1320px", height: `${2868 - SHEET_TOP}px`, overflow: "hidden", borderRadius: "56px 56px 0 0", background: "#fff" } }, sheetWin);
  ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "0px", top: `${-SHEET_TOP}px`, width: "1320px", height: "2868px" } }, sheet);
  /* the status bar stays where it is */
  const sb = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: `${SHEET_TOP}px`, overflow: "hidden" } }, sheetPage);
  ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px" } }, sb);
  tl.fromTo(dim, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, T.filterPress + 0.02);
  tl.fromTo(sb, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }, T.filterPress + 0.12);
  tl.fromTo(sheet, { y: 2700 }, { y: 0, duration: 0.46, ease: "power3.out" }, T.filterPress + 0.02);

  /* The pre-press state, in the sheet's own coordinates (display px minus SHEET_TOP). */
  const at = (x, y) => ({ left: `${x}px`, top: `${y - SHEET_TOP}px` });
  const TILE = { w: 393, h: 248 };
  const blue = "linear-gradient(180deg, #3b8dfc 0px, #3b8dfc 3px, #0b6cf4 5px, #0a6bf3 30%, #0061e8 100%)";
  const allOn = ctx.el("div", { class: "abs", style: { ...at(48, 609), width: `${TILE.w}px`, height: `${TILE.h}px`, borderRadius: "40px", background: blue, boxShadow: "inset 0 0 0 2px rgb(0 76 196 / 0.9)" } }, sheet);
  allOn.innerHTML = `<svg class="abs" style="left:${213 - 48 - 3}px;top:${678 - 609 - 3}px" width="64" height="65" viewBox="0 0 64 65" fill="none" stroke="#fff" stroke-width="6.2"><rect x="4" y="4" width="22" height="22.5" rx="7"/><rect x="38" y="4" width="22" height="22.5" rx="7"/><rect x="4" y="38.5" width="22" height="22.5" rx="7"/><rect x="38" y="38.5" width="22" height="22.5" rx="7"/></svg>`;
  ctx.el("div", { class: "abs", text: "All", style: { left: "0px", right: "0px", top: `${755 - 609}px`, textAlign: "center", font: "600 39px/1.2 Inter, sans-serif", color: "#fff", letterSpacing: "-0.005em" } }, allOn);
  const check = (parent, x, y) => {
    const s = ctx.el("div", { class: "abs", style: { left: `${x}px`, top: `${y}px`, width: "40px", height: "30px" } }, parent);
    s.innerHTML = `<svg width="40" height="30" viewBox="0 0 40 30" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15 L14 26 L37 3"/></svg>`;
  };
  check(allOn, 383 - 48, 900 - 879);
  const villasOff = (parent, style) => {
    const t = ctx.el("div", { class: "abs", style: { width: `${TILE.w}px`, height: `${TILE.h}px`, borderRadius: "40px", background: "#fff", boxShadow: "inset 0 0 0 3px #ececec", ...style } }, parent);
    ctx.img("/repo/apps/web/public/brand/3d/villa@2x.webp", { class: "abs", style: { left: `${245 - 48 - 62}px`, top: `${977 - 879 - 62}px`, width: "124px", height: "124px" } }, t);
    ctx.el("div", { class: "abs", text: "Villas", style: { left: "0px", right: "0px", top: `${1049 - 879}px`, textAlign: "center", font: "600 40px/1.2 Inter, sans-serif", color: "#45494f", letterSpacing: "-0.005em" } }, t);
    return t;
  };
  const villasOffScreen = villasOff(sheet, at(48, 879));
  const APPLY = { x: 573, y: 2640, w: 698, h: 179 };
  const applyGrad = "linear-gradient(180deg, #1a74ff 0%, #3c93ff 1.5%, #1974ff 5%, #0b6cff 34%, #0065fb 66%, #015eec 100%)";
  const applyOnScreen = ctx.el("div", { class: "abs", style: { ...at(APPLY.x, APPLY.y), width: `${APPLY.w}px`, height: `${APPLY.h}px`, borderRadius: "42px", background: applyGrad, display: "flex", alignItems: "center", justifyContent: "center", font: "600 52px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em" } }, sheet);
  const applyText = ctx.el("span", {}, applyOnScreen);
  ctx.text(applyText, (t) => (t < T.exactly + 0.2 ? "Apply (52)" : "Apply (3)"));

  /* The press on "exactly": Villas lights, All goes off, the count becomes 3 (the real capture shows through). */
  tl.fromTo(villasOffScreen, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: "power2.out" }, T.exactly);
  tl.fromTo(allOn, { opacity: 1 }, { opacity: 0, duration: 0.2, ease: "power2.out" }, T.exactly + 0.02);
  tl.fromTo(applyOnScreen, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "power2.out" }, T.exactly + 0.5);

  /* ---------- the two bodies, lifted large above the phone (y 330-560) ---------- */
  const HIGHP = { cx: 540, cy: 640, height: 1180, rx: 0, ry: 0, rz: 0, fov: 24 };
  const liftIn = { t0: T.filterPress + 0.42, t1: T.filterPress + 0.9 };
  const back = { t0: T.need + 0.1, t1: T.need + 0.34 };
  /* The Villas tile: re-drawn off (white), and the real capture's lit tile over it, revealed from the press. */
  const tileBody = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${TILE.w}px`, height: `${TILE.h}px`, transformOrigin: "0 0" } }, bodies);
  villasOff(tileBody, { left: "0px", top: "0px" });
  const tileOn = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${TILE.w}px`, height: `${TILE.h}px`, borderRadius: "40px", overflow: "hidden" } }, tileBody);
  ctx.img(ctx.src.display("filters-villas-lt"), { class: "abs", style: { left: "-48px", top: "-879px", width: "1320px", height: "2868px", maxWidth: "none" } }, tileOn);
  const tileShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "40px", boxShadow: SHADOW, pointerEvents: "none" } }, tileBody);
  const tileTarget = { cx: 258, cy: 445, s: 0.8, r: -3 };
  const tileHit = { x: tileTarget.cx + 20, y: tileTarget.cy + 10 };
  ctx.onFrame((t) => {
    const reveal = ctx.ease("power2.out")(ctx.progress(t, T.exactly, T.exactly + 0.34));
    tileOn.style.clipPath = `circle(${(reveal * 480).toFixed(1)}px at ${TILE.w / 2 + 20}px ${TILE.h / 2 + 10}px)`;
  });
  /* The Apply button: re-drawn, its count rolling 52 -> 3 on the press. */
  const applyBody = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${APPLY.w}px`, height: `${APPLY.h}px`, transformOrigin: "0 0", borderRadius: "42px", background: applyGrad, display: "flex", alignItems: "center", justifyContent: "center", font: "600 52px/1 Inter, sans-serif", color: "#fff", letterSpacing: "-0.01em", overflow: "hidden" } }, bodies);
  const applyShadow = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "42px", boxShadow: SHADOW, pointerEvents: "none" } }, applyBody);
  ctx.el("span", { text: "Apply (", style: { whiteSpace: "pre" } }, applyBody);
  const count = ctx.el("span", { style: { position: "relative", display: "inline-block", height: "1.1em", overflow: "hidden", verticalAlign: "top" } }, applyBody);
  const c52 = ctx.el("span", { text: "52", style: { display: "block", lineHeight: "1.1em" } }, count);
  const c3 = ctx.el("span", { text: "3", style: { position: "absolute", left: "0px", right: "0px", top: "0px", display: "block", lineHeight: "1.1em", textAlign: "center" } }, count);
  ctx.el("span", { text: ")" }, applyBody);
  const roll0 = T.exactly + 0.1;
  tl.fromTo(c52, { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, duration: 0.34, ease: "power3.in" }, roll0);
  tl.fromTo(c3, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.42, ease: "back.out(2)" }, roll0 + 0.26);
  tl.fromTo(count, { width: "2.2ch" }, { width: "1.1ch", duration: 0.3, ease: "power3.inOut" }, roll0 + 0.2);
  const applyTarget = { cx: 718, cy: 452, s: 0.62, r: 2 };
  const applyHit = { x: applyTarget.cx + 30, y: applyTarget.cy + 4 };

  const lifted = [
    { node: tileBody, shadow: tileShadow, d: { x: 48, y: 879, w: TILE.w, h: TILE.h }, to: tileTarget, delay: 0 },
    { node: applyBody, shadow: applyShadow, d: APPLY, to: applyTarget, delay: 0.1 },
  ];
  lifted.forEach((b) => {
    ctx.onFrame((t) => {
      const on = t >= liftIn.t0 + b.delay && t < back.t1 + b.delay;
      b.node.style.visibility = on ? "visible" : "hidden";
      if (!on) return;
      const from = displayRectQuad(P, 1080, 1920, { x: b.d.x, y: b.d.y, w: b.d.w, h: b.d.h });
      const to = rectQuad(b.to.cx, b.to.cy, b.d.w * b.to.s, b.d.h * b.to.s, b.to.r);
      const k1 = ctx.ease("back.out(1.25)")(ctx.progress(t, liftIn.t0 + b.delay, liftIn.t1 + b.delay));
      const k2 = ctx.ease("power3.in")(ctx.progress(t, back.t0 + b.delay, back.t1 + b.delay));
      const m = k1 * (1 - k2);
      const hover = Math.sin((t - liftIn.t0) * 2.1 + b.delay * 9) * 4 * m;
      /* a small dip under the pointer's press */
      const hitT = b.node === tileBody ? T.exactly : T.need;
      const dip = 1 - 0.04 * Math.sin(Math.PI * ctx.progress(t, hitT - 0.06, hitT + 0.2));
      const toQ = to.map((pt) => ({ x: b.to.cx + (pt.x - b.to.cx) * dip, y: b.to.cy + (pt.y - b.to.cy) * dip + hover }));
      placeOnQuad(b.node, b.d.w, b.d.h, lerpQuad(from, toQ, m));
      b.shadow.style.opacity = String(m);
    });
  });

  /* The pointer: Villas on "exactly", Apply on "need". */
  tl.to(pointer, { x: tileHit.x, y: tileHit.y, duration: 0.62, ease: "glide" }, T.exactly - 0.72);
  press(ctx, pointer, T.exactly, { ringParent: pointerScene, x: tileHit.x, y: tileHit.y, sound: null });
  tl.to(pointer, { x: applyHit.x, y: applyHit.y, duration: 0.55, ease: "glide" }, T.need - 0.66);
  press(ctx, pointer, T.need, { ringParent: pointerScene, x: applyHit.x, y: applyHit.y, sound: null });
  tl.to(pointer, { x: 1180, y: 1000, opacity: 0, duration: 0.4, ease: "power2.in" }, T.need + 0.16);
}
