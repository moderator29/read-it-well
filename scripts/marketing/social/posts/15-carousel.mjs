/* 15-17 · The carousel. One 3240 x 1350 Night ground cut into three 1080 x
 * 1350 slides, so the ground runs on without a join; every seam crosses only
 * ground. Each slide names one part of Vallo in the same grid: a home for sale
 * (the example terrace in Karsana), a resort's rooms and amenities (the
 * example Lagoon Crest), and the restaurants list. One big phone and one 3D
 * icon per slide; the brand bar repeats on every slide. */
import { frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 3240;
const H = 1350;
const P = 1080;
const PLACE = { h: 1000, top: 500 };
const SLIDES = [
  { screen: "listing-sale", head: ["<k>Homes,</k>", "to rent or buy."], sub: "Listings with the price up front.", icon: "buy" },
  { screen: "stay-amenities", head: ["<k>Hotels</k> and", "shortlets."], sub: "Rooms, rates and amenities, before you book.", icon: "hotel" },
  { screen: "restaurants", head: ["<k>Restaurants.</k>", "One account."], sub: "See the opening hours before you go.", icon: "restaurant" },
];

export default {
  id: "15",
  file: "15-17-carousel.png",
  W,
  H,
  slices: [
    { file: "15-carousel-1-homes.png", extract: { left: 0, top: 0, width: P, height: H } },
    { file: "16-carousel-2-hotels-and-shortlets.png", extract: { left: P, top: 0, width: P, height: H } },
    { file: "17-carousel-3-restaurants.png", extract: { left: 2 * P, top: 0, width: P, height: H } },
  ],
  phones: SLIDES.map((s, i) => phone(s.screen, "night", { ...PLACE, cx: i * P + 660 })),
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
      ${icon3d(s.icon, { x: i * P + 200, y: 960, size: 210, ground: "night" })}`,
      ).join(""),
    }),
};
