/* X header, 1500 x 500, Night. The wordmark, and "Real estate, done right."
 * in the upper left; the launch line in the brand bar at the right; two
 * phones, straight, rising from the foot at the right (a home for sale and a
 * resort). The lower left (400 x 200) stays empty because X lays the profile
 * photo over it. Keys are the 3D icon. */
import { frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1500;
const H = 500;
const PLACE = { h: 640, top: 150 };

export default {
  id: "x-banner",
  file: "x-banner-1500x500.png",
  W,
  H,
  phones: [phone("listing-sale", "night", { ...PLACE, cx: 952 }), phone("stay", "night", { ...PLACE, cx: 1290 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      foot: "Coming soon on iPhone and Android.",
      body: `
      ${headline(["Real estate,", "done <k>right.</k>"], { W, H, y: 124, size: 76 })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("keys", { x: 650, y: 250, size: 200, ground: "night" })}
      `,
    }),
};
