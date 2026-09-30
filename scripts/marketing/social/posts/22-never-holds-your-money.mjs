/* 22 · "Vallo never holds your money." 1080 x 1350 (so Instagram's grid
 * crops no words), Night. The Agreements page says it in the product's own
 * words ("Vallo never holds your money. When you pay, the owner's or agent's
 * share goes straight to their bank account through our payment processor,
 * in the same transaction."): one bleed phone whose foot falls in the empty
 * band under the page's illustration. A bank is the post's 3D icon, in the
 * left column. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "22",
  file: "22-never-holds-your-money.png",
  W,
  H,
  phones: [phone("agreements", "night", PLACE.bleed({ w: 641, cx: 630 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo never holds", "your <k>money.</k>"], { W, H })}
      ${subline("The owner’s share goes straight to their bank.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("bank", { W, H, slot: "B", cy: (490 + H) / 2 })}
      `,
    }),
};
