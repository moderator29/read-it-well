/**
 * Renders the 60-screen device showcase: 15 areas x iPhone/Android x dark/light.
 *
 *   node scripts/marketing/video/reels/showcase/run.mjs [--scale 2] [--only ios-dark,android-light]
 *
 * Out: docs/marketing/device-showcase/<ios|android>/<dark|light>/NN-<slug>.png
 * (1080 x 1920 at scale 1, 2160 x 3840 at scale 2.) Each image is a 3D handset
 * with the real capture on its display; the handset is a mock-up, not a store build.
 */
import { spawn } from "node:child_process";
import { mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS } from "./areas.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..", "..", "..");
const RENDER = join(REPO, "scripts", "marketing", "video", "engine", "render.mjs");
const args = process.argv.slice(2);
const scale = args.includes("--scale") ? args[args.indexOf("--scale") + 1] : "2";
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : ["ios-dark", "ios-light", "android-dark", "android-light"];
const SCRATCH = process.env.RENDER_DIR ?? "/tmp/showcase-render";
mkdirSync(SCRATCH, { recursive: true });

const run = (argv) => new Promise((ok, fail) => {
  const p = spawn("node", argv, { stdio: ["ignore", "inherit", "inherit"] });
  p.on("close", (c) => (c === 0 ? ok() : fail(new Error(`render exited ${c}`))));
});

for (const v of only) {
  const [platform, theme] = v.split("-");
  const times = AREAS.map((_, i) => (i + 1).toFixed(2));
  await run([RENDER, "--film", "mobile", "--reel", `show-${v}`, "--scale", scale, "--stills", times.join(","), "--out", join(SCRATCH, `${v}.mp4`)]);
  const dir = join(REPO, "docs", "marketing", "device-showcase", platform, theme);
  mkdirSync(dir, { recursive: true });
  AREAS.forEach((a, i) => {
    const from = join(SCRATCH, `show-${v}-${times[i]}.png`);
    if (existsSync(from)) renameSync(from, join(dir, `${String(i + 1).padStart(2, "0")}-${a.slug}.png`));
  });
  console.log(`${v}: ${AREAS.length} images -> ${dir}`);
}
