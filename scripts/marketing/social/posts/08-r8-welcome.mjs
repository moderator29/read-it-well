/* R8 · after IMG_6735: the onboarding as flat screens in rounded cards,
 * staggered, on one clean ground. Night. The first three welcome cards, shown
 * flat at their own resolution; the headline and a handover of keys hold the
 * left column. */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1600;
const H = 1200;
const CW = 300;
const CH = Math.round((CW * 2682) / 1320);
const CARDS = [
  { id: "welcome-1", x: 600, y: 330 },
  { id: "welcome-2", x: 920, y: 190 },
  { id: "welcome-3", x: 1240, y: 420 },
];

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
      ${CARDS.map((c) => `<div style="position:absolute;left:${c.x}px;top:${c.y}px;width:${CW}px;height:${CH}px;border-radius:40px;overflow:hidden;
          box-shadow:0 60px 110px -30px rgba(0,0,10,.8), 0 18px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.24)">
          <img src="${u(join(SOURCE, `${c.id}.webp`))}" alt="" style="display:block;width:${CW}px;height:${CH}px"></div>`).join("")}
      ${icon3d("handover", { x: 250, y: 820, size: 230, ground: "night" })}
      `,
    }),
};
