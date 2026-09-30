/* R6 · after IMG_6733 (a hand holding the phone). No hand: the phone keeps the
 * held angle and floats in front of the brand's own world, thrown softly out
 * of focus. The listing's "For rent" chip lifts off the glass, keys hang
 * close to the lens, and the calendar and chat icons say what comes next. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { art, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "06",
  file: "06-r6-floating-listing.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "listing", model: "island", color: "natural-titanium", rotation: { x: -8, y: -26, z: -14 }, fov: 30, h: 1080, cx: 630, cy: 712,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.25, color: "#000622" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#031066",
      css: `${funCss("dark")}
      .art{position:absolute;left:-300px;top:-210px;width:1500px;height:2000px;object-fit:cover;filter:blur(9px) saturate(1.1)}
      .veil{position:absolute;inset:0;background:
        radial-gradient(60% 45% at 62% 52%, rgba(1,3,40,.0), rgba(1,3,40,.35) 100%),
        linear-gradient(180deg,rgba(2,8,70,.25),rgba(2,8,70,0) 40%,rgba(1,4,40,.45))}
      `,
      body: `
      <img class="art" src="${art(1)}" alt="">
      <div class="veil"></div>
      ${grain(0.07, "overlay")}
      ${obj("calendar-booked", { x: 930, y: 260, size: 170, rot: 10 })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${await part("for-rent-chip", { x: 64, y: 470, w: 330, rot: -8, theme: "dark", radius: 30 })}
      ${obj("local-talks", { x: 176, y: 820, size: 190, rot: -8 })}
      ${obj("keys", { x: 180, y: 1210, size: 250, rot: -28, depth: "near" })}
      ${obj("saved-heart", { x: 980, y: 1000, size: 150, rot: 12, depth: "far" })}
      ${sparkles([{ x: 110, y: 420, s: 24 }, { x: 420, y: 450, s: 12, kind: "dot", c: "#FFB27A" }, { x: 1010, y: 150, s: 16, c: "#FFB27A" }])}
      <div class="abs" style="left:56px;top:48px">${titlePill("Four bedroom villa, <b>Maitama</b>", { theme: "dark", size: 22 })}</div>
      `,
    }),
};
