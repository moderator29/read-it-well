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
import { NAVY, ramp, kf, mix, screenPage, showDuring, glassCard, verifiedMark } from "./b-kit.js";

/** Where the coin is at 62.885 (B -> C in handoffs.md; section c's COIN_IN). */
export const COIN_OUT = { x: 330, y: 470, size: 110, spin: 0, vy: 233, vspin: 1400 };

/**
 * The coin's path from the card's mark to the handoff, shared by both
 * films: the mark turns edge-on, the coin carries on from 90 degrees, rises,
 * and falls into `out` exactly at tEnd with c's speeds (vy, vspin).
 */
export function markToCoin(ctx, parent, { markAt, mark0, tSpin, tEnd, out, badgeHTML }) {
  const MPX = mark0.size;
  const m = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${MPX}px`, height: `${MPX}px`, visibility: "hidden", perspective: "600px" } }, parent);
  const mInner = ctx.el("div", { style: { width: `${MPX}px`, height: `${MPX}px` } }, m);
  mInner.innerHTML = badgeHTML;
  const C = coin(ctx, parent, { size: out.size });
  C.set({ opacity: 0 });
  const tSwap = tSpin + 0.16;
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
  const W = L.WORDS;
  const layer = ctx.scene("b-m-roles", T.r25 - 0.02, T.r26 + 0.4, { z: 30 });

  /* ==================== row 25: the role chips ==================== */
  const roles = [
    { text: "Owner", t: T.owners, cx: 404 },
    { text: "Host", t: T.hosts, cx: 612 },
    { text: "Hotel", t: T.hotels13, cx: 430 },
    { text: "Restaurant", t: T.restaurants, cx: 566 },
  ];
  const H = 116;
  const GAP = 16;
  const top0 = W.y + (W.h - (H * 4 + GAP * 3)) / 2;
  const markTimes = [T.verified, T.verified + 0.15, T.verified + 0.3, T.verified + 0.45];
  const chips = roles.map((r, i) => {
    const el = glassCard(ctx, layer, { w: null, radius: 999, shadow: "m", style: { width: "auto", height: `${H}px`, display: "flex", alignItems: "center", padding: "0 64px 0 46px", font: "700 76px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } });
    ctx.el("span", { text: r.text, style: { transform: "translateY(4px)" } }, el);
    const mark = verifiedMark(ctx, el, 88, { style: { position: "absolute", right: "-34px", top: `${(H - 88) / 2}px`, opacity: "0" } });
    const y = top0 + i * (H + GAP);
    return { ...r, el, mark, y, tm: markTimes[i] };
  });
  /* they drop away together, just after the last mark, before the phone rises */
  const tGone = T.mark + 0.01;          // 57.62
  chips.forEach((c, i) => {
    ctx.sfx("pop_low", c.t, { offset: -2 });
    ctx.sfx("stamp", c.tm);
    tl.fromTo(c.mark, { scale: 1.9, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, c.tm);
    showDuring(ctx, c.el, [[c.t - 0.02, tGone + 0.3]]);
    let wv = null;
    ctx.onFrame((t) => {
      if (t < c.t - 0.02 || t > tGone + 0.3) return;
      if (!wv) wv = c.el.offsetWidth;
      const k = ramp(ctx, t, c.t - 0.02, c.t + 0.46, "land");
      const gone = ramp(ctx, t, tGone, tGone + 0.3, "power2.in");
      const x = c.cx - wv / 2;
      const y = c.y + 90 * (1 - k) + gone * 120;
      const rot = (1 - k) * (i % 2 ? 7 : -7);
      c.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      c.el.style.opacity = String((Math.min(1, k * 2.2) * (1 - gone)).toFixed(3));
    });
  });

  /* ==================== rows 26-27: the phone ==================== */
  const pL = S.pL;
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  const tRise = ctx.beat(99.9);                 // 57.63 -> in place by ~58.2
  const tIn = T.person - 0.02;                  // 59.30: card 2
  const tTurn = ctx.beat(104.7);                // 60.40
  const tOut = ctx.beat(107.9);                 // 62.25
  const tEnd = T.end;
  const pose = S.pLpose;
  pose.to(tRise + 0.11, 0.001, { ...HIGH, cy: 2600, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(tRise + 0.12, 0.5, HIGH, "glide");                                      // 57.75-58.25
  pose.to(tOut, 0.55, { cy: 2650 }, "power2.in");                                 // leaves as the chapter ends
  const page = screenPage(ctx, pL, ctx.src.display("verification-lt"));
  showDuring(ctx, page.el, [[tRise + 0.1, tEnd]]);
  /* dimmed under card 2, so the card never sits on live screen text */
  const wash = screenPage(ctx, pL, null, { bg: "#ffffff" });
  wash.el.style.zIndex = "60";
  showDuring(ctx, wash.el, [[tIn - 0.25, tEnd]]);
  ctx.gsap.set(wash.el, { opacity: 0 });
  tl.fromTo(wash.el, { opacity: 0 }, { opacity: 0.9, duration: 0.3, ease: "power2.inOut", immediateRender: false }, tIn - 0.25);

  /* ==================== row 27: card 2 ==================== */
  const q = QUESTIONS[1];
  const cardLayer = ctx.scene("b-m-card2", tIn - 0.05, tEnd, { z: 32 });
  const BOX = { x: 110, y: 640, w: 830, h: 228 };
  const card = questionCard(ctx, cardLayer, { q: q.q, a: q.a, box: BOX, mark: true, fontSize: 52 });
  card.front.style.justifyContent = "center";
  card.front.style.textAlign = "center";
  Object.assign(card.back.style, { justifyContent: "center", fontSize: "44px", lineHeight: "1.22", textWrap: "balance" });
  ctx.gsap.set(card.root, { transformOrigin: "50% 50%" });
  ctx.gsap.set(card.root, { x: -900, y: -560, rotation: -32 });
  tl.fromTo(card.root, { x: -900, y: -560, rotation: -32 }, { x: 0, y: 0, rotation: -2, duration: 0.52, ease: "back.out(1.2)", immediateRender: false }, tIn);
  ctx.sfx("card_slide", tIn, { offset: -2 });
  card.turn(tTurn);
  tl.fromTo(card.root, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: -1100, y: -760, rotation: -24, scale: 0.8, duration: 0.4, ease: "power3.in", immediateRender: false }, tOut);
  showDuring(ctx, card.root, [[tIn, tOut + 0.42]]);

  /* the card's own mark hides as its twin spins off into the coin */
  const tSpin = tOut + 0.02;
  const backMark = card.back.querySelector("div");
  ctx.onFrame((t) => {
    if (backMark) backMark.style.visibility = t >= tSpin ? "hidden" : "inherit";
  });
  let m0 = null;
  markToCoin(ctx, cardLayer, {
    mark0: { size: 68 },
    markAt: () => {
      if (!m0) m0 = { x: BOX.x + backMark.offsetLeft + backMark.offsetWidth / 2, y: BOX.y + backMark.offsetTop + backMark.offsetHeight / 2 };
      return m0;
    },
    tSpin, tEnd, out: COIN_OUT, badgeHTML: BADGE,
  });
}
