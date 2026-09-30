/* 13 · Teaser. The orange arch from the onboarding art, a doorway into daylight,
 * and one sentence that runs from the headline into the line under it. */
import { art, grain, page, wordmark } from "../lib/kit.mjs";

export default {
  id: "13",
  file: "13-teaser-something-good.png",
  W: 1080,
  H: 1350,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#021062",
      css: `
      .art{position:absolute;left:-54px;top:-96px;width:1188px;height:1584px;object-fit:cover}
      .glow{position:absolute;left:190px;top:170px;width:700px;height:640px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,150,80,.20),rgba(255,120,40,0));mix-blend-mode:screen}
      .fade{position:absolute;left:0;right:0;bottom:0;height:560px;background:linear-gradient(180deg,rgba(2,12,90,0) 0%,rgba(2,10,80,.55) 55%,rgba(1,6,54,.9) 100%)}
      .copy{position:absolute;left:84px;right:84px;bottom:150px}
      .h{font-size:98px;color:#fff;line-height:1.0}
      .h .serif{font-size:112px;letter-spacing:-0.02em;color:#FFC59A}
      .sub{margin-top:26px;font:500 40px/1.3 Inter;color:rgba(232,240,255,.86);letter-spacing:-0.01em}
      .foot{position:absolute;left:84px;right:84px;bottom:66px;display:flex;align-items:center;justify-content:space-between}
      .soon{font:600 22px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:rgba(200,220,255,.7)}
      `,
      body: `
      <img class="art" src="${art(4)}" alt="">
      <div class="glow"></div>
      <div class="fade"></div>
      ${grain(0.07, "overlay")}
      <div class="copy">
        <div class="h">Something <span class="serif">good</span><br>is coming</div>
        <div class="sub">for anyone looking for a place.</div>
      </div>
      <div class="foot">${wordmark({ theme: "dark", h: 30 })}<span class="soon">Coming soon</span></div>
      `,
    }),
};
