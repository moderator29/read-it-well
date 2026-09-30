/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other, filling the centre. 1080 x 1350, Night. One example listing, two
 * things to know before you commit: what it says about light and water, and
 * the total to move in with every fee named. A plug is the post's 3D icon,
 * in the left column. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
const PH = { kind: "pose", fov: 26, h: 700 };
const CY = 900;

export default {
  id: "12",
  file: "12-r12-light-and-water.png",
  W,
  H,
  phones: [
    /* turned toward each other; the right phone's bezel only touches the left phone's, never its screen */
    phone("listing-amenities", "night", { ...PH, rotation: { x: -14, y: 20, z: 10 }, cx: 450, cy: CY }),
    phone("listing-cost-total", "night", { ...PH, rotation: { x: -18, y: -20, z: -6 }, cx: 850, cy: CY + 30 }),
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Light and water,", "<k>before</k> you commit."], { W, H })}
      ${subline("What the agent says, and what residents report.", { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("power", { W, H, slot: "B", cy: CY })}
      `,
    }),
};
