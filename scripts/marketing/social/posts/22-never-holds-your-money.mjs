/* 22 · "Vallo never holds your money." Typographic, in daylight: the whole
 * path a payment takes, drawn plainly. You, then a licensed payment
 * processor (Paystack), then the owner's bank. Vallo is not a step in it. */
import { grain, icon, lockup, page, sticker } from "../lib/kit.mjs";

const NODES = [
  { st: "1f64b-1f3fe", title: "You", sub: "pay inside the app" },
  { st: "1f4b3", title: "Paystack", sub: "a licensed payment processor" },
  { st: "1f3db-fe0f", title: "The owner’s bank", sub: "the owner, host or business" },
];

export default {
  id: "22",
  file: "22-never-holds-your-money.png",
  W: 1080,
  H: 1080,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#F3F6FD",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 45% at 100% 0%, rgba(92,159,255,.22), rgba(92,159,255,0) 70%),
        radial-gradient(45% 40% at 0% 100%, rgba(255,178,122,.20), rgba(255,178,122,0) 70%),
        linear-gradient(180deg,#F7F9FE 0%,#EEF2FB 100%)}
      .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(2,6,63,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(2,6,63,.035) 1px,transparent 1px);background-size:54px 54px;
        -webkit-mask-image:radial-gradient(70% 60% at 50% 55%,#000 30%,transparent 80%)}
      .head{position:absolute;left:78px;top:92px;font-size:92px;color:#070B2A;line-height:1.02}
      .flow{position:absolute;left:60px;right:60px;top:452px;display:flex;align-items:stretch;justify-content:space-between}
      .node{width:270px;border-radius:34px;background:#fff;padding:30px 24px 30px;text-align:center;
        box-shadow:0 30px 70px rgba(20,30,90,.12), 0 6px 18px rgba(20,30,90,.06);border:1px solid rgba(2,6,63,.06)}
      .node .st{display:grid;place-items:center;height:112px}
      .node .t{margin-top:14px;font:700 31px/1.1 Poppins;letter-spacing:-.02em;color:#070B2A}
      .node .s{margin-top:10px;font:500 21px/1.3 Inter;color:#5A6180}
      .node.mid{background:linear-gradient(180deg,#FFFFFF,#F4F8FF);border-color:rgba(0,105,254,.18)}
      .arrow{flex:1;display:flex;align-items:center;justify-content:center;position:relative}
      .arrow .ln{position:absolute;left:6px;right:18px;top:50%;height:0;border-top:3px dashed rgba(0,105,254,.55)}
      .arrow .hd{position:relative;left:22px;color:#0069FE}
      .note{position:absolute;left:78px;right:78px;top:846px;font:500 30px/1.4 Inter;color:#3B4262;letter-spacing:-.01em}
      .note b{color:#070B2A;font-weight:650}
      .foot{position:absolute;left:78px;right:78px;bottom:52px;display:flex;align-items:center;justify-content:space-between;font:500 22px/1 Inter;color:#5A6079}
      `,
      body: `
      <div class="ground"></div>
      <div class="grid"></div>
      ${grain(0.04, "soft-light")}
      <div class="head h">Vallo never holds<br><span class="accent-l">your money.</span></div>
      <div class="flow">
        ${NODES.map((n, i) => `${i ? `<div class="arrow"><div class="ln"></div><div class="hd">${icon("chevron-right", { size: 34, color: "#0069FE", stroke: 3 })}</div></div>` : ""}
          <div class="node ${i === 1 ? "mid" : ""}"><div class="st">${sticker(n.st, 112)}</div><div class="t">${n.title}</div><div class="s">${n.sub}</div></div>`).join("")}
      </div>
      <div class="note">Your payment goes <b>straight to the owner, the host or the business</b>, through a licensed payment processor.</div>
      <div class="foot">${lockup({ theme: "light", h: 26 })}<span>vallospaces.com</span></div>
      `,
    }),
};
