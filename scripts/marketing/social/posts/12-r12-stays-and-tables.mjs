/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other, on a blue-violet gradient. Stays on the left, a restaurant on the
 * right. Each screen's own price or opening chip lifts off beside it, and
 * Vallo's 3D hotel, shortlet and restaurant drift around them. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "12",
  file: "12-r12-stays-and-tables.png",
  W: 1600,
  H: 1200,
  phones: [
    { screen: "stays", model: "island", color: "black-titanium", rotation: { x: -14, y: 26, z: 17 }, fov: 26, h: 880, cx: 660, cy: 530,
      shadow: { type: "drop", opacity: 0.32, ambientOpacity: 0.14, color: "#1A0C66", offset: { x: 30, y: 60 }, blur: 60 } },
    { screen: "restaurant", model: "island", color: "black-titanium", rotation: { x: -18, y: -26, z: -8 }, fov: 26, h: 880, cx: 1030, cy: 680,
      shadow: { type: "drop", opacity: 0.34, ambientOpacity: 0.16, color: "#1A0C66", offset: { x: 20, y: 70 }, blur: 60 } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#6F7BFF",
      css: `${funCss("light")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(45% 55% at 32% 55%, rgba(236,238,255,.95), rgba(236,238,255,0) 70%),
        radial-gradient(50% 60% at 0% 0%, rgba(46,92,255,.9), rgba(46,92,255,0) 70%),
        radial-gradient(55% 60% at 100% 100%, rgba(122,76,255,.95), rgba(122,76,255,0) 70%),
        radial-gradient(40% 50% at 100% 10%, rgba(150,140,255,.8), rgba(150,140,255,0) 70%),
        linear-gradient(135deg,#4E6BFF 0%,#A7B0FF 45%,#8B6CFF 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "soft-light")}
      ${obj("stay-rated", { x: 1390, y: 250, size: 180, rot: 10, depth: "far", theme: "light" })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${phoneHtml(phones[1], { shadowOpacity: 0.9 })}
      ${await part("stays-hotels", { x: 150, y: 640, w: 250, rot: -8, theme: "dark", radius: 30 })}
      ${await part("opens-chip", { x: 1200, y: 540, w: 300, rot: 6, theme: "dark", radius: 30 })}
      ${obj("hotel", { x: 250, y: 330, size: 240, rot: -8, theme: "light" })}
      ${obj("restaurant", { x: 1370, y: 820, size: 240, rot: 8, theme: "light" })}
      ${obj("calendar-booked", { x: 840, y: 150, size: 170, rot: 10, theme: "light" })}
      ${obj("shortlet", { x: 150, y: 1060, size: 230, rot: -10, depth: "near", theme: "light" })}
      ${sparkles([{ x: 420, y: 170, s: 30, c: "#FFFFFF" }, { x: 450, y: 210, s: 10, kind: "dot", c: "#FFB27A" }, { x: 1500, y: 640, s: 20, c: "#FFFFFF" }, { x: 760, y: 1110, s: 18, c: "#FFB27A" }])}
      <div class="abs" style="left:56px;top:48px">${titlePill("Stays and <b>tables</b>", { theme: "light", size: 22 })}</div>
      `,
    }),
};
