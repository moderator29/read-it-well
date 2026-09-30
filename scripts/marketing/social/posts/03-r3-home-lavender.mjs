/* R3 · after IMG_6730: a small, straight phone with room around it, on a pale
 * blue-lavender ground. The home screen in the app's light theme. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";

export default {
  id: "03",
  file: "03-r3-home-lavender.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "home-light", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 880, cx: 540, cy: 708, shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16 } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#E7E9FA",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(58% 44% at 50% 50%, rgba(250,250,255,.95), rgba(250,250,255,0) 70%),
        radial-gradient(60% 40% at 0% 0%, rgba(206,214,255,.9), rgba(206,214,255,0) 70%),
        radial-gradient(60% 40% at 100% 100%, rgba(222,212,255,.9), rgba(222,212,255,0) 70%),
        linear-gradient(180deg,#E3E7FB 0%,#EAE8FA 60%,#E6E1F8 100%)}
      .ring{position:absolute;left:50%;top:708px;width:980px;height:980px;margin:-490px 0 0 -490px;border-radius:50%;
        border:1.5px solid rgba(255,255,255,.7);box-shadow:inset 0 0 120px rgba(255,255,255,.35)}
      .ring2{width:760px;height:760px;margin:-380px 0 0 -380px;border-color:rgba(255,255,255,.55)}
      `,
      body: `
      <div class="ground"></div>
      <div class="ring"></div><div class="ring ring2"></div>
      ${grain(0.045, "soft-light")}
      ${phoneHtml(phones[0], { shadowOpacity: 0.8 })}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Home" })}
      `,
    }),
};
