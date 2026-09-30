/* 23 · "Verified means a person checked." Mist, so the component is cut
 * from the light theme's capture (verification-lt, the same crop box). One real component, shown
 * flat: the government ID step of verification, cut from the captured
 * screen and readable at feed size. The verified mark is the post's 3D icon,
 * in slot B at the foot. The mark is about people and businesses, never
 * homes. */
import { component, frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { PARTS } from "../lib/parts.mjs";

const W = 1080;
const H = 1350;
const card = { ...PARTS["id-card"], id: "verification-lt" };

export default {
  id: "23",
  file: "23-verified-mark.png",
  W,
  H,
  html: async () =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Verified means", "a <k>person</k> checked."], { W, H })}
      ${subline("For owners, hosts, hotels and restaurants.", { W, H })}
      ${await component(card.id, card, { x: 80, y: 480, w: 920, radius: 40, ground: "mist" })}
      ${icon3d("verified", { W, H, slot: "B", top: 480 + Math.round((920 * card.h) / card.w) + 48, ground: "mist" })}
      `,
    }),
};
