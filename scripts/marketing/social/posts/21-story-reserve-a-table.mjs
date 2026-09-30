/* 21 · Story. "Reserve your table tonight." Night. The restaurants list
 * ("Book a table on Vallo. The restaurant confirms, and the conversation
 * lives inside the reservation.", an Example chip on every card, Harbour
 * Lights Kitchen opens at 18:00) on one whole phone lying back (10's pose,
 * w 700). The cloche, the subject, is the post's 3D icon, as on 17.
 * Everything sits inside the story's safe zone. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "21",
  file: "21-story-reserve-a-table.png",
  W,
  H,
  phones: [phone("restaurants", "night", PLACE.lyingBack())],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Reserve your", "table <k>tonight.</k>"], { W, H })}
      ${subline("The restaurant confirms, right inside Vallo.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("restaurant", { W, H, slot: "A" })}
      `,
    }),
};
