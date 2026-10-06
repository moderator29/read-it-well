/* 25 · "Ask what fees really mean." Night. A hero-scale product moment in
 * the 19 to 30 run, in 05's pose: the top of the phone, close and tilted
 * back (0.61x), the AI assistant answering "What is a caution deposit?" (the
 * dark capture) big enough to read in the feed; the answer's text stays 35 px
 * or more above the frame's foot. No line here claims any language for the
 * assistant. Its robot is the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "25",
  file: "25-ai-assistant.png",
  W,
  H,
  phones: [phone("assistant-caution-2", "night", { kind: "pose", rotation: { x: 13, y: 0, z: 0 }, fov: 30, w: 860, cx: 540, top: 452 }, { shadow: "none" })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Ask what fees", "really <k>mean.</k>"], { W, H })}
      ${subline("The AI assistant explains, any time of day.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("assistant", { W, H, slot: "A" })}
      `,
    }),
};
