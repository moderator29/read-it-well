/* 28 · Education. "Before you pay rent: inspect first, and pay on Vallo, never
 * to anybody outside it." A warm paper notice, two numbered steps, and one
 * sticker pair that says it without words: a magnifier over a house. */
import { grain, lockup, page, sticker } from "../lib/kit.mjs";

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
        background:rgba(255,107,26,.12);color:#B8440A;font:700 24px/1 Inter;letter-spacing:.005em}
      .step{position:absolute;left:86px;right:86px}
      .num{position:absolute;left:0;top:14px;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;
        background:linear-gradient(145deg,#FF7A2E,#E85A0C);color:#fff;font:700 32px/1 Poppins;box-shadow:0 10px 24px rgba(232,90,12,.35)}
      .t{margin-left:92px;font:700 96px/1.0 Poppins;letter-spacing:-.035em;color:#1A0F08}
      .t2{margin-left:92px;margin-top:6px;font:700 56px/1.06 Poppins;letter-spacing:-.03em;color:#C24A0C}
      .b{margin-left:94px;margin-top:22px;width:760px;font:500 30px/1.42 Inter;color:#5A4638}
      .rule{position:absolute;left:86px;right:86px;top:752px;height:1.5px;background:linear-gradient(90deg,rgba(160,90,40,.25),rgba(160,90,40,.05))}
      .foot{position:absolute;left:86px;right:86px;bottom:80px;display:flex;align-items:center;justify-content:space-between;font:500 23px/1 Inter;color:#7A6456}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.05, "multiply", 7)}
      <div class="edge"></div>
      <div class="abs" style="left:742px;top:96px">${sticker("1f3e1", 236)}</div>
      <div class="abs" style="left:684px;top:226px;transform:rotate(-12deg)">${sticker("1f50d", 170)}</div>
      <div class="eyebrow">Before you pay rent</div>
      <div class="step" style="top:436px">
        <div class="num">1</div>
        <div class="t">Inspect first.</div>
        <div class="b">See the place in person before you agree to anything. Vallo charges no inspection fee.</div>
      </div>
      <div class="rule"></div>
      <div class="step" style="top:812px">
        <div class="num">2</div>
        <div class="t">Pay on Vallo,</div>
        <div class="t2">never to anybody outside it.</div>
        <div class="b">Keep the conversation and the payment inside the app, from the first message to the last.</div>
      </div>
      <div class="foot">${lockup({ theme: "light", h: 26 })}<span>vallospaces.com</span></div>
      `,
    }),
};
