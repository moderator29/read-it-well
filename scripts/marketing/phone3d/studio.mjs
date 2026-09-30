// Photoreal 3D phone renderer: three.js in headless Chromium (SwiftShader WebGL2).
//
//   import { createPhoneStudio } from './phone3d/studio.mjs';
//   const studio = await createPhoneStudio();
//   const { png, shadowPng, screenCorners, bbox } = await studio.render({ screen: 'screen.png', pose: 'hero-low' });
//   await studio.close();
//
// See README.md in this folder for the full option reference.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { POSES } from './poses.mjs';
import { homography, cssMatrix3d } from './browser/homography.js';

export { homography, cssMatrix3d };

// sharp defaults to a single thread on glibc Linux; the renders are serialised with the
// browser work anyway, so let libvips use the cores.
if (sharp.concurrency() < 4) sharp.concurrency(Math.min(4, os.availableParallelism?.() ?? os.cpus().length));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MARKETING_ROOT = path.resolve(HERE, '..');
const STATIC_ROOTS = [
  path.join(MARKETING_ROOT, 'phone3d'),
  path.join(MARKETING_ROOT, 'node_modules', 'three'),
];
const DEFAULT_CHROMIUM = '/opt/pw-browsers/chromium';
export const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
export const DEFAULT_CHROMIUM_PATH = '/opt/pw-browsers/chromium';

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export const MODELS = ['island', 'android'];
export const COLORS = ['black-titanium', 'natural-titanium', 'blue', 'silver'];
export { POSES };

// ---------------------------------------------------------------------------------------
// tiny local HTTP server: static files, screen images, pixel uploads from the page
// ---------------------------------------------------------------------------------------

/**
 * Local HTTP server (127.0.0.1, random port) serving /phone3d/*, /node_modules/three/*,
 * registered screen images under /screen/<key>, and POST /upload/<token>/<name>.
 * Exported so other scripts (live-mode tests, films) can reuse it.
 */
export function startPhoneServer() {
  const screens = new Map(); // key -> { buf, type }
  const uploads = new Map(); // `${token}/${name}` -> Buffer

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const p = decodeURIComponent(url.pathname);
      if (req.method === 'POST' && p.startsWith('/upload/')) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        uploads.set(p.slice('/upload/'.length), Buffer.concat(chunks));
        res.writeHead(204).end();
        return;
      }
      if (req.method !== 'GET') {
        res.writeHead(405).end();
        return;
      }
      if (p === '/favicon.ico') {
        res.writeHead(204).end();
        return;
      }
      if (p.startsWith('/screen/')) {
        const s = screens.get(p.slice('/screen/'.length));
        if (!s) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'content-type': s.type, 'cache-control': 'no-store' }).end(s.buf);
        return;
      }
      let file = null;
      if (p.startsWith('/phone3d/')) file = path.join(STATIC_ROOTS[0], p.slice('/phone3d/'.length));
      else if (p.startsWith('/node_modules/three/')) file = path.join(STATIC_ROOTS[1], p.slice('/node_modules/three/'.length));
      const safe = file && STATIC_ROOTS.some((r) => path.resolve(file).startsWith(r + path.sep));
      if (!safe) {
        res.writeHead(404).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' }).end(body);
    } catch (e) {
      res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(String(e.message || e));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        screens,
        uploads,
        /** Register an image (Buffer) and get its URL path. */
        addScreen(buf) {
          const key = createHash('sha1').update(buf).digest('hex');
          screens.set(key, { buf, type: sniffType(buf) });
          return `/screen/${key}`;
        },
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

// ---------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------

function sniffType(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function alphaBBox(buf, W, H, threshold = 3, channels = 4) {
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  const ai = channels - 1;
  for (let y = 0; y < H; y++) {
    const row = y * W * channels;
    for (let x = 0; x < W; x++) {
      if (buf[row + x * channels + ai] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// ---------------------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------------------

/**
 * Launch one headless Chromium + three.js engine that is reused for every render.
 * @param {object} [options]
 * @param {string} [options.executablePath='/opt/pw-browsers/chromium']
 * @param {boolean} [options.verbose=false]  forward page console output
 */
export async function createPhoneStudio(options = {}) {
  const server = await startPhoneServer();
  const browser = await chromium.launch({
    executablePath: options.executablePath || process.env.PHONE3D_CHROMIUM || DEFAULT_CHROMIUM,
    headless: true,
    args: [...GL_ARGS, '--disable-dev-shm-usage', ...(options.args || [])],
  });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e));
  page.on('console', (m) => {
    if (options.verbose || m.type() === 'error') console.log(`[phone3d page:${m.type()}] ${m.text()}`);
  });
  await page.goto(`${server.url}/phone3d/browser/index.html${options.msaa === false ? '?aa=0' : ''}`);
  let info;
  try {
    await page.waitForFunction(() => window.__phone3d, null, { timeout: 30000 });
    info = await page.evaluate(() => window.__phone3d.ready);
  } catch (e) {
    await browser.close();
    await server.close();
    const extra = pageErrors.map((x) => x.message).join('; ');
    throw new Error(`phone3d: WebGL engine failed to start (${e.message}) ${extra}`);
  }
  if (!/WebGL 2/.test(info.gl.version)) {
    await browser.close();
    await server.close();
    throw new Error(`phone3d: expected a WebGL2 context, got '${info.gl.version}'`);
  }

  let queue = Promise.resolve();
  const screenKeys = new Map(); // path -> { mtimeMs, size, key }

  async function registerScreen(screen) {
    if (!screen) throw new Error('phone3d: `screen` (path or Buffer) is required');
    if (Buffer.isBuffer(screen) || screen instanceof Uint8Array) {
      const buf = Buffer.from(screen);
      const key = createHash('sha1').update(buf).digest('hex');
      if (!server.screens.has(key)) server.screens.set(key, { buf, type: sniffType(buf) });
      return key;
    }
    const abs = path.resolve(String(screen));
    const st = await stat(abs);
    const known = screenKeys.get(abs);
    if (known && known.mtimeMs === st.mtimeMs && known.size === st.size && server.screens.has(known.key)) return known.key;
    const buf = await readFile(abs);
    const key = createHash('sha1').update(buf).digest('hex');
    server.screens.set(key, { buf, type: sniffType(buf) });
    screenKeys.set(abs, { mtimeMs: st.mtimeMs, size: st.size, key });
    return key;
  }

  function normalize(opts) {
    const model = opts.model || 'island';
    if (!MODELS.includes(model)) throw new Error(`phone3d: unknown model '${model}'`);
    const color = opts.color || (model === 'android' ? 'silver' : 'black-titanium');
    if (!COLORS.includes(color)) throw new Error(`phone3d: unknown color '${color}'`);
    const poseName = opts.pose || (opts.rotation ? null : 'front');
    const pose = poseName ? POSES[poseName] : null;
    if (poseName && !pose) throw new Error(`phone3d: unknown pose '${poseName}'. Poses: ${Object.keys(POSES).join(', ')}`);
    const rotation = { x: 0, y: 0, z: 0, ...(pose?.rotation || {}), ...(opts.rotation || {}) };
    const width = Math.round(opts.width || 1600);
    const height = Math.round(opts.height || 2400);
    let ss = opts.supersample ?? 2;
    if (!(ss >= 1 && ss <= 4)) throw new Error('phone3d: supersample must be between 1 and 4');
    let shadow = opts.shadow;
    if (typeof shadow === 'string') shadow = { type: shadow };
    if (!shadow) shadow = { type: 'none' };
    if (!['none', 'contact', 'drop'].includes(shadow.type)) throw new Error(`phone3d: unknown shadow type '${shadow.type}'`);
    let crop = opts.crop || null;
    if (typeof crop === 'string') {
      const presets = {
        top: { y0: 0, y1: 0.55 },
        bottom: { y0: 0.45, y1: 1 },
        'top-half': { y0: 0, y1: 0.5 },
        'bottom-half': { y0: 0.5, y1: 1 },
      };
      crop = presets[crop];
      if (!crop) throw new Error(`phone3d: unknown crop preset '${opts.crop}'`);
    }
    let offset = opts.offset || { x: 0, y: 0 };
    if (opts.offsetPx) offset = { x: (opts.offsetPx.x || 0) / width, y: (opts.offsetPx.y || 0) / height };
    return {
      model,
      color,
      pose: poseName,
      rotation,
      fov: opts.fov ?? pose?.fov ?? 22,
      fill: opts.fill ?? pose?.fill ?? 0.8,
      focus: { x: 0, y: 0, ...(pose?.focus || {}), ...(opts.focus || {}) },
      offset: { x: offset.x || 0, y: offset.y || 0 },
      crop,
      show: opts.show ?? (opts.crop ? null : pose?.show ?? null),
      align: opts.align || pose?.align || 'auto',
      width,
      height,
      ss,
      reflection: opts.reflection ?? 0.12,
      exposure: opts.exposure ?? 1.0,
      env: opts.env === 'dark' ? 'dark' : 'light',
      envIntensity: opts.envIntensity ?? 1.0,
      keyLight: opts.keyLight ?? 1.0,
      screenFit: opts.screenFit || 'cover',
      shadow,
      shadowMode: opts.shadowMode || 'composite',
      wantShadowPng: !!opts.shadowPng,
      pngCompression: opts.pngCompression ?? 6,
    };
  }

  async function renderOnce(opts) {
    const t0 = performance.now();
    const p = normalize(opts);
    const screenKey = await registerScreen(opts.screen);
    const token = randomBytes(8).toString('hex');
    const params = {
      ...p,
      token,
      screenKey,
      screenUrl: `/screen/${screenKey}`,
    };
    let meta;
    try {
      meta = await page.evaluate((prm) => window.__phone3d.render(prm), params);
    } catch (e) {
      throw new Error(`phone3d: render failed: ${e.message}`);
    }
    const tBrowser = performance.now();
    const take = (name) => {
      const k = `${token}/${name}`;
      const b = server.uploads.get(k);
      server.uploads.delete(k);
      if (!b) throw new Error(`phone3d: missing upload ${name}`);
      return b;
    };

    // ---- assemble supersampled tiles (premultiplied RGBA, bottom-up rows per tile) -------
    const { width: W2, height: H2, tiles } = meta.render;
    const full = Buffer.allocUnsafe(W2 * H2 * 4);
    for (const t of tiles) {
      const buf = take(t.name);
      const copyW = Math.min(t.width, W2 - t.x);
      for (let r = 0; r < t.height; r++) {
        const dstY = t.y + (t.height - 1 - r);
        if (dstY >= H2) continue;
        buf.copy(full, (dstY * W2 + t.x) * 4, r * t.width * 4, r * t.width * 4 + copyW * 4);
      }
    }
    const W = p.width;
    const H = p.height;
    const phone = await sharp(full, { raw: { width: W2, height: H2, channels: 4, premultiplied: true } })
      .resize(W, H, { kernel: 'lanczos3', fit: 'fill' })
      .raw()
      .toBuffer(); // straight alpha
    const tResize = performance.now();

    // ---- shadow ------------------------------------------------------------------------------
    let shadowAlpha = null;
    let shadowInfo = null;
    if (meta.shadow) {
      const sm = meta.shadow;
      const sw = sm.width;
      const sh = sm.height;
      const keyBuf = take('shadow-key');
      const ambBuf = take('shadow-ambient');
      if (process.env.PHONE3D_DEBUG_DIR) {
        const dd = process.env.PHONE3D_DEBUG_DIR;
        await sharp(keyBuf, { raw: { width: sm.width, height: sm.height, channels: 4 } }).flip().png().toFile(`${dd}/dbg-shadow-key.png`);
        await sharp(ambBuf, { raw: { width: sm.width, height: sm.height, channels: 4 } }).flip().png().toFile(`${dd}/dbg-shadow-amb.png`);
      }
      // de-interleave one channel (and flip: GL rows are bottom-up), then blur it as a
      // single-channel image. NB: sharp turns 1-channel raw output into 3-channel sRGB
      // unless the colourspace is pinned to 'b-w'.
      const blurCh = async (buf, ch, sigmaOut) => {
        const plane = Buffer.allocUnsafe(sw * sh);
        for (let y = 0; y < sh; y++) {
          const src = (sh - 1 - y) * sw * 4 + ch;
          const dst = y * sw;
          for (let x = 0; x < sw; x++) plane[dst + x] = buf[src + x * 4];
        }
        const sigma = sigmaOut * sm.scale;
        if (sigma < 0.3) return plane;
        return sharp(plane, { raw: { width: sw, height: sh, channels: 1 } })
          .blur(Math.min(1000, sigma))
          .toColourspace('b-w')
          .raw()
          .toBuffer();
      };
      const [k0, k1, k2, am] = await Promise.all([
        blurCh(keyBuf, 0, sm.sigmas[0]),
        blurCh(keyBuf, 1, sm.sigmas[1]),
        blurCh(keyBuf, 2, sm.sigmas[2]),
        blurCh(ambBuf, 0, sm.ambient.sigma),
      ]);
      const lo = Buffer.allocUnsafe(sw * sh);
      const op = sm.opacity;
      const aop = sm.ambient.opacity;
      for (let i = 0; i < sw * sh; i++) {
        const k = Math.min(1, (k0[i] + k1[i] + k2[i]) / 255);
        const a = am[i] / 255;
        lo[i] = Math.round(255 * (1 - (1 - op * k) * (1 - aop * a)));
      }
      shadowAlpha = await sharp(lo, { raw: { width: sw, height: sh, channels: 1 } })
        .resize(W, H, { kernel: 'cubic', fit: 'fill' })
        .toColourspace('b-w')
        .raw()
        .toBuffer();
      if (shadowAlpha.length !== W * H) throw new Error('phone3d: unexpected shadow buffer layout');
      shadowInfo = sm;
    }

    // ---- composite (phone over shadow), encode ---------------------------------------------
    let out = phone;
    let shadowPng = null;
    const separate = p.shadowMode === 'separate';
    if (shadowAlpha) {
      const [sr, sg, sb] = hexToRgb(shadowInfo.color);
      if (separate || p.wantShadowPng) {
        const shadowLayer = Buffer.allocUnsafe(W * H * 4);
        for (let i = 0, j = 0; i < W * H; i++, j += 4) {
          shadowLayer[j] = sr;
          shadowLayer[j + 1] = sg;
          shadowLayer[j + 2] = sb;
          shadowLayer[j + 3] = shadowAlpha[i];
        }
        shadowPng = await sharp(shadowLayer, { raw: { width: W, height: H, channels: 4 } })
          .png({ compressionLevel: p.pngCompression, adaptiveFiltering: false })
          .toBuffer();
      }
      if (!separate) {
        // phone OVER shadow (straight alpha in, straight alpha out)
        out = Buffer.allocUnsafe(W * H * 4);
        for (let i = 0, j = 0; i < W * H; i++, j += 4) {
          const s = shadowAlpha[i];
          const a8 = phone[j + 3];
          if (a8 === 255 || s === 0) {
            out[j] = phone[j];
            out[j + 1] = phone[j + 1];
            out[j + 2] = phone[j + 2];
            out[j + 3] = a8;
            continue;
          }
          const pa = a8 / 255;
          const k = (s / 255) * (1 - pa);
          const oa = pa + k;
          out[j] = Math.round((phone[j] * pa + sr * k) / oa);
          out[j + 1] = Math.round((phone[j + 1] * pa + sg * k) / oa);
          out[j + 2] = Math.round((phone[j + 2] * pa + sb * k) / oa);
          out[j + 3] = Math.round(oa * 255);
        }
      }
    }
    const bbox = alphaBBox(phone, W, H);
    const shadowBbox = shadowAlpha ? alphaBBox(shadowAlpha, W, H, 3, 1) : null;
    const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .png({ compressionLevel: p.pngCompression, adaptiveFiltering: false })
      .toBuffer();
    const tEnd = performance.now();

    const c = meta.screenCorners;
    const ic = meta.image.corners;
    const iw = meta.image.width;
    const ih = meta.image.height;
    const Himg = homography(
      [[0, 0], [iw, 0], [iw, ih], [0, ih]],
      [[ic.topLeft.x, ic.topLeft.y], [ic.topRight.x, ic.topRight.y], [ic.bottomRight.x, ic.bottomRight.y], [ic.bottomLeft.x, ic.bottomLeft.y]],
    );
    return {
      png,
      shadowPng,
      width: W,
      height: H,
      screenCorners: c,
      screenQuad: [c.topLeft, c.topRight, c.bottomRight, c.bottomLeft].map(({ x, y }) => [x, y]),
      screenImage: { width: iw, height: ih, corners: ic },
      screenHomography: Himg,
      screenCss: cssMatrix3d(Himg),
      bbox,
      shadowBbox,
      bboxProjected: meta.phoneBBoxProjected,
      model: p.model,
      color: p.color,
      pose: p.pose,
      rotation: p.rotation,
      fov: p.fov,
      camera: meta.camera,
      shadow: shadowInfo ? { type: p.shadow.type, mode: p.shadowMode, light: shadowInfo.light, plane: shadowInfo.plane } : null,
      timings: {
        total: Math.round(tEnd - t0),
        browser: Math.round(tBrowser - t0),
        browserMain: Math.round(meta.timings.main),
        browserShadow: Math.round(meta.timings.shadow || 0),
        resize: Math.round(tResize - tBrowser),
        encode: Math.round(tEnd - tResize),
      },
    };
  }

  if (options.warmup !== false) {
    // compile every shader program up front (first use costs several seconds in SwiftShader)
    const dummy = await sharp({ create: { width: 66, height: 143, channels: 3, background: '#808080' } }).png().toBuffer();
    for (const model of MODELS) {
      await renderOnce({ screen: dummy, model, pose: 'three-quarter-left', width: 96, height: 144, shadow: 'drop' });
    }
    server.screens.clear();
  }

  return {
    info,
    /** @private debugging handle */
    _page: page,
    /** Render one phone. Calls are serialised (one GPU context). */
    render(opts) {
      const run = queue.then(() => renderOnce(opts));
      queue = run.catch(() => {});
      return run;
    },
    async close() {
      await browser.close().catch(() => {});
      await server.close();
    },
  };
}
