/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other. Electric. A home for sale on Chevron Drive, and what its listing
 * says about light, water and getting in. A plug is the post's 3D icon. */
import { frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1600;
const H = 1200;

export default {
  id: "12",
  file: "12-r12-light-water-and-getting-in.png",
  W,
  H,
  phones: [
    { screen: "listing-banana", model: "island", color: "black-titanium", rotation: { x: -14, y: 26, z: 17 }, fov: 26, h: 860, cx: 930, cy: 650,
      shadow: { type: "drop", opacity: 0.4, ambientOpacity: 0.2, color: "#001040", offset: { x: 30, y: 60 }, blur: 60 } },
    { screen: "listing-amenities", model: "island", color: "black-titanium", rotation: { x: -18, y: -26, z: -8 }, fov: 26, h: 860, cx: 1310, cy: 730,
      shadow: { type: "drop", opacity: 0.4, ambientOpacity: 0.2, color: "#001040", offset: { x: 20, y: 70 }, blur: 60 } },
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
