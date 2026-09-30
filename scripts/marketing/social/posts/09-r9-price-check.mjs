/* R9 · after IMG_6736 (a hand holding the phone against a pegboard). The hand
 * and the board go; the phone keeps its held angle on a clean Electric ground.
 * Price Check: what places nearby are asking. A map pin is the post's 3D icon. */
import { SLOT, frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "09",
  file: "09-r9-see-what-places-are-asking.png",
  W,
  H,
  phones: [
    { screen: "price", model: "island", color: "black-titanium", rotation: { x: 6, y: -20, z: -11 }, fov: 30, h: 1020, cx: 660, top: 470,
      shadow: { type: "drop", opacity: 0.45, ambientOpacity: 0.22, color: "#001040" } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "electric",
      body: `
      ${headline(["See what places", "nearby are <k>asking.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("analytics", { ...SLOT.post.left, size: 210, ground: "electric" })}
      `,
    }),
};
