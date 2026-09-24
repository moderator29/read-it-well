import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * OPS-15: the one script tag production served without a nonce.
 *
 * It was the async <script> Next renders for a layout's own client chunk
 * (`script-0` in the RSC payload). Next 16.2.12, which the live deployment
 * was built with, rendered it with no nonce, so `strict-dynamic` refused it on
 * every page. Next 16.3 passes `ctx.nonce` to it. These two assertions fail if
 * the dependency ever goes back to a renderer that drops it, and
 * `scripts/check-script-nonces.mjs` checks a served build end to end.
 */
const require = createRequire(import.meta.url);
const nextRoot = dirname(require.resolve("next/package.json"));
const renderer = (file: string) => readFileSync(join(nextRoot, "dist/server/app-render", file), "utf8");

describe("Next stamps the nonce on a layout's own script", () => {
  it.each(["create-component-styles-and-scripts.js", "get-layer-assets.js"])("%s", (file) => {
    const source = renderer(file);
    const script = source.slice(source.indexOf("createElement('script'"));
    expect(script.slice(0, 400)).toContain("nonce: ctx.nonce");
  });

  it("the app asks for a Next with that fix", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    const [major, minor] = (pkg.dependencies.next ?? "").replace(/^[^\d]*/, "").split(".").map(Number);
    expect(major! > 16 || (major === 16 && minor! >= 3)).toBe(true);
  });
});
