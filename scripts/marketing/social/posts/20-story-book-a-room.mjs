/* 20 · Story. "Book a room in a few taps." Night. Explore stays with the
 * dates filled in (16/10/2026 to 19/10/2026, two guests), captured signed in
 * and in British English, on one big phone, whole and centred. A booked
 * calendar is the post's 3D icon. Everything sits inside the story's safe zone
 * (top 250 and bottom 340 px clear). */
import { SLOT, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "20",
  file: "20-story-book-a-room.png",
  W,
  H,
  phones: [phone("stays-dates", "night", { h: 890, cx: 540, top: 690 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Book a <k>room</k>", "in a few taps."], { W, H })}
      ${subline("Hotels, shortlets and resorts across Nigeria.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("calendar-booked", { ...SLOT.story.tr, size: 210, ground: "night" })}
      `,
    }),
};
