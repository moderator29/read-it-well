/* 22 · "Vallo never holds your money." 1080 x 1350, Night. The statement
 * piece of the 20 to 30 run: the campaign's hardest question answered in the
 * product's own voice. One real component, the help centre's own question
 * and answer (support-money), cut on the card's own edge and shown flat at
 * 0.75x and centred in the field:
 * "Does Vallo hold my money? / No. Vallo never holds your money. When you
 * pay, the owner's or agent's share goes straight to their bank account
 * through our payment processor, in the same transaction. There is no Vallo
 * wallet or balance, nothing to top up and nothing to withdraw." A bank is
 * the post's 3D icon, 48 px under the card (slot A would sit on "holds"). */
import { centreTop, component, componentHeight, frame, headline, icon3d, iconBox } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const card = { id: "support-money", x: 48, y: 988, w: 1224, h: 772 };
const CH = componentHeight(card, 920);
const TOP = centreTop(CH, iconBox("bank").h);

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
      ${headline(["Vallo never holds", "your <k>money.</k>"], { W, H })}
      ${await component(card.id, card, { x: 80, y: TOP, w: 920, radius: 30, ring: false })}
      ${icon3d("bank", { W, H, slot: "B", top: TOP + CH + 48 })}
      `,
    }),
};
