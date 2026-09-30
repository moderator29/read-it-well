/* 13 · Teaser. "Something good is coming." Night. The one picture is the
 * brand's own onboarding art, the orange doorway, shown at its native size in
 * a window cut to the same arch, the doorway on the window's axis and the
 * blue sky, not the near-black top of the art, in the crown. A gift is the
 * post's 3D icon, in the left column. */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
/* the window: an arch 520 wide, its top a half circle */
const win = { x: 480, y: 500, w: 520, h: 760 };
/* the art (1080 x 1440) at 1.0: the doorway (art x 544) on the window's axis */
const art = { s: 1, left: -284, top: -300 };

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
