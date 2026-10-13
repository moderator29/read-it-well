/**
 * VIDEO TWO: THE VALLO VISION AND WHAT'S COMING. 219.23 s (95 bars), 1920 x 1080.
 *
 * Every capability on screen wears a status badge: "Live now" (in the product
 * today, shown from a live capture), "Rolling out" (built, switching on in
 * stages), "In development" (being built, no date) or "Direction" (where Vallo
 * is heading). No dates, no guarantees, no provider names.
 *
 *   bars  1- 9   the fragmentation
 *   bars  9-17   one connected platform
 *   bars 17-26   the product's look and reach (dark and light, four languages)
 *   bars 26-34   discover and understand
 *   bars 34-42   connect and trust
 *   bars 42-50   owners and agents
 *   bars 50-58   restaurants
 *   bars 58-64   hotels and shortlets
 *   bars 64-70   payments
 *   bars 70-76   rewards
 *   bars 76-84   the assistant
 *   bars 84-90   the vision (Nigeria)
 *   bars 90-96   close (logo hit bar 90)
 */
import { createKit } from "../kit.js";
import { bgNavy, glow } from "../../engine/components.js";
import { nigeriaOutline, CITIES } from "../../scenes/a-common.js";

export async function build(ctx) {
  const k = createKit(ctx);
  const { tl } = ctx;
  const B = (n, beats = 0) => ctx.bar(n, beats);
  const END = ctx.duration;

  const ground = ctx.scene("ground", 0, END + 1, { z: 0 });
  bgNavy(ctx, ground, { glowX: 60, glowY: 8, glow: 0.5 });
  k.drift(ground, { x0: 1550, y0: 160, x1: 1050, y1: 760, size: 1400, t0: 0, t1: END, color: "rgb(0 105 254 / 0.30)" });
  k.drift(ground, { x0: 160, y0: 1000, x1: 800, y1: 420, size: 1200, t0: 0, t1: END, color: "rgb(0 63 152 / 0.30)" });

  /* Alternate scenes mirror: the text moves to the right, the phone to the left. */
  let flip = false;
  const FLIPPED = new Set(["discover", "owners", "hotels", "rewards", "vision-none"]);
  const R = { cx: 1390, cy: 548, height: 930, rx: 2, ry: -9, rz: 0 };
  const poses = () => flip
    ? { enter: { ...R, cx: 520, cy: R.cy + 160, ry: 22, rz: -3 }, settle: { cx: 520, ry: 5, cy: 540 } }
    : { enter: { ...R, cy: R.cy + 160, ry: -22, rz: 3 }, settle: { ry: -5, cy: 540 } };

  /** The common left-hand block: kicker, headline, line, badge. */
  const text = (s, t0, t1, { kicker, lines, accent = [], size = 108, para, badge = [], paraY = 560, badgeY = 790 }) => {
    const X = flip ? 1000 : 140;
    k.kicker(s, kicker, { x: X, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, lines, { x: X, y: 270, size, width: 900, t: t0 + 0.3, tOut: t1 - 0.3, accent });
    if (para) k.paragraph(s, para, { x: X, y: paraY, width: 780, size: 32, t: t0 + 1.3, tOut: t1 - 0.3 });
    badge.forEach(([kind, label], i) => k.status(s, kind, { x: X, y: badgeY + i * 84, t: t0 + 1.9 + i * 0.5, tOut: t1 - 0.3, label }));
  };

  /* ================= 1. THE FRAGMENTATION  bars 1-9 ================= */
  {
    const t1 = B(9);
    const s = k.scene("frag", 0, t1 + 0.6, { z: 2 });
    flip = FLIPPED.has("frag");
    k.kicker(s, "The physical-space economy", { x: 160, y: 210, t: 0.3, tOut: B(5) - 0.2 });
    k.headline(s, ["Spaces are found", "in one place."], { x: 160, y: 270, size: 120, width: 1600, t: 0.5, tOut: B(3, 2), accent: ["found"] });
    k.headline(s, ["Trusted in another."], { x: 160, y: 270, size: 120, width: 1600, t: B(3, 3), tOut: B(5, 2), accent: ["trusted"] });
    k.headline(s, ["Paid for in a third."], { x: 160, y: 270, size: 120, width: 1600, t: B(5, 3), tOut: B(7, 2), accent: ["paid"] });
    k.headline(s, ["Run in a fourth."], { x: 160, y: 270, size: 120, width: 1600, t: B(7, 3), tOut: t1 - 0.3, accent: ["run"] });
    const parts = [
      ["Discovery", "search", 300, 560], ["Trust", "shield-check", 820, 700], ["Transactions", "credit-card", 1300, 560], ["Operations", "layout-dashboard", 1560, 760],
    ];
    parts.forEach(([name, icon, x, y], i) => {
      const t = B(2, i * 1.5) + 0.4;
      k.chip(s, { text: name, icon, x, y, t, tOut: t1 - 0.3, size: 40, tone: "dark" });
    });
    k.rule(s, { x: 160, y: 520, w: 260, t: 1.2, tOut: t1 - 0.3 });
  }

  /* ================= 2. ONE CONNECTED PLATFORM  bars 9-17 ================= */
  {
    const t0 = B(9), t1 = B(17);
    const s = k.scene("one", t0 - 0.1, t1 + 0.6, { z: 3 });
    flip = FLIPPED.has("one");
    k.logo(s, { x: 150, y: 190, width: 520, markSize: 190, gap: 30, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["One platform for", "every step."], { x: 150, y: 430, size: 118, width: 1300, t: t0 + 0.8, tOut: t1 - 0.3, accent: ["step."] });
    ["Discover", "Trust", "Transact", "Operate"].forEach((w, i) => k.chip(s, { text: w, x: 150 + i * 250, y: 800, t: B(11) + i * 0.35, tOut: t1 - 0.3, size: 36, accent: i === 0 }));
    k.phoneAt(s, { id: "sc-home", t: t0 + 0.6, tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("impact_soft", t0, { offset: 2 });
    ctx.sfx("whoosh_short", t0 + 0.6);
  }

  /* ================= 3. LOOK AND REACH  bars 17-26 ================= */
  {
    const t0 = B(17), t1 = B(26);
    const s = k.scene("look", t0 - 0.1, t1 + 0.6, { z: 4 });
    flip = FLIPPED.has("look");
    text(s, t0, t1, { kicker: "Today", lines: ["Dark or light.", "Four languages."], accent: ["light.", "languages."], para: "The same Vallo, in the theme you like, in English, Hausa, Yorùbá and Igbo.", badge: [["live"]], badgeY: 780 });
    k.phoneAt(s, { id: "sc-home", t: t0 + 0.4, tOut: t1 - 0.1, z: 6, pose: { ...R, cy: R.cy + 160, rz: 3, cx: 1200, ry: -18 }, to: { cx: 1180, cy: 560, height: 880, ry: -10 } });
    k.phoneAt(s, { id: "sc-home-lt", theme: "light", t: t0 + 0.8, tOut: t1 - 0.1, z: 5, pose: { ...R, cy: R.cy + 160, cx: 1650, height: 800, ry: 8, rz: -3 }, to: { cx: 1630, cy: 600, height: 820, ry: 12 } });
    ctx.sfx("whoosh_short", t0 + 0.4);
    ctx.sfx("pop", t0 + 0.9);
  }

  /* ================= 4. DISCOVER AND UNDERSTAND  bars 26-34 ================= */
  {
    const t0 = B(26), t1 = B(34);
    const s = k.scene("discover", t0 - 0.1, t1 + 0.6, { z: 5 });
    flip = FLIPPED.has("discover");
    text(s, t0, t1, { kicker: "Discover and understand", lines: ["Search. See the", "whole cost."], accent: ["whole"], para: "Rent or buy, filter by what you need, and see rent, fees and deposit added up before you call anyone.", badge: [["live"]], badgeY: 790, size: 104 });
    k.phoneSeq(s, { steps: [{ id: "sc-search", t: t0 + 0.2 }, { id: "sc-listing-cost", t: B(29, 2) }, { id: "sc-price", t: B(32) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(29, 2) - 0.05);
    ctx.sfx("swipe", B(32) - 0.05);
  }

  /* ================= 5. CONNECT AND TRUST  bars 34-42 ================= */
  {
    const t0 = B(34), t1 = B(42);
    const s = k.scene("connect", t0 - 0.1, t1 + 0.6, { z: 6 });
    flip = FLIPPED.has("connect");
    text(s, t0, t1, { kicker: "Connect and trust", lines: ["Talk first.", "Know who."], accent: ["know"], para: "Message the owner or agent, ask to view, and see the four steps a person at Vallo checks.", badge: [["live"], ["rollout", "Video calls from the chat"]], badgeY: 780 });
    k.phoneSeq(s, { steps: [{ id: "sc-thread", t: t0 + 0.2 }, { id: "sc-verification", t: B(38) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("bubble_send", B(36, 1));
    ctx.sfx("swipe", B(38) - 0.05);
  }

  /* ================= 6. OWNERS AND AGENTS  bars 42-50 ================= */
  {
    const t0 = B(42), t1 = B(50);
    const s = k.scene("owners", t0 - 0.1, t1 + 0.6, { z: 7 });
    flip = FLIPPED.has("owners");
    text(s, t0, t1, { kicker: "Owners, landlords and agents", lines: ["List it yourself.", "Or let an agent."], accent: ["yourself."], para: "Listing is free. Approved agents apply once, and a person reads every application.", badge: [["live"]], badgeY: 780, size: 100 });
    k.phoneSeq(s, { steps: [{ id: "sc-agent-listings", t: t0 + 0.2 }, { id: "sc-agent", t: B(46) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(46) - 0.05);
  }

  /* ================= 7. RESTAURANTS  bars 50-58 ================= */
  {
    const t0 = B(50), t1 = B(58);
    const s = k.scene("restaurants", t0 - 0.1, t1 + 0.6, { z: 8 });
    flip = FLIPPED.has("restaurants");
    text(s, t0, t1, { kicker: "Restaurants", lines: ["Reservations,", "made simple."], accent: ["simple."], para: "Guests find a table and book it. The restaurant confirms, and the conversation lives inside the reservation.", badge: [["live", "Reservations"], ["dev", "Table deposits"]], badgeY: 800, size: 104 });
    k.phoneSeq(s, { steps: [{ id: "sc-restaurant", t: t0 + 0.2 }, { id: "sc-host-reservations", t: B(54) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(54) - 0.05);
  }

  /* ================= 8. HOTELS AND SHORTLETS  bars 58-64 ================= */
  {
    const t0 = B(58), t1 = B(64);
    const s = k.scene("hotels", t0 - 0.1, t1 + 0.6, { z: 9 });
    flip = FLIPPED.has("hotels");
    text(s, t0, t1, { kicker: "Hotels and shortlets", lines: ["Rooms, nights", "and guests."], accent: ["guests."], para: "Add rooms, set nights and prices, and manage requests and bookings from one workspace.", badge: [["live"]], badgeY: 780, size: 104 });
    k.phoneSeq(s, { steps: [{ id: "sc-stay", t: t0 + 0.2 }, { id: "sc-host-rooms", t: B(60, 3) }, { id: "sc-host-calendar", t: B(62, 2) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(60, 3) - 0.05);
    ctx.sfx("swipe", B(62, 2) - 0.05);
  }

  /* ================= 9. PAYMENTS  bars 64-70 ================= */
  {
    const t0 = B(64), t1 = B(70);
    const s = k.scene("payments", t0 - 0.1, t1 + 0.6, { z: 10 });
    flip = FLIPPED.has("payments");
    text(s, t0, t1, { kicker: "Payments", lines: ["Clear money.", "Never ours."], accent: ["never"], para: "Vallo never holds your money. Licensed partners hold it, and every payment gets a receipt.", badge: [["live", "Receipts and payment records"], ["rollout", "Wallet"]], badgeY: 790, size: 112 });
    k.phoneSeq(s, { steps: [{ id: "sc-payments", t: t0 + 0.2 }, { id: "sc-receipts", t: B(67, 2) }], tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("swipe", B(67, 2) - 0.05);
  }

  /* ================= 10. REWARDS  bars 70-76 ================= */
  {
    const t0 = B(70), t1 = B(76);
    const s = k.scene("rewards", t0 - 0.1, t1 + 0.6, { z: 11 });
    flip = FLIPPED.has("rewards");
    text(s, t0, t1, { kicker: "Referrals and rewards", lines: ["Bring friends.", "Earn rewards."], accent: ["rewards."], para: "Share your link. A friend counts once they finish setting up their account.", badge: [["rollout"]], badgeY: 700, size: 108 });
    k.phoneAt(s, { id: "sc-rewards", t: t0 + 0.2, tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("chime_notify", B(72, 1), { offset: -3 });
  }

  /* ================= 11. THE ASSISTANT  bars 76-84 ================= */
  {
    const t0 = B(76), t1 = B(84);
    const s = k.scene("assistant", t0 - 0.1, t1 + 0.6, { z: 12 });
    flip = FLIPPED.has("assistant");
    text(s, t0, t1, { kicker: "Assistance", lines: ["Ask. Understand.", "Decide."], accent: ["decide."], para: "Today the assistant answers questions on prices, areas and renting. Next, help finishing tasks, always with your approval.", badge: [["live", "Answers questions"], ["next", "Help with tasks, with your approval"]], badgeY: 800, size: 108 });
    k.phoneAt(s, { id: "sc-assistant-start", t: t0 + 0.2, tOut: t1 - 0.1, pose: poses().enter, to: poses().settle });
    ctx.sfx("whoosh_short", t0 + 0.2);
    ctx.sfx("chime_notify", B(78, 1), { offset: -3 });
  }

  /* ================= 12. THE VISION  bars 84-90 ================= */
  {
    const t0 = B(84), t1 = B(90);
    const s = k.scene("vision", t0 - 0.1, t1 + 0.6, { z: 13 });
    flip = FLIPPED.has("vision");
    const map = await nigeriaOutline({ x: 1010, y: 120, w: 760 });
    const svg = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${ctx.W}px`, height: `${ctx.H}px` } }, s);
    svg.innerHTML = `<svg width="${ctx.W}" height="${ctx.H}" viewBox="0 0 ${ctx.W} ${ctx.H}"><path d="${map.d}" fill="rgb(0 105 254 / 0.16)" stroke="rgb(143 211 255 / 0.7)" stroke-width="3" stroke-linejoin="round"/></svg>`;
    k.appear(svg, t0 + 0.2, t1 - 0.3, { y: 30, dur: 1.1 });
    CITIES.forEach((c, i) => {
      const p = map.proj(c.lon, c.lat);
      const dot = ctx.el("div", { class: "abs", style: { left: `${p.x - 13}px`, top: `${p.y - 13}px`, width: "26px", height: "26px", borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff 0%, #8fd3ff 30%, #0069fe 80%)", boxShadow: "0 0 36px rgb(0 105 254 / 0.9)" } }, s);
      const label = ctx.el("div", { class: "abs", style: { left: `${p.x + 26}px`, top: `${p.y - 17}px`, font: "600 30px/1 Inter, sans-serif", color: "#fff", whiteSpace: "nowrap" }, text: c.name }, s);
      const t = B(85) + i * 0.5;
      k.appear(dot, t, t1 - 0.3, { y: 0, dur: 0.5, ease: "back.out(2)", scale: 0.2 });
      k.appear(label, t + 0.15, t1 - 0.3, { y: 10, dur: 0.5 });
      ctx.sfx("pop", t + 0.05, { offset: -2 });
    });
    k.kicker(s, "Where Vallo is heading", { x: 140, y: 210, t: t0 + 0.2, tOut: t1 - 0.3 });
    k.headline(s, ["The infrastructure", "for physical spaces."], { x: 140, y: 270, size: 96, width: 900, t: t0 + 0.4, tOut: t1 - 0.3, accent: ["spaces."] });
    k.paragraph(s, "Discovering them. Understanding them. Transacting around them. Operating them.", { x: 140, y: 560, width: 760, size: 34, t: t0 + 1.6, tOut: t1 - 0.3 });
    k.status(s, "next", { x: 140, y: 790, t: t0 + 2.2, tOut: t1 - 0.3 });
  }

  /* ================= 13. CLOSE  bars 90-96 ================= */
  {
    const t0 = B(90);
    const s = k.scene("close", t0 - 0.1, END + 1, { z: 14 });
    flip = FLIPPED.has("close");
    k.logo(s, { x: 350, y: 270, width: 720, markSize: 240, gap: 36, t: t0 });
    k.headline(s, ["Real estate,", "done right."], { x: 160, y: 590, size: 100, width: 1600, align: "center", t: B(91), accent: ["right."], stagger: 0.12 });
    k.paragraph(s, "Explore Vallo at vallospaces.com", { x: 160, y: 850, width: 1600, align: "center", size: 46, t: B(93) });
    k.paragraph(s, "iPhone and Android apps coming soon", { x: 160, y: 930, width: 1600, align: "center", size: 30, color: "rgb(143 211 255 / 0.85)", t: B(94) });
    k.sparkles(s, { area: { x: 300, y: 200, w: 1320, h: 330 }, count: 9, seed: 21, t0, t1: END - 1 });
    ctx.sfx("impact_soft", t0, { offset: 3 });
    ctx.sfx("sparkle", B(91));
    ctx.sfx("stamp", B(93), { offset: -4 });
  }
}
