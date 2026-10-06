/**
 * Test-only: the stylesheet the ported components ship, plus what they stand
 * on, assembled for `mountInBrowser`, and an axe run over the mounted page.
 * Kept in one place so the seven component tests read the same product CSS
 * (tokens, the button system, the sheet, then `ported.css` itself) instead of
 * seven slightly different copies.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import type { Page } from "playwright-core";

const WEB = join(__dirname, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");

export const PORTED_CSS = [
  read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
  "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; font-family: sans-serif; background: var(--nf-surface-canvas); color: var(--nf-content-primary); } @layer base { a { color: var(--nf-content-link); } }",
  ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
  read("src", "app", "css", "overlays.css"),
  read("src", "app", "css", "buttons.css"),
  read("src", "app", "css", "symbols.css"),
  read("src", "app", "css", "ported.css"),
].join("\n");

const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** WCAG 2.1 A and AA plus best practice, over the mounted page. */
export async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => {
    const w = window as unknown as {
      axe: {
        run: (
          ctx: unknown,
          options: unknown,
        ) => Promise<{ violations: { id: string; nodes: { html: string }[] }[] }>;
      };
    };
    const out = await w.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      /* A bare harness has no landmark or page heading; those are the host
         page's, not the component's. */
      rules: { "document-title": { enabled: false }, region: { enabled: false }, "page-has-heading-one": { enabled: false }, "landmark-one-main": { enabled: false } },
    });
    return out.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 160) ?? ""}`);
  });
}

/**
 * Re-wrap a test entry so it mounts inside a `LazyMotion` whose features NEVER
 * load, which is what a person gets in the window between first paint and the
 * lazily loaded `domAnimation` chunk (MotionProvider, motion-features.ts). In
 * that window an `m` element shows only its first frame and ignores every
 * change, so a component that leaned on one would be broken. Every ported
 * component is tested here to prove it does not: open, visible, focusable and
 * following the finger with the features absent.
 */
export function withoutFeatures(entry: string): string {
  return entry
    .replace(
      'import { MotionProvider } from "@/components/app/MotionProvider";',
      `import { LazyMotion } from "framer-motion";
       const NeverLoaded = ({ children }) => <LazyMotion features={() => new Promise(() => {})} strict>{children}</LazyMotion>;`,
    )
    .replace(/<MotionProvider>/g, "<NeverLoaded>")
    .replace(/<\/MotionProvider>/g, "</NeverLoaded>");
}
