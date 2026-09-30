/* 18 · "See the full cost before you call." Mist: the fourth light beat, mid
 * run. One real component, cut from the light theme's capture of the example
 * villa (listing-lt) and shown flat below its own resolution: the move-in
 * total (₦26,100,000, rent plus every fee, each amount in its legend, and the
 * product's own Example chip). A contract, the fees on paper, is the post's
 * 3D icon, 48 px under the card. */
import { centreTop, component, componentHeight, frame, headline, icon3d, iconBox } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const card = { id: "listing-lt", x: 110, y: 1446, w: 1100, h: 672 };
const CH = componentHeight(card, 920);
const TOP = centreTop(CH, iconBox("contract").h);

export default {
  id: "18",
  file: "18-move-in-cost.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["See the <k>full</k> cost", "before you call."], { W, H })}
      ${await component(card.id, card, { x: 80, y: TOP, w: 920, radius: 40, ground: "mist" })}
      ${icon3d("contract", { W, H, slot: "B", top: TOP + CH + 48, ground: "mist" })}
      `,
    }),
};
