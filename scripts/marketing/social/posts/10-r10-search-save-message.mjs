/* R10 · after IMG_6737: a steep view down the phone's lower half, the buttons
 * big. Night. The last welcome card lying back on a long foreshortened angle:
 * an account lets you search, save, message and book inspections. The keys
 * with a house tag are the post's 3D icon. */
import { frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "10",
  file: "10-r10-search-save-and-message.png",
  W,
  H,
  phones: [
    { screen: "welcome-4", model: "island", color: "black-titanium", rotation: { x: -44, y: 18, z: 14 }, fov: 50, w: 740, cx: 560, bottom: 1330,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Search, save", "and <k>message.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("rent", { x: 905, y: 262, size: 200, ground: "night" })}
      `,
    }),
};
