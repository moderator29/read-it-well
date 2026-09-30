/* HTML to PNG. Each post is an HTML page served from a tiny local server (so
 * fonts and images load the way a browser expects), rendered in Chromium at
 * `scale` x and brought down to its native size with a Lanczos filter. */
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { CACHE, CHROMIUM, REPO } from "./paths.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json",
};

let server = null;
let base = "";
async function ensureServer() {
  if (server) return;
  const roots = { r: resolve(REPO), c: resolve(CACHE) };
  server = http.createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const m = p.match(/^\/(r|c)\/(.*)$/);
      if (!m) return void res.writeHead(404).end();
      const file = resolve(roots[m[1]], m[2]);
      if (!file.startsWith(roots[m[1]] + sep)) return void res.writeHead(403).end();
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" }).end(body);
    } catch (e) {
      res.writeHead(e.code === "ENOENT" ? 404 : 500).end(String(e.message));
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${server.address().port}`;
}

/** URL of a file under the repo or the cache, as the page sees it. */
export function u(abs) {
  const a = resolve(abs);
  if (a.startsWith(resolve(CACHE) + sep)) return `/c/${a.slice(resolve(CACHE).length + 1).split(sep).map(encodeURIComponent).join("/")}`;
  if (a.startsWith(resolve(REPO) + sep)) return `/r/${a.slice(resolve(REPO).length + 1).split(sep).map(encodeURIComponent).join("/")}`;
  throw new Error(`asset outside the repo and cache: ${abs}`);
}

let browser = null;
async function ensureBrowser() {
  if (browser) return browser;
  browser = await chromium.launch({
    executablePath: CHROMIUM,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none", "--force-color-profile=srgb", "--disable-lcd-text", "--disable-background-networking", "--disable-component-update", "--no-first-run"],
  });
  return browser;
}

/**
 * Render `html` (a whole document) at width x height CSS px.
 * Returns an RGB buffer at native size (Lanczos from `scale` x).
 */
export async function renderHtml({ html, width, height, scale = 2, name = "page" }) {
  await ensureServer();
  const b = await ensureBrowser();
  const file = join(CACHE, "html", `${name}.html`);
  await writeFile(file, html);
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfailed", (r) => errors.push(`failed: ${r.url()}`));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(`${base}${u(file)}`, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const shot = await page.screenshot({ type: "png", fullPage: false });
  await page.close();
  if (errors.length) console.warn(`  ! ${name}: ${[...new Set(errors)].join(" | ")}`);
  let img = sharp(shot);
  if (scale !== 1) img = img.resize(width, height, { kernel: "lanczos3", fit: "fill" });
  return img.removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
}

/** Save a raw RGB buffer (from renderHtml) as a PNG with no alpha. */
export async function savePng({ data, info }, out, extract = null) {
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });
  if (extract) img = img.extract(extract);
  await img.removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(out);
}

export async function closeRenderer() {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise((r) => server.close(r));
  browser = null;
  server = null;
}
