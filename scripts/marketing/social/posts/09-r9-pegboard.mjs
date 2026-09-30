/* R9 · after IMG_6736 (a hand holding the phone against a blue pegboard).
 * No hand: the phone rests against a navy and electric pegboard, drawn here in
 * CSS, casting a close shadow onto it; a key hangs on the next peg. */
import { grain, page, phoneHtml, pill, sticker } from "../lib/kit.mjs";

const P = 74; // hole pitch
const R = 17; // hole radius

export default {
  id: "09",
  file: "09-r9-pegboard.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "stays", model: "island", color: "natural-titanium", rotation: { x: 6, y: -20, z: -11 }, fov: 30, h: 1120, cx: 574, cy: 700,
      shadow: { type: "contact", opacity: 0.7, ambientOpacity: 0.4, color: "#00031A", distance: 40, offset: { x: 64, y: 58 }, blur: 26, ambientBlur: 40 } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#0A2590",
      css: `
      .board{position:absolute;inset:0;background:
        radial-gradient(70% 55% at 22% 18%, rgba(70,120,255,.55), rgba(70,120,255,0) 70%),
        radial-gradient(60% 50% at 90% 100%, rgba(2,6,50,.65), rgba(2,6,50,0) 70%),
        linear-gradient(135deg,#1541D0 0%,#0D2FA8 45%,#081F7C 100%)}
      .holes{position:absolute;inset:0;
        background-image:
          radial-gradient(circle at ${P / 2}px ${P / 2 + 2}px, rgba(140,180,255,.30) ${R - 1}px, rgba(140,180,255,0) ${R + 1.5}px),
          radial-gradient(circle at ${P / 2}px ${P / 2}px, #01051F ${R - 3}px, #020A36 ${R - 0.5}px, rgba(2,10,54,0) ${R + 0.5}px);
        background-size:${P}px ${P}px,${P}px ${P}px;background-position:-6px 8px,-6px 8px}
      .seam{position:absolute;top:0;bottom:0;left:${P * 11 + 18}px;width:14px;background:linear-gradient(90deg,rgba(0,4,30,.55),rgba(0,4,30,.15) 40%,rgba(120,160,255,.18) 60%,rgba(0,4,30,.2))}
      .panel2{position:absolute;top:0;bottom:0;left:${P * 11 + 32}px;right:0;background:linear-gradient(90deg,rgba(0,4,40,.18),rgba(0,4,40,0) 30%)}
      .shade{position:absolute;inset:0;background:radial-gradient(80% 70% at 50% 45%, rgba(0,0,0,0), rgba(0,2,24,.45) 100%)}
      .peg{position:absolute;width:16px;height:46px;border-radius:8px;background:linear-gradient(90deg,#C8CDD8,#F4F6FA 45%,#9AA0B0);box-shadow:4px 10px 10px rgba(0,2,24,.55)}
      .key{position:absolute;transform-origin:72% 26%;transform:rotate(-38deg);filter:drop-shadow(12px 18px 12px rgba(0,2,24,.6))}
      .pin{position:absolute;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFFFFF,#C9CFDC 55%,#8A92A6);box-shadow:3px 6px 8px rgba(0,2,24,.6)}
      `,
      body: `
      <div class="board"></div>
      <div class="holes"></div>
      <div class="panel2"></div>
      <div class="seam"></div>
      <div class="shade"></div>
      <div class="key" style="left:${P * 1 + P / 2 - 6 - 108}px;top:${P * 9 + P / 2 + 8 - 39}px">${sticker("1f511", 150)}</div>
      <div class="pin" style="left:${P * 1 + P / 2 - 6 - 11}px;top:${P * 9 + P / 2 + 8 - 11}px"></div>
      ${grain(0.08, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="abs" style="left:48px;top:44px">${pill("Vallo &nbsp;·&nbsp; Stays", { theme: "dark", size: 19, style: "background:rgba(4,10,50,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      <div class="abs" style="right:48px;top:44px">${pill("vallospaces.com", { theme: "dark", size: 19, style: "background:rgba(4,10,50,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      `,
    }),
};
