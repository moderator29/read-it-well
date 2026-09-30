// Builds the 1320×2868 test screen: the 1320×2682 web-view screenshot padded with a
// 186-px dark status bar (#010118) showing "9:41" and simple status glyphs (SVG via sharp).
//
//   node scripts/marketing/phone3d/test/make-test-screen.mjs [out.png] [source.webp]

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const DEFAULT_SRC = path.join(REPO, 'docs/store/screenshots/source/01-find-your-next-home-1.webp');

export const STATUS_BAR_HEIGHT = 186;
export const STATUS_BAR_COLOR = '#010118';

export function statusBarSvg(width = 1320, height = STATUS_BAR_HEIGHT, fg = '#ffffff') {
  // vertical centre of the status items = centre of the display cut-out (top 34 px, 111 px tall)
  const cy = 90;
  const bars = [0, 1, 2, 3]
    .map((i) => {
      const h = 15 + i * 7;
      const x = 1004 + i * 13;
      return `<rect x="${x}" y="${cy + 17 - h}" width="9.5" height="${h}" rx="2.6" fill="${fg}"/>`;
    })
    .join('');
  // wifi: three stroked arcs + dot, centred at (1101, cy + 14)
  const wx = 1101;
  const wy = cy + 15;
  const arc = (r) => {
    const a = (40 * Math.PI) / 180;
    const x0 = wx - r * Math.sin(a);
    const y0 = wy - r * Math.cos(a);
    const x1 = wx + r * Math.sin(a);
    return `<path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y0.toFixed(2)}" stroke="${fg}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  };
  const wifi = `${arc(29)}${arc(18.5)}<circle cx="${wx}" cy="${wy - 5}" r="4.4" fill="${fg}"/>`;
  // battery
  const bx = 1144;
  const by = cy - 13;
  const battery =
    `<rect x="${bx}" y="${by}" width="58" height="27" rx="8" fill="none" stroke="${fg}" stroke-opacity="0.42" stroke-width="2.6"/>` +
    `<rect x="${bx + 4.5}" y="${by + 4.5}" width="44" height="18" rx="4.5" fill="${fg}"/>` +
    `<path d="M ${bx + 61} ${by + 9} a 4 4 0 0 1 0 9 z" fill="${fg}" fill-opacity="0.42"/>`;
  const time = `<text x="248" y="${cy + 17}" text-anchor="middle" font-family="Liberation Sans, DejaVu Sans, sans-serif" font-weight="700" font-size="49" letter-spacing="0.5" fill="${fg}">9:41</text>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
      `<rect width="${width}" height="${height}" fill="${STATUS_BAR_COLOR}"/>${time}${bars}${wifi}${battery}</svg>`,
  );
}

/** Read the source image; if it is missing from the working tree, read it from git HEAD. */
async function readSource(src) {
  if (existsSync(src)) return readFile(src);
  const rel = path.relative(REPO, src);
  try {
    return execFileSync('git', ['-C', REPO, 'show', `HEAD:${rel}`], { maxBuffer: 64 * 1024 * 1024 });
  } catch {
    throw new Error(`source screenshot not found: ${src}`);
  }
}

export async function makeTestScreen(out, src = DEFAULT_SRC) {
  src = await readSource(src);
  const meta = await sharp(src).metadata();
  if (meta.width !== 1320) throw new Error(`expected a 1320-px wide source, got ${meta.width}`);
  const bar = await sharp(statusBarSvg(meta.width)).png().toBuffer();
  const buf = await sharp(src)
    .removeAlpha()
    .extend({ top: STATUS_BAR_HEIGHT, background: STATUS_BAR_COLOR })
    .composite([{ input: bar, top: 0, left: 0 }])
    .png({ compressionLevel: 6 })
    .toBuffer();
  if (out) {
    await mkdir(path.dirname(out), { recursive: true });
    await sharp(buf).toFile(out);
  }
  return buf;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || path.resolve('test-screen.png');
  const buf = await makeTestScreen(out, process.argv[3] || DEFAULT_SRC);
  const m = await sharp(buf).metadata();
  console.log(`wrote ${out} (${m.width}×${m.height})`);
}
