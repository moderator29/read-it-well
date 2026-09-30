/* R6 · after IMG_6733 (a hand holding the phone). No hand: the phone keeps the
 * held angle and floats in front of the brand's own world, the houses and
 * hotel on their velvet hills, thrown softly out of focus like a lens would. */
import { art, corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "06",
  file: "06-r6-floating-listing.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "listing", model: "island", color: "natural-titanium", rotation: { x: -8, y: -26, z: -14 }, fov: 30, h: 1100, cx: 612, cy: 690,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.25, color: "#000622" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#031066",
      css: `
      .art{position:absolute;left:-300px;top:-210px;width:1500px;height:2000px;object-fit:cover;filter:blur(9px) saturate(1.1)}
      .veil{position:absolute;inset:0;background:
        radial-gradient(60% 45% at 62% 52%, rgba(1,3,40,.0), rgba(1,3,40,.35) 100%),
        linear-gradient(180deg,rgba(2,8,70,.15),rgba(2,8,70,0) 40%,rgba(1,4,40,.45))}
      `,
      body: `
      <img class="art" src="${art(1)}" alt="">
      <div class="veil"></div>
      ${grain(0.07, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Four bedroom villa, Maitama", theme: "dark" })}
      `,
    }),
};
