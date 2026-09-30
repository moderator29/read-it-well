/* 26 · "Have a property?" 16:9, Night. The host start (add a workspace: a
 * hotel, a shortlet, a restaurant, or a property you own) on one big phone at
 * the right, running off the foot; the one pop-up the post is about, on the
 * ground at the left: a payment settled straight to your bank (Example). A
 * hand with a naira coin is the post's 3D icon. */
import { frame, headline, icon3d, phone, popcard, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1600;
const H = 900;

export default {
  id: "26",
  file: "26-owners-put-it-on-vallo.png",
  W,
  H,
  phones: [phone("host-start", "night", { h: 1000, cx: 1236, top: 150 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Have a <k>property?</k>"], { W, H })}
      ${subline("Put it on Vallo and welcome guests from across the country.", { W, H, lines: 1 })}
      ${phoneHtml(phones[0])}
      ${popcard({ ground: "night", title: "Payment settled", line: "Straight to your bank", amount: "₦1,800,000", x: 88, y: 430, width: 520 })}
      ${icon3d("earnings", { x: 800, y: 540, size: 210, ground: "night" })}
      `,
    }),
};
