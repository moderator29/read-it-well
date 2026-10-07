/* R6 · after IMG_6733, posted seventh so the light posts never stack in the
 * profile grid. Mist, so the screen is the light theme: the search filters
 * with Villas picked (the Property type grid, down to its divider), on one bleed phone at the set's size (660 px, x 300 to
 * 960, 0.47x), so the Property type grid and the tick read at feed size. A
 * villa, echoing the picked Villas tile, is the post's 3D icon, in the left
 * column on the phone's centre. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";
import { scrolledDisplay } from "../lib/scroll.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "07",
  file: "07-r6-filter-by-what-you-need.png",
  W,
  H,
  /* the sheet shown down to the divider under Property type, its own white
   * below (the Shape section is left out), so the foot crosses empty sheet */
  phones: async () => [phone(await scrolledDisplay({ id: "filters-villas-lt", offset: 0, page: "viewport", footRows: 262, cutAt: 1310, fill: "#FFFFFF" }), "mist", PLACE.bleed({ w: 660, cx: 630 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "mist",
      body: `
      ${headline(["Filter by <k>exactly</k>", "what you need."], { W, H })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${icon3d("villa", { W, H, slot: "B", cy: (490 + H) / 2, ground: "mist" })}
      `,
    }),
};
