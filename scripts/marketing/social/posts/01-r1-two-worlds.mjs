/* R1 · after IMG_6727: one straight dark phone, the onboarding's first screen,
 * on a soft dawn ground (a cool sky above, a peach warmth behind the phone). */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "01",
  file: "01-r1-two-worlds.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-1", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 1100, cx: 540, cy: 716, shadow: { type: "drop", opacity: 0.34, ambientOpacity: 0.16 } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EEF1F8",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(52% 40% at 50% 70%, rgba(255,204,170,.62), rgba(255,204,170,0) 72%),
        radial-gradient(80% 42% at 50% 0%, rgba(197,216,255,.95), rgba(197,216,255,0) 70%),
        radial-gradient(40% 30% at 12% 96%, rgba(255,226,206,.7), rgba(255,226,206,0) 70%),
        linear-gradient(180deg,#E9EEFA 0%,#F1F0F4 52%,#F6EEE8 100%)}
      .halo{position:absolute;left:170px;top:190px;width:740px;height:1040px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,255,255,.75),rgba(255,255,255,0));filter:blur(6px)}
      `,
      body: `
      <div class="ground"></div>
      <div class="halo"></div>
      ${grain(0.05, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Two worlds, one account" })}
      `,
    }),
};
