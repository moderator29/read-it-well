/* R7 · after IMG_6734, posted sixth. Night. Sign up, "Create your account":
 * by email, or with an account you already have, on one bleed phone at the
 * set's size (660 px, x 300 to 960, 0.47x), like 07 beside it. The screen is
 * shown down to "Sign up with email", its own ground below (the second
 * button, the empty lower screen and the terms line are left out: at this
 * size the frame's foot would cut the second button). A phone
 * with a code is the post's 3D icon, in slot B on the phone's centre. */
import { PLACE, frame, headline, icon3d, phone } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";
import { scrolledDisplay } from "../lib/scroll.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "06",
  file: "06-r7-sign-up-in-a-minute.png",
  W,
  H,
  phones: async () => [phone(await scrolledDisplay({ id: "sign-up", offset: 0, page: "viewport", cutAt: 1420 }), "night", PLACE.bleed({ w: 660, cx: 630 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Sign up", "in a <k>minute.</k>"], { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("phone-code", { W, H, slot: "B", cy: (490 + H) / 2 })}
      `,
    }),
};
