/* 21 · Story. "Reserve your table tonight." Night. The example restaurant's
 * page (Harbour Lights Kitchen, opens at 18:00, its Example notice in view)
 * on one whole phone lying back (w 760), its "No photographs yet" chip shown
 * once, at the far end. The cloche, the subject, is the post's 3D icon.
 * Everything sits inside the story's safe zone. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "21",
  file: "21-story-reserve-a-table.png",
  W,
  H,
  phones: [phone("restaurant", "night", PLACE.lyingBack({ w: 760, bottom: 1580 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Reserve your", "table <k>tonight.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("restaurant", { W, H, slot: "A" })}
      `,
    }),
};
