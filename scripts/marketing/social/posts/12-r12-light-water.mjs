/* R12 · after IMG_6739, rebuilt as the set's second product mode: one real
 * component instead of two small phones. Night. The example listing's own
 * "Light" and "Water" block (Band A, with a generator and inverter, running
 * 24 hours a day; a prepaid meter; treated mains), cut from listing-amenities
 * with air round it and shown flat at 0.72x, so its body text reads at feed
 * size. A plug is the post's 3D icon, in slot A. */
import { centreTop, component, componentHeight, frame, headline, icon3d, subline } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const card = { id: "listing-amenities", x: 24, y: 832, w: 1272, h: 816 };

export default {
  id: "12",
  file: "12-r12-light-and-water.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Check light", "and <k>water.</k>"], { W, H })}
      ${subline("What the listing says about power and water.", { W, H })}
      ${await component(card.id, card, { x: 80, y: centreTop(componentHeight(card, 920)), w: 920, radius: 40 })}
      ${icon3d("power", { W, H, slot: "A" })}
      `,
    }),
};
