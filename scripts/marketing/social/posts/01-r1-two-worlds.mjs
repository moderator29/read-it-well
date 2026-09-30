/* R1 · after IMG_6727: one straight dark phone, the onboarding's first screen,
 * on a soft dawn ground. The screen's own Property and Stays pills lift off
 * the glass, and Vallo's 3D villa and hotel float out to meet them. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "01",
  file: "01-r1-two-worlds.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-1", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 1060, cx: 540, cy: 748, shadow: { type: "drop", opacity: 0.34, ambientOpacity: 0.16 } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EEF1F8",
      css: `${funCss("light")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(52% 40% at 50% 70%, rgba(255,204,170,.62), rgba(255,204,170,0) 72%),
        radial-gradient(80% 42% at 50% 0%, rgba(197,216,255,.95), rgba(197,216,255,0) 70%),
        radial-gradient(40% 30% at 12% 96%, rgba(255,226,206,.7), rgba(255,226,206,0) 70%),
        linear-gradient(180deg,#E9EEFA 0%,#F1F0F4 52%,#F6EEE8 100%)}
      .halo{position:absolute;left:170px;top:210px;width:740px;height:1040px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,255,255,.75),rgba(255,255,255,0));filter:blur(6px)}
      `,
      body: `
      <div class="ground"></div>
      <div class="halo"></div>
      ${grain(0.05, "soft-light")}
      ${obj("shortlet", { x: 930, y: 330, size: 150, rot: 8, depth: "far", theme: "light" })}
      ${obj("calendar-booked", { x: 130, y: 830, size: 130, rot: -10, depth: "far", theme: "light" })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${await part("pill-property", { x: 150, y: 382, w: 400, rot: -5, theme: "light", radius: 60 })}
      ${await part("pill-stays", { x: 452, y: 836, w: 470, rot: 4, theme: "light", radius: 60 })}
      ${obj("villa", { x: 166, y: 640, size: 230, rot: -6, theme: "light" })}
      ${obj("hotel", { x: 928, y: 1080, size: 230, rot: 5, theme: "light" })}
      ${obj("keys", { x: 118, y: 1210, size: 250, rot: -24, depth: "near", theme: "light" })}
      ${sparkles([
        { x: 760, y: 70, s: 30, c: "#5C9FFF" }, { x: 800, y: 104, s: 14, c: "#FF9A5A" }, { x: 735, y: 112, s: 9, kind: "dot", c: "#5C9FFF" },
        { x: 116, y: 500, s: 22, c: "#0069FE" }, { x: 1010, y: 930, s: 18, c: "#FF9A5A" }, { x: 1030, y: 890, s: 8, kind: "dot", c: "#0069FE" },
      ])}
      <div class="abs" style="left:0;right:0;top:48px;display:flex;justify-content:center">${titlePill("Two worlds, <b>one</b> account", { theme: "light", size: 24 })}</div>
      `,
    }),
};
