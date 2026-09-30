/* R9 · after IMG_6736: one phone, turned and tilted, running off the foot
 * through the empty lower part of the form. Night (the pegboard and hand of
 * the reference are dropped). Price Check: tell it where and what, and it
 * says what similar places near there are currently advertised for. A pin on
 * a plot of land (a place nearby) is the post's 3D icon, in the left column. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const TOP = 470;

export default {
  id: "09",
  file: "09-r9-see-what-places-are-asking.png",
  W,
  H,
  phones: [phone("price", "night", { kind: "pose", rotation: { x: 6, y: -20, z: -11 }, fov: 30, h: 1020, cx: 660, top: TOP }, { images: [[120, 2480, 1300, 2868, "the pin map"]] })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["See what places", "nearby are <k>asking.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("land", { W, H, slot: "B", bottom: 1270 })}
      `,
    }),
};
