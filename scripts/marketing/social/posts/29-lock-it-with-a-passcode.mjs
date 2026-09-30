/* 29 · "Lock it with a passcode." Night (the product keeps its lock dark in
 * both themes). The real passcode lock ("Welcome back, omojuni · Enter your
 * passcode", six empty dots and the glossy keypad) on one big phone, straight,
 * running off the foot of the frame. The line under the headline is the
 * passcode setting's own: Vallo locks after 5 minutes away. A padlock with a
 * keypad is the post's 3D icon. */
import { SLOT, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "29",
  file: "29-lock-it-with-a-passcode.png",
  W,
  H,
  phones: [phone("lock", "night", { h: 1000, cx: 540, top: 492 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Lock it with", "a <k>passcode.</k>"], { W, H })}
      ${subline("Vallo locks after 5 minutes away.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("passcode-lock", { ...SLOT.post.tr, size: 210, ground: "night" })}
      `,
    }),
};
