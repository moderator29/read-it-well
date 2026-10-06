/**
 * Mobile rows 25 to 27 (54.23 to 62.88), storyboard v3.2, on mist.
 *   25  four role chips land fresh in WORDS on their words; on "verified
 *       mark" the product's mark stamps beside each; they drop away together.
 *   26  verification-lt rises at PHONE_HIGH ("Your ID", "Government issued
 *       ID") and holds; the pill already says "Checked by a person".
 *   27  on "person" the phone dims and card 2 swings in over it; it turns
 *       at 60.40 and holds its answer ("Checked by a real person / at
 *       Vallo.") to 62.25; it flies out to the top left and its mark spins
 *       off into the naira coin (section c's coin), which falls on toward
 *       the lock: the handoff to c at 62.88. The phone leaves as the
 *       chapter ends.
 */
import { questionCard } from "../engine/components.js";
import { LAYOUT, QUESTIONS } from "./layout.js";
import { coin } from "./c-kit.js";
import { NAVY, ramp, kf, mix, screenPage, showDuring, glassCard, verifiedMark, measure } from "./b-kit.js";

/** Where the coin is at 62.885 (B -> C in handoffs.md; section c's COIN_IN). */
export const COIN_OUT = { x: 330, y: 470, size: 110, spin: 0, vy: 233, vspin: 1400 };

/**
 * The coin's path from the card's mark to the handoff, shared by both
 * films: the mark turns edge-on, the coin carries on from 90 degrees, rises,
 * and falls into `out` exactly at tEnd with c's speeds (vy, vspin).
 */
export function markToCoin(ctx, parent, { markAt, mark0, tSpin, tEnd, out, badgeHTML, flip = 0.16 }) {
  const MPX = mark0.size;
  const m = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${MPX}px`, height: `${MPX}px`, visibility: "hidden", perspective: "600px" } }, parent);
  const mInner = ctx.el("div", { style: { width: `${MPX}px`, height: `${MPX}px` } }, m);
  mInner.innerHTML = badgeHTML;
  const C = coin(ctx, parent, { size: out.size });
  C.set({ opacity: 0 });
  const tSwap = tSpin + flip;
  /* the fall's last stretch at c's speed: power2.in over d reaches 2 * drop / d */
  const DROP = 20;
  const tPeak = tEnd - (2 * DROP) / out.vy;
  const P = (out.vspin * (tEnd - tSwap)) / 630;
  ctx.onFrame((t) => {
    const on = t >= tSpin && t < tEnd;
    m.style.visibility = on && t < tSwap ? "inherit" : "hidden";
    if (!on) {
      C.set({ opacity: 0 });
      return;
    }
    const m0 = markAt();
    const u = ramp(ctx, t, tSpin, tEnd, "power1.inOut");
    const x = mix(m0.x, out.x, u);
    const y = kf(ctx, t, [[tSpin, m0.y], [tPeak, out.y - DROP, "power2.out"], [tEnd, out.y, "power2.in"]]);
    const size = kf(ctx, t, [[tSpin, MPX], [tSwap, MPX + 6, "power1.out"], [tEnd, out.size, "power2.inOut"]]);
    if (t < tSwap) {
      const spin = kf(ctx, t, [[tSpin, 0], [tSwap, 90, "power2.in"]]);
      m.style.transform = `translate(${(x - MPX / 2).toFixed(2)}px, ${(y - MPX / 2).toFixed(2)}px) scale(${(size / MPX).toFixed(4)})`;
      mInner.style.transform = `rotateY(${spin.toFixed(2)}deg)`;
      C.set({ opacity: 0 });
    } else {
      const spin = 90 + 630 * Math.pow((t - tSwap) / (tEnd - tSwap), P);
      C.set({ x, y, size, spin, tilt: 0, opacity: 1, shadow: 0 });
    }
  });
}

export const BADGE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="m16.2 9-5.6 5.6L7.8 11.8" fill="none" stroke="#0069fe" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export async function checked(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const layer = ctx.scene("b-m-roles", T.r25 - 0.02, T.r26 + 0.4, { z: 30 });

  /* ==================== row 25: the role chips, a 2 x 2 cluster centred at y 800 ==================== */
  const roles = [
    { text: "Owner", t: T.owners, row: 0, col: 0 },
    { text: "Host", t: T.hosts, row: 0, col: 1 },
    { text: "Hotel", t: T.hotels13, row: 1, col: 0 },
    { text: "Restaurant", t: T.restaurants, row: 1, col: 1 },
  ];
  const markTimes = [T.verified, T.verified + 0.15, T.verified + 0.3, T.verified + 0.45];
  const chips = roles.map((r, i) => {
    const el = glassCard(ctx, layer, { w: null, radius: 999, shadow: "m", style: { width: "auto", display: "flex", alignItems: "center", font: "700 88px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } });
    const label = ctx.el("span", { text: r.text, style: { transform: "translateY(4px)" } }, el);
    const mark = verifiedMark(ctx, el, 88, { style: { position: "absolute", top: "0px", opacity: "0" } });
    return { ...r, el, label, mark, tm: markTimes[i] };
  });
  /* one size, fitted so the wider row is at most 900 px (inside the safe width), 1.3x round 1's chips */
  let lay = null;
  const doLayout = () => {
    const w100 = chips.map((c) => measure(c.text, "700 100px Poppins", "-0.035em"));
    const GAP = 34;
    let size = 100;
    const rowW = (sz) => [0, 1].map((r) => chips.filter((c) => c.row === r).reduce((a, c) => a + (w100[chips.indexOf(c)] * sz) / 100 + sz * 1.3 + sz * 0.4, 0) + GAP);
    while (Math.max(...rowW(size)) > 900) size -= 1;
    const H = Math.round(size * 1.5);
    const markS = Math.round(size * 0.95);
    chips.forEach((c, i) => {
      c.el.style.fontSize = `${size}px`;
      c.el.style.height = `${H}px`;
      c.el.style.padding = `0 ${Math.round(size * 0.8)}px 0 ${Math.round(size * 0.5)}px`;
      Object.assign(c.mark.style, { width: `${markS}px`, height: `${markS}px`, right: `${-Math.round(markS * 0.36)}px`, top: `${Math.round((H - markS) / 2)}px` });
      c.mark.querySelector("svg").setAttribute("width", markS);
      c.mark.querySelector("svg").setAttribute("height", markS);
    });
    const widths = chips.map((c) => c.el.offsetWidth);
    const rows = [0, 1].map((r) => chips.filter((c) => c.row === r));
    lay = chips.map((c) => {
      const row = rows[c.row];
      const total = row.reduce((a, x) => a + widths[chips.indexOf(x)], 0) + GAP;
      let x = (ctx.W - total) / 2 + (c.row ? 18 : -18);
      if (c.col === 1) x += widths[chips.indexOf(row[0])] + GAP;
      return { x, y: 800 + (c.row ? 24 : -24 - H) + (c.row ? 0 : 0), H };
    });
  };
  /* they drop away together just after the last mark, before the phone rises */
  const tGone = T.mark + 0.01;          // 57.62
  chips.forEach((c, i) => {
    ctx.sfx("pop_low", c.t, { offset: -2 });
    ctx.sfx("stamp", c.tm);
    tl.fromTo(c.mark, { scale: 1.9, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, c.tm);
    showDuring(ctx, c.el, [[c.t - 0.02, tGone + 0.3]]);
    ctx.onFrame((t) => {
      if (t < c.t - 0.02 || t > tGone + 0.3) return;
      if (!lay) doLayout();
      const k = ramp(ctx, t, c.t - 0.02, c.t + 0.46, "land");
      const gone = ramp(ctx, t, tGone, tGone + 0.3, "power2.in");
      const y = lay[i].y + 90 * (1 - k) + gone * 120 - 10 * ramp(ctx, t, c.t + 0.46, tGone, "none"); // floats up while held
      const rot = (1 - k) * (i % 2 ? 7 : -7);
      c.el.style.transform = `translate(${lay[i].x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      c.el.style.opacity = String((Math.min(1, k * 2.2) * (1 - gone)).toFixed(3));
    });
  });

  /* ==================== rows 26-27: the phone ==================== */
  const pL = S.pL;
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  const tRise = ctx.beat(99.9);                 // 57.63 -> in place by ~58.2
  const tIn = T.person - 0.02;                  // 59.30: card 2
  const tTurn = ctx.beat(104.7);                // 60.40
  const tOut = ctx.beat(108.42);                // 62.55: the answer holds 1.75 s and more
  const tEnd = T.end;
  const pose = S.pLpose;
  pose.to(tRise + 0.11, 0.001, { ...HIGH, cy: 2600, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(tRise + 0.12, 0.5, HIGH, "glide");                                      // 57.75-58.25
  /* round 5: the phone eases right to cx 700 at h 1400 (x 365-1035, whole) as card 2 comes; then a 10 px float,
     never still. The pill steps aside: it would sit on the app's logo. */
  const SIDE = { cx: 700, cy: HIGH.cy - 4, height: HIGH.height };
  pose.to(tRise + 0.64, tIn + 0.3 - (tRise + 0.64), SIDE, "power1.inOut");
  pose.to(tIn + 0.3, tOut - tIn - 0.3, { cy: HIGH.cy - 14 }, "drift");
  ctx.hidePill(57.9, 62.5);
  pose.to(tOut, 0.24, { cy: 2650 }, "power2.in");                                 // leaves as the chapter ends, gone by 62.79
  const page = screenPage(ctx, pL, ctx.src.display("verification-lt"));
  showDuring(ctx, page.el, [[tRise + 0.1, tEnd]]);

  /* ==================== row 27: card 2 ==================== */
  const q = QUESTIONS[1];
  const cardLayer = ctx.scene("b-m-card2", tIn - 0.05, tEnd, { z: 32 });
  /* round 5: at x 40-400, y 1180-1340: on the mist and the bezel (35 px at most), on no screen text */
  const BOX = { x: 40, y: 1180, w: 360, h: 160 };
  const card = questionCard(ctx, cardLayer, { q: q.q, a: q.a, box: BOX, mark: true, fontSize: 30 });
  card.front.style.justifyContent = "center";
  card.front.style.textAlign = "center";
  card.front.style.textWrap = "balance";
  Object.assign(card.back.style, { justifyContent: "center", fontSize: "27px", lineHeight: "1.22", textWrap: "balance" });
  ctx.gsap.set(card.root, { transformOrigin: "50% 50%" });
  ctx.gsap.set(card.root, { x: -900, y: -560, rotation: -32 });
  tl.fromTo(card.root, { x: -900, y: -560, rotation: -32 }, { x: 0, y: 0, rotation: -2, duration: 0.52, ease: "back.out(1.2)", immediateRender: false }, tIn);
  ctx.sfx("card_slide", tIn, { offset: -2 });
  card.turn(tTurn);
  /* out to section c's CARD_OUT.mobile.c2: centre (-575, -6), -24 deg, 0.8 */
  const c0 = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 };
  tl.fromTo(card.root, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: -575 - c0.x, y: -6 - c0.y, rotation: -24, scale: 0.8, duration: 0.3, ease: "power3.in", immediateRender: false }, tOut);
  showDuring(ctx, card.root, [[tIn, tOut + 0.32]]);

  /* the card's own mark hides as its twin spins off into the coin */
  const tSpin = tOut + 0.02;
  const backMark = card.back.querySelector("div");
  ctx.onFrame((t) => {
    if (backMark) backMark.style.visibility = t >= tSpin ? "hidden" : "inherit";
  });
  let m0 = null;
  markToCoin(ctx, cardLayer, {
    mark0: { size: Math.round(30 * 1.3) },
    flip: 0.06,
    markAt: () => {
      if (!m0) m0 = { x: BOX.x + backMark.offsetLeft + backMark.offsetWidth / 2, y: BOX.y + backMark.offsetTop + backMark.offsetHeight / 2 };
      return m0;
    },
    tSpin, tEnd, out: COIN_OUT, badgeHTML: BADGE,
  });
}
