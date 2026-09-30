/* 21 · Story. "Reserve your table in seconds." A warm restaurant at night
 * fills the frame; the phone shows the restaurants list (Harbour Lights
 * Kitchen opens at 18:00, so 8:00 PM tonight fits, and every card carries its
 * Example chip). The opening time pops off the glass, Vallo's 3D cloche and
 * clock float in the warm light, and the table arrives over the phone's
 * edge. The headline sits low, above the story's reply bar. */
import { funCss, obj, sparkles, squiggle } from "../lib/fun.mjs";
import { partOff } from "../lib/parts.mjs";
import { grain, page, phoneHtml, photo, popup } from "../lib/kit.mjs";

export default {
  id: "21",
  file: "21-story-reserve-a-table.png",
  W: 1080,
  H: 1920,
  phones: [
    { screen: "restaurants", model: "island", color: "black-titanium", rotation: { x: -4, y: -18, z: -5 }, fov: 30, h: 1120, cx: 610, top: 250,
      shadow: { type: "drop", opacity: 0.6, ambientOpacity: 0.3, color: "#0A0300" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#140A08",
      css: `${funCss("dark")}
      .ph{position:absolute;left:-560px;top:0;width:2520px;height:1890px;object-fit:cover;object-position:40% 50%;filter:saturate(1.05)}
      .veil{position:absolute;inset:0;background:
        linear-gradient(180deg,rgba(12,6,4,.55) 0%,rgba(12,6,4,.25) 22%,rgba(12,6,4,.2) 45%,rgba(10,5,4,.78) 66%,#0D0706 80%)}
      .warm{position:absolute;left:50%;top:560px;width:1300px;height:1100px;margin-left:-650px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(255,140,60,.28),rgba(255,140,60,0))}
      .head{position:absolute;left:84px;top:1398px;font-size:96px;color:#fff;line-height:1.0}
      .head .w{background:linear-gradient(92deg,#FFB27A,#FFD8B8);-webkit-background-clip:text;background-clip:text;color:transparent}
      .sub{position:absolute;left:88px;top:1636px;width:820px;font:500 30px/1.36 Inter;color:rgba(255,236,222,.82)}
      `,
      body: `
      <img class="ph" src="${photo("restaurant-03-bar")}" alt="">
      <div class="veil"></div>
      <div class="warm"></div>
      ${grain(0.07, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${await partOff("list-opens-chip", phones[0], { grow: 1.5, dy: -8, theme: "dark", radius: 22 })}
      ${obj("restaurant", { x: 180, y: 440, size: 240, rot: -10 })}
      ${obj("clock", { x: 950, y: 250, size: 170, rot: 12, depth: "far" })}
      ${obj("celebrate", { x: 150, y: 1230, size: 190, rot: -12, depth: "near" })}
      <div class="abs" style="left:372px;top:1016px">${popup({ theme: "dark", icon: { obj: "restaurant" }, title: "Table for 2", sub: "Tonight, 8:00 PM · Harbour Lights Kitchen", chipText: "Example", time: "now", width: 650,
        style: "background:rgba(28,14,10,.86);border-color:rgba(255,178,122,.38);box-shadow:0 40px 90px rgba(0,0,0,.6), 0 8px 24px rgba(0,0,0,.4)" })}</div>
      <div class="head h">Reserve your table<br><span class="w">in seconds.</span></div>
      ${squiggle({ x: 88, y: 1602, w: 440, loops: 8, amp: 16, color: "#FF8A3D", stroke: 5, rot: -2 })}
      ${sparkles([{ x: 560, y: 1520, s: 30, c: "#FFD2B0" }, { x: 596, y: 1556, s: 10, kind: "dot", c: "#FFB27A" }])}
      <div class="sub">Pick a time. The restaurant confirms, and the chat lives inside the reservation.</div>
      `,
    }),
};
