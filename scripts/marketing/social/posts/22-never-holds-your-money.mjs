/* 22 · "Vallo never holds your money." 1080 x 1350, Night. The statement
 * piece of the 20 to 30 run: the claim in bold type at 108 px, and under it
 * the product saying it in its own words, one real component cut from the
 * Agreements page and shown flat at 0.73x ("Payment opens only after the
 * inspection report is submitted, both of you confirm the agreement, and
 * Vallo approves it. Vallo never holds your money. When you pay, the owner's
 * or agent's share goes straight to their bank account through our payment
 * processor, in the same transaction."). A bank is the post's 3D icon, 48 px
 * under the card. */
import { component, componentHeight, frame, headline, icon3d } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const card = { id: "agreements", x: 30, y: 290, w: 1260, h: 650 };
const TOP = 480;
const CH = componentHeight(card, 920);

export default {
  id: "22",
  file: "22-never-holds-your-money.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo never holds", "your <k>money.</k>"], { W, H, size: 108 })}
      ${await component(card.id, card, { x: 80, y: TOP, w: 920, radius: 40 })}
      ${icon3d("bank", { W, H, slot: "B", top: TOP + CH + 48 })}
      `,
    }),
};
