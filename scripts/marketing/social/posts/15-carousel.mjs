/* 15-17 · The connected carousel. One 3240 x 1350 panorama cut into three
 * 1080 x 1350 panels, so the seams line up to the pixel: one horizon arc runs
 * across all three, the phones cross the seams, and each panel names one part
 * of Vallo before the last one says it plainly: one app, one account. The
 * cards lifted off each phone repeat what that screen itself shows (these are
 * example pages, so no booking is claimed over them). */
import { grain, page, phoneHtml, popup } from "../lib/kit.mjs";

const W = 3240;
const H = 1350;
const PH = { model: "island", color: "black-titanium", fov: 28, shadow: { type: "drop", opacity: 0.5, ambientOpacity: 0.25, color: "#00010F" } };

export default {
  id: "15",
  file: "15-17-carousel.png",
  W,
  H,
  slices: [
    { file: "15-carousel-1-homes.png", extract: { left: 0, top: 0, width: 1080, height: H } },
    { file: "16-carousel-2-hotels-and-shortlets.png", extract: { left: 1080, top: 0, width: 1080, height: H } },
    { file: "17-carousel-3-restaurants.png", extract: { left: 2160, top: 0, width: 1080, height: H } },
  ],
  phones: [
    { ...PH, screen: "listing", rotation: { x: -6, y: -20, z: -7 }, h: 1130, cx: 905, top: 372 },
    { ...PH, screen: "stay", color: "natural-titanium", rotation: { x: -6, y: 18, z: 6 }, h: 1130, cx: 2065, top: 360 },
    { ...PH, screen: "restaurant", rotation: { x: -6, y: -16, z: -5 }, h: 1100, cx: 2905, top: 420 },
  ],
  html: ({ phones }) =>
    page({
      W,
      H,
      bg: "#020624",
      css: `
      .sky{position:absolute;inset:0;background:
        radial-gradient(22% 40% at 12% 30%, rgba(0,86,208,.30), rgba(0,86,208,0) 70%),
        radial-gradient(26% 46% at 50% 55%, rgba(0,105,254,.42), rgba(0,105,254,0) 70%),
        radial-gradient(22% 44% at 90% 70%, rgba(255,120,50,.30), rgba(255,120,50,0) 70%),
        radial-gradient(18% 30% at 76% 20%, rgba(92,159,255,.16), rgba(92,159,255,0) 70%),
        linear-gradient(90deg,#030833 0%,#041051 34%,#061564 52%,#08104A 72%,#170E3A 100%)}
      .arc{position:absolute;left:-900px;top:760px;width:5040px;height:2300px;border-radius:50%;
        background:radial-gradient(50% 50% at 50% 50%, rgba(3,10,60,0) 60%, rgba(3,10,60,0) 100%);
        box-shadow:0 -2px 0 rgba(143,211,255,.55), 0 -26px 80px rgba(0,105,254,.45), inset 0 40px 120px rgba(0,105,254,.28)}
      .floor{position:absolute;left:-900px;top:760px;width:5040px;height:2300px;border-radius:50%;
        background:linear-gradient(180deg,rgba(4,14,80,.92),rgba(2,6,36,1) 30%)}
      .stars{position:absolute;inset:0;background-image:
        radial-gradient(1.5px 1.5px at 4% 12%, rgba(255,255,255,.75), transparent 60%),
        radial-gradient(1.3px 1.3px at 22% 6%, rgba(255,255,255,.6), transparent 60%),
        radial-gradient(1.4px 1.4px at 31% 24%, rgba(255,255,255,.5), transparent 60%),
        radial-gradient(1.2px 1.2px at 45% 9%, rgba(255,255,255,.6), transparent 60%),
        radial-gradient(1.5px 1.5px at 58% 18%, rgba(255,255,255,.55), transparent 60%),
        radial-gradient(1.3px 1.3px at 67% 5%, rgba(255,255,255,.6), transparent 60%),
        radial-gradient(1.4px 1.4px at 83% 14%, rgba(255,255,255,.5), transparent 60%),
        radial-gradient(1.2px 1.2px at 96% 8%, rgba(255,255,255,.6), transparent 60%)}
      .panel{position:absolute;top:0;width:1080px;height:${H}px}
      .eyebrow{position:absolute;left:92px;top:104px;font:600 22px/1 Inter;letter-spacing:.16em;color:rgba(143,211,255,.8)}
      .title{position:absolute;left:88px;top:148px;font-size:112px;color:#fff;line-height:.98}
      .lede{position:absolute;left:92px;top:292px;width:600px;font:500 30px/1.38 Inter;color:rgba(214,226,255,.78);letter-spacing:-.01em}
      .p1 .title{font-size:132px;top:140px}
      .p3 .title2{position:absolute;left:88px;top:258px;font-size:76px;line-height:1.02}
      `,
      body: `
      <div class="sky"></div>
      <div class="stars"></div>
      <div class="floor"></div>
      <div class="arc"></div>
      ${grain(0.06, "overlay")}
      ${phoneHtml(phones[0], { shadowOpacity: 1 })}
      ${phoneHtml(phones[1], { shadowOpacity: 1 })}
      ${phoneHtml(phones[2], { shadowOpacity: 1 })}

      <div class="panel p1" style="left:0">
        <div class="eyebrow">01 &nbsp;·&nbsp; RENT OR BUY</div>
        <div class="title h">Homes.</div>
        <div class="lede" style="top:300px;width:470px">See the full move-in cost before you call anyone.</div>
      </div>
      <div class="abs" style="left:120px;top:900px">${popup({ theme: "dark", icon: { sticker: "1f511" }, title: "Move-in total", sub: "Rent plus every fee, added up", amount: "₦26,100,000", chipText: "Example", width: 540 })}</div>

      <div class="panel p2" style="left:1080px">
        <div class="eyebrow" style="left:${1300 - 1080}px">02 &nbsp;·&nbsp; STAYS</div>
        <div class="title h" style="left:${1296 - 1080}px">Hotels and<br>shortlets.</div>
        <div class="lede" style="left:${1300 - 1080}px;top:400px;width:390px">Pick your dates and book a room in a few taps.</div>
      </div>
      <div class="abs" style="left:1218px;top:1010px">${popup({ theme: "dark", icon: { sticker: "1f6cf-fe0f" }, title: "₦150,000 a night", sub: "Lagoon Crest Resort · Lekki, Lagos", chipText: "Example", width: 560 })}</div>

      <div class="panel p3" style="left:2160px">
        <div class="eyebrow" style="left:${2384 - 2160}px">03 &nbsp;·&nbsp; TABLES</div>
        <div class="title h" style="left:${2380 - 2160}px;font-size:104px">Restaurants.</div>
        <div class="title2 h accent-d" style="left:${2382 - 2160}px">One app.<br>One account.</div>
      </div>
      <div class="abs" style="left:2232px;top:1062px">${popup({ theme: "dark", icon: { sticker: "1f37d-fe0f" }, title: "Opens at 18:00", sub: "Harbour Lights Kitchen, Victoria Island", chipText: "Example", width: 640 })}</div>
      `,
    }),
};
