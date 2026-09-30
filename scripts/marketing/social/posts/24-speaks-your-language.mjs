/* 24 · "In your language." Night. The literal proof: the first welcome
 * slide's headline as captured in each of the app's four languages, English,
 * Hausa, Yorùbá and Igbo ("Two worlds. One platform." and its three
 * translations), cut with air round every accent and descender and stacked as
 * one centred column of real components at 0.70x. Nothing here says the
 * assistant answers in these languages. A pin with a speech bubble (local
 * talk) is the post's 3D icon, in slot A. */
import { component, componentHeight, frame, headline, icon3d, subline } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const CW = 920;
const GAP = 16;
const TOP = 480;
/* each headline cut from its own capture, 28 rows of air above and below */
const CROPS = [
  { id: "welcome-1", crop: { x: 0, y: 1957, w: 1320, h: 233 } },
  { id: "welcome-ha", crop: { x: 0, y: 1954, w: 1320, h: 236 } },
  { id: "welcome-yo", crop: { x: 0, y: 1954, w: 1320, h: 236 } },
  { id: "welcome-ig", crop: { x: 0, y: 1796, w: 1320, h: 229 } },
];

export default {
  id: "24",
  file: "24-speaks-your-language.png",
  W,
  H,
  html: async () => {
    let y = TOP;
    const parts = [];
    for (const c of CROPS) {
      parts.push(await component(c.id, c.crop, { x: 80, y, w: CW, radius: 28 }));
      y += componentHeight(c.crop, CW) + GAP;
    }
    return frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["In your", "<k>language.</k>"], { W, H })}
      ${subline("Vallo speaks English, Hausa, Yorùbá and Igbo.", { W, H })}
      ${parts.join("")}
      ${icon3d("local-talks", { W, H, slot: "A" })}
      `,
    });
  },
};
