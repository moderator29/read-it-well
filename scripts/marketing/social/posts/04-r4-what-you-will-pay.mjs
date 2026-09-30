/* R4 · after IMG_6731: a phone lying on a long diagonal, the screen's lines
 * rising to the right, its top corner running out through the left edge
 * under the headline (bezel only: every line of the screen stays at least
 * 24 px inside), its bottom bezel and speaker grille in frame at the lower
 * right.
 * Night. What you will actually pay for the example villa: rent, every fee
 * and the caution deposit, each figure kept well inside the frame. A
 * checklist is the post's 3D icon. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "04",
  file: "04-r4-what-you-will-actually-pay.png",
  W,
  H,
  phones: [phone("listing-cost", "night", { kind: "pose", rotation: { x: -46, y: 16, z: 48 }, fov: 50, w: 960, cx: 470, cy: 880 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["What you will", "<k>actually</k> pay."], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("checklist", { W, H, slot: "A" })}
      `,
    }),
};
