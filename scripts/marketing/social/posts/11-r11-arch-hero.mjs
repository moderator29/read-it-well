/* R11 · after IMG_6738: the top of the phone seen from below, leaning away,
 * the art filling the glass. The upper half of the last welcome screen (R10
 * is its lower half), on a warm peach ground that answers the orange arch. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "11",
  file: "11-r11-arch-hero.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-4", model: "island", color: "black-titanium", rotation: { x: -28, y: -18, z: 13 }, fov: 38, w: 920, cx: 548, top: 142,
      shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#5A2A10" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#FCEBDF",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 45% at 78% 18%, rgba(255,255,255,.85), rgba(255,255,255,0) 70%),
        radial-gradient(70% 55% at 10% 90%, rgba(255,178,122,.55), rgba(255,178,122,0) 70%),
        radial-gradient(50% 40% at 100% 100%, rgba(255,140,80,.35), rgba(255,140,80,0) 70%),
        linear-gradient(170deg,#FFF6EF 0%,#FDEADF 50%,#FAD9C4 100%)}
      .sun{position:absolute;left:-180px;top:720px;width:760px;height:760px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,150,90,.45),rgba(255,150,90,0));filter:blur(10px)}
      `,
      body: `
      <div class="ground"></div>
      <div class="sun"></div>
      ${grain(0.05, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.8 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Ready when you are", style: "color:#8A5A44" })}
      `,
    }),
};
