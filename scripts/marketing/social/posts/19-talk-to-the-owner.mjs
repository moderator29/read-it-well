/* 19 · "Talk straight to the owner." The sentence runs through the phone:
 * "Talk straight" above it, "to the owner." below it. The conversation's own
 * pieces lift off the glass (who you are talking to, the enquiry, your
 * message), 3D speech bubbles and a bell float in depth, and the owner's
 * reply arrives over the phone's edge. */
import { funCss, obj, ring, sparkles } from "../lib/fun.mjs";
import { part, partOff } from "../lib/parts.mjs";
import { grain, page, phoneHtml, popup } from "../lib/kit.mjs";

export default {
  id: "19",
  file: "19-talk-to-the-owner.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "thread", model: "island", color: "natural-titanium", rotation: { x: -4, y: -14, z: -4 }, fov: 30, h: 860, cx: 560, top: 236,
      shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25, color: "#00010F" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#030724",
      css: `${funCss("dark")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(44% 36% at 88% 50%, rgba(0,105,254,.45), rgba(0,105,254,0) 70%),
        radial-gradient(40% 32% at 8% 70%, rgba(255,120,50,.24), rgba(255,120,50,0) 70%),
        radial-gradient(60% 40% at 30% 0%, rgba(92,159,255,.16), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#050B3A 0%,#030724 100%)}
      .top{position:absolute;left:0;right:0;top:70px;text-align:center;font-size:118px;color:#fff;line-height:1}
      .bot{position:absolute;left:0;right:0;top:1150px;text-align:center;font-size:118px;color:#fff;line-height:1}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.06, "overlay")}
      ${obj("bell", { x: 150, y: 330, size: 150, rot: -14, depth: "far" })}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="top h">Talk straight</div>
      ${await partOff("owner-header", phones[0], { grow: 1.34, dx: 0, dy: -10, theme: "dark", radius: 26 })}
      ${await part("thread-bubble", { x: 520, y: 900, w: 500, rot: 3, theme: "dark", radius: 30 })}
      ${obj("local-talks", { x: 170, y: 575, size: 220, rot: -10 })}
      <div class="abs" style="left:48px;top:770px">${popup({ theme: "dark", icon: { obj: "envelope" }, title: "New message", sub: "The owner replied", time: "now", width: 470 })}</div>
      <div class="bot h">to the <span class="accent-d">owner.</span></div>
      ${ring({ cx: 718, cy: 1204, rx: 214, ry: 84, color: "#8FD3FF", stroke: 4.5, rot: -4 })}
      ${sparkles([{ x: 920, y: 1112, s: 30 }, { x: 954, y: 1150, s: 11, kind: "dot", c: "#FFB27A" }, { x: 890, y: 1086, s: 16, kind: "dash", rot: -40, c: "#FFB27A" }, { x: 120, y: 1240, s: 20, c: "#FFB27A" }])}
      `,
    }),
};
