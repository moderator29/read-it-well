/**
 * Mobile rows 23 and 24 (49.04 to 54.23), storyboard v3.1, on the warm light.
 *   23  the dusk (b-mobile.js): "Going out / tonight?" in WORDS, the letters
 *       windows onto a warm restaurant photo (atmosphere only, never named,
 *       at 1.15x), in the last ring; from 50.2 the camera pushes through the
 *       O of "Going" and the frame fills with warm light.
 *   24  restaurant-light rises (PHONE_HERO), its notice readable; on
 *       "reserve" the Table for 2 card (Example) arrives beside the phone;
 *       then the card flies off and the phone turns away.
 */
import { ringBurst } from "../engine/components.js";
import { LAYOUT } from "./layout.js";
import { NAVY, INK2, DW, SHADOW, ramp, mix, screenPage, showDuring, glassCard, iconPlate, exampleChip, measure, quadAtPose } from "./b-kit.js";

const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (parent) parent.appendChild(n);
  return n;
};

export async function goingOut(ctx, S, T) {
  const { tl } = ctx;
  const L = LAYOUT.mobile;
  const W = L.WORDS;
  const CX = W.x + W.w / 2;
  const CY = W.y + W.h / 2 + 10;

  /* ==================== row 23 ==================== */
  const layer = ctx.scene("b-m-going", T.r23 - 0.05, T.r24 + 0.3, { z: 30 });
  ctx.sfx("whoosh_short", T.r23, { offset: -2 });

  /* The photo behind the letters: fixed to the stage (the letters are windows), at 1.15x. */
  const PH = { w: 1448 * 1.15, h: 1086 * 1.15 };
  const svg = svgEl("svg", { width: ctx.W, height: ctx.H, viewBox: `0 0 ${ctx.W} ${ctx.H}`, style: "position:absolute;left:0;top:0;overflow:visible" }, layer);
  const defs = svgEl("defs", {}, svg);
  const mask = svgEl("mask", { id: "b-m-going-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: ctx.W, height: ctx.H }, defs);
  svgEl("rect", { x: 0, y: 0, width: ctx.W, height: ctx.H, fill: "black" }, mask);
  const g = svgEl("g", {}, mask);
  const lines = [
    [{ text: "Going", t: T.going }, { text: "out", t: T.out }],
    [{ text: "tonight?", t: T.tonight }],
  ];
  const texts = lines.map((ln) => ln.map((w) => ({ ...w, node: svgEl("text", { x: 0, y: 0, fill: "white", "font-family": "Poppins", "font-weight": 800, "letter-spacing": "-0.035em", opacity: 0 }, g) })));
  texts.flat().forEach((w) => (w.node.textContent = w.text));
  const shown = svgEl("g", { mask: "url(#b-m-going-mask)" }, svg);
  const img = svgEl("image", { href: ctx.src.photo("restaurant-02-lounge.jpg"), x: CX - PH.w / 2, y: CY - PH.h / 2, width: PH.w, height: PH.h, preserveAspectRatio: "xMidYMid slice" }, shown);
  svgEl("rect", { x: CX - PH.w / 2, y: CY - PH.h / 2, width: PH.w, height: PH.h, fill: "rgb(255 170 90)", opacity: 0.12 }, shown);
  /* the photo must be loaded before frame one, like every ctx.img */
  ctx.pending = (ctx.pending ?? []).concat(new Promise((ok) => { img.addEventListener("load", ok, { once: true }); img.addEventListener("error", ok, { once: true }); }));

  /* layout, once the font has loaded: two centred lines, at most 820 px wide */
  let layout = null;
  const doLayout = () => {
    const f100 = "800 100px Poppins";
    const size = Math.min(152, (820 / measure("Going out", f100)) * 100);
    const font = `800 ${size}px Poppins`;
    const sp = measure("Going out", font) - measure("Going", font) - measure("out", font);
    const lineW = [measure("Going", font) + sp + measure("out", font), measure("tonight?", font)];
    const base = [CY - size * 0.12, CY + size * 0.92];
    const pos = [
      [CX - lineW[0] / 2, CX - lineW[0] / 2 + measure("Going", font) + sp],
      [CX - lineW[1] / 2],
    ];
    texts.forEach((ln, i) => ln.forEach((w, j) => {
      w.node.setAttribute("font-size", size.toFixed(1));
      w.node.setAttribute("x", pos[i][j].toFixed(1));
      w.node.setAttribute("y", base[i].toFixed(1));
    }));
    /* the O of "Going": its left stroke is where the camera goes through */
    const gW = measure("G", font);
    const oW = measure("Go", font) - gW;
    const o = { x: pos[0][0] + gW + oW * 0.2, y: base[0] - size * 0.27 };
    layout = { size, o };
  };
  /* each word rises into place on its voice; from 50.2 the push through the O */
  const tPush = 50.2;
  const tPush1 = tPush + 0.46;
  ctx.onFrame((t) => {
    if (t < T.r23 - 0.05 || t > T.r24 + 0.3) return;
    if (!layout) doLayout();
    texts.flat().forEach((w) => {
      const k = ramp(ctx, t, w.t - 0.04, w.t + 0.4, "land");
      w.node.setAttribute("opacity", Math.min(1, k * 1.6).toFixed(3));
      w.node.setAttribute("transform", `translate(0 ${((1 - k) * 60).toFixed(2)})`);
    });
    const p = ramp(ctx, t, tPush, tPush1, "power3.in");
    const s = Math.exp(p * Math.log(70));
    const { o } = layout;
    g.setAttribute("transform", `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)}) scale(${s.toFixed(4)}) translate(${(-o.x).toFixed(2)} ${(-o.y).toFixed(2)})`);
  });

  /* The last ring: it circles the words, with a burst, as "Going" lands. */
  const ringWrap = ctx.el("div", { class: "fill" }, layer);
  layer.insertBefore(ringWrap, svg);
  ringBurst(ctx, ringWrap, { cx: CX, cy: CY + 50, r: 450, t: T.going + 0.04, dots: 12, seed: 23, stroke: 4, color: "#ffffff" });
  tl.fromTo(ringWrap, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.5, duration: 0.36, ease: "power2.in", immediateRender: false }, tPush);
  ringWrap.style.transformOrigin = `${CX}px ${CY}px`;
  showDuring(ctx, ringWrap, [[T.going, tPush + 0.36]]);

  /* The frame fills with warm light, which opens onto the restaurant. */
  const light = ctx.el("div", { class: "fill", style: { background: "radial-gradient(70% 55% at 50% 45%, #fff3e2 0%, #ffd9ae 55%, #ffc48a 100%)", opacity: "0" } }, layer);
  tl.fromTo(light, { opacity: 0 }, { opacity: 1, duration: 0.24, ease: "power1.in", immediateRender: false }, tPush + 0.26);
  tl.fromTo(light, { opacity: 1 }, { opacity: 0, duration: 0.42, ease: "power2.inOut", immediateRender: false }, T.r24 - 0.08);
  showDuring(ctx, svg, [[T.r23 - 0.05, tPush1 + 0.06]]);
  showDuring(ctx, light, [[tPush + 0.26, T.r24 + 0.36]]);

  /* ==================== row 24 ==================== */
  const pL = S.pL;
  const HERO = { cx: L.PHONE_HERO.cx, cy: L.PHONE_HERO.cy, height: L.PHONE_HERO.height };
  const pose = S.pLpose;
  pose.to(T.r24 - 0.3, 0.001, { ...HERO, cy: 2600, rx: 0, ry: 0, opacity: 1 }, "none");
  pose.to(T.r24 - 0.29, 0.58, { ...HERO, ry: -4 }, "glide");                    // rises into the warm light
  pose.to(T.r24 + 0.4, 2.2, { ry: 3 }, "drift");                                  // a slow turn while the card arrives
  pose.to(T.seconds + 0.34, 0.5, { cx: 330, ry: -64, opacity: 0 }, "power2.in");  // turns away
  const page = screenPage(ctx, pL, ctx.src.display("restaurant-light"));
  showDuring(ctx, page.el, [[T.r24 - 0.32, T.r25 + 0.1]]);

  /* The table card: free-standing, beside the phone (BODY_LEFT, clear of the page's text). */
  const cards = ctx.scene("b-m-table", T.r24, T.r25 + 0.1, { z: 20 });
  const q = quadAtPose(pL, HERO);
  const right = q[0].x + 98 * ((q[1].x - q[0].x) / DW) - 4;
  const CWd = Math.round(right - L.BODY_LEFT.x);
  const card = glassCard(ctx, cards, { w: CWd, radius: 30, shadow: "l", style: { display: "flex", flexDirection: "column", gap: "12px", padding: "22px 22px 20px", visibility: "hidden" } });
  const top = ctx.el("div", { style: { display: "flex", alignItems: "center", gap: "14px" } }, card);
  iconPlate(ctx, top, "utensils", { size: 56 });
  ctx.el("div", { text: "Table for 2", style: { font: "600 31px/1.05 Poppins, Inter, sans-serif", letterSpacing: "-0.025em", color: NAVY, whiteSpace: "nowrap" } }, top);
  ctx.el("div", { html: "Tonight, 8:00 PM<br>Harbour Lights Kitchen", style: { font: "500 21px/1.36 Inter, sans-serif", color: INK2, whiteSpace: "nowrap" } }, card);
  const ex = exampleChip(ctx, ctx.el("div", {}, card), { size: 18 });
  const tIn = T.reserve;
  const tStamp = T.table;
  const tOff = T.seconds + 0.2;
  ctx.sfx("pop", tIn);
  ctx.sfx("stamp", tStamp, { offset: -2 });
  tl.fromTo(ex, { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.2, ease: "power4.out", immediateRender: false }, tStamp);
  showDuring(ctx, card, [[tIn, tOff + 0.4]]);
  const Y = 986;
  ctx.onFrame((t) => {
    if (t < tIn || t > tOff + 0.4) return;
    const k = ramp(ctx, t, tIn, tIn + 0.5, "back.out(1.5)");
    const off = ramp(ctx, t, tOff, tOff + 0.36, "power3.in");
    const bob = Math.sin((t - tIn) * 2.1) * 3 * ramp(ctx, t, tIn + 0.5, tIn + 0.9);
    const x = mix(-CWd - 40, L.BODY_LEFT.x, k) - off * 700;
    const y = Y + bob - off * 520;
    card.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${(mix(-6, 0, k) - off * 18).toFixed(2)}deg)`;
    card.style.opacity = String((1 - off * 0.3).toFixed(3));
  });
}
