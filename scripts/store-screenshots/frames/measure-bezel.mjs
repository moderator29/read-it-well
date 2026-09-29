/**
 * Measures one of Apple's official product bezels so compose.mjs can place a
 * screen inside it, and writes the JSON the compositor reads.
 *
 *   node scripts/store-screenshots/frames/measure-bezel.mjs <bezel.png> <apple-dynamic-island|apple-standard>
 *
 * The bezel PNGs Apple publishes at developer.apple.com/design/resources have
 * a transparent screen. This flood fills from the centre over pixels whose
 * alpha is under 10, takes the bounding box of what it reached as the screen,
 * and estimates the corner radius from how far the transparent area pulls in
 * along the top row. The PNG is copied beside the JSON under the given name.
 */
import sharp from "sharp";
import { copyFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [src, name] = process.argv.slice(2);
if (!src || !["apple-dynamic-island", "apple-standard"].includes(name ?? "")) {
  console.error("usage: measure-bezel.mjs <bezel.png> <apple-dynamic-island|apple-standard>");
  process.exit(2);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels } = info;
const alpha = (x, y) => data[(y * W + x) * channels + 3];
const clear = (x, y) => alpha(x, y) < 10;

const cx = Math.floor(W / 2);
const cy = Math.floor(H / 2);
if (!clear(cx, cy)) {
  console.error("The centre pixel is not transparent: this does not look like a bezel with an empty screen.");
  process.exit(1);
}

const seen = new Uint8Array(W * H);
const stack = [cy * W + cx];
seen[cy * W + cx] = 1;
let minX = cx, maxX = cx, minY = cy, maxY = cy;
while (stack.length) {
  const i = stack.pop();
  const x = i % W;
  const y = (i - x) / W;
  if (x < minX) minX = x;
  if (x > maxX) maxX = x;
  if (y < minY) minY = y;
  if (y > maxY) maxY = y;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx;
    if (!seen[j] && clear(nx, ny)) {
      seen[j] = 1;
      stack.push(j);
    }
  }
}

/* The corner radius: on the screen's top row, the first transparent pixel
   from the left sits about one radius in from the box's edge only at the very
   top, so walk down the left edge instead and find where it becomes straight. */
let radius = 0;
for (let y = minY; y < minY + (maxY - minY) / 4; y += 1) {
  if (seen[y * W + minX]) {
    radius = y - minY;
    break;
  }
}

const out = dirname(fileURLToPath(import.meta.url));
copyFileSync(src, join(out, `${name}.png`));
const meta = {
  file: `${name}.png`,
  source: src.split("/").pop(),
  width: W,
  height: H,
  screen: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  cornerRadius: radius,
};
writeFileSync(join(out, `${name}.json`), JSON.stringify(meta, null, 2) + "\n");
console.log(meta);
