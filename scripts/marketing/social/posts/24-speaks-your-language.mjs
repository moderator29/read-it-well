/* 24 · "In your language." Night. The literal proof: the first welcome
 * slide's headline as captured in each of the app's four languages, English,
 * Hausa, Yorùbá and Igbo ("Two worlds. One platform." and its three
 * translations), cut with air round every accent and descender and set in
 * one edged panel with hairlines between them, at 0.66x. Nothing here says the
 * assistant answers in these languages. A pin with a speech bubble (local
 * talk) is the post's 3D icon, in slot A. */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { componentHeight, frame, headline, icon3d, subline } from "../lib/premium.mjs";
import { CACHE, SOURCE } from "../lib/paths.mjs";
import { u } from "../lib/render.mjs";

const W = 1080;
const H = 1350;
const PW = 920;
const PAD = 24;
const CW = PW - 2 * PAD;
const TOP = 480;
/* each headline cut from its own capture, 28 rows of air above and below */
const CROPS = [
  { id: "welcome-1", crop: { x: 0, y: 1957, w: 1320, h: 233 } },
  { id: "welcome-ha", crop: { x: 0, y: 1954, w: 1320, h: 236 } },
  { id: "welcome-yo", crop: { x: 0, y: 1954, w: 1320, h: 236 } },
  { id: "welcome-ig", crop: { x: 0, y: 1796, w: 1320, h: 229 } },
];

export default {
  id: "24",
  file: "24-speaks-your-language.png",
  W,
  H,
  html: async () => {
    const dir = join(CACHE, "comp");
    await mkdir(dir, { recursive: true });
    let y = PAD;
    const rows = [];
    for (const [i, c] of CROPS.entries()) {
      const file = join(dir, `${c.id}-${c.crop.x}-${c.crop.y}-${c.crop.w}-${c.crop.h}.png`);
      if (!existsSync(file)) await sharp(join(SOURCE, `${c.id}.webp`)).extract({ left: c.crop.x, top: c.crop.y, width: c.crop.w, height: c.crop.h }).png().toFile(file);
      const h = componentHeight(c.crop, CW);
      if (i) rows.push(`<div style="position:absolute;left:${PAD}px;top:${y}px;width:${CW}px;height:1px;background:rgba(130,178,255,.10)"></div>`), (y += 1);
      rows.push(`<img src="${u(file)}" alt="" style="position:absolute;left:${PAD}px;top:${y}px;width:${CW}px;height:${h}px">`);
      y += h;
    }
    const PH = y + PAD;
    return frame({
      W,
      H,
      ground: "night",
      body: `
      ${headline(["In your", "<k>language.</k>"], { W, H })}
      ${subline("Vallo speaks English, Hausa, Yorùbá and Igbo.", { W, H })}
      <div style="position:absolute;left:80px;top:${TOP}px;width:${PW}px;height:${PH}px;border-radius:36px;overflow:hidden;background:#010118;
          box-shadow:0 60px 110px -30px rgba(0,0,10,.8), 0 18px 40px -14px rgba(0,0,20,.5), 0 0 0 1.5px rgba(130,178,255,.24)">${rows.join("")}</div>
      ${icon3d("local-talks", { W, H, slot: "A" })}
      `,
    });
  },
};
