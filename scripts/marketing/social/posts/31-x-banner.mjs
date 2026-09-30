/* X header, 1500 x 500, Night. The wordmark, and "Real estate, done right."
 * at 88 px in the upper left; the launch line in the brand bar at the right;
 * two phones, straight, rising from the foot at the right (a home for sale
 * and a resort), their price lines well clear of the edge. The lower left
 * (400 x 200) stays empty because X lays the profile photo over it. Keys at
 * 150 px, their top on the headline's cap-top, are the 3D icon, shared with
 * post 01, which carries the same tagline. */
import { frame, grid, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1500;
const H = 500;
const g = grid(W, H);
const PL = { kind: "pose", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 550, top: 121 };

export default {
  id: "x-banner",
  file: "x-banner-1500x500.png",
  W,
  H,
  phones: [phone("listing-sale", "night", { ...PL, cx: 952 }), phone("stay", "night", { ...PL, cx: 1290 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      foot: "Coming soon on iPhone and Android.",
      body: `
      ${headline(["Real estate,", "done <k>right.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("keys", { W, H, size: 150, at: { right: 740, top: g.capTop } })}
      `,
    }),
};
