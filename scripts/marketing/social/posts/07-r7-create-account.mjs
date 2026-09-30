/* R7 · after IMG_6734: one whole phone, big and centred, with the quiet
 * corner labels. Here it stands on a dark stage under a soft spotlight,
 * leaning back a little, reflected in a glossy floor. */
import { corners, grain, page, phoneHtml } from "../lib/kit.mjs";
import { u } from "../lib/render.mjs";

const FLOOR = 1150;

export default {
  id: "07",
  file: "07-r7-create-account.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "sign-up", model: "island", color: "silver", rotation: { x: -16, y: 9, z: 0 }, fov: 30, h: 1010, cx: 540, bottom: FLOOR + 4, envIntensity: 1.1 },
  ],
  html: ({ W, H, phones }) => {
    const p = phones[0];
    return page({
      W,
      H,
      bg: "#030724",
      css: `
      .room{position:absolute;inset:0;background:
        radial-gradient(38% 60% at 50% 30%, rgba(40,92,255,.34), rgba(40,92,255,0) 72%),
        radial-gradient(70% 40% at 50% 0%, rgba(92,159,255,.18), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#060D3A 0%,#040930 ${FLOOR - 60}px,#070F3E ${FLOOR}px,#02051C 100%)}
      .beam{position:absolute;left:50%;top:-80px;width:900px;height:${FLOOR + 80}px;margin-left:-450px;
        background:linear-gradient(180deg,rgba(143,211,255,.16),rgba(143,211,255,0) 85%);clip-path:polygon(40% 0,60% 0,100% 100%,0 100%);filter:blur(18px)}
      .floor{position:absolute;left:0;right:0;top:${FLOOR}px;bottom:0;background:
        radial-gradient(46% 60% at 50% 0%, rgba(80,130,255,.22), rgba(80,130,255,0) 70%)}
      .horizon{position:absolute;left:0;right:0;top:${FLOOR}px;height:1px;background:linear-gradient(90deg,rgba(143,211,255,0),rgba(143,211,255,.35),rgba(143,211,255,0))}
      .puddle{position:absolute;left:50%;top:${FLOOR - 26}px;width:620px;height:70px;margin-left:-310px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,0,10,.75),rgba(0,0,10,0));filter:blur(6px)}
      .refl{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 ${FLOOR}px;transform:scaleY(-.72);
        opacity:.22;-webkit-mask-image:linear-gradient(0deg,rgba(0,0,0,.95) ${H - FLOOR - 40}px,rgba(0,0,0,0) ${H - FLOOR + 170}px);filter:blur(1.5px)}
      `,
      body: `
      <div class="room"></div>
      <div class="beam"></div>
      <div class="floor"></div>
      <div class="horizon"></div>
      <img class="refl" src="${u(p.src)}" alt="">
      <div class="puddle"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(p)}
      ${corners({ left: "Vallo &nbsp;·&nbsp; Create your account", theme: "dark" })}
      `,
    });
  },
};
