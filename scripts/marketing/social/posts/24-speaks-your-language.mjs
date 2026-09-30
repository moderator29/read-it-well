/* 24 · "Vallo speaks your language." A poster in the brand's electric blue:
 * the first welcome screen in English, Hausa, Yorùbá and Igbo, side by side,
 * over the product's own translations of its headline set large and faint.
 * Every non-English word here is the product's string (packages/i18n). */
import { grain, page, phoneHtml } from "../lib/kit.mjs";
import { u } from "../lib/render.mjs";

const LANGS = [
  { name: "English", screen: "welcome-1", a: "Two worlds.", b: "One platform." },
  { name: "Hausa", screen: "welcome-ha", a: "Duniya biyu.", b: "Dandali ɗaya." },
  { name: "Yorùbá", screen: "welcome-yo", a: "Ayé méjì.", b: "Pèpéle kan." },
  { name: "Igbo", screen: "welcome-ig", a: "Ụwa abụọ.", b: "Otu ikpo okwu." },
];
const PW = 234; // phone outline width
const GAP = 16;
const X0 = (1080 - PW * 4 - GAP * 3) / 2;
const TOP = 372;

export default {
  id: "24",
  file: "24-speaks-your-language.png",
  W: 1080,
  H: 1080,
  phones: LANGS.map((l, i) => ({
    screen: l.screen, model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, w: PW, left: X0 + i * (PW + GAP), top: TOP,
    shadow: { type: "drop", opacity: 0.45, ambientOpacity: 0.25, color: "#001040" },
  })),
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#0062F0",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 50% at 50% 0%, rgba(143,211,255,.45), rgba(143,211,255,0) 70%),
        radial-gradient(70% 50% at 50% 100%, rgba(0,30,120,.55), rgba(0,30,120,0) 70%),
        linear-gradient(180deg,#1A78FF 0%,#0062F0 45%,#004BC4 100%)}
      .refl{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 var(--floor);transform:scaleY(-.62);opacity:.2;
        -webkit-mask-image:linear-gradient(0deg,#000 calc(${H}px - var(--floor) - 10px),transparent calc(${H}px - var(--floor) + 120px));filter:blur(1px)}
      .floor{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.35),rgba(255,255,255,0))}
      .head{position:absolute;left:0;right:0;top:92px;text-align:center;font-size:78px;color:#fff;line-height:1.04}
      .label{position:absolute;top:${TOP - 58}px;width:${PW}px;text-align:center;font:600 27px/1 Poppins;letter-spacing:-.01em;color:#fff}
      .cap{position:absolute;left:0;right:0;bottom:62px;text-align:center;font:500 27px/1.4 Inter;color:rgba(235,244,255,.9)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      <div class="head h">Vallo speaks<br>your language.</div>
      ${LANGS.map((l, i) => `<div class="label" style="left:${X0 + i * (PW + GAP)}px">${l.name}</div>`).join("")}
      ${phones.map((p) => `<img class="refl" style="--floor:${Math.round(p.box.y + p.box.h)}px" src="${u(p.src)}" alt="">`).join("")}
      <div class="floor" style="top:${Math.round(phones[0].box.y + phones[0].box.h)}px"></div>
      ${phones.map((p) => phoneHtml(p, { shadowOpacity: 1 })).join("")}
      <div class="cap">Switch at any time. The assistant answers in all four.</div>
      `,
    }),
};
