/* 27 · "Vallo on the web." 1600 x 900 (X and LinkedIn), Night. The web app
 * doing work: the example villa's "What you will actually pay" breakdown and
 * its ₦26,100,000 total to move in, in a plain browser window at the right,
 * never larger than its 2880 px capture. The browser's address shows the
 * domain, so this post's footer carries the launch line instead. A globe with
 * a pin is the post's 3D icon, in the wide format's slot B. */
import { browser, frame, grid, headline, icon3d } from "../lib/premium.mjs";

const W = 1600;
const H = 900;
const g = grid(W, H);
const BW = 888;

export default {
  id: "27",
  file: "27-vallo-on-the-web.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      foot: "Coming soon on iPhone and Android.",
      body: `
      ${headline(["Vallo on", "the <k>web.</k>"], { W, H })}
      ${browser({ id: "d-listing-cost", x: W - g.M - BW, y: g.capTop, w: BW })}
      ${icon3d("explore", { W, H, slot: "B", top: 470 })}
      `,
    }),
};
