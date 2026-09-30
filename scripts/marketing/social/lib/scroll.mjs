/* A phone display scrolled further down a page than its viewport capture.
 *
 * Built only from the capture pipeline's own pixels:
 *   - the status bar of the page's display (docs/marketing/screens/<id>-ios.png),
 *     which the native shell paints in the theme's colour whatever the scroll;
 *   - the page itself, shifted up by `offset` capture px (3x): from the
 *     full-page capture (<id>-full.webp, 880 px wide at 2x, resized to the
 *     display's 1320 with Lanczos) or, when every row we need is inside it,
 *     from the viewport capture (<id>.webp);
 *   - the controls the product keeps on screen while the page scrolls, put
 *     back where the product puts them:
 *       * `fixedBack`: the stay and restaurant pages' fixed back control, which
 *         fades in once the photograph's own back has left the screen
 *         (apps/web/src/components/app/listing/ListingGallery.tsx). It is
 *         taken, with a round mask, from `restaurant-hours`, a real capture of
 *         a scrolled restaurant page, at the same place (centre 101, 89.5).
 *       * `footRows`: a fixed bar at the foot of the viewport capture (the
 *         listing's sticky price bar, ListingStickyBar.tsx) stays at the foot.
 *
 * The property listing keeps nothing fixed at its top until its section tabs
 * stick, far further down (ListingSectionTabs.tsx), so a short scroll of it
 * needs no fixed control. The app bar of list pages (restaurants, search)
 * changes when scrolled (AppShell.tsx data-scrolled, LargeTitleFold.tsx), so
 * those pages are never scrolled here.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { CACHE, SCREENS, SOURCE } from "./paths.mjs";

const W = 1320;
const BAR = 186;
const H = 2868;
const VIEW = H - BAR;
const BACK = { from: "restaurant-hours", cx: 101, cy: 89.5, r: 66 };

export async function scrolledDisplay({ id, offset, page = "full", fixedBack = false, footRows = 0 }) {
  const dir = join(CACHE, "displays");
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${id}-${page}-scroll${offset}${fixedBack ? "-back" : ""}${footRows ? `-foot${footRows}` : ""}-ios.png`);
  if (existsSync(out)) return out;

  const bar = await sharp(join(SCREENS, `${id}-ios.png`)).extract({ left: 0, top: 0, width: W, height: BAR }).png().toBuffer();
  let body;
  if (page === "full") {
    const src = join(SOURCE, `${id}-full.webp`);
    const m = await sharp(src).metadata();
    const k = m.width / W;
    const top = Math.round(offset * k);
    const rows = Math.min(Math.round(VIEW * k), m.height - top);
    body = await sharp(src).extract({ left: 0, top, width: m.width, height: rows }).resize(W, Math.round(rows / k), { kernel: "lanczos3" }).png().toBuffer();
  } else {
    const src = join(SOURCE, `${id}.webp`);
    const rows = VIEW - footRows - offset;
    body = await sharp(src).extract({ left: 0, top: offset, width: W, height: rows }).png().toBuffer();
  }
  const bodyMeta = await sharp(body).metadata();
  /* the page's own ground, for rows no capture holds (under a fixed foot bar, off the frame) */
  const { data } = await sharp(body).extract({ left: 0, top: bodyMeta.height - 2, width: 4, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  const ground = { r: data[0], g: data[1], b: data[2] };
  const layers = [{ input: bar, left: 0, top: 0 }, { input: body, left: 0, top: BAR }];
  if (footRows) {
    const foot = await sharp(join(SOURCE, `${id}.webp`)).extract({ left: 0, top: VIEW - footRows, width: W, height: footRows }).png().toBuffer();
    layers.push({ input: foot, left: 0, top: H - footRows });
  }
  if (fixedBack) {
    const s = BACK.r * 2 + 4;
    const x = Math.round(BACK.cx - s / 2);
    const y = Math.round(BACK.cy - s / 2);
    const crop = await sharp(join(SOURCE, `${BACK.from}.webp`)).extract({ left: x, top: y, width: s, height: s }).png().toBuffer();
    const mask = Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${BACK.cx - x}" cy="${BACK.cy - y}" r="${BACK.r}" fill="#fff"/></svg>`);
    const round = await sharp(crop).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    layers.push({ input: round, left: x, top: BAR + y });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: ground } }).composite(layers).png({ compressionLevel: 9 }).toFile(out);
  return out;
}
