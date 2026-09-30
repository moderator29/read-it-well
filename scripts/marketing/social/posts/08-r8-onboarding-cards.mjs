/* R8 · after IMG_6735: the onboarding as flat screens in rounded cards,
 * staggered in columns with more cards running off the edges. Re-imagined at
 * night: navy glass cards on ink, three lit with the welcome screens, and
 * every other card holding one of Vallo's 3D identity icons. */
import { join } from "node:path";
import { funCss, obj, sparkles, titlePill } from "../lib/fun.mjs";
import { grain, page, pill } from "../lib/kit.mjs";
import { BRAND, SOURCE } from "../lib/paths.mjs";
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

/* the icons, in the order the empty cards appear (left to right, top to bottom) */
const ICONS = ["villa", "hotel", "keys", "restaurant", "calendar-booked", "local-talks", "shortlet", "saved-heart", "map", "assistant", "coin", "megaphone", "city", "stay-rated"];

function column({ x, top, screen }, ci, next) {
  const cards = [];
  for (let k = -2; k <= 2; k += 1) {
    const y = top + k * (CH + GAP);
    if (y > 1200 || y + CH < 0) continue;
    const lit = k === 0 && screen;
    let inner = "";
    if (lit) inner = `<img class="scr" src="${u(join(SOURCE, `${screen}.webp`))}" alt="">`;
    else {
      /* the icon sits in the visible part of a card that runs off an edge */
      const vy0 = Math.max(y, 0);
      const vy1 = Math.min(y + CH, 1200);
      const vx0 = Math.max(x - CW / 2, 0);
      const vx1 = Math.min(x + CW / 2, 1600);
      const cy = (vy0 + vy1) / 2 - y;
      const cx = (vx0 + vx1) / 2 - (x - CW / 2);
      const vis = Math.min(vy1 - vy0, vx1 - vx0);
      /* only where the card shows enough of itself; slivers at the edges stay plain */
      if (vx1 - vx0 >= 220 && vy1 - vy0 >= 110) {
        const s = Math.max(100, Math.min(230, vis * 0.7));
        const name = ICONS[next.i % ICONS.length];
        next.i += 1;
        inner = `<img class="ic" src="${u(join(BRAND, "3d", `${name}@2x.webp`))}" alt="" style="left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;transform:rotate(${((next.i * 37) % 17) - 8}deg)">`;
      }
    }
    cards.push(`<div class="card ${lit ? "lit" : ""}" style="left:${x - CW / 2}px;top:${y}px">${inner}</div>`);
  }
  return cards.join("");
}

export default {
  id: "08",
  file: "08-r8-onboarding-cards.png",
  W: 1600,
  H: 1200,
  html: ({ W, H }) => {
    const next = { i: 0 };
    return page({
      W,
      H,
      bg: "#030724",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(50% 55% at 55% 45%, rgba(0,86,208,.30), rgba(0,86,208,0) 70%),
        radial-gradient(40% 40% at 90% 0%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#050A33 0%,#030724 100%)}
      .card{position:absolute;width:${CW}px;height:${CH}px;border-radius:52px;overflow:hidden;
        background:radial-gradient(70% 50% at 50% 45%, rgba(0,105,254,.30), rgba(0,105,254,0) 70%), linear-gradient(180deg,rgba(30,52,150,.40),rgba(12,22,84,.34));
        border:1px solid rgba(120,170,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
      .card.lit{overflow:visible;background:linear-gradient(180deg,rgba(38,66,180,.55),rgba(14,26,96,.55));border-color:rgba(140,185,255,.30);
        box-shadow:0 40px 100px rgba(0,0,20,.6), 0 0 80px rgba(0,105,254,.22), inset 0 1px 0 rgba(255,255,255,.10)}
      .scr{position:absolute;left:${PAD}px;top:${PAD}px;width:${SW}px;height:${SH}px;border-radius:40px;display:block}
      .ic{position:absolute;filter:drop-shadow(0 18px 24px rgba(0,0,20,.55)) drop-shadow(0 0 20px rgba(92,159,255,.28))}
      `,
      body: `
      <div class="ground"></div>
      ${COLS.map((c, i) => column(c, i, next)).join("")}
      ${grain(0.05, "overlay")}
      ${obj("id-check", { x: 562, y: 600, size: 150, rot: 10 })}
      ${obj("coin", { x: 1060, y: 560, size: 110, rot: -16 })}
      ${obj("calendar-booked", { x: 1492, y: 690, size: 150, rot: 8 })}
      ${sparkles([{ x: 330, y: 250, s: 24 }, { x: 1250, y: 980, s: 22, c: "#FFB27A" }, { x: 1280, y: 1010, s: 8, kind: "dot" }])}
      <div class="abs" style="left:44px;top:36px">${titlePill("Get <b>started</b>", { theme: "dark", size: 20, style: "background:rgba(6,12,52,.86)" })}</div>
      <div class="abs" style="right:44px;top:40px">${pill("vallospaces.com", { theme: "dark", size: 19, style: "background:rgba(6,12,52,.86);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      `,
    });
  },
};
