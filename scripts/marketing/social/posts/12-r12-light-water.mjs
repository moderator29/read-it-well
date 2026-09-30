/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other, filling the centre. 1080 x 1350, Night. Light and water, from two
 * sides: what the example listing says about its power and water (Band A,
 * a generator and inverter; treated mains), and the neighbourhood feed's own
 * advice to read the meter before you move in. Never touching, 60 px apart.
 * A plug is the post's 3D icon, in slot A. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const PH = { kind: "pose", fov: 26, h: 740 };
const CY = 880;

export default {
  id: "12",
  file: "12-r12-light-and-water.png",
  W,
  H,
  phones: [
    phone("listing-amenities", "night", { ...PH, rotation: { x: -14, y: 18, z: 6 }, cx: 290, cy: CY }),
    phone("around", "night", { ...PH, rotation: { x: -14, y: -18, z: -6 }, cx: 790, cy: CY }),
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Check light", "and <k>water.</k>"], { W, H })}
      ${subline("What the agent says, and what residents report.", { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("power", { W, H, slot: "A" })}
      `,
    }),
};
