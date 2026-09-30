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
 * with room around the handset for its shadow.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
      color: o.color || (o.model === "android" ? "black-titanium" : "black-titanium"),
      rotation: { x: 0, y: 0, z: 0, ...(o.rotation || {}) },
      fov: o.fov ?? 24,
      shadow: o.shadow ?? { type: "drop", opacity: 0.34 },
      reflection: o.reflection ?? 0.12,
      exposure: o.exposure ?? 1.0,
      envIntensity: o.envIntensity ?? 1.0,
      keyLight: o.keyLight ?? 1.0,
    };
    const res = o.res ?? this.res;
    const key = hash(JSON.stringify({ ...opts, h: Math.round(o.height), res, s: contentHash(o.screen), v: 4 }));
    const png = join(CACHE, `${key}.png`);
    const meta = join(CACHE, `${key}.json`);
    if (existsSync(png) && existsSync(meta)) return { file: png, ...JSON.parse(readFileSync(meta, "utf8")) };

    const studio = await this.ensure();
    /* Probe: the box this pose makes on a known canvas. */
    const probeKey = hash(JSON.stringify({ ...opts, shadow: null, probe: 2 }));
    const probeFile = join(CACHE, `probe-${probeKey}.json`);
    let probe;
    if (existsSync(probeFile)) probe = JSON.parse(readFileSync(probeFile, "utf8"));
    else {
      const r = await studio.render({ ...opts, screen: o.screen, width: 400, height: 800, fill: 0.8, supersample: 1, shadow: { type: "none" } });
      probe = { bbox: r.bbox };
      writeFileSync(probeFile, JSON.stringify(probe));
    }
    /* The real canvas: the probe's, scaled so the handset is height*res tall,
       then widened to the handset's own aspect with a margin for the shadow. */
    const target = o.height * res;
    const k = target / probe.bbox.height;
    const bw = probe.bbox.width * k;
    const margin = 0.13;
    const width = Math.round(bw / (1 - 2 * margin));
    const height = Math.round(target / (1 - 2 * margin));
    const fill = 1 - 2 * margin;
    const t0 = performance.now();
    const r = await studio.render({ ...opts, screen: o.screen, width, height, fill, supersample: 1 });
    writeFileSync(png, r.png);
    const ic = r.screenImage.corners;
    const imageQuad = [ic.topLeft, ic.topRight, ic.bottomRight, ic.bottomLeft].map(({ x, y }) => [x, y]);
    const info = { width, height, bbox: r.bbox, screenQuad: r.screenQuad, imageQuad, image: [r.screenImage.width, r.screenImage.height], scale: o.height / r.bbox.height, res };
    writeFileSync(meta, JSON.stringify(info));
    if (this.verbose) console.log(`  phone ${o.model} ${width}x${height} ${Math.round(performance.now() - t0)}ms`);
    return { file: png, ...info };
  }

  async close() {
    if (this.studio) await this.studio.close();
    this.studio = null;
  }
}
