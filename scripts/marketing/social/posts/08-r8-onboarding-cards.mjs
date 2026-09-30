/* R8 · after IMG_6735: the onboarding as flat screens in rounded cards,
 * staggered in columns with empty cards running off the edges. Re-imagined
 * at night: navy glass cards on ink, the three screens lit from within. */
import { join } from "node:path";
import { grain, page, pill } from "../lib/kit.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const CW = 420; // card width
const PAD = 14;
const SW = CW - PAD * 2; // screen width
const SH = Math.round((SW * 2682) / 1320);
const CH = SH + PAD * 2; // card height
const GAP = 44;

/* column centre x, the top of its lit card, and which screen */
const COLS = [
  { x: 800 - (CW + 56) * 2, top: 170, screen: null },
  { x: 800 - (CW + 56), top: 262, screen: "welcome-2" },
  { x: 800, top: 150, screen: "welcome-3" },
  { x: 800 + (CW + 56), top: 92, screen: "welcome-4" },
  { x: 800 + (CW + 56) * 2, top: 210, screen: null },
];

function column({ x, top, screen }) {
  const cards = [];
  for (let k = -2; k <= 2; k += 1) {
    const y = top + k * (CH + GAP);
    if (y > 1200 || y + CH < 0) continue;
    const lit = k === 0 && screen;
    cards.push(`<div class="card ${lit ? "lit" : ""}" style="left:${x - CW / 2}px;top:${y}px">
      ${lit ? `<img class="scr" src="${u(join(SOURCE, `${screen}.webp`))}" alt="">` : ""}</div>`);
  }
  return cards.join("");
}

export default {
  id: "08",
  file: "08-r8-onboarding-cards.png",
  W: 1600,
  H: 1200,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#030724",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 55% at 55% 45%, rgba(0,86,208,.30), rgba(0,86,208,0) 70%),
        radial-gradient(40% 40% at 90% 0%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#050A33 0%,#030724 100%)}
      .card{position:absolute;width:${CW}px;height:${CH}px;border-radius:52px;
        background:linear-gradient(180deg,rgba(30,52,150,.34),rgba(12,22,84,.30));
        border:1px solid rgba(120,170,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
      .card.lit{background:linear-gradient(180deg,rgba(38,66,180,.55),rgba(14,26,96,.55));border-color:rgba(140,185,255,.30);
        box-shadow:0 40px 100px rgba(0,0,20,.6), 0 0 80px rgba(0,105,254,.22), inset 0 1px 0 rgba(255,255,255,.10)}
      .scr{position:absolute;left:${PAD}px;top:${PAD}px;width:${SW}px;height:${SH}px;border-radius:40px;display:block}
      `,
      body: `
      <div class="ground"></div>
      ${COLS.map(column).join("")}
      ${grain(0.05, "overlay")}
      <div class="abs" style="left:44px;top:36px">${pill("Get started", { theme: "dark", size: 19, style: "background:rgba(6,12,52,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      <div class="abs" style="right:44px;top:36px">${pill("vallospaces.com", { theme: "dark", size: 19, style: "background:rgba(6,12,52,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      `,
    }),
};
