/* R10 · after IMG_6737: the steep close-up of the phone's lower half, the
 * buttons running big across the glass. Like the reference pair (IMG_6737 and
 * IMG_6738 show one welcome screen's two halves), this is the lower half of
 * the last welcome screen and R11 is its upper half. The Android handset in
 * silver over deep navy; the screen's move-in total card lifts off, keys and
 * a party popper float in the dark. (Sign-in is not used: its email field
 * would put an address on screen.) */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { partOff } from "../lib/parts.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "10",
  file: "10-r10-create-account-closeup.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "welcome-4", model: "android", color: "silver", rotation: { x: -36, y: -15, z: -14 }, fov: 52, w: 960, cx: 560, bottom: 1200, envIntensity: 1.1,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#000012" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#020620",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(55% 45% at 58% 42%, rgba(0,105,254,.42), rgba(0,105,254,0) 72%),
        radial-gradient(60% 40% at 0% 100%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(170deg,#061040 0%,#030A30 55%,#020620 100%)}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${obj("coin", { x: 140, y: 690, size: 110, rot: 20, depth: "far" })}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${await partOff("welcome4-total", phones[0], { grow: 1.14, dy: -34, theme: "dark", radius: 34 })}
      ${obj("celebrate", { x: 170, y: 250, size: 210, rot: -14 })}
      ${obj("keys", { x: 980, y: 1180, size: 240, rot: 26, depth: "near" })}
      ${sparkles([{ x: 300, y: 140, s: 24 }, { x: 328, y: 176, s: 9, kind: "dot", c: "#FFB27A" }, { x: 60, y: 420, s: 14, c: "#FFB27A" }])}
      <div class="abs" style="left:56px;top:1262px">${titlePill("Ready when <b>you are</b>", { theme: "dark", size: 22 })}</div>
      `,
    }),
};
