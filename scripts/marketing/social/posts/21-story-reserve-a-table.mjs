/* 21 · Story. "Reserve your table." Night. The example restaurant's page
 * (Harbour Lights Kitchen, opens at 18:00, its Example notice in view) on one
 * big phone, whole and centred, the same grid as the stay story before it. A
 * booked calendar is the post's 3D icon. Everything sits inside the story's
 * safe zone. */
import { SLOT, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "21",
  file: "21-story-reserve-a-table.png",
  W,
  H,
  phones: [phone("restaurant", "night", { h: 890, cx: 540, top: 690 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Reserve your", "<k>table.</k>"], { W, H })}
      ${subline("The restaurant confirms, right inside Vallo.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("calendar-booked", { ...SLOT.story.tr, size: 210, ground: "night" })}
      `,
    }),
};
