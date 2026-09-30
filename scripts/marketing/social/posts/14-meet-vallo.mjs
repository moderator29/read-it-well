/* 14 · "Meet Vallo." The brand reveal: the four worlds of the onboarding art
 * as windows around the app icon, then the name in the glass wordmark. */
import { art, brand, grain, page, wordmark } from "../lib/kit.mjs";

const TW = 468; // tile width
const TH = 388;
const G = 24; // gap
const X0 = (1080 - TW * 2 - G) / 2;
const Y0 = 64;

/* where each scene's subject sits in its 1080 x 1440 art, to centre the crop */
const TILES = [
  { n: 1, fx: 0.5, fy: 0.37, label: "Homes and stays" },
  { n: 2, fx: 0.52, fy: 0.37, label: "Checked by a person" },
  { n: 3, fx: 0.5, fy: 0.395, label: "Talk to the owner" },
  { n: 4, fx: 0.5, fy: 0.34, label: "Ready when you are" },
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
    <div class="cap" style="${i === 1 ? "left:auto;right:28px" : ""}">${t.label}</div>
  </div>`;
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
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 40% at 50% 34%, rgba(0,105,254,.28), rgba(0,105,254,0) 70%),
        linear-gradient(180deg,#030833 0%,#010118 62%)}
      .tile{position:absolute;width:${TW}px;height:${TH}px;border-radius:44px;overflow:hidden;
        box-shadow:0 30px 70px rgba(0,0,12,.55), inset 0 0 0 1px rgba(140,185,255,.18)}
      .tile .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(1,1,24,0) 55%,rgba(1,4,40,.72) 100%)}
      .tile .cap{position:absolute;left:28px;bottom:24px;font:600 23px/1 Inter;color:rgba(235,242,255,.92);letter-spacing:-.005em}
      .hub{position:absolute;left:${540 - 128}px;top:${Y0 + TH + G / 2 - 128}px;width:256px;height:256px;border-radius:64px;
        background:#010118;box-shadow:0 0 0 14px #010118, 0 0 90px 20px rgba(0,105,254,.55), 0 30px 60px rgba(0,0,0,.6)}
      .hub img{width:256px;height:256px;border-radius:60px;display:block}
      .headline{position:absolute;left:0;right:0;top:${Y0 + TH * 2 + G + 74}px;display:flex;align-items:center;justify-content:center;gap:30px}
      .headline .h{font-size:124px;color:#fff;line-height:1}
      .sub{position:absolute;left:90px;right:90px;top:${Y0 + TH * 2 + G + 236}px;text-align:center;font:500 33px/1.4 Inter;color:rgba(222,232,255,.78);letter-spacing:-.01em}
      .foot{position:absolute;left:0;right:0;bottom:58px;text-align:center;font:500 25px/1 Inter;letter-spacing:.01em;color:rgba(170,196,255,.72)}
      .dot{width:22px;height:22px;border-radius:50%;background:linear-gradient(180deg,#8FD3FF,#0069FE);box-shadow:0 0 18px rgba(0,105,254,.8);align-self:flex-end;margin:0 0 22px -14px}
      `,
      body: `
      <div class="ground"></div>
      ${TILES.map(tile).join("")}
      <div class="hub"><img src="${brand("vallo-icon.png")}" alt=""></div>
      ${grain(0.06, "overlay")}
      <div class="headline"><span class="h">Meet</span>${wordmark({ theme: "dark", h: 100, style: "margin-top:6px" })}<span class="dot"></span></div>
      <div class="sub">Homes, hotels, shortlets and restaurants.<br>One app, one account.</div>
      <div class="foot">Coming soon on iPhone and Android.</div>
      `,
    }),
};
