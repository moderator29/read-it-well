/* 23 · "Verified means a person checked." Night. The verification steps an
 * owner goes through (step 1 of 5, a government ID) on one big phone, and the
 * verified mark as the post's 3D icon. The mark is about people, never homes. */
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "23",
  file: "23-verified-mark.png",
  W,
  H,
  phones: [
    { screen: "verification", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 22, h: 1000, cx: 660, top: 520,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Verified means", "a <k>person</k> checked."], { W, H })}
      ${subline("For owners, hosts, hotels and restaurants.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("verified", { x: 210, y: 900, ground: "night" })}
      `,
    }),
};
