/**
 * Vallo's first month of social images: 12 remakes of the founder's reference
 * mockups, 18 campaign posts and the X header, made from the live product's
 * captures (docs/marketing/screens/) and the brand's own art.
 *
 *   node scripts/marketing/social/build.mjs                 all, final (2x, Lanczos down)
 *   node scripts/marketing/social/build.mjs --only 01,13    some
 *   node scripts/marketing/social/build.mjs --draft         1x, quick, into the cache
 *
 * Needs: node scripts/marketing/screens.mjs (the phone displays) and the 3D
 * phone studio in scripts/marketing/phone3d/. Posts live in ./posts, one
 * module each; the premium system (grounds, grid, type, the 3D icon, the one
 * pop-up) lives in ./lib/premium.mjs, fonts and phone layers in ./lib/kit.mjs.
 * Out: docs/marketing/social/<NN>-<slug>.png (RGB, no alpha).
 */
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { closeStudio, phoneLayer } from "./lib/phones.mjs";
import { checkPhone } from "./lib/premium.mjs";
import { CACHE, OUT, SOCIAL } from "./lib/paths.mjs";
import { closeRenderer, renderHtml, savePng } from "./lib/render.mjs";

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const scale = args.includes("--scale") ? Number(args[args.indexOf("--scale") + 1]) : draft ? 1 : 2;
const outDir = draft ? join(CACHE, "draft") : OUT;
mkdirSync(outDir, { recursive: true });

const files = readdirSync(join(SOCIAL, "posts")).filter((f) => f.endsWith(".mjs")).sort();
let made = 0;
for (const f of files) {
  const mod = (await import(pathToFileURL(join(SOCIAL, "posts", f)).href)).default;
  const posts = Array.isArray(mod) ? mod : [mod];
  for (const post of posts) {
    if (only && !only.some((o) => post.id === o || post.file.startsWith(o))) continue;
    const t0 = Date.now();
    const { W, H } = post;
    const specs = typeof post.phones === "function" ? post.phones() : post.phones || [];
    const phones = [];
    for (const spec of specs) {
      const layer = await phoneLayer(spec, { W, H, scale, draft });
      phones.push(layer);
      /* the phone-scale rule (lib/premium.mjs): report the screen scale and what the frame edge crosses */
      const c = await checkPhone(spec, layer, { W, H });
      const e = c.edge ? ` edge@${c.edge.yCap}${c.edge.bandPx !== undefined ? ` band ${c.edge.bandPx}px (+${c.edge.abovePx}/-${c.edge.belowPx})` : ""}` : "";
      console.log(`  ${post.file.replace(/\.png$/, "")} ${spec.screen} ${spec.kind || "pose"} ${c.scale}x${e}${c.notes.length ? "  ! " + c.notes.join("; ") : ""}`);
    }
    const html = await post.html({ W, H, phones, scale, draft });
    const raw = await renderHtml({ html, width: W, height: H, scale, name: post.file.replace(/\.png$/, "") });
    if (post.slices) {
      for (const s of post.slices) await savePng(raw, join(outDir, s.file), s.extract);
    } else {
      await savePng(raw, join(outDir, post.file));
    }
    made += 1;
    console.log(`${post.file.padEnd(40)} ${W}x${H}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
await closeRenderer();
await closeStudio();
console.log(`social: ${made} images in ${outDir}`);
