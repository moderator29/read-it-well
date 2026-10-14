/**
 * VIDEO ONE ON A DESKTOP (films/how/timeline.json, 2:28, 1920 x 1080).
 *
 * The desktop cut is its own film. There is no phone in it: the hero is a
 * browser window on vallospaces.com, carrying the real desktop pages
 * captured on 14 October, with a cursor that clicks and pages that scroll.
 * What the film holds up is lifted off those pages, or drawn from scratch
 * on white paper; the window steps aside for the lines that carry
 * themselves.
 *
 * Grammar
 *   SIDE  the window left, a column of parts on the right
 *   FULL  the window taking the frame, a label above it
 *   OFF   away to the right, for the typographic beats
 */
import {
  poster, installFocus, sceneBack, nigeriaMap3d, windowLift, listCard, noticeCard, priceCard,
  proofCard, momentCard, calendarCard, flowRail, listingWall, flagCard, anchors, ground, flash,
  headline, kicker, liveChip, numberCard, chipRow, featureCard, ending, ringBurst, windowRig,
  ramp, during, place,
} from "../kit.js";

export async function build(ctx) {
  const { s, w } = anchors(ctx);
  const layer = (id, t0, t1, z = 760) => ctx.scene(id, t0, t1, { z });

  /* ---------- the window's poses ---------- */
  const SIDE = { x: 54, y: 150, s: 0.84, opacity: 1 };
  const FULL = { x: 268, y: 92, s: 0.92, opacity: 1 };
  const OFF = { x: 2120, y: 168, s: 0.80, opacity: 1 };
  const RIGHT = { x: 900, y: 230, s: 0.66, opacity: 1 };
  const GONE = { ...OFF, opacity: 0 };
  /* the column of parts, to the right of the window in SIDE */
  const COL = 1578;
  const ROW = [250, 470, 690, 880];
  const HX = 170; // a headline's left edge when the window is away

  const W = windowRig(ctx);
  W.path([
    [0, { ...GONE }],
    [s(4) - 0.5, { ...GONE }],
    [s(4) + 0.2, { ...SIDE }, "power3.out"],
    [s(7) - 0.3, { ...SIDE }],
    [s(7) + 0.2, { ...FULL }, "power3.inOut"],
    [s(9) - 0.3, { ...FULL }],
    [s(9) + 0.1, { ...SIDE }, "power3.inOut"],
    [s(14) - 0.2, { ...SIDE }],
    [s(14) + 0.3, { ...FULL }, "power3.inOut"],
    [s(15) - 0.5, { ...FULL }],
    [s(15) - 0.1, { ...GONE }, "power3.in"],
    [s(16) - 0.3, { ...GONE }],
    [s(16) + 0.2, { ...SIDE }, "power3.out"],
    [s(24) - 0.4, { ...SIDE }],
    [s(24) - 0.05, { ...GONE }, "power3.in"],
    [s(26) + 0.05, { ...GONE }],
    [s(26) + 0.55, { ...SIDE }, "power3.out"],
    [s(31) - 0.3, { ...SIDE }],
    [s(31) + 0.3, { ...RIGHT }, "power3.inOut"],
    [s(32) + 0.6, { ...RIGHT }],
    [s(33) - 0.4, { ...GONE }, "power3.in"],
    [ctx.duration, { ...GONE }, "none"],
  ]);

  /* ===================== 1. The gamble (0 - 6.9) ===================== */
  ground(ctx, 0, s(2) + 0.1, { tone: "navy", y: 30, seed: 11 });
  const open = layer("open", 0, s(2) + 0.1);
  poster(ctx, open, { t1: s(1) - 0.15 });
  const big = 112;
  headline(ctx, open, { lines: [[["Finding a place", false]], [["in ", false], ["Nigeria", true]]], x: HX, y: 250, size: big, t0: s(1) - 0.05, t1: s(2) - 0.55, stagger: 0.05 });
  headline(ctx, open, { lines: [[["shouldn't feel like", false]], [["a gamble.", true]]], x: HX, y: 250 + big * 2.25, size: big, t0: w(1, "shouldn't") - 0.05, t1: s(2) - 0.5, stagger: 0.05 });
  await nigeriaMap3d(ctx, open, { x: 1090, y: 250, w: 700, t0: s(1) - 0.05, t1: s(2) - 0.4, tTrails: s(1) + 0.55, gap: 0.26, labels: true, cities: 6 });
  ctx.hideCaptions(s(1) - 0.2, s(2) + 0.1);

  /* ===================== 2. Meet Vallo (6.9 - 8.1) ===================== */
  flash(ctx, s(2), { color: "rgb(0 105 254 / 0.7)" });
  ground(ctx, s(2) - 0.05, s(4) + 0.6, { tone: "electric", y: 20, seed: 12 });
  const meet = layer("meet", s(2) - 0.05, s(3) + 1.2, 780);
  const mark = ctx.img(ctx.src.asset("logo-mark.png"), { class: "abs", style: { left: "0px", top: "0px", width: "300px", height: "300px", objectFit: "contain" } }, meet);
  const word = ctx.img(ctx.src.asset("logo-wordmark.png"), { class: "abs", style: { left: "0px", top: "0px", width: "520px", height: "auto" } }, meet);
  during(ctx, s(2) - 0.05, s(3) + 1.2, (t) => {
    const a = ramp(ctx, t, s(2), s(2) + 0.55, "back.out(1.8)");
    const up = ramp(ctx, t, s(3) - 0.3, s(3) + 0.6, "power3.inOut");
    place(mark, { x: ctx.W / 2, y: 430 - up * 360, s: (0.3 + 0.7 * a) * (1 - 0.55 * up), r: (1 - a) * -40, o: ramp(ctx, t, s(2), s(2) + 0.15) * (1 - ramp(ctx, t, s(3) + 0.6, s(3) + 1.1)) });
    const b = ramp(ctx, t, s(2) + 0.25, s(2) + 0.8, "land");
    place(word, { x: ctx.W / 2, y: 430 + 230 + (1 - b) * 40 - up * 600, s: 1, o: b * (1 - up) });
  });
  ringBurst(ctx, meet, { cx: ctx.W / 2, cy: 430, r: 210, t: s(2) + 0.05, seed: 21 });
  ctx.sfx("impact_soft", s(2), { offset: 0 });
  ctx.hideCaptions(s(2) - 0.1, s(2) + 1.1);

  /* ===================== 3. One place for all of it (8.1 - 16.1) ===================== */
  const one = layer("one", s(3) - 0.1, s(4) + 0.4);
  /* type needs its own ground when a wall is drifting behind it */
  ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1060px", height: `${ctx.H}px`, background: "linear-gradient(90deg, rgb(2 6 40 / 0.92) 0%, rgb(2 6 40 / 0.72) 48%, transparent 100%)" } }, one);
  listingWall(ctx, layer("wall0", s(3) - 0.2, s(4) - 0.1, 3), { t0: s(3) - 0.1, t1: s(4) - 0.2, rows: 3, opacity: 0.22, seed: 7, y: 40 });
  headline(ctx, one, { lines: [[["Homes, hotels,", false]], [["shortlets and", false]], [["restaurants.", true]]], x: HX, y: 230, size: 78, t0: s(3), t1: w(3, "one") - 0.3, stagger: 0.05 });
  const tiles = [
    ["home-verified", "Homes", "To rent and to buy", w(3, "Homes")],
    ["hotel", "Hotels", "Comfortable stays", w(3, "hotels")],
    ["shortlet", "Shortlets", "Feels like home", w(3, "shortlets")],
    ["restaurant", "Restaurants", "Great food", w(3, "restaurants")],
  ];
  tiles.forEach(([obj, title, note, t], i) => {
    const card = ctx.el("div", {
      class: "abs", attrs: { "data-furn": "1" },
      style: {
        left: "0px", top: "0px", width: "300px", padding: "26px", borderRadius: "32px", textAlign: "center",
        background: "linear-gradient(170deg, rgb(17 27 78 / 0.96), rgb(7 13 46 / 0.96))",
        border: "1.5px solid rgb(120 170 255 / 0.30)", boxShadow: "0 44px 86px -28px rgb(0 0 20 / 0.84)",
      },
    }, one);
    ctx.img(ctx.src.object(obj), { style: { width: "132px", height: "132px", objectFit: "contain", display: "block", margin: "0 auto 14px" } }, card);
    ctx.el("div", { text: title, style: { font: "700 36px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.02em", color: "#fff" } }, card);
    ctx.el("div", { text: note, style: { marginTop: "8px", font: "500 24px/1.25 Inter, sans-serif", color: "rgb(222 232 255 / 0.74)" } }, card);
    const x = 1190 + (i % 2) * 340;
    const y = 300 + Math.floor(i / 2) * 400;
    during(ctx, s(3) - 0.1, s(4) + 0.4, (u) => {
      const a = ramp(ctx, u, t - 0.1, t + 0.5, "back.out(1.5)");
      const b = ramp(ctx, u, w(3, "one") - 0.1, w(3, "one") + 0.4, "power2.in");
      place(card, { x, y: y + (1 - a) * 46 - b * 40, s: 0.9 + 0.1 * a, r: 0, o: Math.min(a, 1 - b) });
    });
    ctx.sfx("card_slide", t, { offset: -6 });
  });
  chipRow(ctx, one, { items: [["One site", "monitor"], ["One app", "smartphone"], ["One account", "user-round-check"]], x: HX + 230, y: 620, t0: w(3, "one"), gap: 0.16, t1: s(4) - 0.2, size: 32, anchor: "center" });

  /* ===================== 4. How it works: search (16.1 - 19.4) ===================== */
  ground(ctx, s(4) - 0.1, s(7) + 0.2, { tone: "navy", y: 15, seed: 13 });
  const how = layer("how", s(4) - 0.1, s(5) + 0.5);
  headline(ctx, how, { lines: [[["Here's how it ", false], ["works.", true]]], x: HX, y: 420, size: 92, t0: s(4), t1: s(5) - 0.15 });
  W.show("d-n-home", s(4) + 0.2, s(5) - 0.1, { enter: "rise", dur: 0.7 });
  W.show("d-n-search", s(5) - 0.1, w(6, "Filter") - 0.2, { enter: "slide" });
  W.click(s(5) + 0.45, 700, 330);
  kicker(ctx, layer("searchlab", s(5) - 0.1, s(6) + 0.3), { text: "Search across Nigeria", icon: "search", x: COL, y: 180, t0: s(5) + 0.1, t1: w(6, "Filter") - 0.2, size: 30, anchor: "center" });
  windowLift(ctx, W, { id: "d-n-search", crop: { x: 300, y: 150, w: 840, h: 92 }, t0: s(5) + 0.5, t1: w(6, "Filter") - 0.25, to: { x: COL, y: ROW[0] + 60, s: 0.52, r: -2 }, seed: 1, label: "Search or describe your home" });

  /* ===================== 5. Filter, save, compare (19.4 - 25.9) ===================== */
  W.show("d-filters", w(6, "Filter") - 0.2, w(6, "save") - 0.2, { enter: "rise", dur: 0.5 });
  W.click(w(6, "Filter") - 0.05, 1180, 150);
  W.show("d-n-search-all", w(6, "save") - 0.2, w(6, "compare") - 0.2, { enter: "fade", dur: 0.35 });
  W.show("d-saved", w(6, "compare") - 0.2, s(7) - 0.2, { enter: "slide" });
  W.click(w(6, "love") - 0.1, 980, 430);
  const filt = layer("filters", s(6) - 0.1, s(7) + 0.2);
  listCard(ctx, filt, {
    title: "Narrow it down",
    items: [["Area", "Where in the city, down to the estate."], ["Budget", "A floor and a ceiling, and what sits between them."], ["Bedrooms and baths", "The shape of the place, not just the price."]],
    x: COL, y: 440, w: 620, t0: w(6, "area") - 0.1, t1: w(6, "save") - 0.35, rot: -1, size: 29, seed: 2,
    stagger: Math.max(0.35, (w(6, "bedrooms") - w(6, "area")) / 2),
  });
  kicker(ctx, filt, { text: "Save it before it's gone", icon: "heart", x: COL, y: 880, t0: w(6, "save") - 0.1, t1: w(6, "side") - 0.3, size: 30, anchor: "center" });
  liveChip(ctx, filt, { text: "Compare them side by side", x: COL, y: 880, t0: w(6, "side") - 0.2, t1: s(7) - 0.2, size: 30, anchor: "center" });

  /* ===================== 6. The whole cost (25.9 - 36.4) ===================== */
  ground(ctx, s(7) - 0.05, s(9) + 0.3, { tone: "electric", y: 25, seed: 14 });
  W.show("d-n-listing", s(7) - 0.2, w(7, "move-in") + 0.2, { enter: "slide" });
  W.show("d-listing-cost", w(7, "move-in") + 0.2, s(9) - 0.2, { enter: "rise", dur: 0.6 });
  W.click(w(7, "move-in") - 0.05, 420, 760);
  const cost = layer("cost", s(7), s(9) + 0.3);
  kicker(ctx, cost, { text: "What you will actually pay", icon: "receipt", x: COL, y: 170, t0: w(7, "whole"), t1: w(8, "added") - 0.5, size: 30, anchor: "center" });
  listCard(ctx, cost, {
    title: "Every line, before you call",
    items: [["Rent", "The yearly rent the lister has declared."], ["Agency and legal fees", "Each one named, with who keeps it."], ["Caution deposit", "Refundable, and shown as refundable."]],
    x: COL, y: 520, w: 620, t0: w(8, "Rent") - 0.1, t1: w(8, "added") - 0.55, rot: -1, size: 31, seed: 20,
    stagger: Math.max(0.4, (w(8, "caution") - w(8, "Rent")) / 3),
  });
  numberCard(ctx, cost, { value: 26100000, label: "Move-in total, every line added", x: ctx.W / 2, y: 210, t0: w(8, "added") - 0.02, t1: w(8, "added") + 1.3, tOut: s(9) - 0.2, size: 84 });
  ctx.hidePill(w(8, "added") - 0.3, s(9) - 0.1);

  /* ===================== 7. Price check (36.9 - 41.7) ===================== */
  W.show("d-price", s(9) - 0.2, s(11) - 0.2, { enter: "slide" });
  const price = layer("price", s(9), s(11));
  listCard(ctx, price, {
    title: "Price check",
    items: [["What homes nearby ask", "Tell Vallo where and what, and it shows what similar places near there are advertised for."], ["Never a guess", "If there is not enough nearby to be sure, Vallo says so instead."]],
    x: COL, y: 460, w: 620, t0: w(10, "price") - 0.05, t1: s(11) - 0.3, rot: -1, size: 31, seed: 30,
    stagger: Math.max(0.35, w(10, "asking") - w(10, "nearby")),
  });
  W.click(w(10, "nearby") - 0.1, 520, 600);

  /* ===================== 8. Talk to the lister (42.6 - 57.9) ===================== */
  ground(ctx, s(11) - 0.05, s(14) + 0.3, { tone: "violet", y: 22, seed: 15 });
  W.show("d-messages", s(11) - 0.2, w(11, "inside") - 0.2, { enter: "slide" });
  W.show("d-thread", w(11, "inside") - 0.2, s(15) - 0.3, { enter: "slide" });
  const talk = layer("talk", s(11), s(14));
  chipRow(ctx, talk, { items: [["Owner", "key-round"], ["Landlord", "house"], ["Agent", "badge-check"]], x: COL, y: 200, t0: w(11, "owner"), gap: 0.42, t1: w(11, "inside") + 0.6, size: 30, anchor: "center" });
  W.click(w(12, "message") - 0.2, 760, 820);
  chipRow(ctx, talk, { items: [["Voice call", "phone"], ["Video call", "video"]], x: COL, y: 430, t0: w(12, "voice"), gap: 0.35, t1: w(12, "viewing") - 0.3, size: 30, anchor: "center" });
  momentCard(ctx, talk, { cap: "Saturday", big: "11:00 AM", check: "Inspection set", x: COL, y: 640, w: 470, t0: w(12, "viewing") + 0.25, t1: s(13) + 0.6, rot: -3, size: 36, from: "right", seed: 32 });
  const free = layer("free", s(13) - 0.1, s(14) + 0.1);
  liveChip(ctx, free, { text: "Viewings are always free", x: COL, y: 200, t0: w(13, "free") - 0.3, t1: s(14) - 0.2, size: 30, anchor: "center" });
  noticeCard(ctx, free, { object: "bell", title: "Viewing tomorrow, 10:00", line: "Mini flat in Yaba", x: COL, y: 880, w: 620, t0: w(13, "reminders") - 0.1, t1: s(14) - 0.25, size: 30, seed: 33, from: "below" });

  /* ===================== 9. Account numbers flagged (58.8 - 64.1) ===================== */
  ground(ctx, s(14) - 0.05, s(15) + 0.2, { tone: "gold", y: 30, seed: 16 });
  sceneBack(ctx, ctx.scene("flag-back", s(14) - 0.2, s(15) + 0.4, { z: 3 }), { scene: "step-3-dark", t0: s(14), t1: s(15) - 0.1, opacity: 0.34 });
  const flag = layer("flag", s(14) - 0.1, s(15) + 0.2, 790);
  const card = flagCard(ctx, flag, false);
  during(ctx, s(14) - 0.1, s(15) + 0.2, (t) => {
    const a = ramp(ctx, t, w(14, "flags") - 0.3, w(14, "flags") + 0.3, "back.out(1.4)");
    const b = ramp(ctx, t, s(15) - 0.55, s(15) - 0.15, "power2.in");
    place(card, { x: ctx.W / 2, y: 540 + (1 - a) * 50, s: 0.94 + 0.06 * a, r: -1.5 * a, o: Math.min(a, 1 - b) });
  });
  ctx.sfx("stamp", w(14, "flags"), { offset: -3 });
  kicker(ctx, flag, { text: "Account number in the chat", icon: "shield-alert", x: ctx.W / 2, y: 190, t0: w(14, "account") - 0.2, t1: s(15) - 0.2, size: 30, anchor: "center" });

  /* ===================== 10. Protected payment (66.9 - 75.1) ===================== */
  ground(ctx, s(15) - 0.05, s(18) + 0.2, { tone: "emerald", y: 20, seed: 17 });
  const pay = layer("pay", s(15) - 0.1, s(18));
  headline(ctx, pay, { lines: [[["Ready to ", false], ["move in?", true]]], x: ctx.W / 2, y: 400, size: 104, t0: s(15), t1: s(16) - 0.25, align: "center" });
  W.show("d-listing-cost", s(16) - 0.3, s(18) - 0.3, { enter: "rise", dur: 0.6 });
  featureCard(ctx, pay, { icon: "shield-check", title: "Protected payment", line: "Held in escrow by our licensed provider, and released when the deal is done.", x: COL, y: 440, w: 620, t0: w(16, "Protected") - 0.1, t1: s(18) - 0.3, size: 32, from: "right", anchor: "center" });
  liveChip(ctx, pay, { text: "Released when the deal is done", x: COL, y: 760, t0: w(17, "released") - 0.2, t1: s(18) - 0.3, size: 30, anchor: "center" });

  /* ===================== 11. Plan a trip (75.5 - 82.6) ===================== */
  ground(ctx, s(18) - 0.05, s(20) + 0.2, { tone: "dusk", y: 25, seed: 18 });
  const trip = layer("trip", s(18) - 0.1, s(20));
  headline(ctx, trip, { lines: [[["Planning a ", false], ["trip?", true]]], x: ctx.W / 2, y: 400, size: 104, t0: s(18), t1: s(19) - 0.25, align: "center" });
  W.show("d-n-stays-dates", s(19) - 0.3, w(19, "room") - 0.2, { enter: "slide" });
  W.show("d-n-stay", w(19, "room") - 0.2, s(20) - 0.3, { enter: "rise", dur: 0.6 });
  W.click(w(19, "dates") + 0.15, 1240, 352);
  calendarCard(ctx, trip, { place: "Eko Pearl Apartments · Victoria Island, Lagos", month: "October 2026", days: 31, start: 4, pick: 16, x: COL, y: 400, w: 640, t0: w(19, "dates") + 0.1, t1: w(19, "hotel") + 0.1, tPick: w(19, "dates") + 0.75, rot: -1, seed: 39, from: "above" });
  priceCard(ctx, trip, { name: "Eko Pearl Apartments", figure: "₦132,000", unit: "per night", x: COL, y: 820, w: 520, t0: w(19, "room") + 0.5, t1: w(19, "full") - 0.55, rot: 2, size: 34, seed: 41, from: "right" });
  noticeCard(ctx, trip, { object: "calendar-booked", title: "Room booked", line: "Eko Pearl Apartments · 3 nights", x: COL, y: 280, w: 660, t0: w(19, "hotel") + 0.45, t1: w(19, "full") - 0.55, rot: 0, size: 32, seed: 42, from: "above" });
  numberCard(ctx, trip, { value: 396000, label: "Total for 3 nights, Eko Pearl Apartments", x: COL, y: 300, t0: w(19, "full") + 0.05, t1: w(19, "full") + 0.9, tOut: s(20) - 0.15, size: 72 });

  /* ===================== 12. Reserve a table (83.6 - 89.1) ===================== */
  const eat = layer("eat", s(20) - 0.1, s(22));
  headline(ctx, eat, { lines: [[["Going out ", false], ["tonight?", true]]], x: ctx.W / 2, y: 400, size: 104, t0: s(20), t1: s(21) - 0.25, align: "center" });
  W.show("d-restaurants", s(21) - 0.3, w(21, "secure") - 0.3, { enter: "slide" });
  W.show("d-restaurant", w(21, "secure") - 0.3, s(22) - 0.2, { enter: "slide" });
  W.click(w(21, "restaurant") + 0.1, 600, 520);
  featureCard(ctx, eat, { icon: "credit-card", title: "Table deposit", line: "Secure the table in seconds. It comes off the bill when you arrive.", x: COL, y: 560, w: 620, t0: w(21, "deposit") - 0.1, t1: s(22) - 0.25, size: 32, from: "right", anchor: "center" });

  /* ===================== 13. The wallet (90.0 - 96.9) ===================== */
  ground(ctx, s(22) - 0.05, s(24) + 0.2, { tone: "electric", y: 18, seed: 19 });
  W.show("d-payments", s(22) - 0.2, s(24) - 0.3, { enter: "slide" });
  const wal = layer("wallet", s(22), s(24));
  headline(ctx, wal, { lines: [[["Your Vallo ", false], ["wallet", true]]], x: COL, y: 210, size: 72, t0: w(22, "wallet") - 0.3, t1: s(23) - 0.2, align: "center" });
  chipRow(ctx, wal, { items: [["Add money", "plus"], ["Pay", "credit-card"], ["Send", "send"], ["Withdraw", "arrow-down-to-line"]], x: COL, y: 560, t0: w(23, "Add"), gap: (w(23, "withdraw") - w(23, "Add")) / 3, t1: s(24) - 0.2, size: 30, anchor: "center", wrapW: 620 });

  /* ===================== 14. The promise, on white (97.5 - 109.7) ===================== */
  ground(ctx, s(24) - 0.05, w(24, "held") - 0.5, { tone: "navy", y: 45, seed: 20, sparkle: 8 });
  const naira = layer("naira", s(24) - 0.05, s(26) + 0.2, 800);
  const size = 96;
  headline(ctx, naira, { lines: [[["Every ", false], ["naira,", true]], [["in your wallet,", false]], [["in escrow,", false]], [["in every payment,", false]]], x: HX, y: 150, size, t0: s(24), t1: w(24, "held") - 0.3, stagger: 0.045 });
  const DAY0 = w(24, "held") - 0.5;
  const DAY1 = s(26) - 0.1;
  ground(ctx, DAY0, DAY1, { tone: "day", y: 40, seed: 34, sparkle: 0, z: 2 });
  ctx.hidePill(DAY0 - 0.1, DAY1 + 0.1);
  const INKC = "#0b1230";
  headline(ctx, naira, { lines: [[["held by our", false]], [["licensed provider.", true]]], x: ctx.W / 2, y: 150, size: size * 0.9, t0: w(24, "held") - 0.1, t1: s(25) - 0.2, stagger: 0.05, color: INKC, key: "#0069fe", sheen: false, align: "center" });
  headline(ctx, naira, { lines: [[["Never by ", false], ["Vallo.", true]]], x: ctx.W / 2, y: 320, size: size * 1.05, t0: s(25) - 0.05, t1: s(26) - 0.2, align: "center", stagger: 0.05, color: INKC, key: "#0069fe", sheen: false });
  flowRail(ctx, naira, { steps: ["Your card", "Our licensed provider", "The owner's bank"], x: 660, y: 470, gap: 192, size: 38, t0: w(24, "held") + 0.15, t1: s(26) - 0.3, seed: 35 });
  ctx.sfx("stamp", s(25) + 0.05, { offset: 0 });
  ctx.hideCaptions(s(24) - 0.1, s(26) - 0.1);
  ctx.hidePill(s(24) - 0.2, s(27) - 0.1);

  /* ===================== 15. A receipt for every payment (105.1 - 109.7) ===================== */
  ground(ctx, s(26) - 0.05, s(27) + 0.2, { tone: "navy", y: 30, seed: 36 });
  const rec = layer("receipt", s(26) - 0.1, s(27) + 0.2);
  W.show("d-payments", s(26) + 0.1, s(27) - 0.3, { enter: "rise", dur: 0.6 });
  featureCard(ctx, rec, { icon: "receipt", title: "A receipt for every payment", line: "Vallo earns only when a deal is done.", x: COL, y: 480, w: 620, t0: w(26, "receipt") - 0.1, t1: s(27) - 0.3, size: 32, from: "right", anchor: "center" });

  /* ===================== 16. Checked by a person (110.7 - 119.4) ===================== */
  ground(ctx, s(27) - 0.05, s(28) + 0.3, { tone: "electric", y: 25, seed: 21 });
  sceneBack(ctx, ctx.scene("ver-back", s(27) - 0.3, s(28) + 0.5, { z: 3 }), { scene: "step-2-dark", t0: s(27) - 0.2, t1: s(28) - 0.1, opacity: 0.4 });
  W.show("d-verification", s(27) - 0.2, s(28) - 0.3, { enter: "slide" });
  const ver = layer("ver", s(27), s(28) + 0.1);
  listCard(ctx, ver, {
    title: "What is checked",
    items: [
      ["Your ID", "One government issued document showing your face and name."],
      ["Your address", "Confirmed against the document you gave."],
      ["A bank account", "In your own name, matching your ID."],
      ["A real person", "Someone at Vallo reads it, every time."],
    ],
    x: COL, y: 440, w: 620, t0: w(27, "owner") - 0.1, t1: s(28) - 0.3, rot: -1, size: 30, seed: 60,
    stagger: Math.max(0.3, (w(27, "person") - w(27, "owner")) / 3),
  });
  proofCard(ctx, ver, { lines: ["Checked by a real", "person at Vallo."], x: 560, y: 920, w: 560, t0: w(27, "person") + 0.1, t1: s(28) - 0.25, rot: -2, size: 36, seed: 64, from: "left" });

  /* ===================== 17. Ask anything (120.0 - 125.9) ===================== */
  ground(ctx, s(28) - 0.05, s(31) + 0.3, { tone: "violet", y: 30, seed: 22 });
  const ask = layer("ask", s(28) - 0.1, s(31) + 0.2);
  headline(ctx, ask, { lines: [[["Got a ", false], ["question?", true]]], x: ctx.W / 2, y: 400, size: 104, t0: s(28), t1: s(29) - 0.25, align: "center" });
  W.show("d-assistant", s(29) - 0.3, w(29, "time") - 0.2, { enter: "slide" });
  W.show("d-assistant-answer", w(29, "time") - 0.2, s(31) - 0.3, { enter: "fade", dur: 0.4 });
  kicker(ctx, ask, { text: "Ask anything, any time", icon: "sparkles", x: COL, y: 300, t0: w(29, "Vallo") - 0.1, t1: w(30, "AI") - 0.2, size: 30, anchor: "center" });
  liveChip(ctx, ask, { text: "It always says it is an AI", x: COL, y: 300, t0: w(30, "AI") - 0.3, t1: s(31) - 0.25, size: 30, anchor: "center" });

  /* ===================== 18. Your language (126.3 - 131.4) ===================== */
  const lang = layer("lang", s(31) - 0.1, s(33) - 0.2);
  headline(ctx, lang, { lines: [[["Vallo speaks", false]], [["your ", false], ["language.", true]]], x: 120, y: 330, size: 84, t0: s(31), t1: s(33) - 0.5, stagger: 0.05 });
  const locales = [["d-welcome", "English", w(32, "English")], ["d-welcome-ha", "Hausa", w(32, "Hausa")], ["d-welcome-yo", "Yorùbá", w(32, "Yorùbá")], ["d-welcome-ig", "Igbo", w(32, "Igbo")]];
  locales.forEach(([id, name, t], i) => {
    W.show(id, t - 0.15, i === locales.length - 1 ? s(33) - 0.45 : locales[i + 1][2] - 0.15, { enter: i ? "fade" : "slide", dur: 0.3 });
    kicker(ctx, lang, { text: name, icon: "languages", x: 300, y: 640 + i * 96, t0: t - 0.1, t1: s(33) - 0.5, size: 32, anchor: "center" });
  });

  /* ===================== 19. The end card ===================== */
  ending(ctx, { t0: s(33), tLine: s(34) - 0.05, tBadges: s(35) - 0.1, tUrl: s(36) + 0.4, t1: ctx.duration });

  installFocus(ctx);
}
