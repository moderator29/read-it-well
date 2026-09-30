/* 24 · "Vallo speaks your language." A poster in the brand's electric blue:
 * the first welcome screen in English, Hausa, Yorùbá and Igbo, side by side,
 * each with its headline set large enough to read in a feed. Every
 * non-English word here is the product's own string (packages/i18n), set in
 * Inter, the face the product uses for the Hausa hooked letters and the
 * Yorùbá and Igbo dotted vowels. */
import { grain, page, phoneHtml } from "../lib/kit.mjs";

const LANGS = [
  { name: "English", screen: "welcome-1", a: "Two worlds.", b: "One platform." },
  { name: "Hausa", screen: "welcome-ha", a: "Duniya biyu.", b: "Dandali ɗaya." },
  { name: "Yorùbá", screen: "welcome-yo", a: "Ayé méjì.", b: "Pèpéle kan." },
  { name: "Igbo", screen: "welcome-ig", a: "Ụwa abụọ.", b: "Otu ikpo okwu." },
];
const PW = 234; // phone outline width
const GAP = 16;
const X0 = (1080 - PW * 4 - GAP * 3) / 2;
const TOP = 350;

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
      .say{position:absolute;width:${PW + 12}px;text-align:center;font:700 25px/1.18 Inter;letter-spacing:-.02em;color:#fff}
      .say span{display:block;color:#BFE6FF}
      .head{position:absolute;left:0;right:0;top:92px;text-align:center;font-size:78px;color:#fff;line-height:1.04}
      .label{position:absolute;top:${TOP - 58}px;width:${PW}px;text-align:center;font:600 27px/1 Poppins;letter-spacing:-.01em;color:#fff}
      .cap{position:absolute;left:0;right:0;bottom:58px;text-align:center;font:500 27px/1.4 Inter;color:rgba(235,244,255,.9)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      <div class="head h">Vallo speaks<br>your language.</div>
      ${LANGS.map((l, i) => `<div class="label" style="left:${X0 + i * (PW + GAP)}px">${l.name}</div>`).join("")}
      ${phones.map((p) => phoneHtml(p, { shadowOpacity: 1 })).join("")}
      ${LANGS.map((l, i) => `<div class="say" style="left:${X0 + i * (PW + GAP) - 6}px;top:${Math.round(phones[i].box.y + phones[i].box.h + 26)}px">${l.a}<span>${l.b}</span></div>`).join("")}
      <div class="cap">Switch at any time. The assistant answers in all four.</div>
      `,
    }),
};
