/* R4 · after IMG_6731: a steep close-up of the phone's lower half, the move-in
 * breakdown running big across the glass. Night. The phone lies on a long
 * diagonal and leaves through the right edge under the headline; a checklist
 * is the post's 3D icon. */
import { SLOT, frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "04",
  file: "04-r4-what-you-will-actually-pay.png",
  W,
  H,
  phones: [
    { screen: "listing-cost", model: "island", color: "black-titanium", rotation: { x: -46, y: -16, z: -48 }, fov: 50, w: 1250, cx: 660, cy: 996,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["What you will", "<k>actually</k> pay."], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("checklist", { ...SLOT.post.tr, size: 210, ground: "night" })}
      `,
    }),
};
