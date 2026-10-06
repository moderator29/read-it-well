// Live-mode check: renders 6 frames of browser/live-test.html (a phone turning over 3 s),
// a two-phone frame, verifies determinism, and times live.render() per AA mode.
//
//   node scripts/marketing/phone3d/test/live-frames.mjs [outDir] [--no-bench]

import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { startPhoneServer, GL_ARGS, DEFAULT_CHROMIUM_PATH } from '../studio.mjs';
import { makeTestScreen } from './make-test-screen.mjs';

const out = path.resolve(process.argv[2] || 'phone3d-live');
const bench = !process.argv.includes('--no-bench');
await mkdir(out, { recursive: true });

const server = await startPhoneServer();
const screenUrl = server.addScreen(await makeTestScreen());
const browser = await chromium.launch({
  executablePath: process.env.PHONE3D_CHROMIUM || DEFAULT_CHROMIUM_PATH,
  headless: true,
  args: [...GL_ARGS, '--disable-dev-shm-usage'],
});

async function openPage(params) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  const qs = new URLSearchParams({ screen: screenUrl, bar: '0', ...params });
  await page.goto(`${server.url}/phone3d/browser/live-test.html?${qs}`);
  await page.waitForFunction(() => window.__liveReady === true, null, { timeout: 120000 });
  return page;
}

// ---- 6 frames (textured screen), and the same 6 in HTML-overlay mode --------------------
const times = [0, 0.6, 1.2, 1.8, 2.4, 3.0];
async function frameSet(params, prefix) {
  const pg = await openPage(params);
  const frames = [];
  for (const t of times) {
    const quad = await pg.evaluate((tt) => window.__live.setTime(tt), t);
    const png = await pg.screenshot({ type: 'png' });
    const file = path.join(out, `${prefix}-${t.toFixed(1)}s.png`);
    await writeFile(file, png);
    frames.push(png);
    console.log(`frame t=${t.toFixed(1)}s -> ${file}  screenQuad=${JSON.stringify(quad.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1)]))}`);
  }
  const thumbs = await Promise.all(frames.map((f) => sharp(f).resize(360, 640).png().toBuffer()));
  await sharp({ create: { width: 360 * 6, height: 640, channels: 3, background: '#ffffff' } })
    .composite(thumbs.map((b, i) => ({ input: b, left: i * 360, top: 0 })))
    .jpeg({ quality: 90 })
    .toFile(path.join(out, `${prefix}-strip.jpg`));
  return pg;
}
await (await frameSet({ aa: 'msaa', env: 'dark', overlay: '1' }, 'live-overlay-frame')).close();
const page = await frameSet({ aa: 'msaa', env: 'light' }, 'live-frame');

// ---- determinism: same state twice -> identical pixels -----------------------------------
const hashes = await page.evaluate(() => {
  const { live, setTime } = window.__live;
  const gl = live.renderer.getContext();
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  const read = () => {
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let hsh = 2166136261 >>> 0;
    for (let i = 0; i < buf.length; i += 1) hsh = Math.imul(hsh ^ buf[i], 16777619) >>> 0;
    return hsh.toString(16);
  };
  setTime(1.37);
  const a = read();
  setTime(2.2);
  setTime(1.37);
  const b = read();
  live.render();
  const c = read();
  return [a, b, c];
});
console.log('determinism hashes (t=1.37 s, re-rendered 3x):', hashes, hashes.every((x) => x === hashes[0]) ? 'IDENTICAL' : 'DIFFERENT');

// ---- screenSpec -------------------------------------------------------------------------
const spec = await page.evaluate(() => {
  const s = window.__live.phone.screenSpec();
  return { ...s, outline: `${s.outline.length} points`, clipPath: `${s.clipPath.slice(0, 60)}…` };
});
console.log('screenSpec (island):', JSON.stringify(spec));
await page.close();

// ---- timings ----------------------------------------------------------------------------
if (bench) {
  const modes = [
    { aa: 'msaa' },
    { aa: 'none' },
    { aa: 'ss', ss: '1.5' },
    { aa: 'fxaa' },
  ];
  const results = [];
  for (const m of modes) {
    const pg = await openPage({ ...m, env: 'light' });
    const r = await pg.evaluate(() => {
      const { live, phone } = window.__live;
      const gl = live.renderer.getContext();
      const px = new Uint8Array(4);
      const measure = (n = 10) => {
        const cpu = [];
        const tot = [];
        for (let i = 0; i < n; i++) {
          phone.set({ rotation: { y: -30 + i * 6 } });
          const t0 = performance.now();
          live.render();
          const t1 = performance.now();
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // wait for the GPU
          const t2 = performance.now();
          cpu.push(t1 - t0);
          tot.push(t2 - t0);
        }
        const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
        return {
          renderCallMs: +med(cpu).toFixed(1),
          toPixelsMedianMs: +med(tot).toFixed(1),
          toPixelsMinMs: +Math.min(...tot).toFixed(1),
        };
      };
      phone.set({ cx: 540, cy: 960, height: 1500, fov: 26, rotation: { x: -8, y: -20, z: 4 } });
      const one = measure();
      phone.set({ cx: 360, cy: 980, height: 1100, rotation: { x: -10, y: 26, z: 12 } });
      const p2 = live.add({ model: 'android' });
      p2.setScreen(phone.screenTexture.image);
      p2.set({ cx: 730, cy: 940, height: 1100, fov: 26, rotation: { x: -14, y: -26, z: -6 } });
      const two = measure();
      live.render();
      return { one, two };
    });
    const shot = await pg.screenshot({ type: 'png' });
    await writeFile(path.join(out, `live-two-phones-${m.aa}${m.ss ? m.ss : ''}.png`), shot);
    results.push({ mode: m.aa + (m.ss ? ` x${m.ss}` : ''), ...r });
    console.log(`timing ${m.aa}${m.ss ? ' x' + m.ss : ''}: one phone @1500px ${JSON.stringify(r.one)}, two phones @1100px ${JSON.stringify(r.two)}`);
    await pg.close();
  }
  await writeFile(path.join(out, 'live-timings.json'), JSON.stringify(results, null, 2));
}

await browser.close();
await server.close();
