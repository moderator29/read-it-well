/* R1 · after IMG_6727: one straight phone, whole and centred, a little
 * bigger than the reference (w 440, 0.31x). Night. The home screen scrolled
 * to what the app is for: the places looked at recently and the featured
 * properties, each with its Example chip. Keys with a house tag are the
 * post's 3D icon, the same as the X header's, which carries the same
 * tagline. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "01",
  file: "01-r1-real-estate-done-right.png",
  W,
  H,
  phones: [phone("home-recent", "night", PLACE.whole({ h: 915, top: 415 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Real estate,", "done <k>right.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("keys", { W, H, slot: "A" })}
      `,
    }),
};
