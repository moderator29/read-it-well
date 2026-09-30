/* R5 · after IMG_6732: the top of the phone, close, content big. Night. The
 * search for homes to buy: the search field, the Buy, Beds and Price filters,
 * "12 properties found. Nobody can pay to be higher." and the first listings,
 * each with its Example chip. A map with a pin is the post's 3D icon. */
import { SLOT, frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "05",
  file: "05-r5-search-homes-across-nigeria.png",
  W,
  H,
  phones: [
    { screen: "search-buy", model: "island", color: "black-titanium", rotation: { x: 13, y: 0, z: 0 }, fov: 30, w: 880, cx: 540, top: 452 },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Search homes", "across <k>Nigeria.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("map", { ...SLOT.post.tr, size: 210, ground: "night" })}
      `,
    }),
};
