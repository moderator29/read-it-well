/* 28 · "Vallo charges no inspection fee." Night (Electric needs a legible
 * wordmark first). The approved line, about Vallo's own charges, as the
 * headline; under it, how it works in the product's words. The third welcome
 * card on one bleed phone at 0.49x, the inspection chat big ("Is Saturday at
 * 11 good for an inspection?" "Yes, see you there."); the frame's foot falls
 * on the plain hill under the lock. A calendar with a clock is the post's 3D
 * icon, in the left column. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "28",
  file: "28-no-inspection-fee.png",
  W,
  H,
  phones: [phone("welcome-3", "night", PLACE.bleed({ w: 660, cx: 630 }), { images: [[40, 1300, 1280, 1960, "the welcome card's illustration"]] })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo charges <k>no</k>", "inspection fee."], { W, H })}
      ${subline("Inspect first. Pay on Vallo, never to anybody outside it.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("search", { W, H, slot: "B", cy: (490 + H) / 2 })}
      `,
    }),
};
