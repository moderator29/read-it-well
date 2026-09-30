/* 30 · Story. "Almost here." Night. The launch line, exactly "Coming soon on
 * iPhone and Android.", under the headline; an iPhone and an Android phone
 * side by side on the same screen, the assistant's greeting ("How can I help
 * today? Ask about somewhere to rent or buy, a hotel or shortlet to stay in, a
 * table to book, and what moving in really costs."), no logos and no store
 * badges. A megaphone is the post's 3D icon. Everything sits inside the
 * story's safe zone. */
import { SLOT, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;
const PLACE = { h: 880, top: 660 };

export default {
  id: "30",
  file: "30-story-coming-soon.png",
  W,
  H,
  phones: [
    phone("assistant", "night", { ...PLACE, cx: 306 }),
    phone("assistant", "night", { ...PLACE, cx: 774 }, { model: "android" }),
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Almost <k>here.</k>"], { W, H })}
      ${subline("Coming soon on iPhone and Android.", { W, H, lines: 1 })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("megaphone", { ...SLOT.story.tr, y: 420, size: 210, ground: "night" })}
      `,
    }),
};
