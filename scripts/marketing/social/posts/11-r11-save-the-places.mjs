/* R11 · after IMG_6738: the top of the phone seen from below, leaning away,
 * the picture filling the glass. Night. Saved: the shortlist with the
 * example villa's photograph. The saved heart is the post's 3D icon, in the
 * left column. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const TOP = 480;

export default {
  id: "11",
  file: "11-r11-save-the-places-you-love.png",
  W,
  H,
  phones: [phone("saved", "night", { kind: "pose", rotation: { x: -24, y: -22, z: 10 }, fov: 36, w: 860, cx: 660, top: TOP }, { shadow: "none" })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Save the places", "you <k>love.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("saved-heart", { W, H, slot: "B", cy: (TOP + H) / 2 })}
      `,
    }),
};
