/* 26 · "Have a property?" 1600 x 900 (X and LinkedIn), Night. The owner's
 * "got paid" moment is the product moment, drawn large as the one component:
 * a Vallo notification, "Payment settled · Straight to your bank ·
 * ₦1,800,000", marked Example. No phone. A hand holding a naira coin is the
 * post's 3D icon, in the wide format's slot B. */
import { frame, grid, headline, icon3d, popcard, subline } from "../lib/premium.mjs";

const W = 1600;
const H = 900;
const g = grid(W, H);
const K = 1.62;
const CARD_W = 600;

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
      ${subline("Put it on Vallo and welcome guests from across the country.", { W, H, lines: 1 })}
      ${popcard({ ground: "night", title: "Payment settled", line: "Straight to your bank", amount: "₦1,800,000", x: W - g.M - CARD_W * K, y: 452, width: CARD_W, scale: K })}
      ${icon3d("earnings", { W, H, slot: "B", top: 470 })}
      `,
    }),
};
