/* 25 · "Ask what a fee really means." Mist, so the screen is the light theme:
 * the AI assistant answering "What is a caution deposit?" (captured on light,
 * no focus ring), on one phone, whole and centred. No line here claims any
 * language for the assistant. Its robot is the post's 3D icon. */
import { SLOT, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "25",
  file: "25-ai-assistant.png",
  W,
  H,
  phones: [phone("assistant-caution-2-lt", "mist", { h: 820, cx: 540, top: 492 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Ask what a fee", "really <k>means.</k>"], { W, H })}
      ${subline("The AI assistant explains, any time of day.", { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("assistant", { ...SLOT.post.tr, size: 210, ground: "mist" })}
      `,
    }),
};
