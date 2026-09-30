/* 18 · "See the full move-in cost before you call." The example villa's
 * move-in lines, as the listing shows them, lifted out of the phone as cards,
 * and the listing's own move-in total card popping off the glass below them.
 * Keys, a coin and a price tag float in depth. Every amount is on the
 * captured screen. */
import { funCss, obj, sparkles, squiggle } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, icon, page, phoneHtml } from "../lib/kit.mjs";

const LINES = [
  { icon: "key-round", label: "Rent", note: "one year", amount: "₦18,000,000" },
  { icon: "user-round", label: "Agency fee", amount: "₦1,800,000" },
  { icon: "scale", label: "Legal fee", amount: "₦1,800,000" },
  { icon: "file-text", label: "Agreement fee", amount: "₦900,000" },
  { icon: "rotate-ccw", label: "Caution deposit", note: "refundable", amount: "₦3,600,000" },
];

const CX = 76; // cards' left
const CW = 560;
const CH = 84;
const GAP = 12;
const TOP = 372;

function card(l, i) {
  const y = TOP + i * (CH + GAP);
  const x = CX + i * 10;
  return `<div class="line" style="left:${x}px;top:${y}px">
    <div class="ic">${icon(l.icon, { size: 26, color: "#8FD3FF", stroke: 2 })}</div>
    <div class="lb">${l.label}${l.note ? `<span>${l.note}</span>` : ""}</div>
    <div class="am">${l.amount}</div>
  </div>`;
}

export default {
  id: "18",
  file: "18-move-in-cost.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "listing-cost", model: "island", color: "black-titanium", rotation: { x: -4, y: -24, z: -6 }, fov: 30, h: 990, cx: 820, top: 330,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.25, color: "#00010F" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#020624",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 45% at 85% 60%, rgba(0,105,254,.42), rgba(0,105,254,0) 70%),
        radial-gradient(50% 40% at 0% 0%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#040A36 0%,#020624 100%)}
      .head{position:absolute;left:76px;top:88px;font-size:66px;color:#fff;letter-spacing:-0.035em;line-height:1.06}
      .line{position:absolute;width:${CW}px;height:${CH}px;border-radius:24px;display:flex;align-items:center;gap:18px;padding:0 28px 0 16px;
        background:rgba(10,16,60,.9);border:1.5px solid rgba(120,170,255,.28);
        -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
        box-shadow:0 24px 60px rgba(0,0,14,.55), inset 0 1px 0 rgba(255,255,255,.06)}
      .ic{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:rgba(92,159,255,.14);border:1px solid rgba(143,211,255,.2);flex:none}
      .lb{flex:1;font:600 27px/1.1 Inter;color:#fff;letter-spacing:-.01em;display:flex;flex-direction:column;gap:5px;white-space:nowrap}
      .lb span{font:500 19px/1 Inter;color:rgba(190,210,255,.72);letter-spacing:0}
      .am{font:700 29px/1 Inter;color:#DCE8FF;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
      .plus{position:absolute;width:30px;text-align:center;font:600 30px/1 Inter;color:rgba(160,215,255,.85)}
      .eq{position:absolute;left:${CX + 4}px;font:600 36px/1 Inter;color:rgba(160,215,255,.9)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${obj("contract", { x: 1000, y: 250, size: 150, rot: 12, depth: "far" })}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">See the full move-in cost<br><span class="accent-d">before you call.</span></div>
      ${squiggle({ x: 78, y: 244, w: 470, loops: 9, amp: 15, color: "#FF8A3D", stroke: 5, rot: -1.5 })}
      ${LINES.map(card).join("")}
      ${LINES.slice(1).map((_, i) => `<div class="plus" style="top:${TOP + (i + 1) * (CH + GAP) + CH / 2 - 16}px;left:${CX - 44 + (i + 1) * 10}px">+</div>`).join("")}
      <div class="eq" style="top:${TOP + 5 * (CH + GAP) + 110}px">=</div>
      ${await part("move-in-card", { x: CX + 46, y: TOP + 5 * (CH + GAP) + 18, w: 590, rot: -2, theme: "dark", radius: 30 })}
      ${obj("keys", { x: 960, y: 1230, size: 240, rot: 24, depth: "near" })}
      ${obj("price-tag", { x: 700, y: 340, size: 150, rot: 14 })}
      ${sparkles([{ x: 900, y: 84, s: 26 }, { x: 930, y: 118, s: 10, kind: "dot", c: "#FFB27A" }, { x: 40, y: 1280, s: 18, c: "#FFB27A" }])}
      `,
    }),
};
