// Test gallery: renders every pose for both models (+ two colour variants each) and builds
// one contact-sheet JPEG per model, plus a sheet of the close-up compositions.
//
//   node scripts/marketing/phone3d/test/gallery.mjs <outDir> [--size 1600x2000] [--shadow drop]

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createPhoneStudio } from '../studio.mjs';
import { REQUIRED_POSES } from '../poses.mjs';
import { makeTestScreen } from './make-test-screen.mjs';

const args = process.argv.slice(2);
const out = path.resolve(args.find((a) => !a.startsWith('--')) || 'phone3d-gallery');
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const [W, H] = opt('size', '1600x2000').split('x').map(Number);
const shadowType = opt('shadow', 'drop');
await mkdir(out, { recursive: true });

const screenFile = path.join(out, 'test-screen.png');
await makeTestScreen(screenFile);

const PLAN = {
  island: [
    ...REQUIRED_POSES.map((pose) => ({ pose, color: 'black-titanium' })),
    { pose: 'three-quarter-right', color: 'natural-titanium' },
    { pose: 'hero-low', color: 'blue' },
  ],
  android: [
    ...REQUIRED_POSES.map((pose) => ({ pose, color: 'silver' })),
    { pose: 'three-quarter-left', color: 'black-titanium' },
    { pose: 'flat-tilt', color: 'blue' },
  ],
  closeups: [
    { model: 'island', pose: 'closeup-top', color: 'black-titanium' },
    { model: 'island', pose: 'closeup-bottom', color: 'black-titanium' },
    { model: 'island', pose: 'hero-top', color: 'black-titanium' },
  ],
};

const t0 = performance.now();
const studio = await createPhoneStudio();
console.log(`studio ready in ${Math.round(performance.now() - t0)} ms (${studio.info.gl.renderer})`);

function studioBackground(w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#fbfbfd"/><stop offset="1" stop-color="#e7e6ec"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function label(text, sub, w) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="64">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="16" y="28" font-family="DejaVu Sans, sans-serif" font-size="20" font-weight="700" fill="#1b1d24">${esc(text)}</text>
    <text x="16" y="52" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#6b6f7c">${esc(sub)}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const timings = [];
async function sheet(name, items, defaults) {
  const cw = 600;
  const ch = Math.round((cw * H) / W);
  const cells = [];
  for (const it of items) {
    const cfg = { ...defaults, ...it };
    const r = await studio.render({ screen: screenFile, width: W, height: H, shadow: { type: shadowType }, ...cfg });
    const base = `${cfg.model}-${cfg.pose}-${cfg.color}`;
    await writeFile(path.join(out, `${base}.png`), r.png);
    timings.push({ file: `${base}.png`, width: W, height: H, ...r.timings });
    console.log(`${base.padEnd(44)} ${JSON.stringify(r.timings)}`);
    const bg = await studioBackground(W, H);
    const flat = await sharp(bg).composite([{ input: r.png }]).png().toBuffer();
    const comp = await sharp(flat).resize(cw, ch).png().toBuffer(); // (sharp resizes before compositing)
    const lab = await label(`${cfg.pose}`, `${cfg.model} · ${cfg.color} · ${r.timings.total} ms`, cw);
    cells.push(await sharp({ create: { width: cw, height: ch + 64, channels: 3, background: '#ffffff' } })
      .composite([{ input: comp, left: 0, top: 0 }, { input: lab, left: 0, top: ch }])
      .png()
      .toBuffer());
  }
  const cols = 3;
  const rows = Math.ceil(cells.length / cols);
  const gap = 12;
  const sw = cols * cw + (cols + 1) * gap;
  const sh = rows * (ch + 64) + (rows + 1) * gap;
  const file = path.join(out, `contact-${name}.jpg`);
  await sharp({ create: { width: sw, height: sh, channels: 3, background: '#d9d9df' } })
    .composite(cells.map((c, i) => ({ input: c, left: gap + (i % cols) * (cw + gap), top: gap + Math.floor(i / cols) * (ch + 64 + gap) })))
    .jpeg({ quality: 90 })
    .toFile(file);
  console.log(`contact sheet: ${file}`);
  return file;
}

await sheet('island', PLAN.island, { model: 'island' });
await sheet('android', PLAN.android, { model: 'android' });
await sheet('closeups', PLAN.closeups, {});
await writeFile(path.join(out, 'timings.json'), JSON.stringify(timings, null, 2));
const tot = timings.map((t) => t.total).sort((a, b) => a - b);
console.log(`renders: ${tot.length}, median ${tot[Math.floor(tot.length / 2)]} ms, max ${tot[tot.length - 1]} ms (${W}x${H}, supersample 2, MSAA 4x)`);
await studio.close();
