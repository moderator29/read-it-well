/* 14 · "Meet Vallo." Night. A hero post: the app's own icon as the whole
 * product moment, at 600 px (its source is 1024, so nothing is upscaled),
 * centred under the headline with the iOS corner radius and a soft contact
 * shadow scaled with it; the line under the headline is the website's own,
 * "Rent, buy or stay. Without the runaround." A party popper is the post's
 * 3D icon, in slot A. */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
const S = 600;
const X = (W - S) / 2;
const Y = 515;

export default {
  id: "14",
  file: "14-meet-vallo.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Meet <k>Vallo.</k>"], { W, H })}
      ${subline("Rent, buy or stay. Without the runaround.", { W, H, lines: 1 })}
      <div style="position:absolute;left:${X + S * 0.12}px;top:${Y + S * 0.9}px;width:${S * 0.76}px;height:${S * 0.16}px;border-radius:50%;
          background:radial-gradient(closest-side,rgba(0,0,8,.7),rgba(0,0,0,0));filter:blur(14px)"></div>
      <div style="position:absolute;left:${X}px;top:${Y}px;width:${S}px;height:${S}px;border-radius:${Math.round(S * 0.2237)}px;overflow:hidden;
          box-shadow:0 50px 90px -30px rgba(0,0,10,.85), 0 16px 34px -12px rgba(0,0,20,.55)">
        <img src="${u(join(BRAND, "vallo-icon.png"))}" alt="Vallo" style="display:block;width:${S}px;height:${S}px">
      </div>
      ${icon3d("celebrate", { W, H, slot: "A" })}
      `,
    }),
};
