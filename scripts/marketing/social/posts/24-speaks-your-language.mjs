/* 24 · "Vallo speaks your language." Night. The literal proof: the first
 * welcome slide's headline as captured in each of the app's four languages,
 * English, Hausa, Yorùbá and Igbo ("Two worlds. One platform." and its three
 * translations), stacked as one column of real components at 0.70x. Nothing
 * here says the assistant answers in these languages. A pin with a speech
 * bubble (local talk) is the post's 3D icon, in slot B at the foot. */
import { component, componentHeight, frame, headline, icon3d, subline } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const CW = 920;
const GAP = 20;
/* each headline cut from its own capture, 184 rows around the two lines */
const CROPS = [
  { id: "welcome-1", crop: { x: 0, y: 1973, w: 1320, h: 184 } },
  { id: "welcome-ha", crop: { x: 0, y: 1977, w: 1320, h: 184 } },
  { id: "welcome-yo", crop: { x: 0, y: 1972, w: 1320, h: 184 } },
  { id: "welcome-ig", crop: { x: 0, y: 1810, w: 1320, h: 184 } },
];
const CH = componentHeight(CROPS[0].crop, CW);
const TOP = 480;

export default {
  id: "24",
  file: "24-speaks-your-language.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo speaks", "your <k>language.</k>"], { W, H })}
      ${subline("English, Hausa, Yorùbá and Igbo. Switch at any time.", { W, H })}
      ${(await Promise.all(CROPS.map((c, i) => component(c.id, c.crop, { x: 80, y: TOP + i * (CH + GAP), w: CW, radius: 28 })))).join("")}
      ${icon3d("local-talks", { W, H, slot: "B", bottom: H - 80 })}
      `,
    }),
};
