/**
 * Desktop rows 25 to 27 (54.23 to 62.88), storyboard v3.1, on mist.
 *   D25  the four role chips land fresh across the frame in a staggered row
 *        (y 300 to 700), each on its word; on "verified mark" the product's
 *        mark stamps beside each; the chips slide into a column at the left
 *        and leave as the window rises.
 *   D26  d-verification-lt at WINDOW_LEFT; three plain pages turn one by one
 *        in RIGHT_PANEL, the way a person reads; on "person" the mark lands
 *        with "Checked by a person" (Example).
 *   D27  card 2 swings into RIGHT_PANEL and turns over on "who" (the mark
 *        and "Checked by a real person at Vallo."); it flies out to the top
 *        left and its mark spins off into the naira coin (section c's coin),
 *        falling on toward the lock: the handoff to c at 62.88.
 */
import { questionCard } from "../engine/components.js";
import { QUESTIONS } from "./layout.js";
import { coin } from "./c-kit.js";
import { NAVY, SHADOW, ramp, kf, mix, showDuring, glassCard, verifiedMark, exampleChip, measure, box } from "./b-kit.js";
import { CW, CH } from "./b-desktop.js";

/** Where the coin is at 62.885 (B -> C in handoffs.md; section c's COIN_IN.desktop). */
export const COIN_OUT_D = { x: 1500, y: 420, size: 88, spin: 0, vy: 200, vspin: 1200 };
/** Card 2's box and where it leaves to (section c's CARD_OUT.desktop.c2: centre and rotation). */
export const CARD2_D = { box: { x: 1200, y: 400, w: 600, h: 160 }, out: { x: -560, y: -200, r: -22, s: 0.8 } };

export async function deskChecked(ctx, S, T) {
  const { tl } = ctx;
  const { L } = S;
  const RP = L.RIGHT_PANEL;
  const LEFT = S.LEFT;
  const wvT = S.wvT;
  const layer = S.type;

  /* ==================== D25: the role chips ==================== */
  const roles = [
    { text: "Owner", t: T.owners, cy: 390 },
    { text: "Host", t: T.hosts, cy: 600 },
    { text: "Hotel", t: T.hotels13, cy: 390 },
    { text: "Restaurant", t: T.restaurants, cy: 600 },
  ];
  const H = 132;
  const MARK = 96;
  const PAD_L = 50;
  const PAD_R = 78;
  const GAP = 56;
  const markTimes = [T.verified, T.verified + 0.15, T.verified + 0.3, T.verified + 0.45];
  const chips = roles.map((r, i) => {
    const el = glassCard(ctx, layer, { w: null, radius: 999, shadow: "m", style: { width: "auto", height: `${H}px`, display: "flex", alignItems: "center", padding: `0 ${PAD_R}px 0 ${PAD_L}px`, font: "700 84px/1 Poppins, Inter, sans-serif", letterSpacing: "-0.035em", color: NAVY, whiteSpace: "nowrap", visibility: "hidden" } });
    ctx.el("span", { text: r.text, style: { transform: "translateY(4px)" } }, el);
    const mark = verifiedMark(ctx, el, MARK, { style: { position: "absolute", right: `${-MARK * 0.4}px`, top: `${(H - MARK) / 2}px`, opacity: "0" } });
    return { ...r, el, mark, tm: markTimes[i] };
  });
  /* the row, centred on the frame with 130 px of air each side, once the font has loaded */
  let row = null;
  const doRow = () => {
    const w100 = chips.map((c) => measure(c.text, "700 100px Poppins"));
    const fixed = chips.length * (PAD_L + PAD_R) + GAP * (chips.length - 1) + MARK * 0.4;
    const size = Math.min(84, ((ctx.W - 260 - fixed) / w100.reduce((a, b) => a + b, 0)) * 100);
    chips.forEach((c) => (c.el.style.fontSize = `${size.toFixed(1)}px`));
    const ws = w100.map((w) => (w * size) / 100 + PAD_L + PAD_R);
    const total = ws.reduce((a, b) => a + b, 0) + GAP * (ws.length - 1) + MARK * 0.4;
    let x = (ctx.W - total) / 2;
    row = ws.map((w) => {
      const at = x;
      x += w + GAP;
      return { x: at, w };
    });
  };
  /* the column forms at the left, holds a beat, then slides out before the window rises there */
  const tCol = T.mark + 0.02;
  const tCol1 = tCol + 0.34;
  const tGone = tCol + 0.36;
  chips.forEach((c, i) => {
    ctx.sfx("pop_low", c.t, { offset: -2 });
    ctx.sfx("stamp", c.tm);
    tl.fromTo(c.mark, { scale: 1.9, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, c.tm);
    showDuring(ctx, c.el, [[c.t - 0.02, tGone + 0.34]]);
    ctx.onFrame((t) => {
      if (t < c.t - 0.02 || t > tGone + 0.34) return;
      if (!row) doRow();
      const k = ramp(ctx, t, c.t - 0.02, c.t + 0.46, "land");
      const col = ramp(ctx, t, tCol + i * 0.03, tCol1 + i * 0.03, "power3.inOut");
      const gone = ramp(ctx, t, tGone + i * 0.02, tGone + i * 0.02 + 0.28, "power2.in");
      const s = mix(1, 0.5, col);
      const x = mix(row[i].x, 80, col) - gone * 520;
      const y = mix(c.cy - H / 2 - 90 * (1 - k), 330 + i * 86, col);
      const rot = (1 - k) * (i % 2 ? 7 : -7);
      c.el.style.transformOrigin = "0 0";
      c.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      c.el.style.opacity = String((Math.min(1, k * 2.2) * (1 - gone)).toFixed(3));
    });
  });

  /* ==================== D26: the window, the pages, the verdict ==================== */
  const full = { viewTop: 0, viewH: CH, viewLeft: 0, viewW: CW };
  S.page("d-verification-lt", [[tCol + 0.38, T.end]]);
  wvT.to(tCol + 0.39, 0.001, { cx: LEFT.cx, cy: LEFT.cy + 760, s: LEFT.s, ry: 0, opacity: 1, ...full }, "none");
  wvT.to(tCol + 0.4, 0.56, { cy: LEFT.cy }, "glide");             // rises at the left once the column has gone
  wvT.to(T.end - 0.3, 0.3, { opacity: 0 }, "power1.in");           // gives the place to c's lock window

  const PW = 400;
  const PHh = 510;
  const PX = RP.x + (RP.w - PW) / 2;
  const PY = 200;
  const pagesWrap = ctx.el("div", { class: "abs", style: { left: `${PX}px`, top: `${PY}px`, width: `${PW}px`, height: `${PHh}px`, perspective: "1600px", visibility: "hidden" } }, S.cards);
  const rand = ctx.random(26);
  const pages = [0, 1, 2].map((i) => {
    const pg = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "18px", background: "#fff", boxShadow: SHADOW.m, transformOrigin: "0% 50%", zIndex: String(10 - i), border: "1px solid rgb(16 32 80 / 0.06)" } }, pagesWrap);
    box(ctx, pg, { x: 40, y: 46, w: 180, h: 16, style: { background: "rgb(16 32 80 / 0.16)", borderRadius: "8px" } });
    for (let l = 0; l < 13; l += 1) {
      const w = l % 4 === 3 ? 150 + rand() * 90 : 270 + rand() * 50;
      box(ctx, pg, { x: 40, y: 100 + l * 30, w, h: 10, style: { background: "rgb(16 32 80 / 0.09)", borderRadius: "5px" } });
    }
    const scan = box(ctx, pg, { x: 26, y: 86, w: PW - 52, h: 36, style: { background: "rgb(0 105 254 / 0.1)", borderRadius: "9px", opacity: "0" } });
    ctx.gsap.set(pg, { rotation: [0, -2.4, -4.6][i], x: [0, -7, -14][i], y: [0, 6, 12][i] });
    return { pg, scan };
  });
  const tPages = T.r26 + 0.34;
  const turns = [T.checked + 0.19, T.checked + 0.59, T.person - 0.08];
  showDuring(ctx, pagesWrap, [[tPages, turns[2] + 0.5]]);
  tl.fromTo(pagesWrap, { y: 620, rotation: 6 }, { y: 0, rotation: 0, duration: 0.5, ease: "land", immediateRender: false }, tPages);
  pages.forEach((p, i) => {
    const s0 = i === 0 ? tPages + 0.3 : turns[i - 1] + 0.08;
    tl.fromTo(p.scan, { y: 0, opacity: 0 }, { y: 300, opacity: 1, duration: turns[i] - s0 - 0.04, ease: "power1.inOut", immediateRender: false }, s0);
    tl.fromTo(p.pg, { rotationY: 0, opacity: 1 }, { rotationY: -168, opacity: 0, duration: 0.44, ease: "power2.inOut", immediateRender: false }, turns[i]);
    ctx.sfx("card_slide", turns[i], { offset: -4 });
  });

  /* the verdict: the mark lands with "Checked by a person" (Example), where the pages were */
  const VW = 440;
  const verdict = glassCard(ctx, S.cards, { w: VW, radius: 32, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "20px", padding: "36px 36px 34px", visibility: "hidden" } });
  const vm = verifiedMark(ctx, verdict, 88, { style: { opacity: "0" } });
  ctx.el("div", { html: "Checked by<br>a person", style: { font: "600 52px/1.08 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY } }, verdict);
  exampleChip(ctx, ctx.el("div", {}, verdict), { size: 22 });
  const tV = T.person;
  const tV1 = T.r27 - 0.1;
  const VX = RP.x + (RP.w - VW) / 2;
  const VY = 250;
  ctx.sfx("stamp", tV, { offset: 2 });
  tl.fromTo(vm, { scale: 1.9, rotation: -24, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.22, ease: "power4.out", immediateRender: false }, tV);
  showDuring(ctx, verdict, [[tV - 0.06, tV1 + 0.4]]);
  ctx.onFrame((t) => {
    if (t < tV - 0.06 || t > tV1 + 0.4) return;
    const k = ramp(ctx, t, tV - 0.06, tV + 0.34, "land");
    const rise = ramp(ctx, t, tV1, tV1 + 0.36, "power2.in");
    const y = mix(VY + 40, VY, k) - rise * 600;
    verdict.style.transform = `translate(${VX.toFixed(2)}px, ${y.toFixed(2)}px) scale(${mix(0.92, 1, k).toFixed(4)})`;
    verdict.style.opacity = String((Math.min(1, k * 2) * (1 - rise)).toFixed(3));
  });

  /* ==================== D27: card 2 ==================== */
  const q = QUESTIONS[1];
  const BOX = CARD2_D.box;
  const OUT = CARD2_D.out;
  const card = questionCard(ctx, S.cards, { q: q.q, a: q.a, box: BOX, mark: true, fontSize: 40 });
  card.front.style.justifyContent = "center";
  card.front.style.textAlign = "center";
  const tIn = T.r27;
  const tTurn = T.who - 0.16;
  const tOut = T.dealing + 0.28;
  const c0 = { x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 };
  ctx.gsap.set(card.root, { transformOrigin: "50% 50%" });
  tl.fromTo(card.root, { x: -420, y: -640, rotation: -28 }, { x: 0, y: 0, rotation: -2, duration: 0.52, ease: "back.out(1.2)", immediateRender: false }, tIn);
  card.turn(tTurn, { sound: null });
  ctx.sfx("pop", T.who);
  tl.fromTo(card.root, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: OUT.x - c0.x, y: OUT.y - c0.y, rotation: OUT.r, scale: OUT.s, duration: 0.5, ease: "power3.in", immediateRender: false }, tOut);
  showDuring(ctx, card.root, [[tIn, tOut + 0.5]]);
  const tSpin = tOut + 0.02;
  const backMark = card.back.querySelector("div");

  /* the mark spins off the card into the naira coin, which rises, turns and falls on toward the lock */
  const MPX = Math.round(40 * 1.3);
  const m = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${MPX}px`, height: `${MPX}px`, visibility: "hidden", perspective: "600px" } }, S.cards);
  const mInner = ctx.el("div", { style: { width: `${MPX}px`, height: `${MPX}px` } }, m);
  mInner.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="m16.2 9-5.6 5.6L7.8 11.8" fill="none" stroke="#0069fe" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const C = coin(ctx, S.cards, { size: COIN_OUT_D.size });
  C.set({ opacity: 0 });
  const MARK0 = { x: BOX.x + 44 + MPX / 2, y: c0.y + 8 };
  const tSwap = tSpin + 0.16;
  const tEnd = T.end;
  const RISE = 60; // the fall's last stretch: 2 x 60 / 0.595 s = 200 px/s at the handoff
  const K = (COIN_OUT_D.vspin * (tEnd - tSwap)) / 630; // the spin's power: 1,200 deg/s at the handoff
  ctx.onFrame((t) => {
    const on = t >= tSpin && t < tEnd;
    m.style.visibility = on && t < tSwap ? "inherit" : "hidden";
    if (backMark) backMark.style.visibility = t >= tSpin ? "hidden" : "inherit";
    if (!on) {
      C.set({ opacity: 0 });
      return;
    }
    const u = ramp(ctx, t, tSpin, tEnd, "power1.inOut");
    const x = mix(MARK0.x, COIN_OUT_D.x, u);
    const y = kf(ctx, t, [[tSpin, MARK0.y], [tSpin + 0.46, COIN_OUT_D.y - RISE, "power2.out"], [tEnd, COIN_OUT_D.y, "power2.in"]]);
    const size = kf(ctx, t, [[tSpin, MPX], [tSwap, MPX + 6, "power1.out"], [tEnd, COIN_OUT_D.size, "power2.inOut"]]);
    const spin = t < tSwap ? kf(ctx, t, [[tSpin, 0], [tSwap, 90, "power2.in"]]) : 90 + 630 * Math.pow((t - tSwap) / (tEnd - tSwap), K);
    if (t < tSwap) {
      m.style.transform = `translate(${(x - MPX / 2).toFixed(2)}px, ${(y - MPX / 2).toFixed(2)}px) scale(${(size / MPX).toFixed(4)})`;
      mInner.style.transform = `rotateY(${Math.min(90, spin).toFixed(2)}deg)`;
      C.set({ opacity: 0 });
    } else {
      C.set({ x, y, size, spin, tilt: 0, opacity: 1, shadow: 0 });
    }
  });
}
