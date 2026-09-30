/* X header, 1500 x 500. The wordmark and "Real estate, done right." sit in
 * the upper left; the lower left stays quiet because X lays the profile photo
 * over it; three phones rise from the bottom-right edge. X crops a little off
 * the top and bottom on some screens, so everything that matters sits in the
 * middle band. */
import { grain, page, phoneHtml, wordmark } from "../lib/kit.mjs";

const PH = { model: "island", color: "black-titanium", fov: 26, shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } };

export default {
  id: "x-banner",
  file: "x-banner-1500x500.png",
  W: 1500,
  H: 500,
  phones: [
    { ...PH, screen: "stays", rotation: { x: 10, y: 14, z: 7 }, h: 570, cx: 950, top: 176 },
    { ...PH, screen: "home", model: "android", color: "silver", rotation: { x: 10, y: 0, z: 0 }, h: 620, cx: 1126, top: 92 },
    { ...PH, screen: "restaurants", rotation: { x: 10, y: -14, z: -7 }, h: 570, cx: 1302, top: 176 },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#02041A",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(40% 90% at 78% 100%, rgba(0,105,254,.55), rgba(0,105,254,0) 70%),
        radial-gradient(30% 70% at 100% 0%, rgba(92,159,255,.18), rgba(92,159,255,0) 70%),
        radial-gradient(26% 60% at 58% 110%, rgba(255,120,50,.22), rgba(255,120,50,0) 70%),
        linear-gradient(180deg,#050A3A 0%,#02041A 100%)}
      .stars{position:absolute;inset:0;background-image:
        radial-gradient(1.3px 1.3px at 8% 18%, rgba(255,255,255,.7), transparent 60%),
        radial-gradient(1.2px 1.2px at 31% 12%, rgba(255,255,255,.55), transparent 60%),
        radial-gradient(1.4px 1.4px at 47% 30%, rgba(255,255,255,.5), transparent 60%),
        radial-gradient(1.2px 1.2px at 56% 10%, rgba(255,255,255,.6), transparent 60%),
        radial-gradient(1.3px 1.3px at 21% 40%, rgba(255,255,255,.45), transparent 60%)}
      .tag{position:absolute;left:96px;top:170px;font-size:57px;color:#fff;line-height:1.02}
      .soon{position:absolute;left:100px;top:258px;font:500 24px/1 Inter;color:rgba(214,226,255,.8);letter-spacing:.005em}
      `,
      body: `
      <div class="ground"></div>
      <div class="stars"></div>
      ${grain(0.06, "overlay")}
      <div class="abs" style="left:96px;top:90px">${wordmark({ theme: "dark", h: 54 })}</div>
      <div class="tag h">Real estate, <span class="accent-d">done right.</span></div>
      <div class="soon">Coming soon on iPhone and Android.</div>
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${phoneHtml(phones[2], { shadowOpacity: 1 })}
      ${phoneHtml(phones[1], { shadowOpacity: 1 })}
      `,
    }),
};
