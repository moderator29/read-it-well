/* R1 · after IMG_6727: one straight phone, whole and centred, on a light
 * ground. Mist, so the screen is the app's light theme: the first welcome
 * card. The villa is the post's 3D icon. */
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "01",
  file: "01-r1-real-estate-done-right.png",
  W,
  H,
  phones: [
    { screen: "welcome-1-lt", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 820, cx: 540, top: 492,
      shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#141E5A" } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Real estate,", "done <k>right.</k>"], { W, H })}
      ${subline("Homes, hotels, shortlets and restaurants, in one app.", { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("villa", { x: 880, y: 900, ground: "mist" })}
      `,
    }),
};
