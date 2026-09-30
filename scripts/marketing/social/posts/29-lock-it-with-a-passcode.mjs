/* 29 · "Lock it with a passcode." The keypad's own digits, set giant and
 * faint, fill the night behind a tilted phone showing "Create your passcode"
 * (four of six dots filled), and the lock turning on arrives over its edge. */
import { grain, page, phoneHtml, popup } from "../lib/kit.mjs";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];

export default {
  id: "29",
  file: "29-lock-it-with-a-passcode.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "passcode-create", model: "android", color: "silver", rotation: { x: -8, y: 18, z: 8 }, fov: 28, h: 1060, cx: 652, top: 356,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } },
  ],
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#02041A",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(45% 36% at 62% 58%, rgba(0,105,254,.42), rgba(0,105,254,0) 72%),
        radial-gradient(60% 40% at 0% 0%, rgba(92,159,255,.12), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#040838 0%,#02041A 100%)}
      .keys{position:absolute;left:-40px;top:250px;width:1160px;display:grid;grid-template-columns:repeat(3,1fr);row-gap:10px;
        font:700 300px/1 Poppins;letter-spacing:-.04em;text-align:center;
        background:linear-gradient(180deg,rgba(143,211,255,.12),rgba(143,211,255,.03));-webkit-background-clip:text;background-clip:text;color:transparent}
      .head{position:absolute;left:82px;top:92px;font-size:88px;color:#fff;line-height:1.02}
      `,
      body: `
      <div class="ground"></div>
      <div class="keys noaudit">${KEYS.map((k) => `<div>${k || "&nbsp;"}</div>`).join("")}</div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">Lock it with<br><span class="accent-d">a passcode.</span></div>
      <div class="abs" style="left:64px;top:302px">${popup({ theme: "dark", icon: { sticker: "1f512" }, title: "Passcode on", sub: "Vallo locks when you step away", time: "now", width: 580 })}</div>
      `,
    }),
};
