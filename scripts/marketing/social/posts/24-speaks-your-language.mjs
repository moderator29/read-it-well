/* 24 · "Vallo speaks your language." Night. The first welcome card in Yorùbá
 * ("Ayé méjì. Pèpéle kan.") on one phone, whole; the line under the headline
 * names the four languages the app is in. Nothing here says the assistant
 * answers in them. A globe is the post's 3D icon. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "24",
  file: "24-speaks-your-language.png",
  W,
  H,
  phones: [phone("welcome-yo", "night", { h: 820, cx: 470, top: 486 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo speaks", "your <k>language.</k>"], { W, H })}
      ${subline("English, Hausa, Yorùbá and Igbo. Switch at any time.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("explore", { x: 884, y: 930, size: 210, ground: "night" })}
      `,
    }),
};
