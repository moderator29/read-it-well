/* 27 · "Vallo on the web." The signed-in home on a desktop browser, the
 * window turned in space toward the words, the same account as the phone. */
import { join } from "node:path";
import { browser, grain, page } from "../lib/kit.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

export default {
  id: "27",
  file: "27-vallo-on-the-web.png",
  W: 1600,
  H: 900,
  html: ({ W, H }) =>
    page({
      W,
      H,
      bg: "#020624",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(48% 70% at 74% 52%, rgba(0,105,254,.40), rgba(0,105,254,0) 70%),
        radial-gradient(30% 40% at 0% 100%, rgba(92,159,255,.14), rgba(92,159,255,0) 70%),
        linear-gradient(180deg,#050B3A 0%,#020624 100%)}
      .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(143,211,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(143,211,255,.05) 1px,transparent 1px);
        background-size:64px 64px;-webkit-mask-image:radial-gradient(55% 70% at 72% 50%,#000 20%,transparent 75%)}
      .stage{position:absolute;left:668px;top:96px;perspective:2400px;perspective-origin:0% 50%}
      .win{transform:rotateY(20deg) rotateX(2deg);transform-origin:0 50%;
        box-shadow:0 60px 120px rgba(0,0,20,.65), 0 0 0 1px rgba(140,185,255,.18), 0 0 120px rgba(0,105,254,.25);border-radius:22px}
      .head{position:absolute;left:92px;top:268px;font-size:92px;color:#fff;line-height:1.0}
      .sub{position:absolute;left:96px;top:486px;width:440px;font:500 27px/1.45 Inter;color:rgba(214,226,255,.8)}
      .url{position:absolute;left:96px;top:646px;font:600 26px/1 Inter;color:#8FD3FF;letter-spacing:.005em}
      `,
      body: `
      <div class="ground"></div>
      <div class="grid"></div>
      ${grain(0.05, "overlay")}
      <div class="stage"><div class="win">${browser({ src: u(join(SOURCE, "d-home.webp")), w: 1080, theme: "dark" })}</div></div>
      <div class="head h">Vallo<br><span class="accent-d">on the web.</span></div>
      <div class="sub">The same account on your laptop. Search, save and message from a bigger screen.</div>
      <div class="url">vallospaces.com</div>
      `,
    }),
};
