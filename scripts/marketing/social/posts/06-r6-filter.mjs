/* R6 · after IMG_6733: one phone, whole, turned and tilted. Mist, so the
 * screen is the light theme: the search filters with Villas picked and
 * "Apply (3)" at the foot, the whole phone in frame, its lowest corner on the
 * bottom margin (y 1270) like every whole phone. A villa, echoing the picked
 * Villas tile, is the post's 3D icon, in the left column standing on the
 * same line. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const TOP = 450;
const PH = 826;

export default {
  id: "06",
  file: "06-r6-filter-by-what-you-need.png",
  W,
  H,
  phones: [phone("filters-villas-lt", "mist", { kind: "pose", rotation: { x: -8, y: -26, z: -14 }, fov: 30, h: PH, cx: 650, top: TOP })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Filter by <k>exactly</k>", "what you need."], { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("villa", { W, H, slot: "B", bottom: 1270, ground: "mist" })}
      `,
    }),
};
