/* Photoreal phones from the 3D studio (scripts/marketing/phone3d), placed in a
 * post's own coordinates.
 *
 *   await phoneLayer({ screen: "home", model: "island", rotation: { x: -8, y: 12, z: 4 },
 *                      h: 1100, cx: 540, cy: 720, shadow: "drop" }, { W: 1080, H: 1350, scale: 2 })
 *
 * A phone is rendered into a transparent layer the size of the whole post, so
 * it can run off any edge (close-ups, carousel seams) and the page simply
 * stacks it. `h` (or `w`) is the height (width) of the phone's projected
 * outline in post pixels and cx/cy (or top/bottom/left/right) put that
 * outline where it belongs. The studio's framing is a pure 2D zoom around the
 * frame centre, so one small measuring render gives an exact placement.
 */
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createPhoneStudio } from "../../phone3d/studio.mjs";
import { CACHE, SCREENS } from "./paths.mjs";

let studio = null;
async function getStudio() {
  if (!studio) studio = await createPhoneStudio();
  return studio;
}
export async function closeStudio() {
  if (studio) await studio.close();
  studio = null;
}

/** The display image for a capture id ("home") or a path. */
export function screenFile(screen, model = "island") {
  if (screen.includes("/")) return screen;
  const os = model === "android" ? "android" : "ios";
  const f = join(SCREENS, `${screen}-${os}.png`);
  if (!existsSync(f)) {
    /* layout drafts while captures are still being made: SOCIAL_STANDIN=home */
    const stand = process.env.SOCIAL_STANDIN;
    if (stand && existsSync(join(SCREENS, `${stand}-${os}.png`))) return join(SCREENS, `${stand}-${os}.png`);
    throw new Error(`no display for '${screen}' (${f}); run node scripts/marketing/screens.mjs`);
  }
  return f;
}

const hash = (o) => createHash("sha1").update(JSON.stringify(o)).digest("hex").slice(0, 16);
const measured = new Map();

function lookOf(spec) {
  return {
    model: spec.model || "island",
    color: spec.color,
    pose: spec.pose,
    rotation: spec.rotation,
    fov: spec.fov,
    reflection: spec.reflection,
    exposure: spec.exposure,
    envIntensity: spec.envIntensity,
    keyLight: spec.keyLight,
  };
}

/* Projected outline of the phone as fractions of the frame at fill = F0. */
const F0 = 0.5;
async function measure(spec, W, H) {
  const look = lookOf(spec);
  const k = 240 / Math.max(W, H);
  const w = Math.max(32, Math.round(W * k));
  const h = Math.max(32, Math.round((w * H) / W));
  const key = hash({ look, w, h, screen: "m" });
  if (measured.has(key)) return measured.get(key);
  const file = join(CACHE, "phones", `m-${key}.json`);
  if (existsSync(file)) {
    const m = JSON.parse(await readFile(file, "utf8"));
    measured.set(key, m);
    return m;
  }
  const s = await getStudio();
  const r = await s.render({ ...look, screen: screenFile(spec.screen, look.model), width: w, height: h, fill: F0, supersample: 1, shadow: "none" });
  const bb = r.bboxProjected;
  const m = { x: bb.x / w, y: bb.y / h, w: bb.width / w, h: bb.height / h, aspect: w / h };
  await writeFile(file, JSON.stringify(m));
  measured.set(key, m);
  return m;
}

/**
 * Render one phone layer for a post of W x H CSS px at `scale`.
 * Returns { src (png path), shadow (png path or null), box: {x,y,w,h} in post px, quad }.
 */
export async function phoneLayer(spec, { W, H, scale = 2, draft = false }) {
  const look = lookOf(spec);
  const m = await measure(spec, W, H);
  /* outline size at F0, in post px */
  const w0 = m.w * W;
  const h0 = m.h * H;
  let fill;
  if (spec.h) fill = (F0 * spec.h) / h0;
  else if (spec.w) fill = (F0 * spec.w) / w0;
  else throw new Error("phoneLayer: give h or w");
  const bw = (w0 * fill) / F0;
  const bh = (h0 * fill) / F0;
  /* where the outline centre sits with no offset: the frame centre (no crop) */
  let cx = spec.cx ?? W / 2;
  let cy = spec.cy ?? H / 2;
  if (spec.left !== undefined) cx = spec.left + bw / 2;
  if (spec.right !== undefined) cx = spec.right - bw / 2;
  if (spec.top !== undefined) cy = spec.top + bh / 2;
  if (spec.bottom !== undefined) cy = spec.bottom - bh / 2;
  const offset = { x: (cx - W / 2) / W, y: (cy - H / 2) / H };

  let shadow = spec.shadow || "none";
  if (typeof shadow === "string") shadow = { type: shadow };
  /* the studio measures shadow offsets and blurs in render pixels: keep them in post pixels */
  shadow = { ...shadow };
  if (shadow.offset && typeof shadow.offset === "object") shadow.offset = { x: (shadow.offset.x || 0) * scale, y: (shadow.offset.y || 0) * scale };
  else if (typeof shadow.offset === "number") shadow.offset *= scale;
  if (shadow.blur !== undefined) shadow.blur *= scale;
  if (shadow.ambientBlur !== undefined) shadow.ambientBlur *= scale;
  const RW = Math.round(W * scale);
  const RH = Math.round(H * scale);
  const scr = screenFile(spec.screen, look.model);
  const st = statSync(scr);
  const params = {
    ...look,
    width: RW,
    height: RH,
    fill,
    offset,
    supersample: draft ? 1 : spec.supersample ?? 2,
    shadow,
    shadowMode: shadow.type === "none" ? "composite" : "separate",
    screenFit: spec.screenFit,
  };
  const key = hash({ params, scr, mt: st.mtimeMs, sz: st.size });
  const src = join(CACHE, "phones", `p-${key}.png`);
  const shd = join(CACHE, "phones", `s-${key}.png`);
  const metaFile = join(CACHE, "phones", `p-${key}.json`);
  if (!existsSync(src) || !existsSync(metaFile)) {
    const s = await getStudio();
    const r = await s.render({ ...params, screen: scr });
    await writeFile(src, r.png);
    if (r.shadowPng) await writeFile(shd, r.shadowPng);
    await writeFile(metaFile, JSON.stringify({ quad: r.screenQuad.map(([x, y]) => [x / scale, y / scale]), hasShadow: !!r.shadowPng, bbox: r.bboxProjected }));
  }
  const meta = JSON.parse(await readFile(metaFile, "utf8"));
  return {
    src,
    shadow: meta.hasShadow ? shd : null,
    box: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    quad: meta.quad,
  };
}
