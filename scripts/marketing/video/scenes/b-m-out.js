/**
 * Mobile rows 23 and 24 (49.04 to 54.23), storyboard v3.2, on the mist.
 *   23  "Going out" in navy, "tonight?" filled with a warm restaurant photo
 *       (atmosphere only, never named, 1.3x at most, its edges feathered),
 *       centred on the frame's axis in the electric ring. From 50.19 the
 *       camera pushes through the "o" of "tonight?" and comes out on the
 *       mist, where the restaurant rises.
 *   24  restaurant-light at PHONE_HIGH, its notice readable; on "reserve"
 *       the Table for 2 card arrives with its Example chip, over the
 *       restaurant's photo (no text under it); it holds to 53.86 and flies
 *       off; the phone turns away as the chapter ends.
 */
import { LAYOUT } from "./layout.js";
import { NAVY, INK2, ramp, mix, screenPage, showDuring, glassCard, iconPlate, exampleChip, measure, ringOut } from "./b-kit.js";

const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (parent) parent.appendChild(n);
  return n;
};

/**
 * The row 23 title, shared by both films: "Going out" (navy) over
 * "tonight?" (the photo), in a ring, pushed through the "o" of "tonight?".
 */
export function goingTitle(ctx, layer, T, { id, CX, CY, R, maxSize, feather, tPush }) {
  const { tl } = ctx;
  const PH = { w: 1448 * 1.3, h: 1086 * 1.3 };
  const svg = svgEl("svg", { width: ctx.W, height: ctx.H, viewBox: `0 0 ${ctx.W} ${ctx.H}`, style: "position:absolute;left:0;top:0;overflow:visible" }, layer);
  const defs = svgEl("defs", {}, svg);
  /* the letters of "tonight?" are the windows */
  const mask = svgEl("mask", { id: `${id}-letters`, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: ctx.W, height: ctx.H }, defs);
  svgEl("rect", { x: 0, y: 0, width: ctx.W, height: ctx.H, fill: "black" }, mask);
  const gMask = svgEl("g", {}, mask);
  /* the photo's edges feathered, so its rectangle never shows as the letters grow */
  const fx = feather.x / PH.w;
  const fy = feather.y / PH.h;
  const lgV = svgEl("linearGradient", { id: `${id}-fv`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [[0, 0], [fy, 1], [1 - fy, 1], [1, 0]].forEach(([o, a]) => svgEl("stop", { offset: o, "stop-color": "white", "stop-opacity": a }, lgV));
  const lgH = svgEl("linearGradient", { id: `${id}-fh`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  [[0, 0], [fx, 1], [1 - fx, 1], [1, 0]].forEach(([o, a]) => svgEl("stop", { offset: o, "stop-color": "white", "stop-opacity": a }, lgH));
  const px = CX - PH.w / 2;
  const py = CY - PH.h / 2;
  const fMask = svgEl("mask", { id: `${id}-feather`, maskUnits: "userSpaceOnUse", x: px, y: py, width: PH.w, height: PH.h }, defs);
  const fMaskIn = svgEl("mask", { id: `${id}-featherH`, maskUnits: "userSpaceOnUse", x: px, y: py, width: PH.w, height: PH.h }, defs);
  svgEl("rect", { x: px, y: py, width: PH.w, height: PH.h, fill: `url(#${id}-fh)` }, fMaskIn);
  svgEl("rect", { x: px, y: py, width: PH.w, height: PH.h, fill: `url(#${id}-fv)`, ...(fx > 0 ? { mask: `url(#${id}-featherH)` } : {}) }, fMask);
  const shown = svgEl("g", { mask: `url(#${id}-letters)` }, svg);
  const photoG = svgEl("g", { mask: `url(#${id}-feather)` }, shown);
  const img = svgEl("image", { href: ctx.src.photo("restaurant-02-lounge.jpg"), x: px, y: py, width: PH.w, height: PH.h, preserveAspectRatio: "xMidYMid slice" }, photoG);
  svgEl("rect", { x: px, y: py, width: PH.w, height: PH.h, fill: "rgb(255 170 90)", opacity: 0.1 }, photoG);
  ctx.pending = (ctx.pending ?? []).concat(new Promise((ok) => { img.addEventListener("load", ok, { once: true }); img.addEventListener("error", ok, { once: true }); }));
  /* "Going out" in navy, live */
  const gNavy = svgEl("g", {}, svg);
  const mk = (parent, text, fill) => {
    const n = svgEl("text", { x: 0, y: 0, fill, "font-family": "Poppins", "font-weight": 800, "letter-spacing": "-0.035em", opacity: 0 }, parent);
    n.textContent = text;
    return n;
  };
  const words = [
    { node: mk(gNavy, "Going", NAVY), t: T.going, line: 0 },
    { node: mk(gNavy, "out", NAVY), t: T.out, line: 0 },
    { node: mk(gMask, "tonight?", "white"), t: T.tonight, line: 1 },
  ];
  let L = null;
  const doLayout = () => {
    const w100 = (s) => measure(s, "800 100px Poppins");
    const wide = Math.max(w100("Going out"), w100("tonight?")) / 100;
    let size = maxSize;
    while (Math.hypot((wide * size) / 2, 0.99 * size) > R - 34) size -= 1;
    const font = `800 ${size}px Poppins`;
    const sp = measure("Going out", font) - measure("Going", font) - measure("out", font);
    const w1 = measure("Going out", font);
    const w2 = measure("tonight?", font);
    const base1 = CY - 0.25 * size;
    const base2 = base1 + size;
    const pos = [[CX - w1 / 2, base1], [CX - w1 / 2 + measure("Going", font) + sp, base1], [CX - w2 / 2, base2]];
    words.forEach((w, i) => {
      w.node.setAttribute("font-size", size.toFixed(1));
      w.node.setAttribute("x", pos[i][0].toFixed(1));
      w.node.setAttribute("y", pos[i][1].toFixed(1));
    });
    /* the counter of the "o" in "tonight?" */
    const tW = measure("t", font);
    const toW = measure("to", font);
    L = { o: { x: pos[2][0] + tW + (toW - tW) / 2 - size * 0.02, y: base2 - 0.28 * size } };
  };
  /* no iris (it led nowhere): the title holds, then lifts a little and fades as the device rises under it */
  const tEnd = tPush + 0.24;
  ctx.onFrame((t) => {
    if (t < T.r23 - 0.05 || t > tEnd + 0.05) return;
    if (!L) doLayout();
    words.forEach((w) => {
      const k = ramp(ctx, t, w.t - 0.04, w.t + 0.3, "land");
      w.node.setAttribute("opacity", Math.min(1, k * 1.6).toFixed(3));
      w.node.setAttribute("transform", `translate(0 ${((1 - k) * 50).toFixed(2)})`);
    });
    const p = ramp(ctx, t, tPush, tEnd, "power2.in");
    const s = 1 + 0.1 * p;
    const tr = `translate(${CX} ${CY}) scale(${s.toFixed(4)}) translate(${-CX} ${(-CY + 40 * p).toFixed(2)})`;
    gMask.setAttribute("transform", tr);
    gNavy.setAttribute("transform", tr);
    svg.style.opacity = (1 - p).toFixed(3);
  });
  showDuring(ctx, svg, [[T.r23 - 0.05, tEnd]]);
  /* the ring: electric, round the words, its particles outside it */
  const ringWrap = ctx.el("div", { class: "fill" }, layer);
  layer.insertBefore(ringWrap, svg);
  ringOut(ctx, ringWrap, { cx: CX, cy: CY, r: R, t: T.going + 0.04, dots: 8, seed: 23, stroke: 4 });
  ringWrap.style.transformOrigin = `${CX}px ${CY}px`;
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.1, duration: 0.3, ease: "power2.in", immediateRender: false }, tPush);
  showDuring(ctx, ringWrap, [[T.going, tPush + 0.3]]);
  return { tEnd };
}

export async function goingOut(ctx, S, T) {
  const L = LAYOUT.mobile;

  /* ==================== row 23 ==================== */
  const layer = ctx.scene("b-m-going", T.r23 - 0.05, T.r24 + 0.3, { z: 30 });
  ctx.sfx("whoosh_short", T.r23, { offset: -2 });
  const tPush = ctx.beat(87.35); // 50.39: the title holds 0.2 s longer
  goingTitle(ctx, layer, T, { id: "b-m-going", CX: ctx.W / 2, CY: 780, R: 400, maxSize: 170, feather: { x: 0, y: 240 }, tPush });

  /* ==================== row 24 ==================== */
  const pL = S.pL;
  const HIGH = { cx: L.PHONE_HIGH.cx, cy: L.PHONE_HIGH.cy, height: L.PHONE_HIGH.height };
  const tRise = ctx.beat(87.35) + 0.08; // 50.47: rises as the title lifts away, clear of it
  const tOff = ctx.beat(93.36);    // 53.86
  const tTurn = ctx.beat(93.43);   // 53.90
  const pose = S.pLpose;
  pose.to(tRise - 0.01, 0.001, { ...HIGH, cy: 2600, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(tRise, 0.58, HIGH, "glide");                                             // rises under the title
  pose.to(tRise + 0.6, tTurn - tRise - 0.6, { cy: HIGH.cy - 12 }, "drift");        // a slow rise while the card holds
  pose.to(tTurn, 0.33, { cx: 330, ry: -64, opacity: 0 }, "power2.in");            // turns away as the chapter ends
  const page = screenPage(ctx, pL, ctx.src.display("restaurant-light"));
  showDuring(ctx, page.el, [[tRise - 0.02, T.r25 + 0.1]]);

  /* The table card: over the restaurant's photo (display y 186-1180), where no text is; the notice stays readable below. */
  const cards = ctx.scene("b-m-table", T.r24, T.r25 + 0.1, { z: 20 });
  const CWd = 560;
  const X = (ctx.W - CWd) / 2;
  const Y = 452;
  const card = glassCard(ctx, cards, { w: CWd, radius: 30, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "12px", padding: "24px 26px 22px", visibility: "hidden" } });
  const top = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "16px" } }, card);
  iconPlate(ctx, top, "utensils", { size: 60 });
  ctx.el("div", { text: "Table for 2", style: { font: "600 36px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, top);
  exampleChip(ctx, top, { size: 18, style: { marginLeft: "auto" } });
  ctx.el("div", { html: "Tonight, 8:00 PM<br>Harbour Lights Kitchen", style: { font: "500 25px/1.36 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, card);
  const tIn = T.reserve;
  ctx.sfx("pop", tIn);
  showDuring(ctx, card, [[tIn, tOff + 0.4]]);
  ctx.onFrame((t) => {
    if (t < tIn || t > tOff + 0.4) return;
    const k = ramp(ctx, t, tIn, tIn + 0.45, "back.out(1.4)");
    const off = ramp(ctx, t, tOff, tOff + 0.34, "power3.in");
    const x = mix(ctx.W + 40, X, k) + off * 640;
    const y = Y - off * 560;
    card.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(mix(6, 0, k) + off * 16).toFixed(2)}deg)`;
    card.style.opacity = String((1 - off * 0.3).toFixed(3));
  });
}
