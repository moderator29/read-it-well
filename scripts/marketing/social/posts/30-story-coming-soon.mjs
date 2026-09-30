/* 30 · Story. "Almost here." Night. The closing bookend to 14, made its own:
 * the launch line, exactly "Coming soon on iPhone and Android.", under the
 * headline, and the app's own icon alone at 720 px (its source is 1024),
 * centred in the story's field with the iOS corner radius and a soft contact
 * shadow. The icon is the post's one object: no 3D icon beside it. No logos
 * and no store badges. Everything sits inside the story's safe zone. */
import { join } from "node:path";
import { frame, headline, subline } from "../lib/premium.mjs";
import { BRAND } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1920;
const S = 720;
const X = (W - S) / 2;
const Y = 1090 - 720 / 2;

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
      `,
    }),
};
