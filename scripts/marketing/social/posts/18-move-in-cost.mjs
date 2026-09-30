/* 18 · "See the full move-in cost before you call." The example villa's
 * move-in lines, as the listing shows them, lifted out of the phone as cards
 * and added up to the total. Every amount is on the captured screen. */
import { chip, grain, icon, page, phoneHtml } from "../lib/kit.mjs";

const LINES = [
  { icon: "key-round", label: "Rent", note: "one year", amount: "₦18,000,000" },
  { icon: "user-round", label: "Agency fee", amount: "₦1,800,000" },
  { icon: "scale", label: "Legal fee", amount: "₦1,800,000" },
  { icon: "file-text", label: "Agreement fee", amount: "₦900,000" },
  { icon: "rotate-ccw", label: "Caution deposit", note: "refundable", amount: "₦3,600,000" },
];

const CX = 76; // cards' left
const CW = 590;
const CH = 88;
const GAP = 14;
const TOP = 420;

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
    { screen: "listing-cost", model: "island", color: "black-titanium", rotation: { x: -4, y: -24, z: -6 }, fov: 30, h: 990, cx: 796, top: 318,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.25, color: "#00010F" } },
  ],
  html: ({ W, H, phones }) => {
    const totalTop = TOP + LINES.length * (CH + GAP) + 18;
    return page({
      W,
      H,
      bg: "#020624",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 45% at 85% 60%, rgba(0,105,254,.42), rgba(0,105,254,0) 70%),
        radial-gradient(50% 40% at 0% 0%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#040A36 0%,#020624 100%)}
      .head{position:absolute;left:76px;top:92px;font-size:66px;color:#fff;letter-spacing:-0.035em;line-height:1.06}
      .line{position:absolute;width:${CW}px;height:${CH}px;border-radius:26px;display:flex;align-items:center;gap:20px;padding:0 30px 0 18px;
        background:rgba(10,16,60,.86);border:1.5px solid rgba(120,170,255,.28);
        -webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
        box-shadow:0 24px 60px rgba(0,0,14,.55), inset 0 1px 0 rgba(255,255,255,.06)}
      .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:rgba(92,159,255,.14);border:1px solid rgba(143,211,255,.2);flex:none}
      .lb{flex:1;font:600 27px/1.1 Inter;color:#fff;letter-spacing:-.01em;display:flex;flex-direction:column;gap:5px;white-space:nowrap}
      .lb span{font:500 19px/1 Inter;color:rgba(190,210,255,.66);letter-spacing:0}
      .am{font:700 29px/1 Inter;color:#DCE8FF;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
      .plus{position:absolute;left:${CX - 50}px;width:30px;text-align:center;font:600 30px/1 Inter;color:rgba(143,211,255,.55)}
      .total{position:absolute;left:${CX + 50}px;top:${totalTop}px;width:${CW}px;border-radius:30px;padding:24px 30px 26px;
        background:linear-gradient(135deg,#1C7BFF 0%,#0056D0 100%);border:1.5px solid rgba(170,210,255,.55);
        box-shadow:0 30px 70px rgba(0,40,140,.55), 0 0 60px rgba(0,105,254,.35), inset 0 1px 0 rgba(255,255,255,.25)}
      .total .t1{display:flex;align-items:center;justify-content:space-between;font:600 26px/1 Inter;color:rgba(255,255,255,.92)}
      .total .t2{margin-top:14px;font:800 58px/1 Inter;color:#fff;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
      .eq{position:absolute;left:${CX + 2}px;top:${totalTop + 44}px;font:600 36px/1 Inter;color:rgba(143,211,255,.8)}
      .note{position:absolute;left:${CX + 52}px;top:${totalTop + 172}px;font:500 26px/1.35 Inter;color:rgba(214,226,255,.72)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">See the full move-in cost<br><span class="accent-d">before you call.</span></div>
      ${LINES.map(card).join("")}
      ${LINES.slice(1).map((_, i) => `<div class="plus" style="top:${TOP + (i + 1) * (CH + GAP) + CH / 2 - 16}px;left:${CX - 44 + (i + 1) * 10}px">+</div>`).join("")}
      <div class="eq">=</div>
      <div class="total">
        <div class="t1"><span>Total to move in</span>${chip("Example", { theme: "dark", size: 19, style: "background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.35);color:#fff" })}</div>
        <div class="t2">₦26,100,000</div>
      </div>
      <div class="note">Rent plus every fee, added up.</div>
      `,
    });
  },
};
