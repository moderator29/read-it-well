/* R2 · after IMG_6729: two phones side by side, big, running off the foot of
 * the frame. Electric. A home (the example villa in Maitama) and a stay (the
 * example resort, Lagoon Crest): two worlds in one account. The shortlet, a
 * home with a pool, is the post's 3D icon. */
import { frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const PH = { model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 960, top: 492, shadow: { type: "drop", opacity: 0.4, ambientOpacity: 0.2, color: "#001040" } };

export default {
  id: "02",
  file: "02-r2-two-worlds-one-account.png",
  W,
  H,
  phones: [
    { ...PH, screen: "listing", cx: 296 },
    { ...PH, screen: "stay", cx: 784 },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "electric",
      body: `
      ${headline(["Two worlds.", "<k>One</k> account."], { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("shortlet", { x: 900, y: 266, size: 220, ground: "electric" })}
      `,
    }),
};
