import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

/**
 * Render a client component to static HTML, for a test.
 *
 * This suite's config aliases `react` to its react-server build, because
 * every other module under test is a server module. A client component
 * (useState, useRouter) cannot render there. So the entry is bundled with
 * esbuild against the ordinary React build and run in Node, with
 * `next/navigation` replaced by an inert stub. Used by render tests only.
 */
const WEB_SRC = join(__dirname, "..", "..");

const NAVIGATION_STUB = `
export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} });
export const usePathname = () => "/";
export const useSearchParams = () => new URLSearchParams();
export const redirect = () => { throw new Error("redirect"); };
export const notFound = () => { throw new Error("notFound"); };
`;

export async function renderClient(entry: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "nf-render-"));
  try {
    writeFileSync(join(dir, "navigation.js"), NAVIGATION_STUB);
    writeFileSync(join(dir, "entry.tsx"), entry);
    const out = join(dir, "out.mjs");
    await build({
      entryPoints: [join(dir, "entry.tsx")],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: out,
      jsx: "automatic",
      logLevel: "silent",
      alias: { "@": WEB_SRC, "next/navigation": join(dir, "navigation.js") },
      nodePaths: [join(WEB_SRC, "..", "node_modules"), join(WEB_SRC, "..", "..", "..", "node_modules")],
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const mod = (await import(/* @vite-ignore */ pathToFileURL(out).href)) as { html: () => string };
    return mod.html();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
