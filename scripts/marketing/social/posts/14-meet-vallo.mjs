/* 14 · "Meet Vallo." The brand reveal: the four worlds of the onboarding art
 * as windows around the app icon, a 3D identity icon popping out of each
 * window's corner, then the name in the glass wordmark, ringed by hand. */
import { funCss, obj, ring, sparkles } from "../lib/fun.mjs";
import { art, brand, grain, page, wordmark } from "../lib/kit.mjs";

const TW = 468; // tile width
const TH = 388;
const G = 24; // gap
const X0 = (1080 - TW * 2 - G) / 2;
const Y0 = 64;

/* where each scene's subject sits in its 1080 x 1440 art, to centre the crop */
const TILES = [
  { n: 1, fx: 0.5, fy: 0.37, label: "Homes and stays", icon: "villa" },
  { n: 2, fx: 0.52, fy: 0.37, label: "Checked by a person", icon: "id-check" },
  { n: 3, fx: 0.5, fy: 0.395, label: "Talk to the owner", icon: "local-talks" },
  { n: 4, fx: 0.5, fy: 0.34, label: "Ready when you are", icon: "keys" },
];

function tile(t, i) {
  const x = X0 + (i % 2) * (TW + G);
  const y = Y0 + Math.floor(i / 2) * (TH + G);
  const s = 0.62; // art scale in the tile
  const aw = 1080 * s;
  const ah = 1440 * s;
  const ax = TW / 2 - aw * t.fx;
  const ay = TH / 2 - ah * t.fy;
  return `<div class="tile" style="left:${x}px;top:${y}px">
    <img src="${art(t.n)}" style="position:absolute;left:${ax}px;top:${ay}px;width:${aw}px;height:${ah}px" alt="">
    <div class="shade"></div>
    <div class="cap" style="${i % 2 === 1 ? "left:auto;right:28px" : ""}">${t.label}</div>
  </div>`;
}

/* the icon pops out of each tile's outer corner */
function pop(t, i) {
  const x = X0 + (i % 2) * (TW + G);
  const y = Y0 + Math.floor(i / 2) * (TH + G);
  const left = i % 2 === 0;
  const topRow = i < 2;
  return obj(t.icon, { x: left ? x + 30 : x + TW - 30, y: y + (topRow ? 34 : 44), size: 150, rot: left ? -10 : 10 });
}

export default {
  id: "14",
  file: "14-meet-vallo.png",
  W: 1080,
  H: 1350,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#010118",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 40% at 50% 34%, rgba(0,105,254,.28), rgba(0,105,254,0) 70%),
        linear-gradient(180deg,#030833 0%,#010118 62%)}
      .tile{position:absolute;width:${TW}px;height:${TH}px;border-radius:44px;overflow:hidden;
        box-shadow:0 30px 70px rgba(0,0,12,.55), inset 0 0 0 1px rgba(140,185,255,.18)}
      .tile .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,1,24,0) 55%,rgba(1,4,40,.78) 100%)}
      .tile .cap{position:absolute;left:28px;bottom:24px;font:600 23px/1 Inter;color:rgba(235,242,255,.94);letter-spacing:-.005em}
      .hub{position:absolute;left:${540 - 128}px;top:${Y0 + TH + G / 2 - 128}px;width:256px;height:256px;border-radius:64px;
        background:#010118;box-shadow:0 0 0 14px #010118, 0 0 90px 20px rgba(0,105,254,.55), 0 30px 60px rgba(0,0,0,.6)}
      .hub img{width:256px;height:256px;border-radius:60px;display:block}
      .headline{position:absolute;left:0;right:0;top:${Y0 + TH * 2 + G + 80}px;display:flex;align-items:center;justify-content:center;gap:30px}
      .headline .h{font-size:120px;color:#fff;line-height:1}
      .dot{width:22px;height:22px;border-radius:50%;background:linear-gradient(180deg,#8FD3FF,#0069FE);box-shadow:0 0 18px rgba(0,105,254,.8);align-self:flex-end;margin:0 0 22px -14px}
      .sub{position:absolute;left:90px;right:90px;top:${Y0 + TH * 2 + G + 250}px;text-align:center;font:500 33px/1.4 Inter;color:rgba(222,232,255,.8);letter-spacing:-.01em}
      .foot{position:absolute;left:0;right:0;bottom:50px;text-align:center;font:500 25px/1 Inter;letter-spacing:.01em;color:rgba(170,196,255,.76)}
      `,
      body: `
      <div class="ground"></div>
      ${TILES.map(tile).join("")}
      <div class="hub"><img src="${brand("vallo-icon.png")}" alt=""></div>
      ${TILES.map(pop).join("")}
      ${grain(0.06, "overlay")}
      <div class="headline"><span class="h">Meet</span>${wordmark({ theme: "dark", h: 96, style: "margin-top:6px" })}<span class="dot"></span></div>
      ${ring({ cx: 540, cy: Y0 + TH * 2 + G + 142, rx: 420, ry: 92, color: "#5C9FFF", stroke: 4, rot: -3 })}
      ${sparkles([
        { x: 968, y: 912, s: 34 }, { x: 1004, y: 956, s: 12, kind: "dot", c: "#FFB27A" }, { x: 930, y: 868, s: 16, kind: "dash", rot: -40, c: "#FFB27A" },
        { x: 100, y: 1080, s: 22 }, { x: 128, y: 1120, s: 8, kind: "dot" },
      ])}
      <div class="sub">Homes, hotels, shortlets and restaurants.<br>One app, one account.</div>
      <div class="foot">Coming soon on iPhone and Android.</div>
      `,
    }),
};
