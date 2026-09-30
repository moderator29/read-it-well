/* R2 · after IMG_6729: two whole phones side by side, 40 px apart, under the
 * headline (the whole placement). Night. The two worlds of one account: a
 * home (the example villa in Maitama, its Example notice in view) and the
 * Stays home ("Great stays. Better experiences."). The shortlet, a home with
 * a pool, is the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;
/* two outlines of 399 px at h 830, 40 px apart, centred on the frame */
const D = 219.6;

export default {
  id: "02",
  file: "02-r2-two-worlds-one-account.png",
  W,
  H,
  phones: [phone("listing", "night", PLACE.whole({ cx: 540 - D })), phone("stays", "night", PLACE.whole({ cx: 540 + D }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Two worlds.", "<k>One</k> account."], { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("shortlet", { W, H, slot: "A" })}
      `,
    }),
};
