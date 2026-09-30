/* 29 · "Lock it with a passcode." Night (the product keeps its lock dark in
 * both themes). The real passcode lock ("Welcome back, omojuni · Enter your
 * passcode", six empty dots and the glossy keypad) on one straight phone,
 * the whole keypad in frame and the frame's foot in the empty band under the
 * 0 row. The keypad is huge UI, so this phone keeps the critic's own size
 * (h 940) under the 0.45x rule. The line under the headline is the passcode
 * setting's own. A padlock with a keypad is the post's 3D icon. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "29",
  file: "29-lock-it-with-a-passcode.png",
  W,
  H,
  phones: [phone("lock", "night", { kind: "bleed", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 940, cx: 540, top: 492 }, { exempt: "keypad is huge UI (critic F3: h 940)" })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Lock it with", "a <k>passcode.</k>"], { W, H })}
      ${subline("Vallo locks after five minutes away.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("passcode-lock", { W, H, slot: "A" })}
      `,
    }),
};
