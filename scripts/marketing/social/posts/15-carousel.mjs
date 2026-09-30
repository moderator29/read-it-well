/* 15-17 · The carousel. One 3240 x 1350 Night ground cut into three 1080 x
 * 1350 slides; the ground runs on without a join and every seam crosses only
 * ground. Three slides in one grammar from the product's own words: homes to
 * rent or buy (the example terrace in Karsana, for sale), stays by the night
 * (the example Lagoon Crest Resort at ₦150,000 per night) and tables for
 * tonight (the restaurants list, Example on every card). One bleed phone and
 * one 3D icon per slide; each phone's scale is chosen so the frame's foot
 * falls in an empty band of its screen: under the price, under the nightly
 * rate, between the two restaurant cards. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 3240;
const H = 1350;
const P = 1080;
const SLIDES = [
  { screen: "listing-sale", w: 660, head: ["<k>Homes,</k>", "to rent or buy."], sub: "Listings with the price up front.", icon: "buy" },
  { screen: "stay", w: 640, head: ["<k>Stays,</k>", "by the night."], sub: "Pick a place, then pick your dates.", icon: "hotel" },
  { screen: "restaurants", w: 644, head: ["<k>Tables,</k>", "for tonight."], sub: "See the opening hours before you go.", icon: "restaurant",
    edgeBand: [1586, 1691, "the first card's foot and the gap to the second card; one card border, no text"] },
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
  phones: SLIDES.map((s, i) => phone(s.screen, "night", PLACE.bleed({ w: s.w, cx: i * P + 540 }), s.edgeBand ? { edgeBand: s.edgeBand } : {})),
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
