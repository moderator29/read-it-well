/* R3 · after IMG_6730: one straight phone, whole and centred, on a light
 * ground (the whole placement, no subline: the screen's own hero already
 * says "Rent, buy or sell property across Nigeria"). Mist, so the screen is
 * the app's light theme. Keys on a house tag (rent) are the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "03",
  file: "03-r3-find-your-next-home.png",
  W,
  H,
  phones: [phone("home-lt", "mist", PLACE.whole())],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Find your", "next <k>home.</k>"], { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("apartment", { W, H, slot: "A", ground: "mist" })}
      `,
    }),
};
