/* R7 · after IMG_6734: one phone, leaning back, seen a little from below. Night.
 * Create your account, big, running off the foot of the frame so the screen is
 * all buttons and no empty space. An envelope (sign up with email) is the
 * post's 3D icon. */
import { frame, headline, icon3d } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "07",
  file: "07-r7-your-account-takes-a-minute.png",
  W,
  H,
  phones: [
    { screen: "sign-up", model: "island", color: "black-titanium", rotation: { x: -16, y: 9, z: 0 }, fov: 30, h: 1180, cx: 650, top: 470,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25 } },
  ],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Your account", "takes a <k>minute.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("envelope", { x: 190, y: 900, size: 210, ground: "night" })}
      `,
    }),
};
