/* 28 · "Vallo charges no inspection fee." Night. The approved line, about
 * Vallo's own charges, as the headline; under it, how it works in the
 * product's words. The third welcome card on one phone, whole: an inspection
 * agreed in chat ("Is Saturday at 11 good for an inspection?" "Yes, see you
 * there."), then pay on Vallo, never to anybody outside it. A calendar with a
 * clock is the post's 3D icon. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "28",
  file: "28-no-inspection-fee.png",
  W,
  H,
  phones: [phone("welcome-3", "night", { h: 820, cx: 660, top: 486 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo charges <k>no</k>", "inspection fee."], { W, H })}
      ${subline("Inspect first. Pay on Vallo, never to anybody outside it.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("calendar-pending", { x: 196, y: 930, size: 210, ground: "night" })}
      `,
    }),
};
