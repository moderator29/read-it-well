/* 26 · "Have a property?" 1600 x 900 (X and LinkedIn), Night, on the same
 * wide grid as 27: text on the left, the product on the right, the icon on
 * the lower left. The product's own words under the headline ("Put it on
 * Vallo." and host start's "List it yourself, no agency fee."); the owner's
 * "got paid" moment drawn large as the one component, right-aligned: a Vallo
 * notification, "Payment settled · Straight to your bank · ₦1,800,000",
 * marked Example. A hand holding a naira coin is the post's 3D icon, its foot
 * on the card's foot. No phone. */
import { frame, grid, headline, icon3d, popcard, subline } from "../lib/premium.mjs";

const W = 1600;
const H = 900;
const g = grid(W, H);
const K = 1.5;

export default {
  id: "26",
  file: "26-owners-put-it-on-vallo.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Have a <k>property?</k>"], { W, H })}
      ${subline("Put it on Vallo. List it yourself, no agency fee.", { W, H, lines: 1 })}
      ${popcard({ ground: "night", title: "Payment settled", line: "Straight to your bank", amount: "₦1,800,000", x: W - g.M - 600 * K, y: 520, width: 600, scale: K })}
      ${icon3d("earnings", { W, H, slot: "B", bottom: 520 + Math.round(162 * K) })}
      `,
    }),
};
