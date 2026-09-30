/* R4 · after IMG_6731: a steep, top-down close-up of the phone's lower half,
 * the move-in breakdown running big across the glass. The listing's own
 * move-in total card lifts off into the empty corner, keys and a coin float
 * in depth, and the title pill names the idea. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "04",
  file: "04-r4-move-in-closeup.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "listing-cost", model: "island", color: "black-titanium", rotation: { x: -36, y: -15, z: -14 }, fov: 52, w: 940, cx: 600, bottom: 1182,
      shadow: { type: "drop", opacity: 0.36, ambientOpacity: 0.2 } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EDF1FA",
      css: `${funCss("light")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(70% 50% at 70% 20%, rgba(255,255,255,.95), rgba(255,255,255,0) 70%),
        radial-gradient(60% 40% at 10% 100%, rgba(203,220,255,.9), rgba(203,220,255,0) 70%),
        linear-gradient(170deg,#F4F7FD 0%,#E9EFFB 60%,#E1E9FA 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.045, "soft-light")}
      ${obj("contract", { x: 150, y: 720, size: 150, rot: -12, depth: "far", theme: "light" })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.85 })}
      ${await part("move-in-card", { x: 24, y: 96, w: 430, rot: -7, theme: "dark", radius: 30 })}
      ${obj("keys", { x: 104, y: 1030, size: 230, rot: -30, theme: "light" })}
      ${obj("coin", { x: 110, y: 470, size: 110, rot: 18, theme: "light" })}
      ${obj("coin", { x: 236, y: 540, size: 72, rot: -20, depth: "far", theme: "light" })}
      ${obj("price-tag", { x: 1000, y: 1250, size: 200, rot: 16, depth: "near", theme: "light" })}
      ${sparkles([{ x: 470, y: 70, s: 26, c: "#0069FE" }, { x: 500, y: 104, s: 10, kind: "dot", c: "#FF9A5A" }, { x: 40, y: 430, s: 18, c: "#FF9A5A" }])}
      <div class="abs" style="left:56px;top:1262px">${titlePill("The full cost, <b>up front</b>", { theme: "light", size: 22 })}</div>
      `,
    }),
};
