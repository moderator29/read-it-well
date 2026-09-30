/* X header, 1500 x 500, Night. The wordmark, and "Real estate, done right."
 * at 88 px in the upper left; the launch line in the brand bar at the right;
 * and one real component at 0.49x: the example villa's move-in total
 * (₦26,100,000, rent plus every fee, with the product's Example chip), as on
 * post 18. No phone: at this height no phone keeps its text off the edge.
 * The lower left (400 x 200) stays empty because X lays the profile photo
 * over it. Keys at 150 px, beside "right." and clear of the card, are the 3D
 * icon, shared with post 01, which carries the same tagline. */
import { component, frame, grid, headline, icon3d } from "../lib/premium.mjs";
import { PARTS } from "../lib/parts.mjs";

const W = 1500;
const H = 500;
const g = grid(W, H);
const card = PARTS["move-in-inner"];

export default {
  id: "x-banner",
  file: "x-banner-1500x500.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "night",
      foot: "Coming soon on iPhone and Android.",
      body: `
      ${headline(["Real estate,", "done <k>right.</k>"], { W, H })}
      ${await component(card.id, card, { x: 872, y: 130, w: 540, radius: 28 })}
      ${icon3d("keys", { W, H, size: 150, at: { left: 640, top: 300 } })}
      `,
    }),
};
