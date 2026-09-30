/* 19 · "Talk straight to the owner." The conversation screen, with the
 * owner's reply arriving over the phone's edge. Two glows, blue and warm,
 * for the two people in the conversation. */
import { grain, page, phoneHtml, popup } from "../lib/kit.mjs";

export default {
  id: "19",
  file: "19-talk-to-the-owner.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "thread", model: "island", color: "natural-titanium", rotation: { x: -6, y: -16, z: -4 }, fov: 30, h: 1120, cx: 668, top: 428,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25, color: "#00010F" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#030724",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(44% 36% at 88% 58%, rgba(0,105,254,.45), rgba(0,105,254,0) 70%),
        radial-gradient(40% 32% at 8% 78%, rgba(255,120,50,.26), rgba(255,120,50,0) 70%),
        radial-gradient(60% 40% at 30% 0%, rgba(92,159,255,.16), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#050B3A 0%,#030724 100%)}
      .head{position:absolute;left:78px;top:88px;font-size:100px;color:#fff;line-height:1.0}
      .sub{position:absolute;left:82px;top:318px;width:640px;font:500 31px/1.38 Inter;color:rgba(214,226,255,.78);letter-spacing:-.01em}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">Talk straight<br><span class="accent-d">to the owner.</span></div>
      <div class="sub">The owner, the landlord or the agent, right inside the app.</div>
      <div class="abs" style="left:64px;top:1036px">${popup({ theme: "dark", icon: { sticker: "1f4ac" }, title: "New message", sub: "The owner replied", time: "now", width: 540 })}</div>
      `,
    }),
};
