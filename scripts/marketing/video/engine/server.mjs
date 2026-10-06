/**
 * The films' local web server: static files only, on 127.0.0.1, GET only.
 *
 *   /film.html        the film page (engine/film.html)
 *   /video/...        scripts/marketing/video
 *   /phone3d/...      scripts/marketing/phone3d (the live 3D phones)
 *   /node_modules/... scripts/marketing/node_modules (gsap, three, fonts, stickers, icons)
 *   /repo/...         the repository (captures, brand art, photographs)
 *
 * Module scripts do not load from file:// in Chromium, hence a server.
 */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const MARKETING = resolve(HERE, "..", "..");
const REPO = resolve(MARKETING, "..", "..");

const ROOTS = [
  ["/video/", join(MARKETING, "video")],
  ["/phone3d/", join(MARKETING, "phone3d")],
  ["/node_modules/", join(MARKETING, "node_modules")],
  ["/repo/", REPO],
];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".glb": "model/gltf-binary",
  ".hdr": "application/octet-stream",
};

function resolvePath(pathname) {
  if (pathname === "/film.html" || pathname === "/") return join(MARKETING, "video", "engine", "film.html");
  for (const [prefix, root] of ROOTS) {
    if (!pathname.startsWith(prefix)) continue;
    const file = resolve(root, normalize(pathname.slice(prefix.length)));
    if (file !== root && !file.startsWith(root + sep)) return null;
    return file;
  }
  return null;
}

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
      const { pathname } = new URL(req.url, "http://127.0.0.1");
      const file = resolvePath(decodeURIComponent(pathname));
      if (!file) { res.writeHead(404).end(); return; }
      const info = await stat(file).catch(() => null);
      if (!info || !info.isFile()) { res.writeHead(404).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

/* `node engine/server.mjs [port]` serves the films for a look in a browser. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startServer(Number(process.argv[2] ?? 4173));
  console.log(`${url}/film.html?film=mobile`);
}
