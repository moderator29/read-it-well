/* R5 · after IMG_6732: the top of the phone, close, the home screen's header
 * and "Find your next home" big. Here the ground is night: an electric glow
 * rises behind the phone like a sunrise over the horizon of its frame. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "05",
  file: "05-r5-find-your-next-home.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "home", model: "island", color: "black-titanium", rotation: { x: 13, y: 0, z: 0 }, fov: 30, w: 930, cx: 540, top: 268, envIntensity: 1.25, keyLight: 1.2 },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#010118",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(60% 34% at 50% 26%, rgba(0,105,254,.55), rgba(0,105,254,0) 72%),
        radial-gradient(90% 50% at 50% 0%, rgba(92,159,255,.22), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#040B3C 0%,#02063F 30%,#010118 70%)}
      .arc{position:absolute;left:50%;top:238px;width:1500px;height:1500px;margin-left:-750px;border-radius:50%;
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
      ${phoneHtml(phones[0])}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Find your next home", theme: "dark" })}
      `,
    }),
};
