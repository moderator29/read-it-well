/* R2 · after IMG_6729: two phones side by side over a giant faded word, on an
 * iridescent ground from the brand's sky blue into its peach. The screens'
 * own pills lift off the glass; 3D icons float between the phones. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { part } from "../lib/parts.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

const PH = { model: "island", color: "silver", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 960, shadow: { type: "drop", opacity: 0.26, ambientOpacity: 0.14 } };

export default {
  id: "02",
  file: "02-r2-one-account.png",
  W: 1080,
  H: 1350,
  phones: [
    { ...PH, screen: "welcome-2", cx: 290, cy: 770 },
    { ...PH, screen: "welcome-3", cx: 790, cy: 770 },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#EEF0FA",
      css: `${funCss("light")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(46% 34% at 8% 30%, rgba(143,196,255,.85), rgba(143,196,255,0) 70%),
        radial-gradient(40% 30% at 96% 22%, rgba(196,186,255,.75), rgba(196,186,255,0) 70%),
        radial-gradient(50% 36% at 92% 88%, rgba(255,190,150,.85), rgba(255,190,150,0) 70%),
        radial-gradient(44% 34% at 4% 92%, rgba(255,214,190,.8), rgba(255,214,190,0) 70%),
        radial-gradient(60% 40% at 50% 55%, rgba(255,255,255,.9), rgba(255,255,255,0) 72%),
        linear-gradient(160deg,#DDE9FF 0%,#EFEAFB 45%,#FFE9DD 100%)}
      .ribbon{position:absolute;border-radius:50%;filter:blur(28px);opacity:.75}
      .word{position:absolute;left:0;right:0;top:136px;text-align:center;font:800 138px/1 Poppins;letter-spacing:-0.04em;
        background:linear-gradient(180deg,#FFFFFF 0%,rgba(255,255,255,.9) 55%,rgba(255,255,255,.62) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
        filter:drop-shadow(0 12px 28px rgba(70,84,190,.22)) drop-shadow(0 2px 2px rgba(70,84,190,.10));white-space:nowrap}
      `,
      body: `
      <div class="ground"></div>
      <div class="ribbon" style="left:-120px;top:520px;width:420px;height:160px;background:linear-gradient(90deg,#9CC6FF,#D9C8FF);transform:rotate(-24deg)"></div>
      <div class="ribbon" style="left:820px;top:980px;width:420px;height:170px;background:linear-gradient(90deg,#FFD0B0,#FFB27A);transform:rotate(-18deg)"></div>
      ${grain(0.05, "soft-light")}
      <div class="word noaudit">ONE<span style="display:inline-block;width:.34em"></span>ACCOUNT</div>
      ${phoneHtml(phones[0], { shadowOpacity: 0.85 })}
      ${phoneHtml(phones[1], { shadowOpacity: 0.85 })}
      ${await part("vallo-record", { x: 26, y: 842, w: 380, rot: -4, theme: "light", radius: 60 })}
      ${await part("pay-on-vallo", { x: 556, y: 916, w: 490, rot: 3, theme: "light", radius: 60 })}
      ${obj("id-check", { x: 96, y: 1262, size: 150, rot: -10, theme: "light" })}
      ${obj("local-talks", { x: 540, y: 1250, size: 170, rot: 6, theme: "light" })}
      ${obj("keys", { x: 1000, y: 330, size: 190, rot: 22, depth: "near", theme: "light" })}
      ${sparkles([
        { x: 150, y: 128, s: 28, c: "#0069FE" }, { x: 116, y: 164, s: 12, kind: "dot", c: "#FF9A5A" },
        { x: 944, y: 124, s: 22, c: "#FF9A5A" }, { x: 972, y: 96, s: 8, kind: "dot", c: "#0069FE" },
      ])}
      <div class="abs" style="left:0;right:0;top:40px;display:flex;justify-content:center">${titlePill("Homes and stays, <b>one</b> account", { theme: "light", size: 22 })}</div>
      `,
    }),
};
