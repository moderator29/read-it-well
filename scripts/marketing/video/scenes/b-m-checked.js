/**
 * Mobile rows 25 to 27 (54.23 to 62.88), storyboard v3.1, on mist.
 *   25  four role chips land fresh in WORDS on their words; on "verified
 *       mark" the product's mark stamps beside each; the chips slide into a
 *       column at the left and the phone rises at the right.
 *   26  verification-lt (the phone at cx 640); three plain pages turn one by
 *       one in BODY_LEFT, the way a person reads; on "person" the mark lands
 *       with "Checked by a person" (Example).
 *   27  card 2 swings in from the top left and turns over on "who" (the
 *       mark and "Checked by a real person at Vallo."); it flies out to the
 *       top left and its mark spins off into the naira coin (section c's
 *       coin), which falls on toward the phone: the handoff to c at 62.88.
 */
import { questionCard } from "../engine/components.js";
import { LAYOUT, QUESTIONS } from "./layout.js";
import { coin } from "./c-kit.js";
import { NAVY, ELECTRIC, SHADOW, ramp, kf, mix, screenPage, showDuring, glassCard, verifiedMark, exampleChip, measure, box } from "./b-kit.js";

/** Where the coin is at 62.885 (B -> C in handoffs.md; section c's COIN_IN). */
export const COIN_OUT = { x: 330, y: 470, size: 110, spin: 0 };

export async function checked(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const W = L.WORDS;
  const layer = ctx.scene("b-m-roles", T.r25 - 0.02, T.r26 + 0.7, { z: 30 });

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
  const tCol = T.mark + 0.02;
  const tCol1 = tCol + 0.4;
  const tGone = tCol + 0.22;
  chips.forEach((c, i) => {
    ctx.sfx("pop_low", c.t, { offset: -2 });
    ctx.sfx("stamp", c.tm);
    tl.fromTo(c.mark, { scale: 1.9, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, c.tm);
    showDuring(ctx, c.el, [[c.t - 0.02, tGone + 0.34]]);
    let wv = null;
    ctx.onFrame((t) => {
      if (t < c.t - 0.02 || t > tGone + 0.34) return;
      if (!wv) wv = c.el.offsetWidth;
      const k = ramp(ctx, t, c.t - 0.02, c.t + 0.46, "land");
      const col = ramp(ctx, t, tCol + i * 0.03, tCol1 + i * 0.03, "power3.inOut");
      const gone = ramp(ctx, t, tGone + i * 0.03, tGone + i * 0.03 + 0.3, "power2.in");
      const s = mix(1, 0.5, col);
      const x = mix(c.cx - wv / 2, L.BODY_LEFT.x + 12, col) - gone * 420;
      const y = mix(c.y - 90 * (1 - k), 432 + i * 74, col);
      const rot = (1 - k) * (i % 2 ? 7 : -7);
      c.el.style.transformOrigin = "0 0";
      c.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`;
      c.el.style.opacity = String((Math.min(1, k * 2.2) * (1 - gone)).toFixed(3));
    });
  });

  /* ==================== row 26: the phone, the pages, the verdict ==================== */
  const pL = S.pL;
  const VERIF = { cx: 640, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  const pose = S.pLpose;
  pose.to(tCol - 0.04, 0.001, { ...VERIF, cy: 2500, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(tCol - 0.03, 0.56, VERIF, "glide");                                      // rises at the right
  pose.to(T.r27 - 0.16, 0.46, { cx: 1500, ry: 18, opacity: 0 }, "power2.in");      // leaves for card 2
  const page = screenPage(ctx, pL, ctx.src.display("verification-lt"));
  showDuring(ctx, page.el, [[tCol - 0.05, T.r27 + 0.4]]);

  const doc = ctx.scene("b-m-pages", T.r26 - 0.1, T.r27 + 0.5, { z: 20 });
  const PW = 330;
  const PHh = 420;
  const PX = L.BODY_LEFT.x + 22;
  const PY = 480;
  const pagesWrap = ctx.el("div", { class: "abs", style: { left: `${PX}px`, top: `${PY}px`, width: `${PW}px`, height: `${PHh}px`, perspective: "1400px", visibility: "hidden" } }, doc);
  const rand = ctx.random(26);
  const pages = [0, 1, 2].map((i) => {
    const pg = ctx.el("div", { class: "abs", style: { inset: "0px", borderRadius: "16px", background: "#fff", boxShadow: SHADOW.m, transformOrigin: "0% 50%", zIndex: String(10 - i), border: "1px solid rgb(16 32 80 / 0.06)" } }, pagesWrap);
    box(ctx, pg, { x: 34, y: 38, w: 150, h: 14, style: { background: "rgb(16 32 80 / 0.16)", borderRadius: "7px" } });
    for (let l = 0; l < 11; l += 1) {
      const w = l % 4 === 3 ? 120 + rand() * 80 : 220 + rand() * 40;
      box(ctx, pg, { x: 34, y: 82 + l * 27, w, h: 9, style: { background: "rgb(16 32 80 / 0.09)", borderRadius: "5px" } });
    }
    const scan = box(ctx, pg, { x: 22, y: 70, w: PW - 44, h: 30, style: { background: "rgb(0 105 254 / 0.1)", borderRadius: "8px", opacity: "0" } });
    ctx.gsap.set(pg, { rotation: [0, -2.4, -4.6][i], x: [0, -6, -12][i], y: [0, 5, 10][i] });
    return { pg, scan };
  });
  const tPages = T.r26 + 0.2;
  const turns = [T.checked + 0.19, T.checked + 0.59, T.person - 0.08];
  showDuring(ctx, pagesWrap, [[tPages, turns[2] + 0.5]]);
  tl.fromTo(pagesWrap, { y: 560, rotation: 6 }, { y: 0, rotation: 0, duration: 0.5, ease: "land", immediateRender: false }, tPages);
  pages.forEach((p, i) => {
    const s0 = i === 0 ? tPages + 0.3 : turns[i - 1] + 0.08;
    tl.fromTo(p.scan, { y: 0, opacity: 0 }, { y: 250, opacity: 1, duration: turns[i] - s0 - 0.04, ease: "power1.inOut", immediateRender: false }, s0);
    tl.fromTo(p.pg, { rotationY: 0, opacity: 1 }, { rotationY: -168, opacity: 0, duration: 0.44, ease: "power2.inOut", immediateRender: false }, turns[i]);
    ctx.sfx("card_slide", turns[i], { offset: -4 });
  });

  /* The verdict: the mark lands with "Checked by a person" (Example), where the pages were. */
  const verdict = glassCard(ctx, doc, { w: PW + 20, radius: 30, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "16px", padding: "28px 28px 26px", visibility: "hidden" } });
  const vm = verifiedMark(ctx, verdict, 76);
  ctx.el("div", { html: "Checked by<br>a person", style: { font: "600 40px/1.1 Poppins, Inter, sans-serif", letterSpacing: "-0.03em", color: NAVY } }, verdict);
  exampleChip(ctx, ctx.el("div", {}, verdict), { size: 20 });
  const tV = T.person;
  const tV1 = T.r27 - 0.1;
  ctx.sfx("stamp", tV, { offset: 2 });
  tl.fromTo(vm, { scale: 1.9, rotation: -24, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.22, ease: "power4.out", immediateRender: false }, tV);
  showDuring(ctx, verdict, [[tV - 0.06, tV1 + 0.4]]);
  ctx.onFrame((t) => {
    if (t < tV - 0.06 || t > tV1 + 0.4) return;
    const k = ramp(ctx, t, tV - 0.06, tV + 0.34, "land");
    const rise = ramp(ctx, t, tV1, tV1 + 0.36, "power2.in");
    const y = mix(PY + 60, PY + 30, k) - rise * 520;
    verdict.style.transform = `translate(${(PX - 10).toFixed(2)}px, ${y.toFixed(2)}px) scale(${mix(0.92, 1, k).toFixed(4)})`;
    verdict.style.opacity = String((Math.min(1, k * 2) * (1 - rise)).toFixed(3));
  });

  /* ==================== row 27: card 2 ==================== */
  const q = QUESTIONS[1];
  const cardLayer = ctx.scene("b-m-card2", T.r27 - 0.05, T.end + 0.02, { z: 32 });
  const BOX = { x: 110, y: 640, w: 830, h: 228 };
  const card = questionCard(ctx, cardLayer, { q: q.q, a: q.a, box: BOX, mark: true, fontSize: 52 });
  card.front.style.justifyContent = "center";
  card.front.style.textAlign = "center";
  const tIn = T.r27;
  const tTurn = T.who - 0.16;
  const tOut = T.dealing + 0.28;
  ctx.gsap.set(card.root, { transformOrigin: "50% 50%" });
  tl.fromTo(card.root, { x: -900, y: -560, rotation: -32 }, { x: 0, y: 0, rotation: -2, duration: 0.52, ease: "back.out(1.2)", immediateRender: false }, tIn);
  card.turn(tTurn, { sound: null });
  ctx.sfx("pop", T.who);
  tl.fromTo(card.root, { x: 0, y: 0, rotation: -2, scale: 1 }, { x: -1100, y: -760, rotation: -24, scale: 0.8, duration: 0.5, ease: "power3.in", immediateRender: false }, tOut);
  showDuring(ctx, card.root, [[tIn, tOut + 0.5]]);
  /* the card's own mark hides as its twin spins off */
  const tSpin = tOut + 0.02;
  const backMark = card.back.querySelector("div");

  /* The mark spins off the card into the naira coin (section c's coin), which rises, turns and falls on. */
  const m = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "68px", height: "68px", visibility: "hidden", perspective: "600px" } }, cardLayer);
  const mInner = ctx.el("div", { style: { width: "68px", height: "68px" } }, m);
  mInner.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="m16.2 9-5.6 5.6L7.8 11.8" fill="none" stroke="#0069fe" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const C = coin(ctx, cardLayer, { size: COIN_OUT.size });
  C.set({ opacity: 0 });
  const MARK0 = { x: BOX.x + 57 + 34, y: BOX.y + BOX.h / 2 };
  const tSwap = tSpin + 0.16;
  const tEnd = T.end;
  ctx.onFrame((t) => {
    const on = t >= tSpin && t < tEnd + 0.02;
    m.style.visibility = on && t < tSwap ? "inherit" : "hidden";
    if (backMark) backMark.style.visibility = t >= tSpin ? "hidden" : "inherit";
    if (!on) {
      if (t < tSpin) C.set({ opacity: 0 });
      return;
    }
    /* the path: off the card, up in an arc, turning over at its top, and falling on at the handoff */
    const u = ramp(ctx, t, tSpin, tEnd, "power1.inOut");
    const x = mix(MARK0.x, COIN_OUT.x, u);
    const y = kf(ctx, t, [[tSpin, MARK0.y], [tSpin + 0.46, COIN_OUT.y - 70, "power2.out"], [tEnd, COIN_OUT.y, "power2.in"]]);
    const size = kf(ctx, t, [[tSpin, 57], [tSwap, 64, "power1.out"], [tEnd, COIN_OUT.size, "power2.inOut"]]);
    const spin = kf(ctx, t, [[tSpin, 0], [tSwap, 90, "power2.in"], [tEnd, 720 + COIN_OUT.spin, "power1.in"]]);
    if (t < tSwap) {
      m.style.transform = `translate(${(x - 34).toFixed(2)}px, ${(y - 34).toFixed(2)}px) scale(${(size / 57).toFixed(4)})`;
      mInner.style.transform = `rotateY(${Math.min(90, spin).toFixed(2)}deg)`;
      C.set({ opacity: 0 });
    } else {
      C.set({ x, y, size, spin, tilt: 0, opacity: 1, shadow: 0 });
    }
  });
}
