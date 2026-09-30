/* 28 · Education. "Before you pay rent: inspect first, and pay on Vallo, never
 * to anybody outside it." A warm paper notice, two numbered steps, and one
 * sticker pair that says it without words: a magnifier over a house.
 * "Vallo charges no inspection fee." is an approved claim (DESIGN.md, the
 * founder, and the live landing page), set as its own badge so it reads at a
 * glance. It speaks only for Vallo's own charges. */
import { grain, icon, lockup, page, sticker } from "../lib/kit.mjs";

export default {
  id: "28",
  file: "28-before-you-pay-rent.png",
  W: 1080,
  H: 1350,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#FFF6EC",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(40% 32% at 84% 16%, rgba(255,178,122,.55), rgba(255,178,122,0) 70%),
        radial-gradient(50% 40% at 0% 100%, rgba(255,214,190,.6), rgba(255,214,190,0) 70%),
        linear-gradient(180deg,#FFF9F2 0%,#FDF0E4 100%)}
      .edge{position:absolute;inset:34px;border-radius:44px;border:1.5px solid rgba(160,90,40,.14)}
      .eyebrow{position:absolute;left:86px;top:104px;display:inline-flex;align-items:center;height:52px;padding:0 24px;border-radius:999px;
        background:rgba(255,107,26,.12);color:#A33A06;font:700 24px/1 Inter;letter-spacing:.005em}
      .step{position:absolute;left:86px;right:86px}
      .num{position:absolute;left:0;top:14px;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;
        background:linear-gradient(145deg,#C24A0C,#A8380A);color:#fff;font:700 32px/1 Poppins;box-shadow:0 10px 24px rgba(194,74,12,.32)}
      .t{margin-left:92px;font:700 96px/1.0 Poppins;letter-spacing:-.035em;color:#1A0F08}
      .t2{margin-left:92px;margin-top:6px;font:700 56px/1.06 Poppins;letter-spacing:-.03em;color:#A83E08}
      .b{margin-left:94px;margin-top:22px;width:760px;font:500 30px/1.42 Inter;color:#5A4638}
      .fee{margin-left:92px;margin-top:22px;display:inline-flex;align-items:center;gap:14px;height:64px;padding:0 28px 0 18px;border-radius:20px;
        background:linear-gradient(135deg,#C24A0C,#A8380A);color:#fff;font:700 29px/1 Inter;letter-spacing:-.01em;white-space:nowrap;
        box-shadow:0 16px 36px rgba(168,56,10,.28), inset 0 1px 0 rgba(255,255,255,.18)}
      .rule{position:absolute;left:86px;right:86px;top:780px;height:1.5px;background:linear-gradient(90deg,rgba(160,90,40,.25),rgba(160,90,40,.05))}
      .foot{position:absolute;left:86px;right:86px;bottom:80px;display:flex;align-items:center;justify-content:space-between;font:500 23px/1 Inter;color:#7A6456}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.05, "multiply", 7)}
      <div class="edge"></div>
      <div class="abs" style="left:770px;top:104px">${sticker("1f3e1", 208)}</div>
      <div class="abs" style="left:716px;top:222px;transform:rotate(-12deg)">${sticker("1f50d", 150)}</div>
      <div class="eyebrow">Before you pay rent</div>
      <div class="step" style="top:414px">
        <div class="num">1</div>
        <div class="t">Inspect first.</div>
        <div class="b">See the place in person before you agree to anything.</div>
        <div class="fee">${icon("badge-check", { size: 30, color: "#FFFFFF", stroke: 2.2 })}Vallo charges no inspection fee.</div>
      </div>
      <div class="rule"></div>
      <div class="step" style="top:832px">
        <div class="num">2</div>
        <div class="t">Pay on Vallo,</div>
        <div class="t2">never to anybody outside it.</div>
        <div class="b">Keep the conversation and the payment inside the app, from the first message to the last.</div>
      </div>
      <div class="foot">${lockup({ theme: "light", h: 26 })}<span>vallospaces.com</span></div>
      `,
    }),
};
