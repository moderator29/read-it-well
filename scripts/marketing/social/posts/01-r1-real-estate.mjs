/* R1 · after IMG_6727: one straight phone, whole and centred, with air around
 * it (the whole placement, no subline). Night: the welcome keeps its dark
 * look in both themes. The first welcome card, "Two worlds. One platform."
 * Keys with a house tag are the post's 3D icon, the same as the X header's,
 * which carries the same tagline. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "01",
  file: "01-r1-real-estate-done-right.png",
  W,
  H,
  phones: [phone("welcome-1", "night", PLACE.whole())],
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
