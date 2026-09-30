/* 20 · Story. "Book a room in a few taps." A resort pool at dusk above, the
 * stay search with three nights picked (16 to 19 October, 2 guests) below,
 * and the booking arriving over the phone's edge. The pop-up sits on the
 * search screen, never on a stay page that says no such property exists. */
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
  html: ({ W, H, phones }) =>
    page({
      W,
      H,
      bg: "#030824",
      css: `
      .ph{position:absolute;left:-330px;top:120px;width:1740px;height:1305px;object-fit:cover;object-position:50% 50%}
      .fade{position:absolute;left:0;right:0;top:0;height:1520px;background:
        linear-gradient(180deg,#030824 0%,rgba(3,8,36,.94) 10%,rgba(3,8,36,.62) 30%,rgba(3,8,36,.12) 44%,rgba(3,8,36,0) 52%,rgba(3,8,36,.55) 70%,#030824 86%)}
      .glow{position:absolute;left:50%;top:1250px;width:1200px;height:900px;margin-left:-600px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(0,105,254,.35),rgba(0,105,254,0))}
      .head{position:absolute;left:84px;top:268px;font-size:112px;color:#fff;line-height:1.0;text-shadow:0 6px 40px rgba(0,0,20,.45)}
      .sub{position:absolute;left:88px;top:512px;width:720px;font:500 34px/1.38 Inter;color:rgba(236,242,255,.9);text-shadow:0 2px 20px rgba(0,0,20,.6)}
      `,
      body: `
      <img class="ph" src="${photo("resort-pool-deck")}" alt="">
      <div class="fade"></div>
      <div class="glow"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      <div class="head h">Book a room<br><span style="color:#9FD8FF">in a few taps.</span></div>
      <div class="sub">Hotels, shortlets and resorts across Nigeria.</div>
      <div class="abs" style="left:56px;top:1452px">${popup({ theme: "dark", icon: { sticker: "1f6ce-fe0f" }, title: "Room booked", sub: "Lagoon Crest Resort · 3 nights", chipText: "Example", time: "now", width: 600 })}</div>
      `,
    }),
};
