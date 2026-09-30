/* 24 · "Vallo speaks your language." Night. One real component, shown flat
 * below its own size: the foot of the first welcome card in Yorùbá ("Ayé
 * méjì. Pèpéle kan.", the Ilé / Ìbùgbé switch and the Ìbùgbé card), cut from
 * the captured screen. The line under the headline names the four languages
 * the app is in; nothing here says the assistant answers in them. A globe is
 * the post's 3D icon. */
import { component, frame, headline, icon3d, subline } from "../lib/premium.mjs";

const W = 1080;
const H = 1350;
const CROP = { x: 30, y: 1560, w: 1260, h: 760 };

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
      ${await component("welcome-yo", CROP, { x: 80, y: 480, w: 920, radius: 40 })}
      ${icon3d("explore", { x: 880, y: 1170, size: 200, ground: "night" })}
      `,
    }),
};
