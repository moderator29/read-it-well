/**
 * VIDEO ONE: HOW VALLO WORKS. 140.77 s (61 bars at 104 BPM), 1920 x 1080.
 *
 *   bars  1-7    the problem            (music intro; the drop is bar 7)
 *   bars  7-10   meet Vallo
 *   bars 10-18   discover               (home, search, filters)
 *   bars 18-27   understand             (listing, the whole cost, price check)
 *   bars 27-35   connect                (saved, the enquiry thread, verification)
 *   bars 35-42   stays and tables
 *   bars 42-49   trust and payments
 *   bars 49-55   workspaces
 *   bars 55-58   the assistant
 *   bars 58-62   close                  (logo hit bar 58)
 *
 * Every screen is a real capture of the live platform (docs/marketing/source,
 * the sc-* set). Listings are the platform's own example stock, labelled as
 * examples on the screens. No voiceover: the words are on screen. FACTS in
 * ../../FACTS-OCT.md.
 */
import { createKit } from "../kit.js";
import { bgNavy, glow } from "../../engine/components.js";

export async function build(ctx) {
  const k = createKit(ctx);
  const { tl } = ctx;
  const B = (n, beats = 0) => ctx.bar(n, beats);
  const END = ctx.duration;

  /* ---------- the ground: one navy field with two slow lights ---------- */
  const ground = ctx.scene("ground", 0, END + 1, { z: 0 });
  bgNavy(ctx, ground, { glowX: 62, glowY: 10, glow: 0.5 });
  k.drift(ground, { x0: 1500, y0: 200, x1: 1100, y1: 700, size: 1300, t0: 0, t1: END, color: "rgb(0 105 254 / 0.30)" });
  k.drift(ground, { x0: 200, y0: 1000, x1: 700, y1: 500, size: 1100, t0: 0, t1: END, color: "rgb(0 63 152 / 0.30)" });

  const PHONE_R = { cx: 1390, cy: 548, height: 930, rx: 2, ry: -9, rz: 0 };
  const PHONE_R_TO = { ry: -5, cy: 540 };

  /* ================= 1. THE PROBLEM  bars 1-7 ================= */
  {
    const s = k.scene("problem", 0, B(7) + 0.6, { z: 2 });
    k.kicker(s, "Finding a space", { x: 160, y: 250, t: 0.3, tOut: B(4) - 0.2 });
    k.headline(s, ["It shouldn't feel", "like a gamble."], { x: 160, y: 310, size: 132, width: 1500, t: 0.5, tOut: B(4) - 0.2, accent: ["gamble"], dur: 1.0 });
    const lines = [
      ["Listings scattered", "across chats and calls."],
      ["Costs that show up", "after you have asked."],
      ["Who is on the", "other end?"],
    ];
    lines.forEach(([a, b], i) => {
      const t = B(4) + i * ctx.BAR * 0.95;
      const tOut = i === 2 ? B(7) - 0.3 : t + ctx.BAR * 0.95 - 0.15;
      k.headline(s, [a, b], { x: 160, y: 380, size: 124, width: 1600, t, tOut, accent: i === 0 ? ["scattered"] : i === 1 ? ["late"] : ["who"], dur: 0.8 });
    });
    k.rule(s, { x: 160, y: 700, w: 220, t: B(4) + 0.2, tOut: B(7) - 0.3 });
  }

  /* ================= 2. MEET VALLO  bars 7-10 ================= */
  {
    const s = k.scene("meet", B(7) - 0.1, B(10) + 0.6, { z: 3 });
    k.logo(s, { x: 340, y: 300, width: 700, markSize: 230, gap: 36, t: B(7), tOut: B(10) - 0.3 });
    k.headline(s, ["Homes. Stays. Restaurants."], { x: 160, y: 610, size: 92, width: 1600, align: "center", t: B(7, 1.5), tOut: B(10) - 0.3, accent: ["restaurants"], stagger: 0.12 });
    k.paragraph(s, "One app. One account.", { x: 160, y: 760, width: 1600, align: "center", size: 42, t: B(8, 1), tOut: B(10) - 0.3 });
    k.sparkles(s, { area: { x: 300, y: 250, w: 1320, h: 560 }, count: 7, seed: 5, t0: B(7), t1: B(10) - 0.2 });
    ctx.sfx("impact_soft", B(7), { offset: 2 });
    ctx.sfx("sparkle", B(7, 1.5), { offset: 0 });
  }

  /* ================= 3. DISCOVER  bars 10-18 ================= */
  {
    const t0 = B(10), t1 = B(18);
    const s = k.scene("discover", t0 - 0.1, t1 + 0.6, { z: 4 });
    k.kicker(s, "01  Discover", { x: 140, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Search across", "Nigeria."], { x: 140, y: 270, size: 112, width: 1000, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["nigeria"] });
    k.paragraph(s, "Rent or buy. Filter by exactly what you need.", { x: 140, y: 560, width: 780, t: t0 + 1.2, tOut: t1 - 0.3 });
    k.chip(s, { text: "For you", icon: "heart", x: 140, y: 720, t: B(11, 1), tOut: t1 - 0.3 });
    k.chip(s, { text: "Near me", icon: "map-pin", x: 360, y: 720, t: B(11, 2), tOut: t1 - 0.3 });
    k.chip(s, { text: "New listed", icon: "clock", x: 600, y: 720, t: B(11, 3), tOut: t1 - 0.3 });
    k.chip(s, { text: "52 homes match", icon: "check", x: 140, y: 830, t: B(15, 2), tOut: t1 - 0.3, accent: true });
    k.phoneSeq(s, { steps: [{ id: "sc-home", t: t0 + 0.3 }, { id: "sc-search", t: B(12, 2) }, { id: "sc-filters", t: B(15) }], tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: PHONE_R_TO });
    ctx.sfx("whoosh_short", t0 + 0.3);
    ctx.sfx("tap", B(12, 2) - 0.05);
    ctx.sfx("toggle_on", B(15, 2));
  }

  /* ================= 4. UNDERSTAND  bars 18-27 ================= */
  {
    const t0 = B(18), t1 = B(27);
    const s = k.scene("understand", t0 - 0.1, t1 + 0.6, { z: 5 });
    k.kicker(s, "02  Understand", { x: 140, y: 190, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["See the whole cost", "before you call."], { x: 140, y: 250, size: 104, width: 1100, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["whole"] });
    k.paragraph(s, "Rent, agency and legal fees, agreement fee and the refundable caution deposit, added up on the listing.", { x: 140, y: 520, width: 820, size: 33, t: t0 + 1.4, tOut: t1 - 0.3 });
    k.chip(s, { text: "Example listing", icon: "info", x: 140, y: 740, t: t0 + 2, tOut: t1 - 0.3, tone: "dark" });
    k.chip(s, { text: "Price check by area", icon: "bar-chart-3", x: 140, y: 850, t: B(24, 1), tOut: t1 - 0.3, accent: true });
    k.phoneSeq(s, { steps: [{ id: "sc-listing", t: t0 + 0.2 }, { id: "sc-listing-cost", t: B(21) }, { id: "sc-price", t: B(24, 2) }], tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: { ...PHONE_R_TO, ry: -8 } });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(21) - 0.05);
    ctx.sfx("swipe", B(24, 2) - 0.05);
  }

  /* ================= 5. CONNECT  bars 27-35 ================= */
  {
    const t0 = B(27), t1 = B(35);
    const s = k.scene("connect", t0 - 0.1, t1 + 0.6, { z: 6 });
    k.kicker(s, "03  Connect", { x: 140, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Talk first.", "Then view."], { x: 140, y: 270, size: 120, width: 1000, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["view"] });
    k.paragraph(s, "Message the owner or agent inside the app, ask to view the home and plan the visit.", { x: 140, y: 560, width: 780, t: t0 + 1.3, tOut: t1 - 0.3 });
    k.chip(s, { text: "Save and compare", icon: "heart", x: 140, y: 740, t: t0 + 1.6, tOut: t1 - 0.3 });
    k.chip(s, { text: "Ask to view this home", icon: "calendar", x: 140, y: 850, t: B(30, 1), tOut: t1 - 0.3, accent: true });
    k.phoneSeq(s, { steps: [{ id: "sc-saved", t: t0 + 0.2 }, { id: "sc-thread", t: B(29, 1) }, { id: "sc-verification", t: B(32, 2) }], tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: PHONE_R_TO });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("bubble_send", B(30, 1));
    ctx.sfx("swipe", B(32, 2) - 0.05);
  }

  /* ================= 6. STAYS AND TABLES  bars 35-42 ================= */
  {
    const t0 = B(35), t1 = B(42);
    const s = k.scene("stays", t0 - 0.1, t1 + 0.6, { z: 7 });
    k.kicker(s, "04  Stays and tables", { x: 140, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Book a stay.", "Reserve a table."], { x: 140, y: 270, size: 108, width: 1000, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["stay.", "table."] });
    k.paragraph(s, "Hotels, shortlets and resorts, with the room, the dates and the price per night.", { x: 140, y: 560, width: 780, t: t0 + 1.3, tOut: t1 - 0.3 });
    k.chip(s, { text: "Hotels", icon: "building-2", x: 140, y: 740, t: B(37), tOut: t1 - 0.3 });
    k.chip(s, { text: "Shortlets", icon: "home", x: 330, y: 740, t: B(37, 1), tOut: t1 - 0.3 });
    k.chip(s, { text: "Restaurants", icon: "utensils", x: 560, y: 740, t: B(37, 2), tOut: t1 - 0.3 });
    k.phoneSeq(s, { steps: [{ id: "sc-stays", t: t0 + 0.2 }, { id: "sc-stay", t: B(37, 2) }, { id: "sc-restaurant", t: B(40) }], tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: PHONE_R_TO });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(37, 2) - 0.05);
    ctx.sfx("swipe", B(40) - 0.05);
  }

  /* ================= 7. TRUST  bars 42-49 ================= */
  {
    const t0 = B(42), t1 = B(49);
    const s = k.scene("trust", t0 - 0.1, t1 + 0.6, { z: 8 });
    k.kicker(s, "05  Trust", { x: 140, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Know who you're", "dealing with."], { x: 140, y: 270, size: 108, width: 1000, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["who"] });
    k.paragraph(s, "A named person behind every listing, steps a person at Vallo checks, and a receipt for every payment.", { x: 140, y: 560, width: 780, t: t0 + 1.3, tOut: t1 - 0.3 });
    k.chip(s, { text: "Vallo never holds your money", icon: "shield-check", x: 140, y: 790, t: B(45, 1), tOut: t1 - 0.3, accent: true, size: 32 });
    k.phoneSeq(s, { steps: [{ id: "sc-verification", t: t0 + 0.2 }, { id: "sc-payments", t: B(45) }], tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: PHONE_R_TO });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("stamp", B(45, 1), { offset: -2 });
  }

  /* ================= 8. WORKSPACES  bars 49-55 ================= */
  {
    const t0 = B(49), t1 = B(55);
    const s = k.scene("workspaces", t0 - 0.1, t1 + 0.6, { z: 9 });
    k.kicker(s, "06  Workspaces", { x: 140, y: 150, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Run it all", "on Vallo."], { x: 140, y: 210, size: 112, width: 800, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["vallo."] });
    k.paragraph(s, "Landlords and agents list properties. Hotels and shortlets manage rooms. Restaurants take reservations.", { x: 140, y: 500, width: 640, size: 31, t: t0 + 1.3, tOut: t1 - 0.3 });
    const base = { rx: 2, rz: 0 };
    k.phoneAt(s, { id: "sc-agent-listings", t: t0 + 0.5, tOut: t1 - 0.1, pose: { ...base, cx: 1000, cy: 700, height: 740, ry: -26, rz: 4 }, to: { cx: 1000, cy: 590, height: 760, ry: -14 } });
    k.phoneAt(s, { id: "sc-host", t: t0 + 0.8, tOut: t1 - 0.1, z: 6, pose: { ...base, cx: 1370, cy: 740, height: 860, ry: -8, rz: 0 }, to: { cx: 1370, cy: 540, height: 900, ry: -4 } });
    k.phoneAt(s, { id: "sc-host-reservations", t: t0 + 1.1, tOut: t1 - 0.1, z: 5, pose: { ...base, cx: 1740, cy: 760, height: 740, ry: 14, rz: -4 }, to: { cx: 1730, cy: 600, height: 760, ry: 12 } });
    ctx.sfx("whoosh_long", t0 + 0.3, { offset: -2 });
    ctx.sfx("pop", t0 + 0.9);
    ctx.sfx("pop", t0 + 1.2);
  }

  /* ================= 9. THE ASSISTANT  bars 55-58 ================= */
  {
    const t0 = B(55), t1 = B(58);
    const s = k.scene("assistant", t0 - 0.1, t1 + 0.6, { z: 10 });
    k.kicker(s, "07  Ask", { x: 140, y: 230, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["Ask anything.", "Any time."], { x: 140, y: 290, size: 112, width: 1000, t: t0 + 0.3, tOut: t1 - 0.3, accent: ["time."] });
    k.paragraph(s, "Prices, areas, how renting works. The assistant tells you it is an AI service and asks your agreement first.", { x: 140, y: 580, width: 780, size: 32, t: t0 + 1.2, tOut: t1 - 0.3 });
    k.phoneAt(s, { id: "sc-assistant-start", t: t0 + 0.2, tOut: t1 - 0.1, pose: { ...PHONE_R, cy: PHONE_R.cy + 160, ry: -22, rz: 3 }, to: PHONE_R_TO });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("chime_notify", B(56, 1), { offset: -2 });
  }

  /* ================= 10. CLOSE  bars 58-62 ================= */
  {
    const t0 = B(58), t1 = END;
    const s = k.scene("close", t0 - 0.1, END + 1, { z: 11 });
    k.logo(s, { x: 350, y: 270, width: 720, markSize: 240, gap: 36, t: t0 });
    k.headline(s, ["Real estate,", "done right."], { x: 160, y: 590, size: 100, width: 1600, align: "center", t: B(59), accent: ["right."], stagger: 0.12 });
    k.paragraph(s, "Explore Vallo at vallospaces.com", { x: 160, y: 850, width: 1600, align: "center", size: 46, t: B(60, 1) });
    k.paragraph(s, "iPhone and Android apps coming soon", { x: 160, y: 930, width: 1600, align: "center", size: 30, color: "rgb(143 211 255 / 0.85)", t: B(61) });
    k.sparkles(s, { area: { x: 300, y: 200, w: 1320, h: 330 }, count: 9, seed: 11, t0: t0, t1: END - 1 });
    ctx.sfx("impact_soft", t0, { offset: 3 });
    ctx.sfx("sparkle", B(59));
    ctx.sfx("stamp", B(60, 1), { offset: -4 });
  }
}
