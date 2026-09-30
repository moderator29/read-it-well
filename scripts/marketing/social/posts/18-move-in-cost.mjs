/* 18 · "See the full cost before you call." Night. One real component, shown
 * flat below its own resolution: the listing's move-in total for the example
 * villa (₦26,100,000, rent plus every fee, each amount in its legend, and the
 * product's own Example chip). A contract, the fees on paper, is the post's
 * 3D icon, in slot B at the foot. */
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
      ${icon3d("contract", { W, H, slot: "B", top: 480 + 526 + 48 })}
      `,
    }),
};
