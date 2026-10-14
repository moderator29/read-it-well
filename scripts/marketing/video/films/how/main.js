/**
 * VIDEO ONE, "How Vallo works" (films/how/timeline.json, 2:28), both formats.
 *
 * One phone carries the film: it rises after "Meet Vallo" and every chapter
 * is a real screen on it, tapped by the glossy pointer, with real parts of
 * the screen lifted off beside it as the voice names them. The desktop film
 * keeps the phone on the left, with the web app's window, the lifted parts
 * and the words on the right. Claims and figures: FACTS-OCT.md.
 */
import { nigeriaMap3d, poster, sceneBack, installFocus, momentCard, calendarCard, noticeCard, priceCard, proofCard, listCard, flowRail, STAY_CARDS, listingWall, flagCard, nigeriaMap, anchors, ground, flash, hero, lift, headline, kicker, liveChip, numberCard, notify, chipRow, featureCard, ending, ringBurst, windowRig, ramp, opa, during, place } from "../kit.js";

export async function build(ctx) {
  const M = ctx.isMobile;
  const { s, e, w } = anchors(ctx);
  const H = await hero(ctx, { model: "island", env: "dark", edge: "#040a2e" });

  /* ---------- poses ---------- */
  const HOME = M ? { cx: 540, cy: 1075, height: 1380 } : { cx: 590, cy: 575, height: 940 };
  const LOW = M ? { cx: 540, cy: 1255, height: 1180 } : { cx: 560, cy: 585, height: 900 };
  const LEFT = M ? { cx: 700, cy: 1100, height: 1300 } : { cx: 470, cy: 575, height: 880 };
  const off = (p, dy = M ? 1750 : 1200) => ({ ...p, cy: p.cy + dy });
  /* slots for lifted parts and words */
  const R = M
    ? { l1: { x: 255, y: 560 }, r1: { x: 825, y: 610 }, l2: { x: 250, y: 1010 }, r2: { x: 830, y: 1060 }, top: 410, cx: 540, size: 86 }
    : { l1: { x: 1170, y: 330 }, r1: { x: 1580, y: 360 }, l2: { x: 1170, y: 700 }, r2: { x: 1580, y: 730 }, top: 210, cx: 1390, size: 76 };
  const HX = M ? 60 : 1000; // headline left
  const TS = M ? 0.6 : 0.58; // a lifted tile's scale (stage px per display px)
  const RS = M ? 0.66 : 0.6; // a lifted row's scale
  const ROW = (i) => ({ x: R.cx, y: (M ? [500, 730, 960, 1190] : [250, 450, 650, 850])[i] });
  const BS = TS;

  const path = [
    [0, { ...off(HOME), opacity: 0 }],
    [7.95, { ...off(HOME), opacity: 1 }, "none"],
    [8.75, { ...HOME, rx: 0, ry: 0 }, "power3.out"],
    [s(4) - 0.2, { ...HOME }],
    [s(4) + 0.5, { ...LOW }],
    [s(5) - 0.2, { ...LOW }],
    [s(5) + 0.4, { ...HOME }],
    /* the cost: a push onto the listing's price, then back for the lines */
    [s(7) + 0.2, { ...HOME }],
    [s(7) + 1.1, H.aim(660, 1350, M ? 1900 : 1250, M ? 540 : 590, M ? 900 : 540)],
    [s(8) - 0.25, H.aim(660, 1350, M ? 1900 : 1250, M ? 540 : 590, M ? 900 : 540)],
    [s(8) + 0.4, { ...HOME }],
    [w(8, "added") - 0.5, { ...HOME }],
    [w(8, "added") + 0.2, { ...LOW }],
    [s(9) - 0.1, { ...LOW }],
    [s(9) + 0.5, { ...HOME }],
    /* the call: a push onto the thread's header */
    [w(12, "call") - 0.6, { ...HOME }],
    [w(12, "call") + 0.1, H.aim(1000, 360, M ? 2300 : 1500, M ? 640 : 700, M ? 760 : 420)],
    [w(12, "viewing") - 0.5, H.aim(1000, 360, M ? 2300 : 1500, M ? 640 : 700, M ? 760 : 420)],
    [w(12, "viewing") + 0.2, { ...HOME }],
    /* the flag: the phone steps back for the card */
    [s(14) - 0.2, { ...HOME }],
    [s(14) + 0.5, { ...LOW }],
    [s(15) - 0.3, { ...LOW }],
    [s(16) + 0.2, { ...LOW }],
    [s(18) - 0.3, { ...LOW }],
    [s(18) + 0.4, { ...HOME }],
    /* the money promise: the phone leaves, the words carry it, it returns */
    [s(24) - 0.2, { ...HOME }],
    [s(24) + 0.6, { ...off(HOME), ry: -18 }, "power3.in"],
    [s(26) - 0.6, { ...off(HOME), ry: 14 }, "none"],
    [s(26) + 0.2, { ...LOW, ry: 0 }, "power3.out"],
    [s(27) - 0.2, { ...LOW }],
    [s(27) + 0.5, { ...HOME }],
    [s(33) - 0.9, { ...HOME }],
    [s(33) - 0.05, { ...off(HOME), rz: -8, ry: 20 }, "power3.in"],
    [ctx.duration, { ...off(HOME), opacity: 0 }, "none"],
  ];
  H.path(path);
  H.swing(s(5) - 0.6, s(7) - 0.2, s(9) - 0.1, s(11) - 0.2, s(18) - 0.2, s(20) - 0.2, s(22) - 0.2, s(27) - 0.2, s(28) - 0.2, s(31) - 0.2);

  const layer = (id, t0, t1, z = 760) => ctx.scene(id, t0, t1, { z });

  /* ===================== 1. Opening: the gamble (0 - 6.9) ===================== */
  ground(ctx, 0, s(2) + 0.1, { tone: "navy", y: 30, seed: 11 });
  const open = layer("open", 0, s(2) + 0.1);
  /* the frame a chat shows before anyone presses play: composed at t = 0 */
  poster(ctx, open, { t1: s(1) - 0.15 });
  const big = M ? 104 : 112;
  headline(ctx, open, { lines: [[["Finding a place", false]], [["in ", false], ["Nigeria", true]]], x: M ? 60 : 160, y: M ? 560 : 260, size: big, t0: s(1) - 0.05, t1: s(2) - 0.55, stagger: 0.05 });
  headline(ctx, open, { lines: [[["shouldn't feel like", false]], [["a gamble.", true]]], x: M ? 60 : 160, y: M ? 560 + big * 2.25 : 260 + big * 2.25, size: big, t0: w(1, "shouldn't") - 0.05, t1: s(2) - 0.5, stagger: 0.05 });
  await nigeriaMap3d(ctx, open, { x: M ? 150 : 1090, y: M ? 1120 : 250, w: M ? 790 : 700, t0: s(1) - 0.05, t1: s(2) - 0.4, tTrails: s(1) + 0.55, gap: 0.26, labels: true, cities: 6 });
  const die = ctx.sticker("1f3b2", M ? 210 : 190, open, { class: "abs", style: { left: "0px", top: "0px" } });
  during(ctx, 0, s(2) + 0.1, (t) => {
    const u = ramp(ctx, t, w(1, "gamble") - 0.2, w(1, "gamble") + 0.5, "back.out(1.7)");
    const out = ramp(ctx, t, s(2) - 0.55, s(2) - 0.15, "power2.in");
    place(die, { x: M ? 880 : 1720, y: (M ? 430 : 860) - out * 200, s: 0.4 + 0.6 * u, r: (1 - u) * 160 + t * 18, o: Math.min(u, 1 - out) });
  });
  ctx.sfx("pop", w(1, "gamble"), { offset: -2 });
  ctx.hideCaptions(s(1) - 0.2, s(2) + 0.1);

  /* ===================== 2. Meet Vallo (6.9 - 8.2) ===================== */
  flash(ctx, s(2), { color: "rgb(0 105 254 / 0.7)" });
  ground(ctx, s(2) - 0.05, s(4) + 0.6, { tone: "electric", y: 20, seed: 12 });
  const meet = layer("meet", s(2) - 0.05, s(3) + 1.2, 780);
  const mark = ctx.img(ctx.src.asset("logo-mark.png"), { class: "abs", style: { left: "0px", top: "0px", width: "300px", height: "300px", objectFit: "contain" } }, meet);
  const word = ctx.img(ctx.src.asset("logo-wordmark.png"), { class: "abs", style: { left: "0px", top: "0px", width: M ? "560px" : "520px", height: "auto" } }, meet);
  during(ctx, s(2) - 0.05, s(3) + 1.2, (t) => {
    const a = ramp(ctx, t, s(2), s(2) + 0.55, "back.out(1.8)");
    const up = ramp(ctx, t, s(3) - 0.3, s(3) + 0.6, "power3.inOut");
    const cy = M ? 820 : 430;
    place(mark, { x: ctx.W / 2, y: cy - up * (M ? 480 : 360), s: (0.3 + 0.7 * a) * (1 - 0.55 * up), r: (1 - a) * -40, o: ramp(ctx, t, s(2), s(2) + 0.15) * (1 - ramp(ctx, t, s(3) + 0.6, s(3) + 1.1)) });
    const b = ramp(ctx, t, s(2) + 0.25, s(2) + 0.8, "land");
    place(word, { x: ctx.W / 2, y: cy + (M ? 270 : 230) + (1 - b) * 40 - up * 600, s: 1, o: b * (1 - up) });
  });
  ringBurst(ctx, meet, { cx: ctx.W / 2, cy: M ? 820 : 430, r: 210, t: s(2) + 0.05, seed: 21 });
  ctx.sfx("impact_soft", s(2), { offset: 0 });
  ctx.hideCaptions(s(2) - 0.1, s(2) + 1.1);

  /* ===================== 3. One app: homes, hotels, shortlets, restaurants ===================== */
  H.show("n-home2", 7.9, s(3) + 1.0, { enter: "cut", full: "n-home2-full", scroll: [[7.9, 1500], [w(3, "Homes") + 0.05, 3000, "power3.out"]] });
  H.show("n-stays", s(3) + 1.0, s(4) + 0.6, { enter: "slide" });
  H.tap(s(3) + 0.85, 660, 1600);
  if (M) {
    lift(ctx, H, { id: "n-home2", src: ctx.src.capture("n-home2-full"), scrolled: 3000, crop: { x: 100, y: 3690, w: 1110, h: 1030 }, t0: w(3, "Homes") + 0.05, t1: w(3, "one") - 0.2, to: { x: 300, y: 720, s: 0.4, r: -5 }, seed: 1, radius: 60, label: "Premium listings" });
    lift(ctx, H, { id: "n-stays", crop: { x: 45, y: 1600, w: 590, h: 420 }, t0: w(3, "hotels"), t1: w(3, "one") - 0.15, to: { x: 805, y: 520, s: TS, r: 5 }, seed: 2 });
    lift(ctx, H, { id: "n-stays", crop: { x: 645, y: 1600, w: 630, h: 420 }, t0: w(3, "shortlets"), t1: w(3, "one") - 0.1, to: { x: 795, y: 900, s: TS, r: -6 }, seed: 3 });
    lift(ctx, H, { id: "n-stays", crop: { x: 45, y: 2045, w: 590, h: 420 }, t0: w(3, "restaurants"), t1: w(3, "one") - 0.05, to: { x: 300, y: 1240, s: TS, r: 4 }, seed: 4 });
  } else {
    /* THE DESKTOP CUT SHOWS THE DESKTOP. Four parts lifted off a phone, in a
       16:9 frame, was the phone film in a wider box: the founder said so.
       Here the same ground is covered by the site itself, in a window
       beside the phone, scrolling from Premium to Featured. */
    const WH = windowRig(ctx);
    WH.path([
      [w(3, "Homes") - 0.5, { x: 2000, y: 170, s: 0.62, opacity: 1 }],
      [w(3, "Homes") + 0.35, { x: 960, y: 170, s: 0.62, opacity: 1 }, "power3.out"],
      [w(3, "one") - 0.45, { x: 960, y: 170, s: 0.62, opacity: 1 }],
      [w(3, "one") + 0.15, { x: 2000, y: 170, s: 0.62, opacity: 1 }, "power3.in"],
      [w(3, "one") + 0.25, { x: 2000, y: 170, s: 0.62, opacity: 0 }, "none"],
      [ctx.duration, { x: 2000, y: 170, s: 0.62, opacity: 0 }, "none"],
    ]);
    WH.show("d-n-home-premium", w(3, "Homes") - 0.5, w(3, "one") + 0.25, { enter: "cut" });
    WH.show("d-n-home-featured", w(3, "restaurants") - 0.2, w(3, "one") + 0.25, { enter: "rise", dur: 0.6 });
  }
  const one = layer("one", s(3), s(4) + 0.4);
  kicker(ctx, one, { text: "Premium listings", icon: "gem", x: R.cx, y: M ? 1600 : 170, t0: w(3, "Homes") + 0.2, t1: w(3, "one") - 0.25, size: M ? 32 : 28, anchor: "center" });
  chipRow(ctx, one, { items: [["One app", "smartphone"], ["One account", "user-round-check"]], x: R.cx, y: M ? 1600 : 170, t0: w(3, "one"), t1: s(4) - 0.2, size: M ? 34 : 30, anchor: "center" });

  /* ===================== 4. How it works: search, filter, save, compare ===================== */
  listingWall(ctx, layer("wall1", s(4) - 0.5, w(6, "Filter") + 1.2, 3), { t0: s(4) - 0.4, t1: w(6, "Filter") + 0.3, rows: M ? 5 : 3, opacity: 0.52, seed: 11, y: M ? 260 : 60, stays: STAY_CARDS(ctx), stayRows: [1, 3] });
  const how = layer("how", s(4) - 0.1, s(5) + 0.5);
  headline(ctx, how, { lines: [[["Here's how it ", false], ["works.", true]]], x: M ? R.cx : 1000, y: M ? R.top : 420, size: M ? 88 : 92, t0: s(4), t1: s(5) - 0.15, align: M ? "center" : "left" });
  ground(ctx, s(4) + 0.55, s(7) + 0.2, { tone: "navy", y: 15, seed: 13 });
  H.show("n-search2", s(5) - 0.3, w(6, "Filter") + 0.2, { enter: "slide", full: "n-search2-full", scroll: [[w(5, "Nigeria") - 0.3, 0], [w(6, "Filter") - 0.7, 2350, "power2.inOut"], [w(6, "Filter") - 0.2, 0, "power3.inOut"]] });
  H.show("sc-filters", w(6, "Filter") + 0.2, w(6, "save") - 0.1, { enter: "rise" });
  H.show("n-search-all", w(6, "save") - 0.1, w(6, "compare") - 0.3, { enter: "fade", dur: 0.3 });
  H.show("sc-saved", w(6, "compare") - 0.3, s(7) + 0.3, { enter: "slide" });
  H.tap(w(5, "Search") + 0.05, 600, 480);
  lift(ctx, H, { id: "n-search-all", crop: { x: 30, y: 595, w: 1290, h: 130 }, t0: w(5, "Nigeria") - 0.1, t1: w(6, "Filter") + 0.1, to: { ...ROW(0), s: RS, r: -3 }, exit: "back", seed: 5 });
  H.tap(w(6, "Filter") - 0.05, 1056, 478);
  lift(ctx, H, { id: "sc-filters", crop: { x: 40, y: 430, w: 1240, h: 180 }, t0: w(6, "area"), t1: w(6, "save") - 0.3, to: { x: R.cx, y: M ? 470 : 230, s: RS, r: -2 }, seed: 6 });
  lift(ctx, H, { id: "sc-filters", crop: { x: 40, y: 700, w: 1240, h: 790 }, t0: w(6, "budget"), t1: w(6, "save") - 0.25, to: { x: R.cx + (M ? 20 : 0), y: M ? 830 : 480, s: RS * 0.85, r: 2 }, seed: 7 });
  lift(ctx, H, { id: "sc-filters", crop: { x: 45, y: 1700, w: 1230, h: 430 }, t0: w(6, "bedrooms"), t1: w(6, "save") - 0.2, to: { x: R.cx - (M ? 20 : 0), y: M ? 1250 : 800, s: RS, r: -2 }, seed: 8 });
  H.tap(w(6, "bedrooms") + 0.5, 660, 2725);
  H.tap(w(6, "love") - 0.1, 1150, 1250);
  ringBurst(ctx, layer("love", w(6, "love") - 0.2, w(6, "love") + 1.6, 870), { ...(() => { const p = H.toStage(w(6, "love"), 1150, 1250); return { cx: p.x, cy: p.y }; })(), r: 70, t: w(6, "love") - 0.05, dots: 12, seed: 9, dur: 0.5 });
  H.tap(w(6, "compare") + 0.2, 230, 975);
  kicker(ctx, layer("fomo1", w(6, "save") - 0.2, w(6, "side")), { text: "Save it before it's gone", icon: "heart", x: R.cx, y: M ? 1440 : 860, t0: w(6, "save") - 0.1, t1: w(6, "side") - 0.3, size: M ? 34 : 30, anchor: "center" });
  lift(ctx, H, { id: "sc-saved", crop: { x: 40, y: 1115, w: 1250, h: 300 }, t0: w(6, "side") - 0.1, t1: s(7) - 0.05, to: { x: M ? 300 : 1180, y: M ? 560 : 420, s: M ? 0.42 : 0.33, r: -4 }, seed: 10 });
  lift(ctx, H, { id: "sc-saved", crop: { x: 40, y: 1460, w: 1250, h: 300 }, t0: w(6, "side", 2) - 0.1, t1: s(7) - 0.05, to: { x: M ? 780 : 1600, y: M ? 640 : 470, s: M ? 0.42 : 0.33, r: 4 }, seed: 11 });
  if (!M) {
    const W = windowRig(ctx);
    W.path([
      [s(5) - 0.2, { x: 1960, y: 330, s: 0.58, opacity: 1 }],
      [s(5) + 0.5, { x: 1030, y: 330, s: 0.58, opacity: 1 }, "power3.out"],
      [w(6, "area") - 0.3, { x: 1030, y: 330, s: 0.58, opacity: 1 }],
      [w(6, "area") + 0.3, { x: 1960, y: 330, s: 0.58, opacity: 1 }, "power3.in"],
      [w(6, "area") + 0.4, { x: 1960, y: 330, s: 0.58, opacity: 0 }, "none"],
      [ctx.duration, { x: 1960, y: 330, s: 0.58, opacity: 0 }, "none"],
    ]);
    W.show("d-n-search-all", s(5) - 0.2, w(6, "area") + 0.4, { enter: "cut" });
    W.click(w(5, "Nigeria") + 0.3, 700, 38);
  }

  /* ===================== 5. The whole cost (25.96 - 36.45) ===================== */
  ground(ctx, s(7) - 0.05, s(9) + 0.3, { tone: "electric", y: 25, seed: 14 });
  H.show("sc-listing", s(7) - 0.2, w(7, "move-in") + 0.3, { enter: "slide" });
  H.show("sc-listing-cost", w(7, "move-in") + 0.3, s(9) + 0.2, { enter: "rise" });
  H.tap(w(7, "move-in") + 0.05, 200, 2720);
  const cost = layer("cost", s(7), s(9) + 0.3);
  kicker(ctx, cost, { text: "What you will actually pay", icon: "receipt", x: R.cx, y: M ? 1430 : 880, t0: w(7, "whole"), t1: w(7, "move-in") + 0.3, size: M ? 32 : 28, anchor: "center" });
  const lines = [
    { word: "Rent", crop: { x: 45, y: 1055, w: 1230, h: 310 }, y: M ? 508 : 218 },
    { word: "agency", crop: { x: 45, y: 1385, w: 1230, h: 260 }, y: M ? 779 : 412 },
    { word: "legal", crop: { x: 45, y: 1655, w: 1230, h: 250 }, y: M ? 1030 : 594 },
    { word: "caution", crop: { x: 45, y: 2195, w: 1230, h: 370 }, y: M ? 1316 : 790 },
  ];
  lines.forEach((l, i) => lift(ctx, H, { id: "sc-listing-cost", crop: l.crop, t0: w(8, l.word) - 0.05, t1: w(8, "added") - 0.6 + i * 0.05, to: { x: R.cx + (i % 2 ? 14 : -14), y: l.y, s: RS * (M ? 1 : 0.82), r: i % 2 ? 1.5 : -1.5 }, seed: 20 + i }));
  numberCard(ctx, cost, { value: 26100000, label: "Move-in total, every line added", x: R.cx, y: M ? R.top : 330, t0: w(8, "added") - 0.02, t1: w(8, "added") + 1.3, tOut: s(9) - 0.2, size: M ? 96 : 84 });
  ctx.hidePill(w(8, "added") - 0.3, s(9) - 0.1);

  /* ===================== 6. Price check (36.92 - 41.72) ===================== */
  H.show("sc-price", s(9) - 0.1, s(11) + 0.3, { enter: "slide" });
  const price = layer("price", s(9), s(11));
  H.tap(w(10, "nearby") - 0.1, 1080, 1470);
  listCard(ctx, price, {
    title: "Price check",
    items: [
      ["What homes nearby ask", "Tell Vallo where and what, and it shows what similar places near there are advertised for."],
      ["Never a guess", "If there is not enough nearby to be sure, Vallo says so instead."],
    ],
    x: M ? 540 : 1330, y: M ? 760 : 470, w: M ? 880 : 740, t0: w(10, "price") - 0.05, t1: s(11) - 0.3, rot: -1, size: M ? 36 : 31, seed: 30,
    stagger: Math.max(0.35, w(10, "asking") - w(10, "nearby")),
  });
  kicker(ctx, price, { text: "What homes nearby are asking", icon: "map-pin", x: R.cx, y: M ? 1440 : 860, t0: w(10, "asking") - 0.6, t1: s(11) - 0.2, size: M ? 32 : 28, anchor: "center" });

  /* ===================== 7. Talk straight to the lister (42.69 - 57.95) ===================== */
  ground(ctx, s(11) - 0.05, s(14) + 0.3, { tone: "violet", y: 22, seed: 15 });
  H.show("sc-messages", s(11) - 0.2, w(11, "inside") - 0.2, { enter: "slide" });
  H.show("sc-thread", w(11, "inside") - 0.2, s(15) + 0.2, { enter: "slide" });
  const talk = layer("talk", s(11), s(14));
  chipRow(ctx, talk, { items: [["Owner", "key-round"], ["Landlord", "house"], ["Agent", "badge-check"]], x: R.cx, y: M ? R.top + 20 : 220, t0: w(11, "owner"), gap: 0.42, t1: w(11, "inside") + 0.6, size: M ? 34 : 30, anchor: "center" });
  H.tap(w(12, "message") - 0.2, 500, 2775);
  lift(ctx, H, { id: "sc-thread", crop: { x: 110, y: 2225, w: 1110, h: 130 }, t0: w(12, "message") + 0.1, t1: w(12, "call") - 0.4, to: { x: R.cx, y: M ? 540 : 330, s: M ? 0.78 : 0.62, r: -2 }, seed: 31 });
  H.tap(w(12, "call") + 0.15, 1055, 275);
  chipRow(ctx, talk, { items: [["Voice call", "phone"], ["Video call", "video"]], x: R.cx, y: M ? 1430 : 840, t0: w(12, "voice"), gap: 0.35, t1: w(12, "viewing") - 0.3, size: M ? 34 : 30, anchor: "center" });
  H.tap(w(12, "viewing") + 0.1, 330, 850);
  momentCard(ctx, talk, { cap: "Saturday", big: "11:00 AM", check: "Inspection set", x: M ? 330 : 1310, y: M ? 620 : 430, w: M ? 540 : 470, t0: w(12, "viewing") + 0.25, t1: s(13) + 0.6, rot: -3, size: M ? 42 : 36, from: "left", seed: 32 });
  chipRow(ctx, talk, { items: [["In person", "footprints"], ["By video", "video"]], x: R.cx, y: M ? 1430 : 840, t0: w(12, "person"), gap: 0.5, t1: s(13) + 0.2, size: M ? 34 : 30, anchor: "center" });
  const free = layer("free", s(13) - 0.1, s(14) + 0.1);
  liveChip(ctx, free, { text: "Viewings are always free", x: R.cx, y: M ? R.top + 10 : 230, t0: w(13, "free") - 0.3, t1: s(14) - 0.2, size: M ? 34 : 30, anchor: "center" });
  notify(ctx, free, { title: "Viewing tomorrow, 10:00", line: "Mini flat in Yaba", icon: "bell-ring", x: M ? 90 : 1010, y: M ? 1380 : 560, t: w(13, "reminders") - 0.1, tOut: s(14) - 0.25, size: M ? 36 : 32, example: true });

  /* ===================== 8. Account numbers flagged (58.85 - 64.16) ===================== */
  ground(ctx, s(14) - 0.05, s(15) + 0.2, { tone: "gold", y: 30, seed: 16 });
  sceneBack(ctx, ctx.scene("flag-back", s(14) - 0.2, s(15) + 0.4, { z: 3 }), { scene: "step-3-dark", t0: s(14), t1: s(15) - 0.1, opacity: 0.38 });
  const flag = layer("flag", s(14), s(15) + 0.1, 790);
  const card = flagCard(ctx, flag, M);
  during(ctx, s(14), s(15) + 0.1, (t) => {
    const a = ramp(ctx, t, w(14, "flags") - 0.35, w(14, "flags") + 0.3, "back.out(1.5)");
    const b = ramp(ctx, t, s(15) - 0.45, s(15) - 0.1, "power2.in");
    place(card, { x: M ? 540 : 1380, y: (M ? 760 : 520) + (1 - a) * 60 - b * 60, s: 0.94 + 0.06 * a, o: Math.min(ramp(ctx, t, w(14, "flags") - 0.35, w(14, "flags") - 0.1), 1 - b) });
  });
  ctx.sfx("stamp", w(14, "flags"), { offset: -3 });
  kicker(ctx, flag, { text: "Account number in the chat", icon: "triangle-alert", x: R.cx, y: M ? R.top : 220, t0: w(14, "account") - 0.2, t1: w(14, "flags") - 0.3, size: M ? 32 : 28, anchor: "center" });

  /* ===================== 9. Protected payment (66.92 - 75.14) ===================== */
  ground(ctx, s(15) - 0.05, s(18) + 0.3, { tone: "emerald", y: 20, seed: 17 });
  H.show("sc-listing-cost", s(15) - 0.2, s(18) + 0.3, { enter: "fade", dur: 0.3 });
  H.tap(w(16, "Pay") - 0.05, 200, 2720);
  const prot = layer("prot", s(15) - 0.1, s(18) + 0.1);
  headline(ctx, prot, { lines: [[["Ready to ", false], ["move in?", true]]], x: M ? R.cx : HX, y: M ? R.top : 200, size: M ? 84 : 80, t0: s(15), t1: s(16) + 0.4, align: M ? "center" : "left" });
  featureCard(ctx, prot, { icon: "shield-check", title: "Protected payment", line: "Held in escrow by our licensed provider. Released when the deal is done.", x: M ? 540 : 1000, y: M ? 1300 : 420, w: M ? 900 : 760, t0: w(16, "Protected") - 0.1, t1: s(18) - 0.25, size: M ? 38 : 34, anchor: M ? "center" : "left" });
  chipRow(ctx, prot, { items: [["Held in escrow", "lock"], ["Released when the deal is done", "check-check"]], x: M ? R.cx : 1000, y: M ? R.top + 30 : 240, t0: w(17, "escrow") - 0.1, gap: 0.9, t1: s(18) - 0.25, size: M ? 30 : 28, wrapW: M ? 940 : 820, anchor: M ? "center" : "left" });
  ctx.sfx("lock_click", w(17, "escrow"), { offset: -2 });

  /* ===================== 10. Book a room (75.58 - 82.65) ===================== */
  ground(ctx, s(18) - 0.05, s(20) + 0.2, { tone: "dusk", y: 85, seed: 18 });
  H.show("n-stays", s(18) - 0.2, w(19, "dates") - 0.2, { enter: "slide" });
  H.show("n-staysd", w(19, "dates") - 0.2, s(20) + 0.1, { enter: "slide", full: "n-staysd-full", scroll: [[w(19, "room") - 0.1, 0], [w(19, "room") + 0.7, 1990, "power3.inOut"], [w(19, "shortlet") - 0.2, 1990], [w(19, "shortlet") + 0.5, 3440, "power3.inOut"]] });
  H.tap(s(18) + 0.7, 340, 1920);
  H.tap(w(19, "dates") + 0.15, 520, 1060);
  const dates = layer("dates", w(19, "dates"), w(19, "hotel") + 0.8, 770);
  calendarCard(ctx, dates, { place: "Eko Pearl Apartments · Victoria Island, Lagos", month: "October 2026", days: 31, start: 4, pick: 16, x: M ? 540 : 1330, y: M ? 700 : 470, w: M ? 860 : 700, t0: w(19, "dates") + 0.1, t1: w(19, "hotel") + 0.1, tPick: w(19, "dates") + 0.75, rot: -1, seed: 39, from: "above" });
  H.tap(w(19, "room") - 0.4, 660, 1560);
  const trip = layer("trip", s(18), s(20));
  lift(ctx, H, { id: "n-staysd", src: ctx.src.capture("n-staysd-full"), scrolled: 3440, crop: { x: 45, y: 3742, w: 1217, h: 1366 }, t0: w(19, "full") + 0.05, t1: s(20) - 0.15, to: { x: R.cx, y: M ? 950 : 600, s: M ? 0.46 : 0.36, r: -2 }, seed: 40, radius: 50 });
  numberCard(ctx, trip, { value: 396000, label: "Total for 3 nights, Eko Pearl Apartments", x: R.cx, y: M ? 300 : 120, t0: w(19, "full") + 0.1, t1: w(19, "full") + 0.9, tOut: s(20) - 0.15, size: M ? 84 : 76 });
  priceCard(ctx, trip, { name: "Eko Pearl Apartments", figure: "₦132,000", unit: "per night", x: M ? 660 : 1500, y: M ? 1330 : 790, w: M ? 600 : 520, t0: w(19, "room") + 0.5, t1: w(19, "full") - 0.55, rot: 2, size: M ? 38 : 34, seed: 41, from: "right" });
  noticeCard(ctx, trip, { object: "calendar-booked", title: "Room booked", line: "Eko Pearl Apartments · 3 nights", x: M ? 540 : 1330, y: M ? 560 : 300, w: M ? 820 : 700, t0: w(19, "hotel") + 0.45, t1: w(19, "full") - 0.55, rot: 0, size: M ? 38 : 34, seed: 42, from: "above" });
  kicker(ctx, trip, { text: "The full cost before you pay", icon: "badge-check", x: R.cx, y: M ? 1440 : 860, t0: w(19, "full") - 0.2, t1: s(20) - 0.2, size: M ? 32 : 28, anchor: "center" });
  listingWall(ctx, layer("staywall", s(18) - 0.5, w(19, "dates") + 0.5, 3), { t0: s(18) - 0.4, t1: w(19, "dates"), rows: M ? 5 : 3, opacity: 0.55, seed: 21, y: M ? 260 : 60, stays: STAY_CARDS(ctx), stayRows: [0, 1, 2, 3, 4] });
  if (!M) {
    const W2 = windowRig(ctx);
    W2.path([
      [s(18) - 0.2, { x: 1960, y: 300, s: 0.6, opacity: 1 }],
      [s(18) + 0.5, { x: 1000, y: 300, s: 0.6, opacity: 1 }, "power3.out"],
      [w(19, "room") - 0.4, { x: 1000, y: 300, s: 0.6, opacity: 1 }],
      [w(19, "room") + 0.2, { x: 1960, y: 300, s: 0.6, opacity: 1 }, "power3.in"],
      [w(19, "room") + 0.3, { x: 1960, y: 300, s: 0.6, opacity: 0 }, "none"],
    ]);
    W2.show("d-n-stays-dates", s(18) - 0.2, w(19, "room") + 0.3, { enter: "cut" });
    W2.click(w(19, "dates") + 0.2, 1240, 352);
  }

  /* ===================== 11. Reserve a table (83.65 - 89.10) ===================== */
  H.show("sc-restaurants", s(20) - 0.2, w(21, "secure") - 0.3, { enter: "slide" });
  H.show("f-restaurant-reserve", w(21, "secure") - 0.3, s(22) + 0.2, { enter: "slide" });
  H.tap(w(21, "restaurant") + 0.1, 660, 1280);
  H.tap(w(21, "deposit") - 0.1, 390, 2745);
  const table = layer("table", s(20), s(22));
  headline(ctx, table, { lines: [[["Going out ", false], ["tonight?", true]]], x: M ? R.cx : HX, y: M ? R.top : 220, size: M ? 84 : 80, t0: s(20), t1: s(21) + 0.8, align: M ? "center" : "left" });
  lift(ctx, H, { id: "f-restaurant-reserve", crop: { x: 80, y: 1130, w: 1170, h: 300 }, t0: w(21, "table") - 0.1, t1: s(22) - 0.25, to: { x: R.cx, y: M ? 600 : 380, s: RS, r: -3 }, seed: 41 });
  chipRow(ctx, table, { items: [["Table deposit", "utensils-crossed"], ["Confirmed by the restaurant", "check"]], x: R.cx, y: M ? 1440 : 860, t0: w(21, "deposit"), gap: 0.5, t1: s(22) - 0.25, size: M ? 30 : 28, wrapW: M ? 960 : 820, anchor: "center" });

  /* ===================== 12. The wallet (90.0 - 96.96) ===================== */
  ground(ctx, s(22) - 0.05, s(24) + 0.2, { tone: "electric", y: 18, seed: 19 });
  const WALLET_PATCH = [{ x: 274, y: 2128, w: 870, h: 66, bg: "rgb(5 11 32)", size: 46, weight: 600, lh: 1.3, color: "rgb(222 227 255)", lines: ["Open your account with our partner"] }];
  H.show("n-wallet", s(22) - 0.2, s(24) + 0.3, { enter: "slide", patch: WALLET_PATCH });
  const wal = layer("wallet", s(22), s(24));
  headline(ctx, wal, { lines: [[["Your Vallo ", false], ["wallet", true]]], x: M ? R.cx : HX, y: M ? R.top : 210, size: M ? 84 : 80, t0: w(22, "wallet") - 0.3, t1: s(23) - 0.2, align: M ? "center" : "left" });
  H.tap(w(23, "Add") - 0.3, 1188, 2508);
  lift(ctx, H, { id: "n-wallet", crop: { x: 45, y: 2410, w: 1230, h: 300 }, t0: w(23, "Add") - 0.05, t1: s(24) - 0.25, to: { x: R.cx, y: M ? 540 : 330, s: RS, r: -2 }, seed: 50 });
  chipRow(ctx, wal, { items: [["Add money", "plus"], ["Pay", "credit-card"], ["Send", "send"], ["Withdraw", "arrow-down-to-line"]], x: R.cx, y: M ? 1440 : 860, t0: w(23, "Add"), gap: (w(23, "withdraw") - w(23, "Add")) / 3, t1: s(24) - 0.2, size: M ? 32 : 28, anchor: "center", wrapW: M ? 980 : 860 });

  /* ===================== 13. Every naira (97.5 - 109.78) ===================== */
  ground(ctx, s(24) - 0.05, s(27) + 0.3, { tone: "navy", y: 45, seed: 20, sparkle: 8 });
  const naira = layer("naira", s(24) - 0.05, s(26) + 0.2, 800);
  const size = M ? 92 : 96;
  headline(ctx, naira, { lines: [[["Every ", false], ["naira,", true]], [["in your wallet,", false]], [["in escrow,", false]], [["in every payment,", false]]], x: M ? 60 : 200, y: M ? 470 : 150, size, t0: s(24), t1: w(24, "held") - 0.3, stagger: 0.045 });
  /* daylight for the promise: white paper, dark type, and the money's route
     drawn down a rail, the way the founder's favourite cut said it */
  const DAY0 = w(24, "held") - 0.5;
  const DAY1 = s(26) - 0.1;
  ground(ctx, DAY0, DAY1, { tone: "day", y: 40, seed: 34, sparkle: 0, z: 2 });
  ctx.hidePill(DAY0 - 0.1, DAY1 + 0.1);
  const INKC = "#0b1230";
  headline(ctx, naira, { lines: [[["held by our", false]], [["licensed provider.", true]]], x: M ? 70 : ctx.W / 2, y: M ? 300 : 150, size: size * (M ? 0.95 : 0.9), t0: w(24, "held") - 0.1, t1: s(25) - 0.2, stagger: 0.07, color: INKC, key: "#0069fe", sheen: false, align: M ? "left" : "center" });
  headline(ctx, naira, { lines: [[["Never by ", false], ["Vallo.", true]]], x: ctx.W / 2, y: M ? 560 : 320, size: size * (M ? 1.2 : 1.05), t0: s(25) - 0.05, t1: s(26) - 0.2, align: "center", stagger: 0.08, color: INKC, key: "#0069fe", sheen: false });
  flowRail(ctx, naira, {
    steps: ["Your card", "Our licensed provider", "The owner's bank"],
    x: M ? 170 : 660, y: M ? 880 : 470, gap: M ? 255 : 192, size: M ? 46 : 38,
    t0: w(24, "held") + 0.15, t1: s(26) - 0.3, seed: 35,
  });
  ctx.sfx("stamp", s(25) + 0.05, { offset: 0 });
  ctx.hideCaptions(s(24) - 0.1, s(26) - 0.1);
  ctx.hidePill(s(24) - 0.2, s(27) - 0.1);
  H.show("sc-payments", s(26) - 0.8, s(27) + 0.2, { enter: "cut" });
  const rec = layer("receipts", s(26) - 0.1, s(27));
  lift(ctx, H, { id: "sc-payments", crop: { x: 45, y: 670, w: 1230, h: 450 }, t0: w(26, "receipt") - 0.1, t1: s(27) - 0.25, to: { x: R.cx, y: M ? 600 : 360, s: RS, r: -2 }, seed: 54 });
  chipRow(ctx, rec, { items: [["A receipt for every payment", "receipt"], ["Vallo earns only when a deal is done", "handshake"]], x: R.cx, y: M ? 1440 : 860, t0: w(26, "receipt") + 0.2, gap: 1.3, t1: s(27) - 0.25, size: M ? 28 : 26, wrapW: M ? 980 : 840, anchor: "center" });

  /* ===================== 14. Checked by a person (110.77 - 119.45) ===================== */
  ground(ctx, s(27) - 0.05, s(28) + 0.3, { tone: "electric", y: 25, seed: 21 });
  sceneBack(ctx, ctx.scene("ver-back", s(27) - 0.3, s(28) + 0.5, { z: 3 }), { scene: "step-2-dark", t0: s(27) - 0.2, t1: s(28) - 0.1, opacity: 0.42 });
  H.show("sc-verification", s(27) - 0.2, s(28) + 0.3, { enter: "slide" });
  const ver = layer("ver", s(27), s(28) + 0.1);
  listCard(ctx, ver, {
    title: "What is checked",
    items: [
      ["Your ID", "One government issued document showing your face and name."],
      ["Your address", "Confirmed against the document you gave."],
      ["A bank account", "In your own name, matching your ID."],
      ["A real person", "Someone at Vallo reads it, every time."],
    ],
    x: M ? 540 : 1330, y: M ? 760 : 470, w: M ? 880 : 740,
    t0: w(27, "owner") - 0.1, t1: s(28) - 0.3, rot: -1, size: M ? 36 : 31, seed: 60, stagger: Math.max(0.3, (w(27, "person") - w(27, "owner")) / 3),
  });
  proofCard(ctx, ver, { lines: ["Checked by a real", "person at Vallo."], x: M ? 420 : 560, y: M ? 1430 : 820, w: M ? 640 : 560, t0: w(27, "person") + 0.1, t1: s(28) - 0.25, rot: -2, size: M ? 42 : 36, seed: 64, from: "left" });

  /* ===================== 15. Ask anything (120.0 - 125.9) ===================== */
  ground(ctx, s(28) - 0.05, s(31) + 0.3, { tone: "violet", y: 30, seed: 22 });
  H.show("sc-assistant-start", s(28) - 0.2, s(31) + 0.3, { enter: "slide" });
  H.tap(s(29) + 0.3, 600, 2480);
  lift(ctx, H, { id: "sc-assistant", crop: { x: 100, y: 590, w: 1140, h: 290 }, t0: w(29, "time") - 0.3, t1: s(31) - 0.25, to: { x: R.cx, y: M ? 560 : 340, s: RS, r: -3 }, seed: 70 });
  lift(ctx, H, { id: "sc-assistant-start", crop: { x: 40, y: 2380, w: 1280, h: 200 }, t0: s(28) + 0.45, t1: w(29, "time") - 0.4, to: { x: R.cx, y: M ? 1250 : 760, s: M ? 0.66 : 0.55, r: 2 }, seed: 71 });
  const ai = layer("ai", s(28), s(31));
  kicker(ctx, ai, { text: "Always says it is an AI", icon: "sparkles", x: R.cx, y: M ? 1440 : 860, t0: w(30, "AI") - 0.5, t1: s(31) - 0.2, size: M ? 32 : 28, anchor: "center" });

  /* ===================== 16. Your language (126.35 - 131.44) ===================== */
  ground(ctx, s(31) - 0.05, s(33) - 0.2, { tone: "dusk", y: 80, seed: 23 });
  H.show("n-welcome-en", s(31) - 0.2, w(32, "Hausa") - 0.1, { enter: "slide" });
  H.show("n-welcome-ha", w(32, "Hausa") - 0.1, w(32, "Yorùbá") - 0.1, { enter: "slide" });
  H.show("n-welcome-yo", w(32, "Yorùbá") - 0.1, w(32, "Igbo") - 0.1, { enter: "slide" });
  H.show("n-welcome-ig", w(32, "Igbo") - 0.1, s(33) + 0.5, { enter: "slide" });
  [["n-welcome-en", "English", -3], ["n-welcome-ha", "Hausa", 3], ["n-welcome-yo", "Yorùbá", -2], ["n-welcome-ig", "Igbo", 2]].forEach(([id, word, r], i) => {
    const t0 = w(32, word) + 0.25;
    const t1 = i < 3 ? w(32, ["Hausa", "Yorùbá", "Igbo"][i]) + 0.1 : s(33) - 0.3;
    lift(ctx, H, { id, crop: { x: 40, y: 2440, w: 1240, h: 340 }, t0, t1, to: { x: R.cx, y: M ? 560 : 340, s: RS, r }, exit: "up", seed: 80 + i, fly: 0.5 });
  });
  const lang = layer("lang", s(31), s(33));
  chipRow(ctx, lang, { items: [["English"], ["Hausa"], ["Yorùbá"], ["Igbo"]], x: R.cx, y: M ? 1420 : 860, t0: w(32, "English") - 0.05, gap: 0.62, t1: s(33) - 0.5, size: M ? 36 : 32, anchor: "center" });

  /* ===================== 17. The end card ===================== */
  ending(ctx, { t0: s(33), tLine: s(34) - 0.05, tBadges: s(35) - 0.1, tUrl: s(36) + 0.4, t1: ctx.duration });

  /* last, so every part has registered the moment it is held up */
  installFocus(ctx);
}

void opa;
