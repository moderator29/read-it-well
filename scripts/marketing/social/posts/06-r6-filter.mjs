/* R6 · after IMG_6733: one phone, whole, turned and tilted. Night. The
 * search filters with Villas picked and "Apply (3)" at the foot, the whole
 * phone in frame. A villa, echoing the picked Villas tile, is the post's 3D
 * icon, in the left column. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const TOP = 450;
const PH = 860;

export default {
  id: "06",
  file: "06-r6-filter-by-what-you-need.png",
  W,
  H,
  phones: [phone("filters-villas", "night", { kind: "pose", rotation: { x: -8, y: -26, z: -14 }, fov: 30, h: PH, cx: 650, top: TOP })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Filter by <k>exactly</k>", "what you need."], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("villa", { W, H, slot: "B", cy: TOP + PH / 2 })}
      `,
    }),
};
