/* R5 · after IMG_6732: the top of the phone, close, the home screen's header
 * and "Find your next home" big. The ground is night: an electric glow rises
 * behind the phone like a sunrise, Vallo's 3D homes float in the sky above
 * it, and a search glass hangs close to the lens. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "05",
  file: "05-r5-find-your-next-home.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "home", model: "island", color: "black-titanium", rotation: { x: 13, y: 0, z: 0 }, fov: 30, w: 900, cx: 540, top: 318, envIntensity: 1.25, keyLight: 1.2 },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#010118",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 34% at 50% 30%, rgba(0,105,254,.55), rgba(0,105,254,0) 72%),
        radial-gradient(90% 50% at 50% 0%, rgba(92,159,255,.22), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#040B3C 0%,#02063F 30%,#010118 70%)}
      .arc{position:absolute;left:50%;top:288px;width:1500px;height:1500px;margin-left:-750px;border-radius:50%;
        box-shadow:0 -2px 0 rgba(143,211,255,.55), 0 -30px 90px rgba(0,105,254,.55), inset 0 30px 90px rgba(0,105,254,.25)}
      .stars{position:absolute;inset:0;background-image:
        radial-gradient(1.5px 1.5px at 12% 14%, rgba(255,255,255,.8), transparent 60%),
        radial-gradient(1.2px 1.2px at 84% 9%, rgba(255,255,255,.7), transparent 60%),
        radial-gradient(1.4px 1.4px at 70% 21%, rgba(255,255,255,.6), transparent 60%),
        radial-gradient(1.2px 1.2px at 24% 26%, rgba(255,255,255,.5), transparent 60%),
        radial-gradient(1.6px 1.6px at 92% 30%, rgba(255,255,255,.55), transparent 60%),
        radial-gradient(1.3px 1.3px at 6% 34%, rgba(255,255,255,.5), transparent 60%)}
      `,
      body: `
      <div class="ground"></div>
      <div class="stars"></div>
      <div class="arc"></div>
      ${grain(0.06, "overlay")}
      ${obj("apartment", { x: 640, y: 210, size: 120, rot: 4, depth: "far" })}
      ${obj("villa", { x: 196, y: 236, size: 220, rot: -6 })}
      ${obj("keys", { x: 890, y: 214, size: 190, rot: 24 })}
      ${phoneHtml(phones[0])}
      ${obj("search", { x: 950, y: 1180, size: 220, rot: -14, depth: "near" })}
      ${sparkles([
        { x: 420, y: 150, s: 26 }, { x: 452, y: 186, s: 10, kind: "dot", c: "#FFB27A" }, { x: 790, y: 120, s: 18, c: "#FFB27A" },
        { x: 60, y: 340, s: 16 }, { x: 1020, y: 330, s: 12, kind: "dot" },
      ])}
      <div class="abs" style="left:0;right:0;top:44px;display:flex;justify-content:center">${titlePill("Find your next <b>home</b>", { theme: "dark", size: 24 })}</div>
      `,
    }),
};
