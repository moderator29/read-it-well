/* 15-17 · The carousel. One 3240 x 1350 Night ground cut into three 1080 x
 * 1350 slides; the ground runs on without a join and every seam crosses only
 * ground. Three detail pages in one grammar from the product's own words:
 * homes to rent or buy (the example terrace in Karsana, for sale), stays by
 * the night (the example Lagoon Crest Resort at ₦150,000 per night) and
 * tables for tonight (the example Harbour Lights Kitchen, opens at 18:00).
 * One bleed phone at the set's one size (665 px) and one 3D icon per slide.
 * Each page is shown scrolled a little (lib/scroll.mjs: the page's own
 * pixels, and the controls the product keeps on screen, from real captures),
 * so the frame's foot falls on empty page under the chips: text and outlines
 * 33 px or more above it. The home for sale is shown down to its first row of
 * chips (the page's continuation is left out, nothing is added). */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { scrolledDisplay } from "../lib/scroll.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 3240;
const H = 1350;
const P = 1080;
const SLIDES = [
  { scroll: { id: "listing-sale", offset: 282, page: "viewport", footRows: 358, cutAt: 1834 }, head: ["<k>Homes,</k>", "to rent or buy."], sub: "Listings with the price up front.", icon: "buy" },
  { scroll: { id: "stay", offset: 315, page: "full", fixedBack: "stay-amenities" }, head: ["<k>Stays,</k>", "by the night."], sub: "Pick a place, then pick your dates.", icon: "hotel" },
  { scroll: { id: "restaurant", offset: 315, page: "full", fixedBack: "restaurant-hours" }, head: ["<k>Tables,</k>", "for tonight."], sub: "See the opening hours before you go.", icon: "restaurant" },
];

export default {
  id: "15",
  file: "15-17-carousel.png",
  W,
  H,
  slices: [
    { file: "15-carousel-1-homes.png", extract: { left: 0, top: 0, width: P, height: H } },
    { file: "16-carousel-2-stays.png", extract: { left: P, top: 0, width: P, height: H } },
    { file: "17-carousel-3-tables.png", extract: { left: 2 * P, top: 0, width: P, height: H } },
  ],
  phones: async () => Promise.all(SLIDES.map(async (s, i) => phone(await scrolledDisplay(s.scroll), "night", PLACE.bleed({ w: 665, cx: i * P + 540 })))),
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      panels: 3,
      body: SLIDES.map(
        (s, i) => `
      ${headline(s.head, { W: P, H, x: i * P + 80 })}
      ${subline(s.sub, { W: P, H, x: i * P + 80 })}
      ${phoneHtml(phones[i])}
      <div style="position:absolute;left:${i * P}px;top:0;width:${P}px;height:${H}px">${icon3d(s.icon, { W: P, H, slot: "A" })}</div>`,
      ).join(""),
    }),
};
