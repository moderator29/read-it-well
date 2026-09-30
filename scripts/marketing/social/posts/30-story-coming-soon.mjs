/* 30 · Story. "Coming soon on iPhone and Android." Two handsets, the island
 * phone and the Android, lean together over rings that pulse out like a
 * countdown; a stopwatch keeps time. No store badges and no maker's logos. */
import { grain, lockup, page, phoneHtml, sticker } from "../lib/kit.mjs";

const CX = 540;
const CY = 1210;

export default {
  id: "30",
  file: "30-story-coming-soon.png",
  W: 1080,
  H: 1920,
  phones: [
    { screen: "welcome-1", model: "island", color: "black-titanium", rotation: { x: -4, y: 20, z: -7 }, fov: 28, h: 900, cx: 382, cy: 1230,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } },
    { screen: "welcome-4", model: "android", color: "silver", rotation: { x: -4, y: -20, z: 7 }, fov: 28, h: 900, cx: 700, cy: 1190,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#02041A",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 30% at 50% 64%, rgba(0,105,254,.45), rgba(0,105,254,0) 72%),
        radial-gradient(70% 30% at 50% 0%, rgba(92,159,255,.20), rgba(92,159,255,0) 70%),
        radial-gradient(40% 20% at 50% 100%, rgba(255,120,50,.18), rgba(255,120,50,0) 70%),
        linear-gradient(180deg,#050A3A 0%,#02041A 60%,#030522 100%)}
      .ring{position:absolute;border-radius:50%;border:1.5px solid rgba(143,211,255,var(--a));left:${CX}px;top:${CY}px;transform:translate(-50%,-50%)}
      .top{position:absolute;left:0;right:0;top:170px;display:flex;justify-content:center}
      .head{position:absolute;left:0;right:0;top:306px;text-align:center;font-size:138px;color:#fff;line-height:.98}
      .sub{position:absolute;left:0;right:0;top:470px;text-align:center;font:600 56px/1.1 Poppins;letter-spacing:-.03em}
      .url{position:absolute;left:0;right:0;top:1712px;text-align:center;font:600 30px/1 Inter;color:rgba(214,226,255,.82);letter-spacing:.01em}
      `,
      body: `
      <div class="ground"></div>
      ${[260, 380, 500, 620, 740, 860].map((r, i) => `<div class="ring" style="width:${r * 2}px;height:${r * 2}px;--a:${(0.34 - i * 0.05).toFixed(2)}"></div>`).join("")}
      ${grain(0.06, "overlay")}
      <div class="top">${lockup({ theme: "dark", h: 34 })}</div>
      <div class="head h">Coming soon</div>
      <div class="sub accent-d">on iPhone and Android.</div>
      <div class="abs" style="left:${CX - 96}px;top:${580}px">${sticker("23f1-fe0f", 192)}</div>
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${phoneHtml(phones[1], { shadowOpacity: 1 })}
      <div class="url">vallospaces.com</div>
      `,
    }),
};
