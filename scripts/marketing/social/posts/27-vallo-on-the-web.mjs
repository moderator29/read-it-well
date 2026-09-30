/* 27 · "Vallo on the web." 1600 x 900 (X and LinkedIn), Night. The web app
 * doing work: the example villa's "What you will actually pay" breakdown and
 * its ₦26,100,000 total to move in, in a plain browser window at the right,
 * cropped to the page's main column (0.38x, never larger than the capture).
 * The browser's address shows the
 * domain, so this post's footer carries the launch line instead. A globe with
 * a pin is the post's 3D icon, in the wide format's slot B, its foot on the
 * window's foot. */
import { browser, browserHeight, frame, grid, headline, icon3d } from "../lib/premium.mjs";

const W = 1600;
const H = 900;
const g = grid(W, H);
const BW = 900;
/* the page's main column and its right card, without the sidebar */
const CROP = { x: 560, y: 0, w: 2320, h: 1610 };

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
      ${browser({ id: "d-listing-cost", x: W - g.M - BW, y: g.capTop, w: BW, crop: CROP })}
      ${icon3d("explore", { W, H, slot: "B", bottom: g.capTop + browserHeight(BW, CROP) })}
      `,
    }),
};
