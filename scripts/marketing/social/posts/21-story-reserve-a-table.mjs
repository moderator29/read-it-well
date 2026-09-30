/* 21 · Story. "Reserve your table tonight." Night. The example restaurant's
 * page on one whole phone lying back (10's pose, w 700): its photograph at the
 * far end, and at the near end what matters, big: Opens at 18:00, Harbour
 * Lights Kitchen, the Example notice, Victoria Island, and what it offers. A
 * clock is the post's 3D icon. Everything sits inside the story's safe zone. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "21",
  file: "21-story-reserve-a-table.png",
  W,
  H,
  phones: [phone("restaurant", "night", PLACE.lyingBack())],
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
