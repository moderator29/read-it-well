/* 14 · "Meet Vallo." Night. The product moment is the app's own icon, shown
 * alone at 440 px (its source is 1024) with the iOS corner radius; the line
 * under the headline is the website's own: "Rent, buy or stay. Without the
 * runaround." A party popper is the post's 3D icon. */
import { join } from "node:path";
import { SLOT, frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
const S = 440;
const X = (W - S) / 2;
const Y = 640;

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
      ${icon3d("celebrate", { ...SLOT.post.tr, size: 210, ground: "night" })}
      `,
    }),
};
