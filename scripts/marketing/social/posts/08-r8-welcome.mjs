/* R8 · after IMG_6735: the onboarding as a wall of flat cards, staggered in
 * three columns that run off the foot. 1080 x 1350, so Instagram's grid crops
 * no words. Night. The welcome cards below their own resolution (0.22x): the
 * first three slides, each column running on into the first slide in Hausa,
 * Yorùbá and Igbo, whose foot is cut only through the illustration, never
 * through a line of text. A handover of keys is the post's 3D icon. */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
const CW = 290;
const CH = Math.round((CW * 2682) / 1320);
const GAP = 25;
const COLS = [
  { x: 80, top: 486, ids: ["welcome-1", "welcome-ha"] },
  { x: 80 + CW + GAP, top: 566, ids: ["welcome-2", "welcome-yo"] },
  { x: 80 + 2 * (CW + GAP), top: 526, ids: ["welcome-3", "welcome-ig"] },
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
      ${subline("Homes, stays and tables.", { W, H })}
      ${COLS.map((c) => c.ids.map((id, i) => card(id, c.x, c.top + i * (CH + GAP))).join("")).join("")}
      ${icon3d("handover", { W, H, slot: "A" })}
      `,
    }),
};
