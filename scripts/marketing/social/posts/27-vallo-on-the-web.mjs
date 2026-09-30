/* 27 · "Vallo on the web." 16:9, Night. The website's front page ("Rent, buy
 * or stay. Without the runaround."), a public page, shown flat in a plain
 * browser window at the right, never larger than its 2880 px capture. A
 * magnifier is the post's 3D icon (the page's own icons are left alone). */
import { browser, frame, headline, icon3d, subline } from "../lib/premium.mjs";

const W = 1600;
const H = 900;

export default {
  id: "27",
  file: "27-vallo-on-the-web.png",
  W,
  H,
  html: () =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Vallo on", "the <k>web.</k>"], { W, H })}
      ${subline("Same account, bigger screen.", { W, H })}
      ${browser({ id: "d-landing", x: 612, y: 176, w: 900, ground: "night" })}
      ${icon3d("search", { x: 250, y: 660, size: 210, ground: "night" })}
      `,
    }),
};
