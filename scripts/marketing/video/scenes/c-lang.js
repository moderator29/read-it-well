/**
 * ROWS 35 and 36: LANGUAGES (79.62 to 85.38), both films. STORYBOARD v3.1.
 *
 * 35  The contrast beat, on night: a wall of the product's own pills (the
 *     welcome screen's capsule: its radius, border and type) in Vallo navy,
 *     holding the welcome words in four languages. Three pills light in
 *     electric blue with "Speaks your language" and fly into the chapter
 *     pill; the wall parts and the phone (window) rises with `welcome-1`.
 * 36  The screen cuts in place on each spoken name: Hausa, Yorùbá, Igbo. The
 *     headlines share one y (the Igbo capture is re-seated in bands). Each
 *     name lands beside the device, rolling the last one away.
 */
import { browserWindow } from "../engine/components.js";
import { track, ramp, spring, during, place, dispToStage, measure, night, mix, opa } from "./c-kit.js";

/* The welcome words (FACTS: welcome, slide 1, in four languages). */
const PHRASES = ["Two worlds.", "Duniya biyu.", "Ayé méjì.", "Ụwa abụọ.", "One platform.", "Dandali ɗaya.", "Pèpéle kan.", "Otu ikpo okwu."];

/* The product's capsule (welcome screen's Property | Stays): navy glass with a
   faint edge, the active pill a brighter navy, Inter 700 in white. */
const NAVIES = ["#1c233e", "#0b2a6b", "#141e4a", "#0f1a44"];

export async function buildLang(ctx, S) {
  const { K, L } = S;
  const M = ctx.isMobile;
  const lit = [ctx.beat(138.15), ctx.beat(138.6), ctx.beat(139)]; // 79.70, 79.96, 80.19
  const toPill = [K.language - 0.12, K.language + 0.14]; // the lit pills fly into the chapter pill (81.0)
  const part = [K.language, K.language + 0.7];
  const rise = [K.language + 0.02, K.r36 - 0.04];

  /* ================= the ground and the wall ================= */
  const wallScene = ctx.scene("c35-wall", K.r35 - 0.02, K.r37 + 0.05, { z: 2 });
  night(ctx, wallScene, { y: 44, glow: 0.22 });
  const wallLayer = ctx.el("div", { class: "fill" }, wallScene);
  const H = M ? 104 : 84; // pill height
  const GAP = M ? 22 : 18;
  const FS = M ? 34 : 28; // dim word size
  const LFS = M ? 58 : 50; // lit word size
  const pad = M ? 40 : 34;
  const pitch = H + GAP;
  const cx = M ? 540 : 960;
  const rowA = M ? 776 - pitch / 2 : 540 - pitch / 2; // row centres: the two rows that carry the lit pills
  const rowB = rowA + pitch;
  const rand = ctx.random(3501);
  const pills = []; // { el, x, y, w, row }
  const litPills = [];
  const textW = (s, size) => measure(s, `700 ${size}px Inter`, "-0.01em");
  const mkPill = (x, y, w, fill, word = null, dim = true) => {
    const el = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${w}px`, height: `${H}px`, borderRadius: "999px", background: fill, border: "2px solid rgb(255 255 255 / 0.07)",
        display: "flex", alignItems: "center", justifyContent: "center", font: `700 ${FS}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: dim ? "rgb(255 255 255 / 0.4)" : "#fff", whiteSpace: "nowrap",
      },
      text: word ?? "",
    }, wallLayer);
    return el;
  };
  /* the lit words: two on row A, one on row B, centred */
  const LIT = [["Speaks", rowA], ["your", rowA], ["language", rowB]];
  const litW = LIT.map(([w]) => textW(w, LFS) + 2 * (pad + 6));
  const rowAW = litW[0] + GAP + litW[1];
  const litX = [cx - rowAW / 2 + litW[0] / 2, cx - rowAW / 2 + litW[0] + GAP + litW[1] / 2, cx];
  let phrase = 0;
  const rows = Math.ceil((ctx.H + 2 * pitch) / pitch);
  for (let r = 0; r < rows; r += 1) {
    const y = rowA - pitch * Math.ceil((rowA + H) / pitch) + r * pitch; // row centres, aligned to rowA
    const isA = Math.abs(y - rowA) < 1;
    const isB = Math.abs(y - rowB) < 1;
    /* the reserved spans (lit pills) on rows A and B */
    const reserved = isA ? [[litX[0] - litW[0] / 2, litX[0] + litW[0] / 2], [litX[1] - litW[1] / 2, litX[1] + litW[1] / 2]] : isB ? [[litX[2] - litW[2] / 2, litX[2] + litW[2] / 2]] : [];
    /* lay pills left to right from a seeded offset, skipping the reserved spans */
    let x = -rand() * 260;
    let guard = 0;
    while (x < ctx.W + 40 && guard < 40) {
      guard += 1;
      const word = rand() < 0.42 ? PHRASES[phrase++ % PHRASES.length] : null;
      const w = word ? textW(word, FS) + 2 * pad : Math.round(150 + rand() * 280);
      const hit = reserved.find(([a, b]) => x < b + GAP && x + w > a - GAP);
      if (hit) {
        /* end this pill before the reserved span: shrink it, or jump over */
        const room = hit[0] - GAP - x;
        if (room > 110 && !word) pills.push({ el: mkPill(x, y, room, NAVIES[Math.floor(rand() * NAVIES.length)]), x, y, w: room });
        x = hit[1] + GAP;
        continue;
      }
      pills.push({ el: mkPill(x, y, w, NAVIES[Math.floor(rand() * NAVIES.length)], word), x, y, w });
      x += w + GAP;
    }
  }
  /* the three lit pills: dim navy until they light, then electric with the word */
  LIT.forEach(([word, y], i) => {
    const el = ctx.el("div", {
      class: "abs",
      style: {
        left: "0px", top: "0px", width: `${litW[i]}px`, height: `${H}px`, borderRadius: "999px", border: "2px solid rgb(255 255 255 / 0.07)", background: NAVIES[1],
        display: "flex", alignItems: "center", justifyContent: "center", font: `700 ${LFS}px/1 Inter, sans-serif`, letterSpacing: "-0.01em", color: "#fff", whiteSpace: "nowrap",
      },
    }, wallScene);
    const span = ctx.el("span", { text: word }, el);
    litPills.push({ el, span, x: litX[i], y, w: litW[i] });
    ctx.sfx("pop", lit[i], { offset: -2 });
  });
  ctx.hideCaptions(K.r35, K.r37);

  const partCentre = M ? 640 : 590; // where the device rises
  during(ctx, K.r35 - 0.02, K.r37 + 0.05, (t) => {
    const drift = (t - K.r35) * (M ? 26 : 30);
    const p = ramp(ctx, t, part[0], part[1], "power3.inOut");
    const fade = 1 - ramp(ctx, t, K.hausa - 0.1, K.hausa + 0.5, "power2.inOut") * 0.9 - ramp(ctx, t, K.r37 - 0.3, K.r37) * 0.1;
    pills.forEach((q, i) => {
      const dir = Math.round((q.y - rowA) / pitch) % 2 === 0 ? 1 : -1;
      const mid = q.x + q.w / 2 + dir * drift;
      const away = (mid < partCentre ? -1 : 1) * p * (M ? 420 : 560) * (0.7 + 0.3 * Math.min(1, Math.abs(mid - partCentre) / 400));
      place(q.el, { x: mid + away, y: q.y, o: (1 - 0.55 * p) * fade });
    });
    litPills.forEach((q, i) => {
      const on = ramp(ctx, t, lit[i] - 0.03, lit[i] + 0.12, "power2.out");
      const pop = 1 + 0.07 * Math.max(0, spring(t, lit[i], { freq: 2.4, decay: 7 }));
      q.el.style.background = on > 0.5 ? "linear-gradient(180deg, #1f7dff 0%, #0069fe 55%, #0058e0 100%)" : NAVIES[1];
      q.el.style.borderColor = on > 0.5 ? "rgb(143 211 255 / 0.55)" : "rgb(255 255 255 / 0.07)";
      q.el.style.boxShadow = on > 0.5 ? "0 18px 44px -14px rgb(0 105 254 / 0.75)" : "none";
      q.span.style.opacity = opa(on);
      /* into the chapter pill */
      const u = ramp(ctx, t, toPill[0] + i * 0.02, toPill[1] + i * 0.02, "power3.in");
      const pillY = (L.PILL.top + L.PILL.bottom) / 2;
      const dxRow = i === 2 ? 0 : (i === 0 ? -1 : 1) * 60;
      place(q.el, { x: mix(q.x, L.PILL.cx + dxRow * 0.5, u), y: mix(q.y, pillY, u), s: pop * mix(1, 0.22, u), o: 1 - ramp(ctx, t, toPill[1] - 0.06 + i * 0.02, toPill[1] + 0.02 + i * 0.02) });
    });
  });

  /* ================= the device and the four languages ================= */
  const cuts = [
    { t: -1, id: M ? "welcome-1" : "d-welcome" },
    { t: K.hausa, id: M ? "welcome-ha" : "d-welcome-ha" },
    { t: K.yoruba, id: M ? "welcome-yo" : "d-welcome-yo" },
    { t: K.igbo, id: M ? "welcome-ig" : "d-welcome-ig" },
  ];
  for (const c of cuts.slice(1)) ctx.sfx("swipe", c.t, { offset: -2 });

  /* An image re-seated in bands: the rows [y0, y1) move by dy (x0-x1), the
     strip they leave is filled with `fill`. Headlines then share one y. */
  const seated = (parent, src, w, h, bands) => {
    const box = ctx.el("div", { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px`, overflow: "hidden", visibility: "hidden" } }, parent);
    ctx.img(src, { class: "abs", style: { left: "0px", top: "0px", width: `${w}px`, height: `${h}px` } }, box);
    for (const b of bands) {
      const x0 = b.x0 ?? 0;
      const x1 = b.x1 ?? w;
      ctx.el("div", { class: "abs", style: { left: `${x0}px`, top: `${b.y0}px`, width: `${x1 - x0}px`, height: `${Math.abs(b.dy)}px`, background: b.fill } }, box);
      const clip = ctx.el("div", { class: "abs", style: { left: `${x0}px`, top: `${b.y0 + b.dy}px`, width: `${x1 - x0}px`, height: `${b.y1 - b.y0}px`, overflow: "hidden" } }, box);
      ctx.img(src, { class: "abs", style: { left: `${-x0}px`, top: `${-b.y0}px`, width: `${w}px`, height: `${h}px` } }, clip);
    }
    return box;
  };

  let screens; // the four screens, in cut order
  let deviceAt; // stage anchor for the names (right edge x, centre y)
  if (M) {
    const p = S.dark;
    const P = { ...L.PHONE_HIGH, cx: 640 };
    screens = cuts.map((c) => (c.id === "welcome-ig"
      /* the Igbo card is shorter: its toggle, headline and text sit 162 px higher */
      ? seated(p.screen, ctx.src.display(c.id), 1320, 2868, [{ y0: 1826, y1: 2600, dy: 162, fill: "rgb(1 6 19)" }])
      : seated(p.screen, ctx.src.display(c.id), 1320, 2868, [])));
    p.poses.push({
      t0: rise[0] - 0.02, t1: K.r37 + 0.02,
      fn: (t) => ({
        cx: P.cx, height: P.height, fov: 24, rz: 0,
        cy: track(ctx, t, [[rise[0], P.cy + 1250], [rise[1], P.cy, "land"]]),
        rx: track(ctx, t, [[rise[0], 14], [rise[1] + 0.1, 0, "land"]]),
        ry: track(ctx, t, [[rise[0], -8], [rise[1] + 0.1, 0, "land"]]),
        opacity: 1,
      }),
    });
    ctx.onFrame((t) => {
      /* runs on every frame: the phone outlives these rows */
      const k = cuts.reduce((acc, c, i) => (t >= c.t ? i : acc), 0);
      const on = t >= rise[0] - 0.1 && t < K.r37;
      screens.forEach((s, i) => { s.style.visibility = on && i === k ? "" : "hidden"; });
    });
    deviceAt = { x: 382, y: dispToStage(P, 0, 2172).y + 20 };
  } else {
    const W = L.WINDOW_LEFT;
    const winScene = ctx.scene("c35-win", rise[0] - 0.02, K.r37 + 0.02, { z: 5 });
    const win = browserWindow(ctx, { parent: winScene, width: 1440, url: "vallospaces.com", theme: "dark" });
    /* the right column (progress bar, headline, text, Continue) is centred on the
       page, so it sits higher in Hausa, Yorùbá and Igbo: re-seat it to English's y */
    const col = (dy) => (dy ? [{ x0: 740, x1: 1330, y0: 250, y1: 700, dy, fill: "rgb(1 8 22)" }] : []);
    screens = [0, 26, 26, 37].map((dy, i) => seated(win.content, ctx.src.capture(cuts[i].id), 1440, 900, col(dy)));
    const s0 = W.width / 1440;
    during(ctx, rise[0] - 0.02, K.r37 + 0.02, (t) => {
      const u = ramp(ctx, t, rise[0], rise[1], "land");
      const y = W.y + (1 - u) * 900;
      win.root.style.transformOrigin = "0 0";
      win.root.style.transform = `translate(${W.x}px, ${y.toFixed(2)}px) scale(${s0.toFixed(5)})`;
      win.root.style.opacity = opa(u * 3);
      win.root.style.visibility = u > 0.001 ? "" : "hidden";
      const k = cuts.reduce((acc, c, i) => (t >= c.t ? i : acc), 0);
      screens.forEach((s, i) => { s.style.visibility = i === k ? "" : "hidden"; });
    });
    deviceAt = { x: L.RIGHT_PANEL.x + 60, y: L.RIGHT_PANEL.y + 330 };
  }

  /* the names, rolling in their slot beside the device */
  const nameScene = ctx.scene("c36-names", K.english - 0.2, K.r37 + 0.05, { z: 10 });
  {
    const names = [["English", K.english], ["Hausa", K.hausa], ["Yorùbá", K.yoruba], ["Igbo", K.igbo]];
    const size = M ? 88 : 112;
    /* one line's slot, clipped, so each name rolls up and out as the next rolls in */
    const slotW = M ? 380 : 640;
    const slotH = Math.round(size * 1.34);
    const slot = ctx.el("div", { class: "abs", style: { left: `${M ? deviceAt.x - slotW : deviceAt.x}px`, top: `${Math.round(deviceAt.y - slotH / 2)}px`, width: `${slotW}px`, height: `${slotH}px`, overflow: "hidden" } }, nameScene);
    const nodes = names.map(([text]) => ctx.el("div", { class: "abs c-display", text, style: { left: "0px", top: "0px", fontSize: `${size}px`, color: "#ffffff", whiteSpace: "nowrap", lineHeight: "1.1" } }, slot));
    const widths = names.map(([text]) => measure(text, `700 ${size}px "C Poppins"`));
    during(ctx, K.english - 0.2, K.r37 + 0.05, (t) => {
      nodes.forEach((n, i) => {
        const tin = names[i][1];
        const inU = ramp(ctx, t, tin - 0.08, tin + 0.26, "power3.out");
        const tout = i < names.length - 1 ? names[i + 1][1] : K.r37 - 0.05;
        const outU = ramp(ctx, t, tout - 0.08, tout + 0.18, "power3.in");
        const x = M ? slotW - widths[i] / 2 - 4 : widths[i] / 2 + 4;
        const y = slotH / 2 + (1 - inU) * slotH - outU * slotH;
        place(n, { x, y, o: inU > 0 && outU < 1 ? 1 : 0 });
      });
    });
  }
}
