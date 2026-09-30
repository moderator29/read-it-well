/* 25 · "Ask what a fee really means." Night. The AI assistant answering
 * "What is a caution deposit?" (the dark capture), on one bleed phone at
 * 0.48x whose foot falls in the empty band between the answer's second and
 * third paragraphs. No line here claims any language for the assistant. Its
 * robot is the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "25",
  file: "25-ai-assistant.png",
  W,
  H,
  phones: [phone("assistant-caution-2", "night", PLACE.bleed({ w: 673 }))],
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
