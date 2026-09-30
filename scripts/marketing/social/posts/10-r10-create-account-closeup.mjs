/* R10 · after IMG_6737: the steep close-up of the phone's lower half, the
 * buttons running big across the glass. Like the reference pair (IMG_6737 and
 * IMG_6738 show one welcome screen's two halves), this is the lower half of
 * the last welcome screen and R11 is its upper half. The Android handset in
 * silver, over deep navy lit by the screen. (Sign-in is not used: its email
 * field would put an address on screen.) */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "10",
  file: "10-r10-create-account-closeup.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-4", model: "android", color: "silver", rotation: { x: -36, y: -15, z: -14 }, fov: 52, w: 960, cx: 548, bottom: 1200, envIntensity: 1.1,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#000012" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#020620",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(55% 45% at 58% 42%, rgba(0,105,254,.42), rgba(0,105,254,0) 72%),
        radial-gradient(60% 40% at 0% 100%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(170deg,#061040 0%,#030A30 55%,#020620 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Ready when you are", theme: "dark", top: 1284 })}
      `,
    }),
};
