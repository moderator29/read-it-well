/* 30 · Story. "Almost here." Night. The launch line, exactly "Coming soon on
 * iPhone and Android.", under the headline; one iPhone lying back (10's
 * pose, w 700) on the first welcome card, "Two worlds. One platform.", big at
 * the near end. No logos and no store badges. A megaphone is the post's 3D
 * icon. Everything sits inside the story's safe zone. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1920;

export default {
  id: "30",
  file: "30-story-coming-soon.png",
  W,
  H,
  phones: [phone("welcome-1", "night", PLACE.lyingBack())],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Almost <k>here.</k>"], { W, H })}
      ${subline("Coming soon on iPhone and Android.", { W, H, lines: 1 })}
      ${phoneHtml(phones[0])}
      ${icon3d("megaphone", { W, H, slot: "A" })}
      `,
    }),
};
