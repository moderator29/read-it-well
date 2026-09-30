/* R11 · after IMG_6738: the top of the phone seen from below, leaning away,
 * the art filling the glass. The upper half of the last welcome screen (R10
 * is its lower half), on a warm peach ground that answers the orange arch;
 * the keys to the door and a villa float in the warm air. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "11",
  file: "11-r11-arch-hero.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-4", model: "island", color: "black-titanium", rotation: { x: -28, y: -18, z: 13 }, fov: 38, w: 900, cx: 560, top: 150,
      shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16, color: "#5A2A10" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#FCEBDF",
      css: `${funCss("light")}
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
      ${obj("villa", { x: 930, y: 190, size: 170, rot: 6, depth: "far", theme: "light" })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.8 })}
      ${obj("keys", { x: 150, y: 960, size: 240, rot: -22, theme: "light" })}
      ${obj("rent", { x: 130, y: 300, size: 170, rot: -10, theme: "light" })}
      ${obj("celebrate", { x: 980, y: 700, size: 180, rot: 16, depth: "near", theme: "light" })}
      ${sparkles([
        { x: 250, y: 190, s: 26, c: "#FF6B1A" }, { x: 280, y: 226, s: 10, kind: "dot", c: "#0069FE" },
        { x: 70, y: 1110, s: 20, c: "#0069FE" }, { x: 900, y: 560, s: 14, c: "#FF6B1A" },
      ])}
      <div class="abs" style="left:56px;top:48px">${titlePill("Ready when <b>you are</b>", { theme: "light", size: 22 })}</div>
      `,
    }),
};
