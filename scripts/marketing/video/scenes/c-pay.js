/**
 * ROWS 28 to 31: PAYING (62.88 to 72.69), both films. STORYBOARD v3.1.
 *
 * 28  The coin comes down to Vallo's real lock and rests in it; the dots fill
 *     as the keys are pressed (lifted beside the phone on mobile, echoed in
 *     RIGHT_PANEL on desktop); on "pay" the coin is let go and the phone
 *     (window) drops out.
 * 29  Signature 3: "Vallo never" / "holds your money." from opposite sides;
 *     the path Your card -> Paystack -> The owner's bank draws itself; the
 *     Vallo mark sits beside it with an empty tray; the coin lands on Your card.
 * 30  The coin runs the path: past Paystack on "goes", into the bank on
 *     "owner"; the last label rolls Owner, Host, Business; the tray stays
 *     empty. The path folds into a thin line.
 * 31  "Licensed payment processor" writes in under Paystack; card 3 swings in
 *     (70.5) and turns (70.9); cards 1 and 2 fly back in (71.0-71.3); all
 *     three show their answers until they fly off (72.4-72.69).
 */
import { QUESTIONS } from "./layout.js";
import { orb, press, tap, browserWindow } from "../engine/components.js";
import { track, ramp, spring, during, place, coin, mist, measure, dispToStage, screenImage, passDot, verifiedMark, SHADOW, mix } from "./c-kit.js";

/* Where builder B leaves the coin at 62.88 (row 27: the verified mark on
   card 2 spins off into the coin). Updated from scenes/handoffs.md. */
export const COIN_IN = {
  mobile: { x: 330, y: 470, size: 110, spin: 0, vy: 233, vspin: 1400 }, // b-m-checked.js COIN_OUT (falling, spinning)
  desktop: { x: 1500, y: 420, size: 88, spin: 0, vy: 200, vspin: 1200 },
};
/* Where cards 1 and 2 left (handoffs.md: A's card 1, B's card 2): centre, rotation. */
const CARD_OUT = {
  mobile: { c1: { x: 1300, y: -105, r: 24 }, c2: { x: -575, y: -6, r: -24 } },
  desktop: { c1: { x: 2060, y: -180, r: 22 }, c2: { x: -560, y: -200, r: -22 } },
};

/** A cubic from p0 to p1 over [t0, t1] leaving at velocity v0 and arriving at rest. */
function hermite(t, t0, t1, p0, p1, v0) {
  const d = t1 - t0;
  const u = Math.min(1, Math.max(0, (t - t0) / d));
  const h10 = u * u * u - 2 * u * u + u;
  const h01 = -2 * u * u * u + 3 * u * u;
  return p0 * (1 - h01) + p1 * h01 + v0 * d * h10;
}

/* The real lock (`lock`, dark in both themes), as a member meets it before
   money moves: its six dots and keys (display px on mobile, content px on
   desktop). */
const LOCK_SCREEN = {
  mobile: {
    id: "lock", edge: "#042267", dots: { x0: 434.5, dx: 90, y: 1181.5, d: 42 }, filled: 0, patch: "rgb(2 16 60)",
    keys: { 1: [340, 1612], 2: [660, 1612], 3: [980, 1612], 4: [340, 1884], 5: [660, 1884], 6: [980, 1884], 7: [340, 2156], 8: [660, 2156], 9: [980, 2156] },
  },
  desktop: {
    id: "d-lock", dots: { x0: 644.75, dx: 30, y: 335.75, d: 14 }, filled: 0, patch: "rgb(2 16 60)",
    keys: { 1: [612, 481], 2: [720, 481], 3: [828, 481], 4: [612, 571], 5: [720, 571], 6: [828, 571], 7: [612, 661], 8: [720, 661], 9: [828, 661] },
    rest: [868, 335.75], // where the coin waits: at the end of the dot row
  },
};

export async function buildPay(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const G = LOCK_SCREEN[ctx.film];

  /* ================= the ground ================= */
  const bg = ctx.scene("c28-ground", K.r28 - 0.05, K.r32 + 0.06, { z: 1 });
  mist(ctx, bg);

  /* ================= the lock (row 28) ================= */
  /* six presses, one per spoken word, the sixth on "pay" */
  const presses = [
    { key: 4, t: K.and14, snd: 1 },
    { key: 5, t: K.when, snd: 3 },
    { key: 2, t: K.its, snd: 5 },
    { key: 3, t: K.time, snd: 2 },
    { key: 6, t: K.to, snd: 4 },
    { key: 9, t: K.pay, snd: 6 },
  ];
  const PRE = 0;
  const fillAt = [...Array(PRE).fill(-1), ...presses.map((p) => p.t)];
  const fillU = (tt, k) => (fillAt[k] < 0 ? 1 : ramp(ctx, tt, fillAt[k] - 0.02, fillAt[k] + 0.12, "back.out(2.6)"));
  const over = ctx.scene("c28-over", K.r28, K.r29 + 0.1, { z: 7 });

  /* The screen's own dots, redrawn over the capture (the capture's filled
     ones beyond the first two are hidden under a patch of the card's navy). */
  const dotLayer = (parent, scale) => {
    const dots = [];
    for (let k = 0; k < 6; k += 1) {
      const cx = G.dots.x0 + G.dots.dx * k;
      const r = G.dots.d * 0.8;
      const patch = ctx.el("div", { class: "abs", style: { left: `${cx - r}px`, top: `${G.dots.y - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, borderRadius: "50%", background: `radial-gradient(closest-side, ${G.patch} 72%, transparent 100%)`, opacity: k >= PRE && k < G.filled ? 1 : 0 } }, parent);
      const d = passDot(ctx, parent, G.dots.d);
      place(d.slot, { x: cx, y: G.dots.y });
      dots.push({ patch, ...d });
    }
    const lights = presses.map((pr) => {
      const [kx, ky] = G.keys[pr.key];
      const r = M ? 112 : 40;
      return { t: pr.t, n: ctx.el("div", { class: "abs", style: { left: `${kx - r}px`, top: `${ky - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, borderRadius: "50%", background: "radial-gradient(closest-side, rgb(170 210 255 / 0.55), rgb(170 210 255 / 0.18) 70%, rgb(170 210 255 / 0))", opacity: 0 } }, parent) };
    });
    return (tt) => {
      dots.forEach((d, k) => {
        const u = fillU(tt, k);
        d.fill.style.opacity = String(Math.min(1, u * 1.4));
        d.fill.style.transform = `scale(${(0.35 + 0.65 * u).toFixed(3)})`;
      });
      lights.forEach(({ n, t }) => { n.style.opacity = String(0.9 * (tt < t - 0.03 ? 0 : Math.exp(-(tt - t) * 7))); });
    };
  };

  let LOCK; // stage centre and size of the coin's resting place
  let KEY; // stage point of a key
  let DOTS_AT; // stage centre of the screen's dot row
  if (M) {
    const P = L.PHONE_HIGH;
    const p = S.light;
    const at = (x, y) => dispToStage(P, x, y);
    const dotsY = at(0, G.dots.y).y;
    /* the coin waits against the phone's right edge, level with the dots */
    LOCK = { x: at(1320, 0).x + 42, y: dotsY, d: 96 };
    KEY = (k) => at(...G.keys[k]);
    DOTS_AT = at(G.dots.x0 + G.dots.dx * 2.5, G.dots.y);
    const img = screenImage(ctx, p, G.id);
    const layer = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen);
    const drawDots = dotLayer(layer, 1);
    ctx.onFrame((tt) => {
      const on = tt >= K.r28 - 0.05 && tt < K.r29 + 0.1;
      img.style.visibility = on ? "" : "hidden";
      layer.style.visibility = on ? "" : "hidden";
      if (!on) return;
      drawDots(tt);
    });
    for (const pr of presses) tap(ctx, p.screen, { x: G.keys[pr.key][0], y: G.keys[pr.key][1], t: pr.t, size: 230, sound: null });
    /* up from below into PHONE_HIGH; after "pay" it drops out */
    p.poses.push({
      t0: K.r28 - 0.05, t1: K.r29 - 0.02,
      fn: (tt) => ({
        cx: P.cx, height: P.height, fov: 24, rz: 0,
        cy: track(ctx, tt, [[K.r28, P.cy + 1150], [K.r28 + 0.36, P.cy, "land"], [K.pay + 0.16, P.cy], [K.r29 - 0.08, P.cy + 1500, "leave"]]),
        rx: track(ctx, tt, [[K.r28, 10], [K.r28 + 0.4, 0, "land"], [K.pay + 0.16, 0], [K.r29 - 0.08, 18, "leave"]]),
        ry: track(ctx, tt, [[K.r28, -9], [K.r28 + 0.42, 0, "land"], [K.pay + 0.16, 0], [K.r29 - 0.08, -7, "leave"]]),
        opacity: 1 - ramp(ctx, tt, K.r29 - 0.2, K.r29 - 0.08),
      }),
    });
  } else {
    /* the window at WINDOW_LEFT with the real lock page */
    const W = L.WINDOW_LEFT;
    const win = browserWindow(ctx, { parent: over, width: W.width, url: "vallospaces.com", theme: "light" });
    const sc = win.scale;
    const C = (x, y) => ({ x: W.x + x * sc, y: W.y + (56 + y) * sc });
    ctx.img(ctx.src.capture(G.id), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const layer = ctx.el("div", { class: "abs", style: { inset: "0px" } }, win.content);
    const drawDots = dotLayer(layer, 1);
    const lk = C(G.rest[0], G.rest[1]);
    LOCK = { x: lk.x, y: lk.y, d: 44 };
    KEY = (k) => C(...G.keys[k]);
    DOTS_AT = C(G.dots.x0 + G.dots.dx * 2.5, G.dots.y);
    during(ctx, K.r28 - 0.05, K.r29 + 0.1, (tt) => {
      drawDots(tt);
      const y = track(ctx, tt, [[K.r28, W.y + 40], [K.r28 + 0.42, W.y, "land"], [K.pay + 0.16, W.y], [K.r29 - 0.06, W.y + 980, "leave"]]);
      const o = ramp(ctx, tt, K.r28 - 0.04, K.r28 + 0.16) * (1 - ramp(ctx, tt, K.r29 - 0.2, K.r29 - 0.06));
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${W.x}px, ${y.toFixed(2)}px) scale(${sc})`;
      win.root.style.opacity = o.toFixed(4);
      win.root.style.visibility = o > 0.001 ? "" : "hidden";
    });
  }

  /* the pointer glides over the keys and presses them */
  const ptr = orb(ctx, over, { size: M ? 44 : 40 });
  {
    const k = presses.map((pr) => KEY(pr.key));
    const start = { x: k[0].x + (M ? 70 : 60), y: k[0].y + (M ? 90 : 70) };
    const end = M ? { x: 900, y: 1150 } : { x: 1000, y: 800 };
    const hover = M ? -14 : -10;
    const lead = [0.06, 0.05, 0.06, 0.07, 0.08, 0.05];
    const xs = [[K.r28, start.x], ...presses.map((pr, i) => [pr.t - lead[i], k[i].x, "glide"]), [K.pay + 0.3, end.x, "power2.in"]];
    const ys = [[K.r28, start.y], ...presses.map((pr, i) => [pr.t - lead[i], k[i].y + hover, "glide"]), [K.pay + 0.3, end.y, "power2.in"]];
    const half = M ? 22 : 20;
    during(ctx, K.r28, K.r29, (tt) => {
      const x = track(ctx, tt, xs);
      const y = track(ctx, tt, ys);
      const o = ramp(ctx, tt, K.r28 - 0.02, K.r28 + 0.1) * (1 - ramp(ctx, tt, K.pay + 0.08, K.pay + 0.3));
      ptr.style.left = `${(x - half).toFixed(2)}px`;
      ptr.style.top = `${(y - half).toFixed(2)}px`;
      ptr.style.opacity = o.toFixed(3);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
    });
    presses.forEach((pr, i) => {
      press(ctx, ptr, pr.t, { ringParent: M ? null : over, x: k[i].x, y: k[i].y, sound: null, ring: !M });
      ctx.sfx(`type_key_${pr.snd}`, pr.t, { offset: -6 });
    });
  }

  /* the dots, lifted beside the phone (BODY_LEFT) or echoed in RIGHT_PANEL */
  {
    const D = M ? 30 : 64;
    const gap = M ? 44 : 100;
    const width = M ? L.BODY_LEFT.w : gap * 5 + D + 96;
    const height = M ? 64 : 128;
    const home = M ? { x: L.BODY_LEFT.x + L.BODY_LEFT.w / 2, y: DOTS_AT.y } : { x: L.RIGHT_PANEL.x + L.RIGHT_PANEL.w / 2, y: L.RIGHT_PANEL.y + 330 };
    const body = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${width}px`, height: `${height}px`, borderRadius: "999px", overflow: "hidden",
        background: "linear-gradient(180deg, #03165a 0%, #011146 100%)", border: "1.5px solid rgb(120 170 255 / 0.3)", boxShadow: SHADOW.light,
      },
    }, over);
    const dots = [];
    for (let i = 0; i < 6; i += 1) {
      const d = passDot(ctx, body, D);
      place(d.slot, { x: width / 2 + (i - 2.5) * gap, y: height / 2 });
      dots.push(d);
    }
    const glint = ctx.el("div", { class: "abs", style: { top: "0px", bottom: "0px", left: "0px", width: `${width * 0.35}px`, background: "linear-gradient(100deg, rgb(255 255 255 / 0), rgb(200 230 255 / 0.28), rgb(255 255 255 / 0))" } }, body);
    ctx.sfx("glass_clink", K.pay, { offset: -4 });
    const from = M ? DOTS_AT : { x: home.x, y: home.y + 60 };
    const fromScale = M ? (G.dots.dx * 5 + G.dots.d) * dispToStage(L.PHONE_HIGH, 0, 0).s / (gap * 5 + D) : 0.7;
    during(ctx, K.r28, K.r29, (tt) => {
      const u = ramp(ctx, tt, K.r28 + 0.16, K.r28 + 0.5, "land");
      const out = ramp(ctx, tt, K.pay + 0.2, K.pay + 0.5, "power2.in");
      const s = mix(fromScale, 1, u) * (1 - 0.04 * out);
      const pulse = 1 + 0.05 * Math.max(0, spring(tt, K.pay, { freq: 3, decay: 9 }));
      place(body, { x: mix(from.x, home.x, u), y: mix(from.y, home.y, u) - (M ? 0 : 40) * out, s: s * pulse, o: Math.min(1, u * 3) * (1 - out) });
      dots.forEach((d, k) => {
        const f = fillU(tt, k);
        d.fill.style.opacity = String(Math.min(1, f * 1.4));
        d.fill.style.transform = `scale(${(0.35 + 0.65 * f).toFixed(3)})`;
      });
      const g = ramp(ctx, tt, K.pay - 0.02, K.pay + 0.32, "power2.inOut");
      glint.style.transform = `translateX(${(-width * 0.4 + g * width * 1.45).toFixed(1)}px)`;
      glint.style.opacity = g > 0 && g < 1 ? "1" : "0";
    });
  }

  /* ================= the path (rows 29 to 31) ================= */
  const pathScene = ctx.scene("c29-path", K.r29 - 0.1, K.r32 + 0.06, { z: 6 });
  /* Stations: row 29 (under the words), row 30 (the words gone: centred),
     and the thin line of row 31. */
  const ST29 = M ? [{ x: 190, y: 910 }, { x: 190, y: 1045 }, { x: 190, y: 1180 }] : [{ x: 300, y: 560 }, { x: 960, y: 560 }, { x: 1620, y: 560 }];
  const ST30 = M ? [{ x: 190, y: 610 }, { x: 190, y: 825 }, { x: 190, y: 1040 }] : ST29;
  const LINE = M ? [{ x: 200, y: 1120 }, { x: 540, y: 1120 }, { x: 870, y: 1120 }] : [{ x: 300, y: 800 }, { x: 960, y: 800 }, { x: 1620, y: 800 }];
  const SD29 = M ? 100 : 112;
  const SD30 = M ? 120 : 112;
  const SMALL = 26;
  const COIN_D = M ? 104 : 96;
  const TRAY29 = M ? { x: 820, y: 1045 } : { x: 960, y: 770 };
  const TRAY30 = M ? { x: 820, y: 825 } : TRAY29;
  const drawAt = [K.r29 + 0.14, K.r29 + 0.52, K.r29 + 0.9];
  const rise = [K.r30 - 0.16, K.r30 + 0.3]; // mobile: the path rises once the words have gone
  const fold = [K.r31 - 0.42, K.r31];

  const svg = ctx.el("div", { class: "abs", style: { inset: "0px" } }, pathScene);
  svg.innerHTML = `<svg width="${ctx.W}" height="${ctx.H}" viewBox="0 0 ${ctx.W} ${ctx.H}" style="position:absolute;left:0;top:0;overflow:visible"><line id="c29a" stroke="#3d86ff" stroke-linecap="round"/><line id="c29b" stroke="#3d86ff" stroke-linecap="round"/></svg>`;
  const seg = [svg.querySelector("#c29a"), svg.querySelector("#c29b")];
  const stations = [0, 1, 2].map(() => {
    const n = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)", border: "1.5px solid #ffffff", boxShadow: SHADOW.light } }, pathScene);
    const ring = ctx.el("div", { class: "abs", style: { inset: "9%", borderRadius: "50%", border: "2px solid rgb(0 105 254 / 0.22)" } }, n);
    return { n, ring };
  });
  const flashes = [0, 1, 2].map(() => ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "50%", border: "3px solid rgb(0 105 254 / 0.7)", opacity: 0 } }, pathScene));
  const bigFont = M ? 52 : 46;
  const labelStyle = { font: `600 ${bigFont}px/1.1 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.025em", color: "#0b1230", whiteSpace: "nowrap" };
  const labels = ["Your card", "Paystack", "The owner's bank"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...labelStyle } }, pathScene));
  const roles = ["Owner", "Host", "Business"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...labelStyle, color: "var(--electric)", fontWeight: "700" } }, pathScene));
  const roleAt = [K.owner, K.host, K.business];
  ctx.sfx("tap_soft", K.host, { offset: -6 });
  ctx.sfx("tap_soft", K.business, { offset: -6 });
  const smallStyle = { font: "600 26px/1 Inter, sans-serif", letterSpacing: "-0.01em", color: "#0b1230", whiteSpace: "nowrap" };
  const small = ["Your card", "Paystack", "Business"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...smallStyle } }, pathScene));
  const licensed = ctx.el("div", { class: "abs", text: "Licensed payment processor", style: { left: "0px", top: "0px", font: "600 30px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: "var(--electric-600)", whiteSpace: "nowrap", clipPath: "inset(0 100% 0 0)" } }, pathScene);
  const trayBox = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "220px", height: "200px" } }, pathScene);
  const trayRing = ctx.el("div", { class: "abs", style: { left: "35px", top: "120px", width: "150px", height: "50px", borderRadius: "50%", border: "3px dashed rgb(0 105 254 / 0.45)", background: "radial-gradient(closest-side, rgb(0 105 254 / 0.06), rgb(0 105 254 / 0))" } }, trayBox);
  ctx.img(ctx.src.brand("vallo-mark.png"), { class: "abs", style: { left: "56px", top: "8px", width: "108px", height: "103px", objectFit: "contain" } }, trayBox);
  if (M) ctx.hideCaptions(K.r31, K.r32);

  const stationAt = (i, tt) => {
    const r = M ? ramp(ctx, tt, rise[0] + i * 0.04, rise[1] + i * 0.04, "power3.inOut") : 0;
    const f = ramp(ctx, tt, fold[0] + i * 0.03, fold[1] - (2 - i) * 0.03, "whip");
    const x0 = mix(ST29[i].x, ST30[i].x, r);
    const y0 = mix(ST29[i].y, ST30[i].y, r);
    const d0 = mix(SD29, SD30, r);
    return { x: mix(x0, LINE[i].x, f), y: mix(y0, LINE[i].y, f), d: mix(d0, SMALL, f), u: f, r };
  };

  during(ctx, K.r29 - 0.1, K.r32 + 0.06, (tt) => {
    const gone = ramp(ctx, tt, K.r32 - 0.26, K.r32 - 0.04, "power2.in");
    const sp = [0, 1, 2].map((i) => stationAt(i, tt));
    sp.forEach((q, i) => {
      const pop = ramp(ctx, tt, drawAt[i], drawAt[i] + 0.34, "back.out(1.8)");
      const small1 = q.u > 0.5;
      const n = stations[i].n;
      n.style.width = `${q.d.toFixed(2)}px`;
      n.style.height = `${q.d.toFixed(2)}px`;
      n.style.background = small1 ? "#ffffff" : "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)";
      n.style.border = small1 ? "3px solid rgb(0 105 254 / 0.85)" : "1.5px solid #ffffff";
      stations[i].ring.style.opacity = String(1 - q.u);
      place(n, { x: q.x, y: q.y, s: 0.55 + 0.45 * pop, o: Math.min(1, pop * 2) * (1 - gone) });
    });
    [0, 1].forEach((i) => {
      const a = sp[i];
      const b = sp[i + 1];
      const g = ramp(ctx, tt, drawAt[i] + 0.2, drawAt[i + 1] + 0.1, "power2.inOut") * (1 - gone);
      seg[i].setAttribute("x1", a.x.toFixed(2));
      seg[i].setAttribute("y1", a.y.toFixed(2));
      seg[i].setAttribute("x2", mix(a.x, b.x, g).toFixed(2));
      seg[i].setAttribute("y2", mix(a.y, b.y, g).toFixed(2));
      seg[i].setAttribute("stroke-width", mix(M ? 6 : 5, 3, a.u).toFixed(2));
      seg[i].style.opacity = g > 0.001 ? "1" : "0";
    });
    [[1, K.goes], [2, K.owner]].forEach(([i, tf]) => {
      const f = ramp(ctx, tt, tf, tf + 0.6, "power2.out");
      flashes[i].style.width = `${sp[i].d.toFixed(2)}px`;
      flashes[i].style.height = `${sp[i].d.toFixed(2)}px`;
      place(flashes[i], { x: sp[i].x, y: sp[i].y, s: 1 + 0.6 * f, o: f > 0 && f < 1 ? (1 - f) * 0.9 : 0 });
    });
    /* the big labels: beside the stations (mobile), under them (desktop) */
    const bigOut = ramp(ctx, tt, fold[0] - 0.02, fold[0] + 0.22);
    const labelAt = (i, n, inU) => (M
      ? { x: sp[i].x + sp[i].d / 2 + 30 + n.offsetWidth / 2 + (1 - inU) * 26, y: sp[i].y }
      : { x: sp[i].x, y: sp[i].y + sp[i].d / 2 + 40 + (1 - inU) * 18 });
    labels.forEach((n, i) => {
      const inU = ramp(ctx, tt, drawAt[i] + 0.06, drawAt[i] + 0.46, "land");
      let o = inU * (1 - bigOut);
      if (i === 2) o *= 1 - ramp(ctx, tt, K.owner - 0.04, K.owner + 0.12);
      place(n, { ...labelAt(i, n, inU), o });
    });
    roles.forEach((n, i) => {
      const inU = ramp(ctx, tt, roleAt[i] - 0.02, roleAt[i] + 0.3, "power3.out");
      const outU = i < 2 ? ramp(ctx, tt, roleAt[i + 1] - 0.02, roleAt[i + 1] + 0.24, "power3.in") : 0;
      const base = labelAt(2, n, 1);
      const dy = ((1 - inU) - outU) * bigFont * 1.1;
      /* a vertical roll inside the label's line */
      const lineTop = sp[2].y - bigFont * 0.62 + (M ? 0 : sp[2].d / 2 + 40);
      n.style.clipPath = `inset(${Math.max(0, lineTop - (base.y + dy - bigFont * 0.62)).toFixed(1)}px 0 ${Math.max(0, base.y + dy + bigFont * 0.62 - (lineTop + bigFont * 1.24)).toFixed(1)}px 0)`;
      place(n, { x: base.x, y: base.y + dy, o: inU * (1 - outU) * (1 - bigOut) });
    });
    small.forEach((n, i) => {
      const u = ramp(ctx, tt, fold[1] - 0.16, fold[1] + 0.2, "power2.out") * (1 - gone);
      place(n, { x: LINE[i].x, y: LINE[i].y - (M ? 42 : 40) + (1 - u) * 10, o: u });
    });
    {
      const w = ramp(ctx, tt, K.licensed, K.licensed + 0.6, "power1.inOut");
      licensed.style.clipPath = `inset(-8px ${(100 - w * 100).toFixed(2)}% -8px 0)`;
      place(licensed, { x: LINE[1].x, y: LINE[1].y + (M ? 44 : 40), o: w > 0 ? 1 - gone : 0 });
    }
    {
      const inU = ramp(ctx, tt, drawAt[1] + 0.18, drawAt[1] + 0.6, "land");
      const outU = ramp(ctx, tt, fold[0] - 0.18, fold[0] + 0.1, "power2.in");
      const r = M ? ramp(ctx, tt, rise[0] + 0.04, rise[1] + 0.04, "power3.inOut") : 0;
      const breathe = 1 + 0.05 * Math.max(0, spring(tt, K.goes + 0.05, { freq: 1.6, decay: 3.5 }));
      place(trayBox, { x: mix(TRAY29.x, TRAY30.x, r), y: mix(TRAY29.y, TRAY30.y, r), s: (M ? 0.92 : 0.86) * (0.92 + 0.08 * inU) * (1 - 0.1 * outU), o: inU * (1 - outU) });
      trayRing.style.transform = `scale(${breathe.toFixed(4)})`;
    }
  });
  ctx.sfx("ding_pay", K.owner, { offset: 0 });

  /* ================= the big words (row 29) ================= */
  const type = ctx.scene("c29-type", K.r29 - 0.05, K.r30 + 0.12, { z: 10 });
  {
    ctx.hideCaptions(K.r29, K.r30);
    ctx.sfx("whoosh_short", K.r29, { offset: -2 });
    const font = (size) => `700 ${size}px "C Poppins"`;
    const pill = { x: L.PILL.cx, y: (L.PILL.top + L.PILL.bottom) / 2 };
    const mk = (parts, size) => {
      const n = ctx.el("div", { class: "abs c-display", style: { left: "0px", top: "0px", fontSize: `${size}px`, color: "#0b1230", whiteSpace: "nowrap" } }, type);
      parts.forEach(([text, blue]) => ctx.el("span", { text, style: blue ? { color: "var(--electric)" } : {} }, n));
      return n;
    };
    const exitU = (tt) => ramp(ctx, tt, K.r30 - 0.2, K.r30 + 0.06, "power2.in");
    if (M) {
      /* two lines in WORDS: "Vallo never" from the left, "holds your money." from the right */
      const Wd = L.WORDS;
      let s2 = 96;
      const w2full = measure("holds your money.", font(s2));
      if (w2full > Wd.w - 16) s2 = Math.floor((s2 * (Wd.w - 16)) / w2full);
      const s1 = Math.round(s2 * 1.04);
      const l1 = mk([["Vallo never", false]], s1);
      const l2 = mk([["holds your ", false], ["money.", true]], s2);
      const w1 = measure("Vallo never", font(s1));
      const w2 = measure("holds your money.", font(s2));
      const c1 = { x: Wd.x + 16 + w1 / 2, y: Wd.y + 28 + s1 * 0.51 };
      const c2 = { x: Wd.x + Wd.w - 8 - w2 / 2, y: Wd.y + 28 + s1 * 1.08 + 20 + s2 * 0.51 };
      during(ctx, K.r29 - 0.05, K.r30 + 0.12, (tt) => {
        const a = ramp(ctx, tt, K.r29, K.r29 + 0.5, "land");
        const b = ramp(ctx, tt, K.holds - 0.16, K.holds + 0.34, "land");
        const o = exitU(tt);
        const sOut = mix(1, 0.3, o);
        place(l1, { x: mix(mix(-w1 / 2 - 40, c1.x, a), pill.x, o), y: mix(c1.y, pill.y, o), s: sOut, o: Math.min(1, a * 4) * (1 - o) });
        place(l2, { x: mix(mix(ctx.W + w2 / 2 + 40, c2.x, b), pill.x, o), y: mix(c2.y, pill.y, o), s: sOut, o: Math.min(1, b * 4) * (1 - o) });
      });
    } else {
      /* one line across the top (y 110-250), the halves from opposite sides */
      let s = 104;
      const full = "Vallo never holds your money.";
      const wFull = measure(full, font(s));
      if (wFull > 1640) s = Math.floor((s * 1640) / wFull);
      const space = measure("x x", font(s)) - measure("xx", font(s));
      const wa0 = measure("Vallo never", font(s));
      const wb = measure("holds your money.", font(s));
      const x0 = ctx.W / 2 - (wa0 + space + wb) / 2;
      const la = mk([["Vallo never", false]], s);
      const lb = mk([["holds your ", false], ["money.", true]], s);
      const ca = { x: x0 + wa0 / 2, y: 180 };
      const cb = { x: x0 + wa0 + space + wb / 2, y: 180 };
      during(ctx, K.r29 - 0.05, K.r30 + 0.12, (tt) => {
        const a = ramp(ctx, tt, K.r29, K.r29 + 0.5, "land");
        const b = ramp(ctx, tt, K.holds - 0.16, K.holds + 0.34, "land");
        const o = exitU(tt);
        const sOut = mix(1, 0.3, o);
        place(la, { x: mix(mix(-400, ca.x, a), pill.x - 120, o), y: mix(ca.y, pill.y, o), s: sOut, o: Math.min(1, a * 4) * (1 - o) });
        place(lb, { x: mix(mix(ctx.W + 500, cb.x, b), pill.x + 120, o), y: mix(cb.y, pill.y, o), s: sOut, o: Math.min(1, b * 4) * (1 - o) });
      });
    }
  }

  /* ================= the coin (rows 28 to 31) ================= */
  const coinScene = ctx.scene("c28-coin", K.r28, K.r32 + 0.06, { z: 9 });
  const C = coin(ctx, coinScene, { size: COIN_D });
  {
    const IN = COIN_IN[ctx.film];
    const land = K.r28 + 0.42; // it comes to rest beside the lock's dots
    const up = K.pay + 0.07; // let go on "pay"
    const hop = M ? { x: 0, y: -150 } : { x: -30, y: -110 };
    during(ctx, K.r28, K.r32 + 0.06, (tt) => {
      let x, y, size, spin, tilt = 0, sy = 1, shadow = 0;
      const land29 = drawAt[0] + 0.2;
      if (tt < land29) {
        /* 28: down into the lock, rest, spring up on "pay", then down onto Your card */
        /* carries on from B's fall: moving down and spinning, it settles at rest */
        const a = ramp(ctx, tt, K.r28, land, "power2.inOut");
        x = mix(IN.x, LOCK.x, a);
        y = hermite(tt, K.r28, land, IN.y, LOCK.y, IN.vy);
        size = mix(IN.size, LOCK.d, a);
        spin = IN.spin + hermite(tt, K.r28, land, 0, 360, IN.vspin);
        sy = 1 - 0.1 * spring(tt, land, { freq: 3.2, decay: 10 });
        /* the hop up and the fall to Your card: one arc */
        const u = ramp(ctx, tt, up, land29, "none");
        if (u > 0) {
          const s0 = stationAt(0, land29);
          const peak = { x: LOCK.x + hop.x, y: LOCK.y + hop.y };
          const e = ctx.ease("power1.inOut")(u);
          /* quadratic arc lock -> peak -> station */
          const qx = (1 - e) * (1 - e) * LOCK.x + 2 * (1 - e) * e * (peak.x * 2 - (LOCK.x + s0.x) / 2) + e * e * s0.x;
          const qy = (1 - e) * (1 - e) * LOCK.y + 2 * (1 - e) * e * (peak.y * 2 - (LOCK.y + s0.y) / 2) + e * e * s0.y;
          x = qx;
          y = qy;
          size = mix(LOCK.d, COIN_D, ramp(ctx, tt, up, up + 0.4));
          spin += 360 * ctx.ease("power2.out")(u);
          sy *= 1 + 0.08 * Math.max(0, spring(tt, up, { freq: 2.4, decay: 7 }));
          tilt = 12 * Math.sin(u * Math.PI);
        }
      } else if (tt < K.r30 + 0.3) {
        /* resting on Your card (riding it up as the path rises) */
        const s0 = stationAt(0, tt);
        x = s0.x;
        y = s0.y;
        size = COIN_D * (s0.d / SD29) * 0.98;
        spin = 1440;
        sy = 1 - 0.12 * spring(tt, land29, { freq: 3, decay: 9 });
        shadow = 1;
      } else {
        /* 30-31: the run, then riding the bank station into the thin line */
        const q = [0, 1, 2].map((i) => stationAt(i, tt));
        const a = ramp(ctx, tt, K.r30 + 0.4, K.goes, "power2.in");
        const b = ramp(ctx, tt, K.goes, K.owner, "power3.out");
        const lift = Math.sin(Math.PI * ramp(ctx, tt, K.r30 + 0.3, K.r30 + 0.46)) * 10;
        if (tt < K.goes) { x = mix(q[0].x, q[1].x, a); y = mix(q[0].y, q[1].y, a) - lift; } else { x = mix(q[1].x, q[2].x, b); y = mix(q[1].y, q[2].y, b); }
        size = mix(COIN_D * (SD30 / SD29) * 0.98, SMALL * 0.92, q[2].u);
        spin = 1440 + track(ctx, tt, [[K.r30 + 0.4, 0], [K.goes, 360, "power2.in"], [K.owner, 720, "power3.out"]]);
        sy = 1 - 0.1 * spring(tt, K.owner, { freq: 3, decay: 8 });
        shadow = tt > K.owner - 0.1 ? 1 : 0.4;
      }
      const gone = ramp(ctx, tt, K.r32 - 0.26, K.r32 - 0.04, "power2.in");
      C.set({ x, y, size, spin, tilt, opacity: 1 - gone, shadow: shadow * 0.8 });
      C.body.style.transform += ` scaleY(${sy.toFixed(4)})`;
    });
  }

  /* ================= the three answered cards (row 31) ================= */
  const cardScene = ctx.scene("c31-cards", ctx.beat(122.2) - 0.02, K.r32 + 0.06, { z: 11 });
  {
    const slot = L.CARD_SLOT;
    const w = slot[0].w;
    const h = slot[0].h;
    const fs = M ? 31 : 40;
    const card = async (q, a, mark) => {
      const root = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px`, perspective: `${w * 4}px` } }, cardScene);
      const inner = ctx.el("div", { class: "abs", style: { inset: "0px", transformStyle: "preserve-3d" } }, root);
      const face = (back) => ctx.el("div", {
        class: "abs glass-dark",
        style: {
          inset: "0px", borderRadius: `${Math.round(Math.min(w, h) * 0.11)}px`, backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${Math.round(fs * 0.6)}px`, textAlign: "center",
          padding: `0 ${Math.round(fs * 0.85)}px`, color: "#fff", font: `600 ${back ? fs : Math.round(fs * 1.08)}px/1.2 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.02em",
          backdropFilter: "none", boxShadow: SHADOW.light,
          ...(back ? { background: "linear-gradient(150deg, rgb(0 105 254 / 0.94), rgb(0 63 152 / 0.96))", border: "1.5px solid rgb(143 211 255 / 0.55)" } : { background: "rgb(10 16 60 / 0.94)" }),
        },
      }, inner);
      const front = face(false);
      ctx.el("span", { text: q }, front);
      const back = face(true);
      if (mark) await verifiedMark(ctx, back, Math.round(fs * 1.8));
      ctx.el("span", { text: a }, back);
      return { root, inner };
    };
    /* card 2 returns to the left slot (it left to the top left), card 1 to
       the right (it left to the top right), card 3 in the middle */
    const c3 = await card(QUESTIONS[2].q, QUESTIONS[2].a, false);
    const c2 = await card(QUESTIONS[1].q, QUESTIONS[1].a, true);
    const c1 = await card(QUESTIONS[0].q, QUESTIONS[0].a, false);
    const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const [S0, S1, S2] = slot.map(centre);
    const swingIn = ctx.beat(122.2); // 70.5
    const turnAt = ctx.beat(122.85); // 70.88
    const back1 = ctx.beat(123.1); // 71.02
    const full = ctx.beat(123.6); // 71.31
    const off = ctx.beat(125.5); // 72.40
    ctx.sfx("card_slide", swingIn, { offset: -4 });
    ctx.sfx("pop", turnAt + 0.04, { offset: 0 });
    ctx.sfx("success", full, { offset: -2 });
    during(ctx, swingIn - 0.02, K.r32 + 0.06, (tt) => {
      const a = ramp(ctx, tt, swingIn, turnAt - 0.02, "power3.out");
      const swing = track(ctx, tt, [[swingIn, -26], [turnAt - 0.1, 6, "power2.out"], [turnAt + 0.2, -2, "sine.inOut"], [turnAt + 0.5, 0, "sine.inOut"]]);
      const f3 = ramp(ctx, tt, off, K.r32 - 0.02, "power3.in");
      place(c3.root, { x: S1.x, y: mix(S1.y - (M ? 900 : 640), S1.y, a) - f3 * (M ? 1000 : 700), r: swing, o: 1 });
      const turn = ramp(ctx, tt, turnAt, turnAt + 0.6, "back.out(1.4)");
      c3.inner.style.transform = `rotateY(${(turn * 180).toFixed(2)}deg)`;
      const OUT = CARD_OUT[ctx.film];
      [[c2, S0, -1, 0, OUT.c2], [c1, S2, 1, 0.1, OUT.c1]].forEach(([c, S, side, lag, from]) => {
        const b = ramp(ctx, tt, back1 + lag, full + lag * 0.5, "power3.out");
        const f = ramp(ctx, tt, off + lag * 0.2, K.r32 - 0.02, "power3.in");
        place(c.root, { x: mix(from.x, S.x, b) + side * f * (M ? 760 : 1000), y: mix(from.y, S.y, b), r: mix(from.r, 0, b) + side * f * 16, o: b > 0 ? 1 : 0 });
        c.inner.style.transform = "rotateY(180deg)";
      });
    });
  }
}
