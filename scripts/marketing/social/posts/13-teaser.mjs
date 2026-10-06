/* 13 · Teaser. "Something good is coming." Night. A hero post: the brand's
 * own onboarding art, the orange doorway, at its native size in a tall window
 * cut to the same arch (640 x 830, the whole-phone box of the set, right
 * margin), the doorway on the window's axis, the starry sky in its crown and
 * only a strip of velvet ground under the stairs. A gift, the "something
 * good", is the post's 3D icon, in the left column on the window's centre. */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
/* the window: an arch 520 wide, its top a half circle */
const win = { x: 360, y: 440, w: 640, h: 830 };
/* the art (1080 x 1440) at 1.0: the doorway (art x 544) on the window's axis (320), sky from art row 60 */
const art = { s: 1, left: 320 - 544, top: -60 };

export default {
  id: "13",
  file: "13-teaser-something-good.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Something <k>good</k>", "is coming."], { W, H })}
      ${subline("For anyone looking for a place.", { W, H })}
      <div style="position:absolute;left:${win.x}px;top:${win.y}px;width:${win.w}px;height:${win.h}px;border-radius:${win.w / 2}px ${win.w / 2}px 40px 40px;overflow:hidden;
          box-shadow:0 60px 110px -30px rgba(0,0,10,.8), 0 18px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.24)">
        <img src="${u(join(BRAND, "onboarding", "step-4-dark.webp"))}" alt="" style="position:absolute;left:${art.left}px;top:${art.top}px;width:${1080 * art.s}px;height:${1440 * art.s}px">
      </div>
      ${icon3d("gift", { W, H, slot: "B", cy: win.y + win.h / 2 })}
      `,
    }),
};
