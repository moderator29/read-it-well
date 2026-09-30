/* R9 · after IMG_6736 (a hand holding the phone against a blue pegboard).
 * No hand: the phone rests against a navy and electric pegboard, drawn in
 * CSS, casting a close shadow onto it. The board is a tool wall for going
 * away: Vallo's 3D keys hang from a pin, the hotel and shortlet tiles are
 * pinned up, and a calendar waits for the dates. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, page, phoneHtml, pill } from "../lib/kit.mjs";

const P = 74; // hole pitch
const R = 17; // hole radius
/* a hole's centre, by column and row */
const hole = (c, r) => ({ x: c * P + P / 2 - 6, y: r * P + P / 2 + 8 });
const pin = (c, r) => {
  const h = hole(c, r);
  return `<div class="pin" style="left:${h.x - 11}px;top:${h.y - 11}px"></div>`;
};

export default {
  id: "09",
  file: "09-r9-pegboard.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "stays", model: "island", color: "natural-titanium", rotation: { x: 6, y: -20, z: -11 }, fov: 30, h: 1080, cx: 600, cy: 716,
      shadow: { type: "contact", opacity: 0.7, ambientOpacity: 0.4, color: "#00031A", distance: 40, offset: { x: 64, y: 58 }, blur: 26, ambientBlur: 40 } },
  ],
  html: async ({ W, H, phones }) => {
    const k = hole(1, 8);
    return page({
      W,
      H,
      bg: "#0A2590",
      css: `${funCss("dark")}
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
      .pin{position:absolute;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FFFFFF,#C9CFDC 55%,#8A92A6);box-shadow:3px 6px 8px rgba(0,2,24,.6);z-index:5}
      .string{position:absolute;width:2px;background:linear-gradient(180deg,#E7ECF7,#AEB7CC);box-shadow:2px 3px 4px rgba(0,2,24,.5)}
      `,
      body: `
      <div class="board"></div>
      <div class="holes"></div>
      <div class="panel2"></div>
      <div class="seam"></div>
      <div class="shade"></div>
      ${await part("stays-hotels", { x: 30, y: 176, w: 250, rot: -6, theme: "dark", radius: 30 })}
      ${pin(2, 2)}
      ${obj("keys", { x: k.x - 12, y: k.y + 96, size: 210, rot: -38 })}
      ${pin(1, 8)}
      ${obj("calendar-booked", { x: 150, y: 1100, size: 190, rot: -8 })}
      ${pin(2, 13)}
      ${grain(0.08, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${await part("stays-shortlets", { x: 838, y: 952, w: 226, rot: 7, theme: "dark", radius: 28 })}
      ${pin(12, 13)}
      ${obj("shortlet", { x: 960, y: 250, size: 200, rot: 8, depth: "near" })}
      ${sparkles([{ x: 330, y: 200, s: 22 }, { x: 350, y: 240, s: 9, kind: "dot", c: "#FFB27A" }, { x: 1010, y: 820, s: 18, c: "#FFB27A" }])}
      <div class="abs" style="left:48px;top:44px">${titlePill("Great <b>stays</b>", { theme: "dark", size: 20, style: "background:rgba(4,10,50,.84)" })}</div>
      <div class="abs" style="right:48px;top:48px">${pill("vallospaces.com", { theme: "dark", size: 19, style: "background:rgba(4,10,50,.84);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)" })}</div>
      `,
    });
  },
};
