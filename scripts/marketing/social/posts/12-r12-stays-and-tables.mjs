/* R12 · after IMG_6739: two phones floating, tilted and turned toward each
 * other, on a blue-violet gradient. Stays on the left, a restaurant on the
 * right: the two halves of going out, in one account. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "12",
  file: "12-r12-stays-and-tables.png",
  W: 1600,
  H: 1200,
  phones: [
    { screen: "stays", model: "island", color: "black-titanium", rotation: { x: -14, y: 26, z: 17 }, fov: 26, h: 900, cx: 652, cy: 522,
      shadow: { type: "drop", opacity: 0.32, ambientOpacity: 0.14, color: "#1A0C66", offset: { x: 30, y: 60 }, blur: 60 } },
    { screen: "restaurant", model: "island", color: "black-titanium", rotation: { x: -18, y: -26, z: -8 }, fov: 26, h: 900, cx: 1030, cy: 684,
      shadow: { type: "drop", opacity: 0.34, ambientOpacity: 0.16, color: "#1A0C66", offset: { x: 20, y: 70 }, blur: 60 } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#6F7BFF",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(45% 55% at 32% 55%, rgba(236,238,255,.95), rgba(236,238,255,0) 70%),
        radial-gradient(50% 60% at 0% 0%, rgba(46,92,255,.9), rgba(46,92,255,0) 70%),
        radial-gradient(55% 60% at 100% 100%, rgba(122,76,255,.95), rgba(122,76,255,0) 70%),
        radial-gradient(40% 50% at 100% 10%, rgba(150,140,255,.8), rgba(150,140,255,0) 70%),
        linear-gradient(135deg,#4E6BFF 0%,#A7B0FF 45%,#8B6CFF 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${phoneHtml(phones[1], { shadowOpacity: 0.9 })}
      ${corners({ left: "", right: "vallospaces.com", theme: "dark", top: 52, side: 60, size: 22, style: "color:#14125A" })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Stays and tables", right: "", theme: "dark", top: 1126, side: 60, size: 22, style: "color:#14125A" })}
      `,
    }),
};
