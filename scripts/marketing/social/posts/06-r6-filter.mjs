/* R6 · after IMG_6733 (a hand holding the phone). No hand: the phone keeps the
 * held angle on a clean Night ground. The filters with villas chosen and
 * Apply (3). A list is the post's 3D icon. */
import { frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "06",
  file: "06-r6-filter-by-what-you-need.png",
  W,
  H,
  phones: [
    { screen: "filters-villas", model: "island", color: "black-titanium", rotation: { x: -8, y: -26, z: -14 }, fov: 30, h: 1000, cx: 650, top: 470,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Filter by <k>exactly</k>", "what you need."], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("list", { x: 190, y: 980, size: 210, ground: "night" })}
      `,
    }),
};
