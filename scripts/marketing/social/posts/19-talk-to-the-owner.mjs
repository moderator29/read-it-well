/* 19 · "Talk to the owner, landlord or agent." Night. The whole conversation
 * on one phone (a rental enquiry with Vallo Examples, the two listings they
 * shared, and the member's own question at the foot), and the one pop-up the
 * post is about, on the ground beside it: their reply has arrived. The
 * Example chip marks it as an illustration. */
import { SLOT, frame, headline, icon3d, phone, popcard, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "19",
  file: "19-talk-to-the-owner.png",
  W,
  H,
  phones: [phone("thread", "night", { h: 820, cx: 756, top: 486 })],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Talk to the <k>owner,</k>", "landlord or agent."], { W, H })}
      ${subline("Message them straight from the listing.", { W, H })}
      ${phoneHtml(phones[0])}
      ${popcard({ ground: "night", title: "New message", line: "Vallo Examples replied", x: 80, y: 590, width: 440 })}
      ${icon3d("team", { ...SLOT.post.left, size: 210, ground: "night" })}
      `,
    }),
};
