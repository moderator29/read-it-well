/* 20 · Story. "Book a room in a few taps." A resort pool at dusk above, the
 * stay search with three nights picked (16 to 19 October, 2 guests) below.
 * The dates pop off the glass, 3D hotel, bed and calendar icons float in the
 * evening air, and the booking arrives over the phone's edge. The pop-up sits
 * on the search screen, never on a stay page that says no such property
 * exists. */
import { funCss, obj, ring, sparkles } from "../lib/fun.mjs";
import { partOff } from "../lib/parts.mjs";
import { grain, page, phoneHtml, photo, popup } from "../lib/kit.mjs";

export default {
  id: "20",
  file: "20-story-book-a-room.png",
  W: 1080,
  H: 1920,
  phones: [
    { screen: "stays-dates", model: "island", color: "natural-titanium", rotation: { x: -4, y: 16, z: 4 }, fov: 30, h: 1200, cx: 600, top: 730,
      shadow: { type: "drop", opacity: 0.55, ambientOpacity: 0.3, color: "#00010F" } },
  ],
  html: async ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#030824",
      css: `${funCss("dark")}
      .ph{position:absolute;left:-330px;top:120px;width:1740px;height:1305px;object-fit:cover;object-position:50% 50%}
      .fade{position:absolute;left:0;right:0;top:0;height:1520px;background:
        linear-gradient(180deg,#030824 0%,rgba(3,8,36,.94) 10%,rgba(3,8,36,.62) 30%,rgba(3,8,36,.12) 44%,rgba(3,8,36,0) 52%,rgba(3,8,36,.55) 70%,#030824 86%)}
      .glow{position:absolute;left:50%;top:1250px;width:1200px;height:900px;margin-left:-600px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,105,254,.35),rgba(0,105,254,0))}
      .head{position:absolute;left:84px;top:262px;font-size:112px;color:#fff;line-height:1.0;text-shadow:0 6px 40px rgba(0,0,20,.45)}
      .sub{position:absolute;left:88px;top:508px;width:720px;font:500 34px/1.38 Inter;color:rgba(236,242,255,.92);text-shadow:0 2px 20px rgba(0,0,20,.6)}
      `,
      body: `
      <img class="ph" src="${photo("resort-pool-deck")}" alt="">
      <div class="fade"></div>
      <div class="glow"></div>
      ${grain(0.06, "overlay")}
      ${obj("stay-rated", { x: 930, y: 640, size: 200, rot: 10 })}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${await partOff("dates", phones[0], { grow: 1.12, dy: -18, theme: "dark", radius: 26 })}
      ${obj("hotel", { x: 150, y: 840, size: 230, rot: -8 })}
      ${obj("calendar-booked", { x: 960, y: 1180, size: 190, rot: 12 })}
      ${obj("keys", { x: 110, y: 1800, size: 240, rot: -24, depth: "near" })}
      <div class="head h">Book a <span style="color:#9FD8FF">room</span><br><span style="color:#9FD8FF">in a few taps.</span></div>
      ${ring({ cx: 560, cy: 318, rx: 196, ry: 78, color: "#FFB27A", stroke: 5, rot: -4 })}
      ${sparkles([{ x: 790, y: 238, s: 34, c: "#FFD2B0" }, { x: 826, y: 282, s: 12, kind: "dot", c: "#8FD3FF" }, { x: 760, y: 210, s: 16, kind: "dash", rot: -40, c: "#FFB27A" }])}
      <div class="sub">Hotels, shortlets and resorts across Nigeria.</div>
      <div class="abs" style="left:56px;top:1452px">${popup({ theme: "dark", icon: { obj: "calendar-booked" }, title: "Room booked", sub: "Lagoon Crest Resort · 3 nights", chipText: "Example", time: "now", width: 600 })}</div>
      `,
    }),
};
