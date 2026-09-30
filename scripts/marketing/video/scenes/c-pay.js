/**
 * ROWS 28 to 31: PAYING (62.88 to 72.69), both films. STORYBOARD v3.2.
 *
 * 28  B's coin falls on, behind the rising lock and out of the frame (it never
 *     touches anything of Vallo's). Vallo's real lock (dark) rises from below
 *     the frame; on mobile the camera pushes onto its dot row. Three presses on
 *     "when", "time" and "pay", two dots each: the dots are the one moment.
 *     After "pay" the phone (window) drops out.
 * 29  Signature 3: "Vallo never holds your money." lands and holds, still,
 *     over one path (Your card, Paystack, The owner's bank) that drifts
 *     slowly, 1.02x over the holds. The coin arcs in onto Your card. Nothing
 *     of Vallo's sits on the path (round 3: the tray is gone).
 * 30  The coin runs the path under the held line: past Paystack on "goes",
 *     into the bank on "owner"; the bank's label rolls Owner, Host, Business.
 * 31  The line leaves; the path folds into a thin line and "Licensed payment
 *     processor" writes in under Paystack. Card 3 swings in; cards 1 and 2
 *     come back answered and land by 70.95 as card 3 turns (70.96); the row
 *     reads 1 | 2 | 3, holds to 72.60 with a slow drift, then the three fly
 *     off in three directions (72.60 to 72.85) with the folded path.
 */
import { QUESTIONS } from "./layout.js";
import { orb, browserWindow, installFlatTurn, TURN_SWAP } from "../engine/components.js";
import { track, ramp, spring, during, place, coin, mist, measure, dispToStage, screenImage, passDot, verifiedMark, SHADOW, mix, scaledSrc, opa, roll } from "./c-kit.js";

/* Where builder B leaves the coin at 62.885 (handoffs.md, B -> C). */
export const COIN_IN = {
  mobile: { x: 330, y: 470, size: 110, spin: 0, vy: 233, vspin: 1400 },
  desktop: { x: 1500, y: 420, size: 88, spin: 0, vy: 200, vspin: 1200 },
};
/* Where cards 1 and 2 come back from (round 3: the row reads 1 | 2 | 3, so
   card 1 comes in from the left and card 2 from above), and where the three
   fly off to: left, up, right. Centre, rotation, scale. */
const CARD_IN = {
  mobile: { c1: { x: -260, y: 380, r: -18, s: 0.9 }, c2: { x: 492, y: -300, r: 8, s: 0.9 } },
  desktop: { c1: { x: -380, y: 160, r: -16, s: 0.9 }, c2: { x: 960, y: -260, r: 6, s: 0.9 } },
};
const CARD_OFF = {
  mobile: [{ x: -300, y: 470, r: -22 }, { x: 492, y: -330, r: 6 }, { x: 1380, y: 470, r: 22 }],
  desktop: [{ x: -420, y: 240, r: -20 }, { x: 960, y: -300, r: 6 }, { x: 2340, y: 240, r: 20 }],
};
/* the row leaves over 72.60 to 72.85 (power2.in); the "?" drops from 72.80 */
export const ROW_OFF = [72.6, 72.85];

/* The real lock (`lock`, dark in both themes): its six dots and keys
   (display px on mobile, content px on desktop). */
const LOCK_SCREEN = {
  mobile: {
    id: "lock", dots: { x0: 434.5, dx: 90, y: 1181.5, d: 42 },
    keys: { 1: [340, 1612], 2: [660, 1612], 3: [980, 1612], 4: [340, 1884], 5: [660, 1884], 6: [980, 1884], 7: [340, 2156], 8: [660, 2156], 9: [980, 2156] },
  },
  desktop: {
    id: "d-lock", dots: { x0: 644.75, dx: 30, y: 335.75, d: 14 },
    keys: { 1: [612, 481], 2: [720, 481], 3: [828, 481], 4: [612, 571], 5: [720, 571], 6: [828, 571], 7: [612, 661], 8: [720, 661], 9: [828, 661] },
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
  /* three presses, spaced on the words; each fills two dots; the last on "pay" */
  const presses = [
    { key: M ? 2 : 4, t: K.when, snd: 1 },
    { key: M ? 1 : 2, t: K.time, snd: 3 },
    { key: M ? 3 : 9, t: K.pay, snd: 6 },
  ];
  const fillAt = [0, 0, 1, 1, 2, 2].map((p, k) => presses[p].t + (k % 2) * 0.07);
  const fillU = (tt, k) => ramp(ctx, tt, fillAt[k] - 0.02, fillAt[k] + 0.12, "back.out(2.6)");
  presses.forEach((pr) => ctx.sfx(`type_key_${pr.snd}`, pr.t, { offset: -6 }));
  ctx.sfx("glass_clink", K.pay, { offset: -4 });
  const leave = [K.pay + 0.2, K.r29 - 0.05];

  /* The screen's own dots, redrawn over the capture, and a light on each pressed key. */
  const dotLayer = (parent) => {
    const dots = [];
    for (let k = 0; k < 6; k += 1) {
      const d = passDot(ctx, parent, G.dots.d);
      place(d.slot, { x: G.dots.x0 + G.dots.dx * k, y: G.dots.y });
      dots.push(d);
    }
    const lights = presses.map((pr) => {
      const [kx, ky] = G.keys[pr.key];
      const r = M ? 112 : 40;
      return { t: pr.t, n: ctx.el("div", { class: "abs", style: { left: `${kx - r}px`, top: `${ky - r}px`, width: `${2 * r}px`, height: `${2 * r}px`, borderRadius: "50%", background: "radial-gradient(closest-side, rgb(170 210 255 / 0.55), rgb(170 210 255 / 0.18) 70%, rgb(170 210 255 / 0))", opacity: 0 } }, parent) };
    });
    return (tt) => {
      dots.forEach((d, k) => {
        const u = fillU(tt, k);
        d.fill.style.opacity = opa(u * 1.4);
        d.fill.style.transform = `scale(${(0.35 + 0.65 * u).toFixed(3)})`;
      });
      lights.forEach(({ n, t }) => { n.style.opacity = opa(0.9 * (tt < t - 0.03 ? 0 : Math.exp(-(tt - t) * 7))); });
    };
  };

  if (M) {
    const P = L.PHONE_HERO;
    const p = S.light;
    const img = screenImage(ctx, p, G.id);
    const layer = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "1320px", height: "2868px", visibility: "hidden" } }, p.screen);
    const drawDots = dotLayer(layer);
    ctx.onFrame((tt) => {
      const on = tt >= K.r28 - 0.05 && tt < K.r29 + 0.1;
      img.style.visibility = on ? "" : "hidden";
      layer.style.visibility = on ? "" : "hidden";
      drawDots(tt);
    });
    /* From fully below the frame into PHONE_HERO; a 1.3x push onto the dot
       row through the presses (the dot row rises from y 959 to 880); after
       "pay" it drops out of the frame. */
    const s0 = dispToStage(P, 0, 0).s;
    const PUSH = 1.3;
    const pushedCy = 880 + (1434 - G.dots.y) * s0 * PUSH;
    const push = [K.when - 0.12, K.time + 0.06];
    p.poses.push({
      t0: K.r28 - 0.05, t1: K.r29 + 0.02,
      fn: (tt) => {
        const up = ramp(ctx, tt, K.r28, K.r28 + 0.5, "power3.out");
        const u = ramp(ctx, tt, push[0], push[1], "power2.inOut");
        const out = ramp(ctx, tt, leave[0], leave[1], "leave");
        const cy = mix(mix(P.cy + 1650, P.cy, up), pushedCy, u) + out * 2300;
        return { cx: P.cx, cy, height: P.height * mix(1, PUSH, u), rx: 8 * (1 - up) + 10 * out, ry: -6 * (1 - up), rz: 0, fov: 24, opacity: 1 };
      },
    });
  } else {
    /* the window at WINDOW_LEFT at full opacity from the cut: B held its page
       to 62.885 in the same place, so the page swaps in place on the beat */
    const W = L.WINDOW_LEFT;
    const over = ctx.scene("c28-over", K.r28, K.r29 + 0.1, { z: 7 });
    const win = browserWindow(ctx, { parent: over, width: W.width, url: "vallospaces.com", theme: "light" });
    const sc = win.scale;
    const C = (x, y) => ({ x: W.x + x * sc, y: W.y + (56 + y) * sc });
    ctx.img(ctx.src.capture(G.id), { class: "abs", style: { left: "0px", top: "0px", width: "1440px", height: "900px" } }, win.content);
    const layer = ctx.el("div", { class: "abs", style: { inset: "0px" } }, win.content);
    const drawDots = dotLayer(layer);
    const yTrack = [[K.r28, W.y], [leave[0], W.y], [leave[1], W.y + 980, "leave"]];
    during(ctx, K.r28 - 0.05, K.r29 + 0.1, (tt) => {
      drawDots(tt);
      const y = track(ctx, tt, yTrack);
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${W.x}px, ${y.toFixed(2)}px) scale(${sc})`;
      win.root.style.opacity = opa(1);
      win.root.style.visibility = tt < leave[1] ? "" : "hidden";
    });
    /* the pointer comes in from the right and presses the three keys */
    const ptr = orb(ctx, over, { size: 40 });
    ptr.style.visibility = "hidden";
    const k = presses.map((pr) => C(...G.keys[pr.key]));
    const xs = [[K.r28, 1180], ...presses.flatMap((pr, i) => [[pr.t - 0.07, k[i].x, "glide"], [pr.t + 0.02, k[i].x]]), [K.pay + 0.35, 1250, "power2.in"]];
    const ys = [[K.r28, k[0].y + 80], ...presses.flatMap((pr, i) => [[pr.t - 0.07, k[i].y - 8, "glide"], [pr.t + 0.02, k[i].y - 8]]), [K.pay + 0.35, 820, "power2.in"]];
    const squash = (tt) => {
      let q = 0;
      for (const pr of presses) q += ramp(ctx, tt, pr.t - 0.06, pr.t + 0.03, "power2.out") - ramp(ctx, tt, pr.t + 0.05, pr.t + 0.37, "back.out(2.2)");
      return Math.min(1.15, q);
    };
    const rings = presses.map((pr, i) => ctx.el("div", { class: "abs", style: { left: `${k[i].x - 50}px`, top: `${k[i].y - 50}px`, width: "100px", height: "100px", borderRadius: "50%", border: "3px solid rgb(0 105 254 / 0.8)", zIndex: 840, visibility: "hidden" } }, over));
    during(ctx, K.r28 - 0.05, K.r29 + 0.1, (tt) => {
      const o = ramp(ctx, tt, K.r28, K.r28 + 0.12) * (1 - ramp(ctx, tt, K.pay + 0.12, K.pay + 0.32));
      const q = squash(tt);
      ptr.style.left = `${(track(ctx, tt, xs) - 20).toFixed(2)}px`;
      ptr.style.top = `${(track(ctx, tt, ys) - 20).toFixed(2)}px`;
      ptr.style.transform = `scale(${(1 + 0.1 * q).toFixed(4)}, ${(1 - 0.2 * q).toFixed(4)})`;
      ptr.style.opacity = opa(o);
      ptr.style.visibility = o > 0.001 ? "" : "hidden";
      rings.forEach((r, i) => {
        const on = tt >= presses[i].t && tt < presses[i].t + 0.5;
        const e = ctx.ease("power2.out")(ctx.progress(tt, presses[i].t, presses[i].t + 0.5));
        r.style.transform = `scale(${(0.25 + e).toFixed(4)})`;
        r.style.opacity = on ? opa(1 - e) : "0";
        r.style.visibility = on ? "" : "hidden";
      });
    });
  }

  /* B's coin carries on falling (behind the rising lock on mobile, beside the
     window on desktop) and leaves the frame: it never rests on anything of Vallo's. */
  {
    const IN = COIN_IN[ctx.film];
    const fallScene = ctx.scene("c28-fall", K.r28 - 0.01, K.r28 + 1.2, { z: 3 });
    const F = coin(ctx, fallScene, { size: IN.size });
    const g = 2400;
    during(ctx, K.r28 - 0.01, K.r28 + 1.2, (tt) => {
      const dt = Math.max(0, tt - K.r28);
      const y = IN.y + IN.vy * dt + 0.5 * g * dt * dt;
      F.set({ x: IN.x + 24 * dt, y, size: IN.size, spin: IN.spin + IN.vspin * dt, tilt: 0, opacity: y < ctx.H + IN.size ? 1 : 0, shadow: 0 });
    });
  }

  /* ================= the path (rows 29 to 31): one path that does not move ================= */
  const pathScene = ctx.scene("c29-path", K.r29 - 0.1, ROW_OFF[1] + 0.02, { z: 6 });
  /* mobile: the path spans y 720 to 1260 (round 3), its labels large enough to fill the width */
  const ST = M ? [{ x: 170, y: 720 }, { x: 170, y: 990 }, { x: 170, y: 1260 }] : [{ x: 300, y: 560 }, { x: 960, y: 560 }, { x: 1620, y: 560 }];
  const LINE = M ? [{ x: 200, y: 1120 }, { x: 540, y: 1120 }, { x: 870, y: 1120 }] : [{ x: 300, y: 800 }, { x: 960, y: 800 }, { x: 1620, y: 800 }];
  const SD = M ? 124 : 112;
  const SMALL = 26;
  const COIN_D = M ? 104 : 96;
  const drawAt = [K.r29 + 0.14, K.r29 + 0.52, K.r29 + 0.9];
  const fold = [ctx.beat(121.25), ctx.beat(121.85)]; // 69.95 to 70.30, after the line has gone
  const lineOut = [K.r31, K.r31 + 0.24];
  const svg = ctx.el("div", { class: "abs", style: { inset: "0px" } }, pathScene);
  svg.innerHTML = `<svg width="${ctx.W}" height="${ctx.H}" viewBox="0 0 ${ctx.W} ${ctx.H}" style="position:absolute;left:0;top:0;overflow:visible"><line id="c29a" stroke="#3d86ff" stroke-linecap="round"/><line id="c29b" stroke="#3d86ff" stroke-linecap="round"/></svg>`;
  const seg = [svg.querySelector("#c29a"), svg.querySelector("#c29b")];
  const stations = [0, 1, 2].map(() => {
    const n = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)", border: "1.5px solid #ffffff", boxShadow: SHADOW.light, visibility: "hidden" } }, pathScene);
    const ring = ctx.el("div", { class: "abs", style: { inset: "9%", borderRadius: "50%", border: "2px solid rgb(0 105 254 / 0.22)" } }, n);
    return { n, ring };
  });
  const flashes = [0, 1, 2].map(() => ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: "100px", height: "100px", borderRadius: "50%", border: "3px solid rgb(0 105 254 / 0.7)", opacity: 0, visibility: "hidden" } }, pathScene));
  const bigFont = M ? 64 : 46;
  const labelStyle = { font: `600 ${bigFont}px/1.1 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.025em", color: "#0b1230", whiteSpace: "nowrap", visibility: "hidden" };
  const labels = ["Your card", "Paystack"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...labelStyle } }, pathScene));
  /* the bank's label: one line that rolls The owner's bank -> Owner -> Host -> Business */
  const bank = roll(ctx, pathScene, {
    items: [{ text: "The owner's bank", t: drawAt[2] }, { text: "Owner", t: K.owner }, { text: "Host", t: K.host }, { text: "Business", t: K.business }],
    size: bigFont, color: "#0b1230", weight: 700, align: M ? "left" : "center", letterSpacing: "-0.025em",
  });
  bank.nodes.forEach((n, i) => { n.style.color = i ? "var(--electric)" : "#0b1230"; n.style.fontWeight = i ? "700" : "600"; });
  bank.slot.style.visibility = "hidden";
  ctx.sfx("tap_soft", K.host, { offset: -6 });
  ctx.sfx("tap_soft", K.business, { offset: -6 });
  const smallStyle = { font: "600 26px/1 Inter, sans-serif", letterSpacing: "-0.01em", color: "#0b1230", whiteSpace: "nowrap", visibility: "hidden" };
  const small = ["Your card", "Paystack", "Business"].map((text) => ctx.el("div", { class: "abs", text, style: { left: "0px", top: "0px", ...smallStyle } }, pathScene));
  const licensed = ctx.el("div", { class: "abs", text: "Licensed payment processor", style: { left: "0px", top: "0px", font: "600 30px/1.2 Inter, sans-serif", letterSpacing: "-0.01em", color: "var(--electric-600)", whiteSpace: "nowrap", clipPath: "inset(0 100% 0 0)", visibility: "hidden" } }, pathScene);
  /* the holds are never still: the path group drifts 1.02x about its middle
     from the first station to the fold, and the node the coin rests on
     breathes (2 beats a breath) */
  const GC = M ? { x: 540, y: 990 } : { x: 960, y: 600 };
  const drift = (tt) => 1 + 0.02 * ramp(ctx, tt, drawAt[0], fold[0], "sine.inOut") * (1 - ramp(ctx, tt, fold[0] - 0.1, fold[0] + 0.2));
  const restsOn = (tt) => (tt < drawAt[0] + 0.2 ? -1 : tt < K.r30 + 0.4 ? 0 : tt < K.goes ? -1 : tt < K.owner ? 1 : 2);
  const arrived = [drawAt[0] + 0.2, K.goes, K.owner];
  const pulse = (i, tt) => {
    if (restsOn(tt) !== i) return 0;
    const dt = tt - arrived[i] - 0.3;
    if (dt < 0) return 0;
    const env = Math.min(1, dt / 0.3) * (1 - ramp(ctx, tt, fold[0] - 0.25, fold[0]));
    return env * 0.5 * (1 - Math.cos((2 * Math.PI * dt) / (2 * ctx.beat(1))));
  };
  const rowOff = (tt) => ramp(ctx, tt, ROW_OFF[0], ROW_OFF[1], "power2.in");
  const stationAt = (i, tt) => {
    const f = ramp(ctx, tt, fold[0], fold[1], "whip");
    const k = drift(tt);
    const x = mix(ST[i].x, LINE[i].x, f);
    const y = mix(ST[i].y, LINE[i].y, f) + rowOff(tt) * 60; // the folded path sinks a little and fades as the cards fly
    return { x: GC.x + (x - GC.x) * k, y: GC.y + (y - GC.y) * k, d: mix(SD, SMALL, f) * k, u: f };
  };
  const bankAt = (sp, inU) => (M
    ? { x: sp.x + sp.d / 2 + 30 + bank.width / 2 + (1 - inU) * 26, y: sp.y }
    : { x: sp.x, y: sp.y + sp.d / 2 + 40 + (1 - inU) * 18 });

  during(ctx, K.r29 - 0.1, ROW_OFF[1] + 0.02, (tt) => {
    const sp = [0, 1, 2].map((i) => stationAt(i, tt));
    sp.forEach((q, i) => {
      const pop = ramp(ctx, tt, drawAt[i], drawAt[i] + 0.34, "back.out(1.8)");
      const small1 = q.u > 0.5;
      const n = stations[i].n;
      n.style.width = `${q.d.toFixed(2)}px`;
      n.style.height = `${q.d.toFixed(2)}px`;
      n.style.background = small1 ? "#ffffff" : "radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f8ff 60%, #e6eeff 100%)";
      n.style.border = small1 ? "3px solid rgb(0 105 254 / 0.85)" : "1.5px solid #ffffff";
      stations[i].ring.style.opacity = opa(1 - q.u);
      place(n, { x: q.x, y: q.y, s: (0.55 + 0.45 * pop) * (1 + 0.045 * pulse(i, tt)), o: Math.min(1, pop * 2) * (1 - rowOff(tt)) });
    });
    [0, 1].forEach((i) => {
      const a = sp[i];
      const b = sp[i + 1];
      const g = ramp(ctx, tt, drawAt[i] + 0.2, drawAt[i + 1] + 0.1, "power2.inOut");
      seg[i].setAttribute("x1", a.x.toFixed(2));
      seg[i].setAttribute("y1", a.y.toFixed(2));
      seg[i].setAttribute("x2", mix(a.x, b.x, g).toFixed(2));
      seg[i].setAttribute("y2", mix(a.y, b.y, g).toFixed(2));
      seg[i].setAttribute("stroke-width", mix(M ? 6 : 5, 3, a.u).toFixed(2));
      seg[i].style.opacity = g > 0.001 ? opa(1 - rowOff(tt)) : "0";
    });
    [[1, K.goes], [2, K.owner]].forEach(([i, tf]) => {
      const f = ramp(ctx, tt, tf, tf + 0.6, "power2.out");
      flashes[i].style.width = `${sp[i].d.toFixed(2)}px`;
      flashes[i].style.height = `${sp[i].d.toFixed(2)}px`;
      place(flashes[i], { x: sp[i].x, y: sp[i].y, s: 1 + 0.6 * f, o: f > 0 && f < 1 ? (1 - f) * 0.9 : 0 });
    });
    /* the big labels: beside the stations (mobile), under them (desktop); they go before the fold */
    const bigOut = ramp(ctx, tt, fold[0] - 0.14, fold[0] + 0.06);
    labels.forEach((n, i) => {
      const inU = ramp(ctx, tt, drawAt[i] + 0.06, drawAt[i] + 0.46, "land");
      const at = M ? { x: sp[i].x + sp[i].d / 2 + 30 + n.offsetWidth / 2 + (1 - inU) * 26, y: sp[i].y } : { x: sp[i].x, y: sp[i].y + sp[i].d / 2 + 40 + (1 - inU) * 18 };
      place(n, { ...at, o: inU * (1 - bigOut) });
    });
    {
      const inU = ramp(ctx, tt, drawAt[2] + 0.06, drawAt[2] + 0.46, "land");
      place(bank.slot, { ...bankAt(sp[2], inU), o: inU * (1 - bigOut) });
      bank.update(tt);
    }
    small.forEach((n, i) => {
      const u = ramp(ctx, tt, fold[1] - 0.1, fold[1] + 0.2, "power2.out");
      place(n, { x: sp[i].x, y: sp[i].y - (M ? 42 : 40) + (1 - u) * 10, o: u * (1 - rowOff(tt)) });
    });
    {
      const w = ramp(ctx, tt, fold[1] + 0.2, fold[1] + 0.7, "power1.inOut");
      licensed.style.clipPath = `inset(-8px ${(100 - w * 100).toFixed(2)}% -8px 0)`;
      place(licensed, { x: sp[1].x, y: sp[1].y + (M ? 44 : 40), o: w > 0 ? 1 - rowOff(tt) : 0 });
    }
  });
  ctx.sfx("ding_pay", K.owner, { offset: 0 });

  /* ================= the line (rows 29 and 30): lands, then holds still ================= */
  const type = ctx.scene("c29-type", 64.4, lineOut[1] + 0.02, { z: 10 });
  {
    ctx.hideCaptions(64.495, M ? 70.708 : 69.908); // caption span edges: none shows while the line is big
    ctx.sfx("whoosh_short", K.r29, { offset: -2 });
    const font = (size) => `700 ${size}px "C Poppins"`;
    const mk = (parts, size, parent = type) => {
      const n = ctx.el("div", { class: "abs c-display", style: { left: "0px", top: "0px", fontSize: `${size}px`, color: "#0b1230", whiteSpace: "nowrap", visibility: "hidden" } }, parent);
      parts.forEach(([text, blue]) => ctx.el("span", { text, style: blue ? { color: "var(--electric)" } : {} }, n));
      return n;
    };
    const aIn = (tt) => ramp(ctx, tt, 64.45, 64.95, "land"); // round 3: over the falling phone, not after it
    const bIn = (tt) => ramp(ctx, tt, K.holds - 0.16, K.holds + 0.34, "land");
    const out = (tt) => ramp(ctx, tt, lineOut[0], lineOut[1], "power2.in");
    if (M) {
      /* two lines under the pill: "Vallo never" from the left, "holds your money." from the right */
      const Wd = L.WORDS;
      let s2 = 96;
      const w2full = measure("holds your money.", font(s2));
      if (w2full > Wd.w - 16) s2 = Math.floor((s2 * (Wd.w - 16)) / w2full);
      const s1 = s2;
      const l1 = mk([["Vallo never", false]], s1);
      const l2 = mk([["holds your ", false], ["money.", true]], s2);
      const y1 = 460;
      const y2 = y1 + Math.round(s2 * 1.12);
      during(ctx, 64.4, lineOut[1] + 0.02, (tt) => {
        const a = aIn(tt);
        const b = bIn(tt);
        const o = out(tt);
        const w1 = l1.offsetWidth;
        const w2 = l2.offsetWidth;
        const c1x = Wd.x + 16 + w1 / 2;
        const c2x = Wd.x + Wd.w - 8 - w2 / 2;
        place(l1, { x: mix(-w1 / 2 - 40, c1x, a), y: y1 - o * 40, o: Math.min(1, a * 4) * (1 - o) });
        place(l2, { x: mix(ctx.W + w2 / 2 + 40, c2x, b), y: y2 - o * 40, o: Math.min(1, b * 4) * (1 - o) });
      });
    } else {
      /* one line across the top (y 180): one element, so the space between
         "never" and "holds" is the font's own; the halves slide in from opposite sides */
      let s = 104;
      const full = "Vallo never holds your money.";
      if (measure(full, font(s)) > 1640) s = Math.floor((s * 1640) / measure(full, font(s)));
      const line = ctx.el("div", { class: "abs c-display", style: { left: "0px", top: "0px", fontSize: `${s}px`, color: "#0b1230", whiteSpace: "nowrap", visibility: "hidden" } }, type);
      const la = ctx.el("span", { text: "Vallo never", style: { display: "inline-block" } }, line);
      line.appendChild(document.createTextNode(" "));
      const lb = ctx.el("span", { style: { display: "inline-block" } }, line);
      ctx.el("span", { text: "holds your " }, lb);
      ctx.el("span", { text: "money.", style: { color: "var(--electric)" } }, lb);
      during(ctx, 64.4, lineOut[1] + 0.02, (tt) => {
        const a = aIn(tt);
        const b = bIn(tt);
        const o = out(tt);
        place(line, { x: 960, y: 180 - o * 30, o: 1 - o });
        la.style.transform = `translateX(${(-(1 - a) * 1400).toFixed(1)}px)`;
        la.style.opacity = opa(Math.min(1, a * 4));
        lb.style.transform = `translateX(${((1 - b) * 1500).toFixed(1)}px)`;
        lb.style.opacity = opa(Math.min(1, b * 4));
      });
    }
  }

  /* ================= the coin (rows 29 to 31) ================= */
  const coinScene = ctx.scene("c29-coin", K.r29, ROW_OFF[1] + 0.02, { z: 9 });
  const C = coin(ctx, coinScene, { size: COIN_D });
  {
    const land29 = drawAt[0] + 0.2;
    const from = M ? { x: -90, y: 520 } : { x: -90, y: 380 };
    during(ctx, K.r29, ROW_OFF[1] + 0.02, (tt) => {
      let x, y, size = COIN_D, spin, tilt = 0, sy = 1, shadow = 0;
      if (tt < land29) {
        /* in from the left edge in one arc onto Your card */
        const u = ramp(ctx, tt, K.r29, land29, "none");
        const e = ctx.ease("power1.inOut")(u);
        const s0 = stationAt(0, tt);
        x = mix(from.x, s0.x, e);
        y = mix(from.y, s0.y, e) - Math.sin(Math.PI * e) * 120;
        spin = 720 * ctx.ease("power2.out")(u);
        tilt = 10 * Math.sin(u * Math.PI);
      } else {
        const q = [0, 1, 2].map((i) => stationAt(i, tt));
        const a = ramp(ctx, tt, K.r30 + 0.4, K.goes, "power2.in");
        const b = ramp(ctx, tt, K.goes, K.owner, "power3.out");
        const lift = Math.sin(Math.PI * ramp(ctx, tt, K.r30 + 0.3, K.r30 + 0.46)) * 10;
        if (tt < K.goes) { x = mix(q[0].x, q[1].x, a); y = mix(q[0].y, q[1].y, a) - lift; } else { x = mix(q[1].x, q[2].x, b); y = mix(q[1].y, q[2].y, b); }
        size = mix(COIN_D * 0.98, SMALL * 0.92, q[2].u);
        spin = 720 + track(ctx, tt, [[K.r30 + 0.4, 0], [K.goes, 360, "power2.in"], [K.owner, 720, "power3.out"]]);
        sy = 1 - 0.12 * spring(tt, land29, { freq: 3, decay: 9 }) - 0.1 * spring(tt, K.owner, { freq: 3, decay: 8 });
        shadow = tt < K.r30 + 0.3 || tt > K.owner - 0.1 ? 1 : 0.4;
      }
      C.set({ x, y, size, spin, tilt, sy, opacity: 1 - rowOff(tt), shadow: shadow * 0.8 });
    });
  }

  /* ================= the three answered cards (row 31) ================= */
  const swingIn = ctx.beat(121.25); // 69.95
  const cardScene = ctx.scene("c31-cards", swingIn - 0.02, ROW_OFF[1] + 0.02, { z: 11 });
  {
    const slot = L.CARD_SLOT;
    const w = slot[0].w;
    const h = slot[0].h;
    const fs = M ? 31 : 40;
    const pad = Math.round(fs * 0.85);
    /* answers set in explicit lines (round 3): card 1 never wraps raggedly */
    const LINES = {
      mobile: [["₦26,100,000", "to move in.", "Seen before", "a single call."], null, null],
      desktop: [["₦26,100,000 to move in.", "Seen before a single call."], null, null],
    }[ctx.film];
    const card = async (q, a, mark, lines) => {
      const root = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px`, visibility: "hidden" } }, cardScene);
      const inner = ctx.el("div", { class: "abs", style: { inset: "0px" } }, root);
      const face = (back) => ctx.el("div", {
        class: "abs glass-dark",
        style: {
          inset: "0px", borderRadius: `${Math.round(Math.min(w, h) * 0.11)}px`, overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: `${Math.round(fs * 0.6)}px`, textAlign: "center",
          padding: `0 ${pad}px`, color: "#fff", font: `600 ${back ? fs : Math.round(fs * 1.08)}px/1.2 "C Poppins", Inter, sans-serif`, letterSpacing: "-0.02em",
          backdropFilter: "none", boxShadow: SHADOW.light,
          ...(back ? { background: "linear-gradient(150deg, rgb(0 105 254 / 0.94), rgb(0 63 152 / 0.96))", border: "1.5px solid rgb(143 211 255 / 0.55)" } : { background: "rgb(10 16 60 / 0.94)" }),
        },
      }, inner);
      const front = face(false);
      ctx.el("span", { text: q }, front);
      const back = face(true);
      if (mark) await verifiedMark(ctx, back, Math.round(fs * 1.8));
      if (lines) {
        /* the longest line fits the card's width at the face's own size or smaller */
        const widest = Math.max(...lines.map((l) => measure(l, `600 ${fs}px "C Poppins"`, "-0.02em")));
        const size = Math.min(fs, Math.floor((fs * (w - 2 * pad - 8)) / widest));
        const box = ctx.el("div", { style: { fontSize: `${size}px` } }, back);
        lines.forEach((l) => ctx.el("div", { text: l, style: { whiteSpace: "nowrap" } }, box));
      } else {
        ctx.el("span", { text: a }, back);
      }
      return { root, inner, front, back };
    };
    /* the row reads 1 | 2 | 3, as the story asks them: card 1 comes back from
       the left, card 2 from above, card 3 swings in from the right */
    const c1 = await card(QUESTIONS[0].q, QUESTIONS[0].a, false, LINES[0]);
    const c2 = await card(QUESTIONS[1].q, QUESTIONS[1].a, true, LINES[1]);
    const c3 = await card(QUESTIONS[2].q, QUESTIONS[2].a, false, LINES[2]);
    const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    const [S0, S1, S2] = slot.map(centre);
    /* the engine's flat turn (skew, edge shade, highlight): card 3 turns once;
       cards 1 and 2 come back already turned */
    const t3 = [ctx.beat(123.0)]; // 70.96: its answer shows from 71.26 and lies flat by 71.58
    installFlatTurn(ctx, c3, t3);
    installFlatTurn(ctx, c1, [-100]);
    installFlatTurn(ctx, c2, [-100]);
    const land12 = [[70.45, 70.9], [70.5, 70.95]]; // cards 1 and 2 land by 70.95
    const full = ctx.beat(124.1); // 71.60: the row is complete
    ctx.sfx("card_slide", swingIn, { offset: -4 });
    ctx.sfx("pop", t3[0] + 0.04, { offset: 0 });
    ctx.sfx("success", full, { offset: -2 });
    const IN = CARD_IN[ctx.film];
    const OFF = CARD_OFF[ctx.film];
    /* the held row drifts 1.5% larger about its middle, then flies off */
    const rowC = { x: S1.x, y: S1.y };
    const hold = (tt) => 1 + 0.015 * ramp(ctx, tt, full - 0.3, ROW_OFF[0], "sine.inOut");
    const off = (i, tt) => ramp(ctx, tt, ROW_OFF[0] + i * 0.02, ROW_OFF[1] - (2 - i) * 0.02, "power2.in");
    const at = (Sx, k) => ({ x: rowC.x + (Sx.x - rowC.x) * k, y: rowC.y + (Sx.y - rowC.y) * k });
    during(ctx, swingIn - 0.02, ROW_OFF[1] + 0.02, (tt) => {
      const k = hold(tt);
      /* card 3 swings in from the right, clear of the pill */
      {
        const a = ramp(ctx, tt, swingIn, swingIn + 0.38, "back.out(1.3)");
        const p = at(S2, k);
        const o = off(2, tt);
        place(c3.root, {
          x: mix(mix(S2.x + (M ? 560 : 900), p.x, a), OFF[2].x, o), y: mix(p.y, OFF[2].y, o),
          r: mix(14, 0, a) + OFF[2].r * o, s: k, o: tt >= swingIn && o < 1 ? 1 : 0,
        });
        const flipped = tt >= t3[0] + TURN_SWAP;
        c3.front.style.visibility = flipped ? "hidden" : "inherit";
        c3.back.style.visibility = flipped ? "inherit" : "hidden";
      }
      [[c1, S0, IN.c1, 0], [c2, S1, IN.c2, 1]].forEach(([c, Sx, from, i]) => {
        const b = ramp(ctx, tt, land12[i][0], land12[i][1], "power3.out");
        const p = at(Sx, k);
        const o = off(i, tt);
        place(c.root, {
          x: mix(mix(from.x, p.x, b), OFF[i].x, o), y: mix(mix(from.y, p.y, b), OFF[i].y, o),
          r: mix(from.r, 0, b) + OFF[i].r * o, s: mix(from.s, 1, b) * k, o: b > 0 && o < 1 ? 1 : 0,
        });
        c.front.style.visibility = "hidden";
        c.back.style.visibility = "inherit";
      });
    });
  }
}
