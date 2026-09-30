/* 30 · Story. "Almost here." Night. The closing hero, a pair with 14: the
 * launch line, exactly "Coming soon on iPhone and Android.", under the
 * headline, and the app's own icon at 600 px (its source is 1024) centred in
 * the story's field with the iOS corner radius and a soft contact shadow. No
 * logos and no store badges. A megaphone is the post's 3D icon. Everything
 * sits inside the story's safe zone (top 250 and bottom 340 px clear). */
import { join } from "node:path";
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1920;
const S = 600;
const X = (W - S) / 2;
const Y = 790;

export default {
  id: "30",
  file: "30-story-coming-soon.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Almost <k>here.</k>"], { W, H })}
      ${subline("Coming soon on iPhone and Android.", { W, H, lines: 1 })}
      <div style="position:absolute;left:${X + S * 0.12}px;top:${Y + S * 0.9}px;width:${S * 0.76}px;height:${S * 0.16}px;border-radius:50%;
          background:radial-gradient(closest-side,rgba(0,0,8,.7),rgba(0,0,0,0));filter:blur(14px)"></div>
      <div style="position:absolute;left:${X}px;top:${Y}px;width:${S}px;height:${S}px;border-radius:${Math.round(S * 0.2237)}px;overflow:hidden;
          box-shadow:0 50px 90px -30px rgba(0,0,10,.85), 0 16px 34px -12px rgba(0,0,20,.55)">
        <img src="${u(join(BRAND, "vallo-icon.png"))}" alt="Vallo" style="display:block;width:${S}px;height:${S}px">
      </div>
      ${icon3d("megaphone", { W, H, slot: "A" })}
      `,
    }),
};
