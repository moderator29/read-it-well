/* 19 · "Talk to the owner, landlord or agent." Night. The conversation on one
 * bleed phone at 0.53x: the rental enquiry with Vallo Examples and the first
 * listing they shared, readable at feed size. The frame's foot falls in the
 * gap between the two shared listing cards. Two people are the post's 3D
 * icon, in the left column. No pop-up: the screen shows no reply. */
import { PLACE, frame, headline, icon3d, phone, subline } from "../lib/premium.mjs";
import { phoneHtml } from "../lib/kit.mjs";

const W = 1080;
const H = 1350;

export default {
  id: "19",
  file: "19-talk-to-the-owner.png",
  W,
  H,
  phones: [phone("thread", "night", PLACE.bleed({ w: 745, cx: 668 }))],
  html: ({ phones }) =>
    frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["Talk to the <k>owner,</k>", "landlord or agent."], { W, H })}
      ${subline("Message them straight from the listing.", { W, H })}
      ${phoneHtml(phones[0])}
      ${icon3d("team", { W, H, slot: "B", cy: (490 + H) / 2 })}
      `,
    }),
};
