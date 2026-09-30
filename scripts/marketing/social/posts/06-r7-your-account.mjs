/* R7 · after IMG_6734, posted sixth (06 and 07 swap places in the order): one straight phone, whole and centred, with quiet
 * labels in the corners (our brand bar). Night. Sign up: "Create your
 * account", by email or with an account you already have. A phone with a
 * code is the post's 3D icon. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "06",
  file: "06-r7-sign-up-in-a-minute.png",
  W,
  H,
  phones: [phone("sign-up", "night", PLACE.whole())],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Sign up", "in a <k>minute.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("phone-code", { W, H, slot: "B", cy: 440 + 830 / 2 })}
      `,
    }),
};
