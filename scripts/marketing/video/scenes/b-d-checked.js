/**
 * Desktop rows 25 to 27 (54.23 to 62.88), storyboard v3.2, on mist.
 *   D25  the four role chips land fresh across the frame in a staggered row,
 *        each on its word; on "verified mark" the product's mark stamps
 *        beside each; they drop away together as the window rises.
 *   D26  d-verification-lt at the hero scale (v3.3), its right third softened
 *        under card 2; it settles back at WINDOW_LEFT for c's in-place cut.
 *   D27  on "person" card 2 swings into RIGHT_PANEL; it turns at 60.40 and
 *        holds its answer to 62.25; it flies out to the top left and its
 *        mark spins off into the naira coin (section c's coin), falling on
 *        toward the lock: the handoff to c at 62.88.
 */
import { questionCard } from "../engine/components.js";
import { QUESTIONS } from "./layout.js";
import { markToCoin, BADGE } from "./b-m-checked.js";
import { NAVY, ramp, showDuring, glassCard, verifiedMark, measure, box } from "./b-kit.js";
import { CW, CH } from "./b-desktop.js";

/** Where the coin is at 62.885 (B -> C in handoffs.md; section c's COIN_IN.desktop). */
export const COIN_OUT_D = { x: 1500, y: 420, size: 88, spin: 0, vy: 200, vspin: 1200 };
/** Card 2's box and where it leaves to (section c's CARD_OUT.desktop.c2: centre and rotation). */
export const CARD2_D = { box: { x: 1260, y: 520, w: 520, h: 170 }, out: { x: -560, y: -200, r: -22, s: 0.8 } };

export async function deskChecked(ctx, S, T) {
  const { tl } = ctx;
  const { L } = S;
  const RP = L.RIGHT_PANEL;
  const LEFT = S.LEFT;
  const wvT = S.wvT;
  const layer = S.type;

  /* ==================== D25: the role chips ==================== */
  const roles = [
    { text: "Owner", t: T.owners, row: 0 },
    { text: "Host", t: T.hosts, row: 0 },
    { text: "Hotel", t: T.hotels13, row: 1 },
    { text: "Restaurant", t: T.restaurants, row: 1 },
  ];
  /* a 2 x 2 cluster centred on the frame, 1.3x round 1's chips */
  const H = 172;
  const MARK = 124;
  const PAD_L = 64;
  const PAD_R = 100;
  const GAP = 64;
  const markTimes = [T.verified, T.verified + 0.15, T.verified + 0.3, T.verified + 0.45];
  const chips = roles.map((r, i) => {
    const el = glassCard(ctx, layer, { w: null, radius: 999, shadow: "m", style: { width: "auto", height: `${H}px`, display: "flex", alignItems: "center", padding: `0 ${PAD_R}px 0 ${PAD_L}px`, font: "700 110px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } });
    ctx.el("span", { text: r.text, style: { transform: "translateY(4px)" } }, el);
    const mark = verifiedMark(ctx, el, MARK, { style: { position: "absolute", right: `${-MARK * 0.4}px`, top: `${(H - MARK) / 2}px`, opacity: "0" } });
    return { ...r, el, mark, tm: markTimes[i] };
  });
  let row = null;
  const doRow = () => {
    const ws = chips.map((c) => c.el.offsetWidth);
    row = chips.map((c, i) => {
      const mates = chips.map((x, j) => j).filter((j) => chips[j].row === c.row);
      const total = mates.reduce((a, j) => a + ws[j], 0) + GAP;
      let x = (ctx.W - total) / 2 + (c.row ? 30 : -30);
      if (mates[1] === i) x += ws[mates[0]] + GAP;
      return { x, y: c.row ? 540 + 20 : 540 - 20 - H };
    });
  };
  /* they drop away together just after the last mark (57.62, 0.3 s), before the window rises */
  const tGone = T.mark + 0.01;
  chips.forEach((c, i) => {
    ctx.sfx("pop_low", c.t, { offset: -2 });
    ctx.sfx("stamp", c.tm);
    tl.fromTo(c.mark, { scale: 1.9, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, c.tm);
    showDuring(ctx, c.el, [[c.t - 0.02, tGone + 0.3]]);
    ctx.onFrame((t) => {
      if (t < c.t - 0.02 || t > tGone + 0.3) return;
      if (!row) doRow();
      const k = ramp(ctx, t, c.t - 0.02, c.t + 0.46, "land");
      const gone = ramp(ctx, t, tGone, tGone + 0.3, "power2.in");
      const y = row[i].y + 90 * (1 - k) + gone * 120;
      const rot = (1 - k) * (i % 2 ? 7 : -7);
      c.el.style.transform = `translate(${row[i].x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      c.el.style.opacity = String((Math.min(1, k * 2.2) * (1 - gone)).toFixed(3));
    });
  });

  /* ==================== D26: the window (it holds to the cut) ==================== */
  const full = { viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  const tRise = ctx.beat(99.9) + 0.12;       // 57.75
  S.page("d-verification-lt", [[tRise - 0.01, T.end]]);
  /* round 4: at 0.85 of the frame (x 60-1240), so card 2 lands on bare mist at its right; then a slow push, never still */
  const W85 = S.WIN85;
  wvT.to(tRise - 0.01, 0.001, { cx: W85.cx, cy: W85.cy + 760, s: W85.s, ry: 0, opacity: 1, ...full }, "none");
  wvT.to(tRise, 0.5, { cy: W85.cy }, "glide");                     // 57.75-58.25
  wvT.to(tRise + 0.5, ctx.beat(108.3) - tRise - 0.5, { cx: W85.cx - 10, cy: W85.cy - 8, s: W85.s * 1.02 }, "drift");
  /* back to section c's place (WINDOW_LEFT, at rest) as card 2 flies out, for its in-place cut at 62.885 */
  wvT.to(ctx.beat(108.3), T.end - ctx.beat(108.3), { cx: LEFT.cx, cy: LEFT.cy, s: LEFT.s }, "power2.inOut");

  /* ==================== D27: card 2 in RIGHT_PANEL ==================== */
  const q = QUESTIONS[1];
  const BOX = CARD2_D.box;
  const OUT = CARD2_D.out;
  const tIn = T.person - 0.02;               // 59.30
  const tTurn = ctx.beat(104.7);             // 60.40
  const tOut = ctx.beat(108.42);             // 62.55
  /* (no veil: the card sits on the mist, off the window) */
  const card = questionCard(ctx, S.cards, { q: q.q, a: q.a, box: BOX, mark: true, fontSize: 38 });
  card.front.style.justifyContent = "center";
  card.front.style.textAlign = "center";
  Object.assign(card.back.style, { textWrap: "balance", lineHeight: "1.22" });
  const c0 = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 };
  ctx.gsap.set(card.root, { transformOrigin: "50% 50%", x: 180, y: -640, rotation: 18 });
  tl.fromTo(card.root, { x: 180, y: -640, rotation: 18 }, { x: 0, y: 0, rotation: -2, duration: 0.52, ease: "back.out(1.2)", immediateRender: false }, tIn);
  ctx.sfx("card_slide", tIn, { offset: -2 });
  card.turn(tTurn);
  tl.fromTo(card.root, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: OUT.x - c0.x, y: OUT.y - c0.y, rotation: OUT.r, scale: OUT.s, duration: 0.3, ease: "power3.in", immediateRender: false }, tOut);
  showDuring(ctx, card.root, [[tIn, tOut + 0.32]]);
  const tSpin = tOut + 0.02;
  const backMark = card.back.querySelector("div");
  ctx.onFrame((t) => {
    if (backMark) backMark.style.visibility = t >= tSpin ? "hidden" : "inherit";
  });
  let m0 = null;
  markToCoin(ctx, S.cards, {
    mark0: { size: Math.round(38 * 1.3) },
    flip: 0.06,
    markAt: () => {
      if (!m0) m0 = { x: BOX.x + backMark.offsetLeft + backMark.offsetWidth / 2, y: BOX.y + backMark.offsetTop + backMark.offsetHeight / 2 };
      return m0;
    },
    tSpin, tEnd: T.end, out: COIN_OUT_D, badgeHTML: BADGE,
  });
}
