/* 13 · Teaser. The orange arch from the onboarding art, a doorway into
 * daylight; keys to it hang in the night air, and a 3D gift, ringed and
 * sparkling, stands for the "something good" of the headline. */
import { funCss, obj, ring, sparkles } from "../lib/fun.mjs";
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
      css: `${funCss("dark")}
      .art{position:absolute;left:-54px;top:-96px;width:1188px;height:1584px;object-fit:cover}
      .glow{position:absolute;left:190px;top:170px;width:700px;height:640px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,150,80,.20),rgba(255,120,40,0));mix-blend-mode:screen}
      .fade{position:absolute;left:0;right:0;bottom:0;height:600px;background:linear-gradient(180deg,rgba(2,12,90,0) 0%,rgba(2,10,80,.6) 50%,rgba(1,6,54,.94) 100%)}
      .copy{position:absolute;left:84px;right:84px;bottom:150px}
      .h{font-size:98px;color:#fff;line-height:1.0}
      .h .serif{font-size:116px;letter-spacing:-0.02em;color:#FFC59A}
      .sub{margin-top:26px;font:500 40px/1.3 Inter;color:rgba(232,240,255,.88);letter-spacing:-0.01em}
      .foot{position:absolute;left:84px;right:84px;bottom:66px;display:flex;align-items:center;justify-content:space-between}
      .soon{font:600 22px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:rgba(200,220,255,.74)}
      `,
      body: `
      <img class="art" src="${art(4)}" alt="">
      <div class="glow"></div>
      <div class="fade"></div>
      ${grain(0.07, "overlay")}
      ${obj("keys", { x: 820, y: 560, size: 170, rot: 18 })}
      ${obj("gift", { x: 936, y: 930, size: 220, rot: 10 })}
      <div class="copy">
        <div class="h">Something <span class="serif">good</span><br>is coming</div>
        <div class="sub">for anyone looking for a place.</div>
      </div>
      ${ring({ cx: 724, cy: 976, rx: 120, ry: 62, color: "#FFB27A", stroke: 4.5, rot: -6 })}
      ${sparkles([
        { x: 836, y: 856, s: 34, c: "#FFD2B0" }, { x: 862, y: 896, s: 12, kind: "dot", c: "#8FD3FF" }, { x: 596, y: 902, s: 18, c: "#8FD3FF" },
        { x: 980, y: 1080, s: 16, kind: "dash", rot: -30, c: "#FFB27A" }, { x: 760, y: 470, s: 20, c: "#FFD2B0" },
      ])}
      <div class="foot">${wordmark({ theme: "dark", h: 30 })}<span class="soon">Coming soon</span></div>
      `,
    }),
};
