/* R4 · after IMG_6731: a steep, top-down close-up of the phone's lower half,
 * the move-in breakdown running big across the glass, on a cool mist ground. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "04",
  file: "04-r4-move-in-closeup.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "listing-cost", model: "island", color: "black-titanium", rotation: { x: -36, y: -15, z: -14 }, fov: 52, w: 940, cx: 546, bottom: 1182,
      shadow: { type: "drop", opacity: 0.36, ambientOpacity: 0.2 } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EDF1FA",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(70% 50% at 70% 20%, rgba(255,255,255,.95), rgba(255,255,255,0) 70%),
        radial-gradient(60% 40% at 10% 100%, rgba(203,220,255,.9), rgba(203,220,255,0) 70%),
        linear-gradient(170deg,#F4F7FD 0%,#E9EFFB 60%,#E1E9FA 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.045, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.85 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; What you will actually pay", top: 1284 })}
      `,
    }),
};
