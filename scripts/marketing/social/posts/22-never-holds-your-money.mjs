/* 22 · "Vallo never holds your money." Square, Electric. The Agreements page
 * says it in the product's own words ("Vallo never holds your money. When you
 * pay, the owner's or agent's share goes straight to their bank account
 * through our payment processor, in the same transaction."): one big phone,
 * straight, running off the foot of the frame so its top half reads. A bank is
 * the post's 3D icon. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1080;

export default {
  id: "22",
  file: "22-never-holds-your-money.png",
  W,
  H,
  phones: [phone("agreements", "electric", { h: 1300, cx: 668, top: 496 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "electric",
      body: `
      ${headline(["Vallo never holds", "your <k>money.</k>"], { W, H })}
      ${subline("The owner’s share goes straight to their bank.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("bank", { x: 196, y: 760, size: 210, ground: "electric" })}
      `,
    }),
};
