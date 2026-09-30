/* 18 · "See the full cost before you call." Night. One real component, shown
 * flat at its own resolution: the listing's move-in total card for the example
 * villa (₦26,100,000, rent plus every fee, each amount in its legend, and the
 * product's own Example chip). A price tag is the post's 3D icon. */
import { component, frame, headline, icon3d } from "../lib/premium.mjs";
import { PARTS } from "../lib/parts.mjs";

const W = 1080;
const H = 1350;
const card = PARTS["move-in-inner"];

export default {
  id: "18",
  file: "18-move-in-cost.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["See the <k>full</k> cost", "before you call."], { W, H })}
      ${await component(card.id, card, { x: 80, y: 480, w: 920, radius: 40 })}
      ${icon3d("price-tag", { x: 880, y: 1170, size: 200, ground: "night" })}
      `,
    }),
};
