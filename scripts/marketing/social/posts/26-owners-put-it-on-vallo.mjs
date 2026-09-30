/* 26 · Owners. "Have a property? Put it on Vallo." In daylight, business-like:
 * on a laptop (drawn in CSS, no maker's marks) the page that asks what you
 * have (a hotel, a shortlet, a restaurant, a property to rent or sell), and
 * in front of it a phone showing how a place looks on Vallo: the example
 * villa with its full move-in cost. */
import { join } from "node:path";
import { grain, laptop, page, phoneHtml, pill } from "../lib/kit.mjs";
import { SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const LX = 690; // laptop left
const LY = 190; // laptop top

export default {
  id: "26",
  file: "26-owners-put-it-on-vallo.png",
  W: 1600,
  H: 900,
  phones: [
    { screen: "listing", model: "island", color: "natural-titanium", rotation: { x: 0, y: -14, z: 0 }, fov: 24, h: 560, cx: 748, bottom: 858,
      shadow: { type: "drop", opacity: 0.32, ambientOpacity: 0.18, color: "#101A4A" } },
  ],
  html: ({ W, H, phones }) => {
    const lap = laptop({ src: u(join(SOURCE, "d-host-start.webp")), w: 720, metal: "silver" });
    return page({
      W,
      H,
      bg: "#EEF1F7",
      css: `
      .ground{position:absolute;inset:0;background:
        radial-gradient(45% 60% at 72% 40%, rgba(255,255,255,.95), rgba(255,255,255,0) 70%),
        radial-gradient(40% 50% at 100% 100%, rgba(197,216,255,.8), rgba(197,216,255,0) 70%),
        radial-gradient(35% 45% at 0% 0%, rgba(214,226,255,.7), rgba(214,226,255,0) 70%),
        linear-gradient(180deg,#F5F7FB 0%,#E9EDF5 100%)}
      .desk{position:absolute;left:${LX - 60}px;top:${LY + lap.height - 16}px;width:${lap.width + 120}px;height:60px;border-radius:50%;
        background:radial-gradient(closest-side,rgba(16,26,74,.30),rgba(16,26,74,0));filter:blur(6px)}
      .eyebrow{position:absolute;left:84px;top:118px}
      .head{position:absolute;left:84px;top:196px;font-size:62px;color:#070B2A;line-height:1.05}
      .sub{position:absolute;left:88px;top:362px;width:440px;font:500 25px/1.46 Inter;color:#3B4262}
      `,
      body: `
      <div class="ground"></div>
      ${grain(0.035, "soft-light")}
      <div class="desk"></div>
      <div class="abs" style="left:${LX}px;top:${LY}px;filter:drop-shadow(0 40px 60px rgba(16,26,74,.16))">${lap.html}</div>
      ${phoneHtml(phones[0], { shadowOpacity: 0.9 })}
      <div class="eyebrow">${pill("For owners, hosts, hotels and restaurants", { theme: "light", size: 18 })}</div>
      <div class="head h">Have a property?<br><span class="accent-l">Put it on Vallo.</span></div>
      <div class="sub">Homes to rent or sell, hotels, shortlets and restaurants. A person on our team reads every application.</div>
      `,
    });
  },
};
