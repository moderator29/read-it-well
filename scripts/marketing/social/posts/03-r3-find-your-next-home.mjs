/* R3 · after IMG_6730: a small, straight phone with room around it. Mist, so
 * the home screen is the app's light theme. Keys are the post's 3D icon. */
import { SLOT, frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "03",
  file: "03-r3-find-your-next-home.png",
  W,
  H,
  phones: [
    { screen: "home-lt", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 740, cx: 540, top: 530,
      shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#141E5A" } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Find your", "next <k>home.</k>"], { W, H })}
      ${subline("Rent, buy or sell property across Nigeria.", { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("keys", { ...SLOT.post.tr, size: 210, ground: "mist" })}
      `,
    }),
};
