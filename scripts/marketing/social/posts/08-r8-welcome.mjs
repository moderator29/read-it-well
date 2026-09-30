/* R8 · after IMG_6735: the onboarding as flat cards, staggered, on one
 * clean ground. 1080 x 1350, so Instagram's grid crops no words. Night. The
 * first, second and last welcome cards, whole, at their own resolution's 0.22x, 25 px
 * apart. A handover of keys is the post's 3D icon, in slot A. */
import { join } from "node:path";
import { frame, headline, icon3d } from "../lib/premium.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
const CW = 290;
const CH = Math.round((CW * 2682) / 1320);
const CARDS = [
  { id: "welcome-1", x: 80, y: 500 },
  { id: "welcome-2", x: 395, y: 460 },
  { id: "welcome-4", x: 710, y: 540 },
];

const card = (id, x, y) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${CW}px;height:${CH}px;border-radius:34px;overflow:hidden;
    box-shadow:0 60px 110px -30px rgba(0,0,10,.8), 0 18px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.24)">
    <img src="${u(join(SOURCE, `${id}.webp`))}" alt="" style="display:block;width:${CW}px;height:${CH}px"></div>`;

export default {
  id: "08",
  file: "08-r8-welcome-to-vallo.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Welcome", "to <k>Vallo.</k>"], { W, H })}
            ${CARDS.map((c) => card(c.id, c.x, c.y)).join("")}
      ${icon3d("handover", { W, H, slot: "A" })}
      `,
    }),
};
