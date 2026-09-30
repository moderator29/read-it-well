/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other. Electric. One example listing, two things to know before you commit:
 * what it says about light and water, and the total to move in with every fee
 * named. Text screens only, so the example villa's photograph is not repeated
 * here. A plug is the post's 3D icon. */
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1600;
const H = 1200;
const PH = { model: "island", color: "black-titanium", fov: 26, h: 680 };

export default {
  id: "12",
  file: "12-r12-light-water-and-getting-in.png",
  W,
  H,
  phones: [
    { ...PH, screen: "listing-amenities", rotation: { x: -14, y: 24, z: 15 }, cx: 990, cy: 736,
      shadow: { type: "drop", opacity: 0.4, ambientOpacity: 0.2, color: "#001040", offset: { x: 26, y: 50 }, blur: 50 } },
    { ...PH, screen: "listing-cost-total", rotation: { x: -18, y: -24, z: -8 }, cx: 1346, cy: 800,
      shadow: { type: "drop", opacity: 0.4, ambientOpacity: 0.2, color: "#001040", offset: { x: 18, y: 58 }, blur: 50 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "electric",
      body: `
      ${headline(["Light, water", "and getting in."], { W, H })}
      ${subline("What to know before you commit.", { W, H })}
      ${phoneHtml(phones[0])}
      ${phoneHtml(phones[1])}
      ${icon3d("power", { x: 250, y: 820, size: 230, ground: "electric" })}
      `,
    }),
};
