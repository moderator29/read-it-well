/**
 * Photoreal handsets from the 3D studio (scripts/marketing/phone3d), sized
 * for the store images and cached on disk.
 *
 *   const phones = new Phones({ res: 2 });
 *   const p = await phones.render({ screen, model: "island", rotation, fov, height: 2100 });
 *   // p.file: transparent PNG, p.bbox: the handset's box in that PNG (px),
 *   // p.scale: CSS px per PNG px so the handset is `height` CSS px tall.
 *   await phones.close();
 *
 * `height` is the handset's height in the finished image (1x pixels). The
 * studio draws it `res` times larger, so a page rendered at deviceScaleFactor
 * `res` shows it pixel for pixel before the Lanczos step brings it down.
 *
 * The studio frames the handset to a fraction of its canvas; a small probe
 * render finds the box a pose makes, and the real render is sized from it,
 * with room around the handset.
 *
 * The light is the studio's "night" set (phone3d/browser/look.js): a ring of
 * light around the phone, so the rounded front edge of the frame reads as one
 * continuous highlight on all four sides against the near-black ground. The
 * Android's front edge is narrower (0.36 mm against the island's 0.62), so
 * its ring is wider and brighter (ANDROID_NIGHT). There is no shadow: on the
 * night ground it cannot read.
 *
 * renderFlat() draws the same handset twice, once with a black display and
 * once with a white one. The compositor uses the pair to lay the capture onto
 * the display as a flat layer brought down in one Lanczos step (see
 * compose.mjs), which is sharper than any texture the studio can sample.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { MARKETING } from "./lib.mjs";

const CACHE = join(MARKETING, "node_modules", ".cache", "store-phones");
mkdirSync(CACHE, { recursive: true });

const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 20);
const fileHash = new Map();
function contentHash(file) {
  const st = statSync(file);
  const k = `${file}:${st.mtimeMs}:${st.size}`;
  if (!fileHash.has(k)) fileHash.set(k, hash(readFileSync(file)));
  return fileHash.get(k);
}

/** The studio's "night" ring, wider and brighter, for the Android's narrow front edge. */
function ring({ phiMin, phiMax, intensity, radius = 3 }) {
  const z1 = radius / Math.tan((phiMin * Math.PI) / 180);
  const z0 = radius / Math.tan((phiMax * Math.PI) / 180);
  const arc = (name, from, to) => ({ name, radius, z0, z1, from, to, intensity });
  return {
    blur: 0.03,
    room: { wall: 0.12, lightScale: 0.3, pointScale: 0.45, dropFront: true },
    panels: [
      { name: "topBig", pos: [0, 12, -5], size: [30, 20], intensity: 3.6 },
      { name: "topFront", pos: [-2, 10, 6], size: [20, 3], intensity: 5.5 },
      { name: "rimL", pos: [-12, 2, -4], size: [3.4, 24], intensity: 12 },
      { name: "rimR", pos: [12, 2, -2], size: [3.4, 24], intensity: 10 },
      { name: "floor", pos: [0, -10, 2], size: [30, 24], intensity: 0.5 },
    ],
    arcs: [arc("ringBottom", -50, 50), arc("ringRight", 40, 140), arc("ringTop", 130, 230), arc("ringLeft", 220, 320)],
  };
}
export const ANDROID_NIGHT = ring({ phiMin: 24, phiMax: 110, intensity: 10 });
export const envFor = (model) => (model === "android" ? ANDROID_NIGHT : "night");

/* Solid displays for renderFlat(). */
const SOLID = {};
async function solid(name) {
  if (!SOLID[name]) {
    const file = join(CACHE, `display-${name}.png`);
    if (!existsSync(file)) {
      const c = name === "white" ? 255 : 0;
      await sharp({ create: { width: 1320, height: 2868, channels: 3, background: { r: c, g: c, b: c } } }).png().toFile(file);
    }
    SOLID[name] = file;
  }
  return SOLID[name];
}

export class Phones {
  constructor({ res = 2, verbose = false } = {}) {
    this.res = res;
    this.verbose = verbose;
    this.studio = null;
  }

  async ensure() {
    if (!this.studio) {
      const { createPhoneStudio } = await import("../phone3d/studio.mjs");
      this.studio = await createPhoneStudio({ verbose: false });
    }
    return this.studio;
  }

  /**
   * @param {object} o
   * @param {string} o.screen        display PNG (1320 x 2868)
   * @param {string} o.model         "island" | "android"
   * @param {string} [o.color]
   * @param {object} [o.rotation]    degrees {x, y, z} (see phone3d/poses.mjs)
   * @param {number} [o.fov]
   * @param {number} o.height        handset height in the finished image (px)
   * @param {object|string} [o.shadow]
   */
  async render(o) {
    const opts = {
      model: o.model,
      color: o.color || "black-titanium",
      rotation: { x: 0, y: 0, z: 0, ...(o.rotation || {}) },
      fov: o.fov ?? 24,
      shadow: o.shadow ?? { type: "none" },
      reflection: o.reflection ?? 0.06,
      exposure: o.exposure ?? 1.0,
      env: o.env ?? envFor(o.model),
      envIntensity: o.envIntensity ?? 1.0,
      keyLight: o.keyLight ?? 1.0,
    };
    const res = o.res ?? this.res;
    const key = hash(JSON.stringify({ ...opts, h: Math.round(o.height), res, s: contentHash(o.screen), v: 5 }));
    const png = join(CACHE, `${key}.png`);
    const meta = join(CACHE, `${key}.json`);
    if (existsSync(png) && existsSync(meta)) return { file: png, ...JSON.parse(readFileSync(meta, "utf8")) };

    const studio = await this.ensure();
    /* Probe: the box this pose makes on a known canvas. */
    const probeKey = hash(JSON.stringify({ ...opts, shadow: null, probe: 3 }));
    const probeFile = join(CACHE, `probe-${probeKey}.json`);
    let probe;
    if (existsSync(probeFile)) probe = JSON.parse(readFileSync(probeFile, "utf8"));
    else {
      const r = await studio.render({ ...opts, screen: o.screen, width: 400, height: 800, fill: 0.8, supersample: 1, shadow: { type: "none" } });
      probe = { bbox: r.bbox };
      writeFileSync(probeFile, JSON.stringify(probe));
    }
    /* The real canvas: the probe's, scaled so the handset is height*res tall,
       then widened to the handset's own aspect with a margin. */
    const target = o.height * res;
    const k = target / probe.bbox.height;
    const bw = probe.bbox.width * k;
    const margin = opts.shadow?.type && opts.shadow.type !== "none" ? 0.13 : 0.04;
    const width = Math.round(bw / (1 - 2 * margin));
    const height = Math.round(target / (1 - 2 * margin));
    const fill = 1 - 2 * margin;
    const t0 = performance.now();
    const r = await studio.render({ ...opts, screen: o.screen, width, height, fill, supersample: o.supersample ?? 2 });
    writeFileSync(png, r.png);
    const ic = r.screenImage.corners;
    const imageQuad = [ic.topLeft, ic.topRight, ic.bottomRight, ic.bottomLeft].map(({ x, y }) => [x, y]);
    const info = { width, height, bbox: r.bbox, screenQuad: r.screenQuad, imageQuad, image: [r.screenImage.width, r.screenImage.height], scale: o.height / r.bbox.height, res };
    writeFileSync(meta, JSON.stringify(info));
    if (this.verbose) console.log(`  phone ${o.model} ${width}x${height} ${Math.round(performance.now() - t0)}ms`);
    return { file: png, ...info };
  }

  /**
   * The handset twice, with a black display and with a white one (same pose,
   * size and light, so the same pixels everywhere but the display).
   */
  async renderFlat(o) {
    const black = await this.render({ ...o, screen: await solid("black") });
    const white = await this.render({ ...o, screen: await solid("white") });
    return { black, white, camera: await camera(white) };
  }

  async close() {
    if (this.studio) await this.studio.close();
    this.studio = null;
  }
}

/**
 * The camera cut-out (island or punch hole) of a straight-on handset, as a box
 * in its PNG's pixels: the dark pixels in the top eighth of its white display.
 */
async function camera(white) {
  const { data, info } = await sharp(white.file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [tl, tr, br, bl] = white.screenQuad;
  /* the middle three fifths across, clear of the display's rounded corners */
  const qw = Math.min(tr[0], br[0]) - Math.max(tl[0], bl[0]);
  const x0 = Math.ceil(Math.max(tl[0], bl[0]) + qw * 0.2);
  const x1 = Math.floor(Math.min(tr[0], br[0]) - qw * 0.2);
  const y0 = Math.ceil(Math.max(tl[1], tr[1])) + 4;
  const y1 = Math.floor(y0 + (Math.min(bl[1], br[1]) - y0) / 8);
  let cx0 = Infinity, cy0 = Infinity, cx1 = -1, cy1 = -1;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * info.width + x) * 4;
      if (data[i] + data[i + 1] + data[i + 2] < 240) {
        cx0 = Math.min(cx0, x); cx1 = Math.max(cx1, x); cy0 = Math.min(cy0, y); cy1 = Math.max(cy1, y);
      }
    }
  }
  return cx1 < 0 ? null : { x: cx0, y: cy0, r: cx1 + 1, b: cy1 + 1 };
}
