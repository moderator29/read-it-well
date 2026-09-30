/* R3 · after IMG_6730: a small, straight phone with room around it, on a pale
 * blue-lavender ground. The home screen in the app's light theme, with the
 * halo rings turned into orbits for Vallo's 3D icons. */
import { obj, sparkles, titlePill, funCss } from "../lib/fun.mjs";
import { grain, page, phoneHtml } from "../lib/kit.mjs";

const CX = 540;
const CY = 720;

export default {
  id: "03",
  file: "03-r3-home-lavender.png",
  W: 1080,
  H: 1350,
  phones: [
    { screen: "home-light", model: "island", color: "black-titanium", rotation: { x: 0, y: 0, z: 0 }, fov: 20, h: 860, cx: CX, cy: CY, shadow: { type: "drop", opacity: 0.3, ambientOpacity: 0.16 } },
  ],
  html: ({ W, H, phones }) => {
    /* a point on an orbit: radius r, angle a (degrees, 0 = right, clockwise) */
    const at = (r, a) => ({ x: CX + r * Math.cos((a * Math.PI) / 180), y: CY + r * Math.sin((a * Math.PI) / 180) });
    return page({
      W,
      H,
      bg: "#E7E9FA",
      css: `${funCss("light")}
      .ground{position:absolute;inset:0;background:
        radial-gradient(58% 44% at 50% 50%, rgba(250,250,255,.95), rgba(250,250,255,0) 70%),
        radial-gradient(60% 40% at 0% 0%, rgba(206,214,255,.9), rgba(206,214,255,0) 70%),
        radial-gradient(60% 40% at 100% 100%, rgba(222,212,255,.9), rgba(222,212,255,0) 70%),
        linear-gradient(180deg,#E3E7FB 0%,#EAE8FA 60%,#E6E1F8 100%)}
      .ring{position:absolute;left:${CX}px;top:${CY}px;border-radius:50%;transform:translate(-50%,-50%);
        border:1.5px solid rgba(255,255,255,.8);box-shadow:inset 0 0 120px rgba(255,255,255,.3), 0 0 0 1px rgba(120,130,220,.08)}
      `,
      body: `
      <div class="ground"></div>
      <div class="ring" style="width:980px;height:980px"></div>
      <div class="ring" style="width:740px;height:740px"></div>
      ${grain(0.045, "soft-light")}
      ${obj("map", { ...at(490, -128), size: 130, rot: -8, depth: "far", theme: "light" })}
      ${obj("apartment", { ...at(490, 128), size: 120, rot: 6, depth: "far", theme: "light" })}
      ${phoneHtml(phones[0], { shadowOpacity: 0.8 })}
      ${obj("villa", { ...at(370, -150), size: 200, rot: -6, theme: "light" })}
      ${obj("keys", { ...at(370, -22), size: 190, rot: 18, theme: "light" })}
      ${obj("search", { ...at(370, 38), size: 170, rot: -12, theme: "light" })}
      ${obj("saved-heart", { ...at(370, 152), size: 170, rot: -10, theme: "light" })}
      ${obj("rent", { ...at(490, 62), size: 230, rot: 14, depth: "near", theme: "light" })}
      ${sparkles([
        { ...at(430, -60), s: 22, c: "#0069FE" }, { ...at(300, -100), s: 12, kind: "dot", c: "#FF9A5A" },
        { ...at(430, 120), s: 18, c: "#FF9A5A" }, { ...at(470, 172), s: 8, kind: "dot", c: "#0069FE" },
      ])}
      <div class="abs" style="left:0;right:0;top:52px;display:flex;justify-content:center">${titlePill("Find your next <b>home</b>", { theme: "light", size: 24 })}</div>
      `,
    });
  },
};
