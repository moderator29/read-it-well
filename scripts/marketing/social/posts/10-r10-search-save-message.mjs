/* R10 · after IMG_6737: a phone lying back on a long foreshortened angle,
 * the buttons big at the near end. Night. The last welcome card: an account
 * lets you search, save, message agents and hosts, and book inspections. The
 * pose is the one the stories use. An envelope is the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "10",
  file: "10-r10-search-save-and-message.png",
  W,
  H,
  phones: [phone("welcome-4", "night", PLACE.lyingBack({ w: 700, cx: 560, bottom: 1330 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Search, save,", "<k>message.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("envelope", { W, H, slot: "A" })}
      `,
    }),
};
