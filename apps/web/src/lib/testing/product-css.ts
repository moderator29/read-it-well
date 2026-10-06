/**
 * Test-only: the product stylesheet a browser-mounted component stands on, for
 * `mountInBrowser`'s `css`.
 *
 * `PORTED_CSS` is the floor every browser test reads (tokens, the sheet, the
 * button system, the ported components' own sheet). A component that ships its
 * own stylesheet imports it with `import "./x.css"`, which the harness replaces
 * with nothing, so the test hands the same file in here instead of copying any
 * of it. Paths are relative to `apps/web/src`.
 *
 *   mountInBrowser({ entry, css: productCss("components/app/pro/pro.css") })
 *
 * The glass partial (`app/css/glass.css`: Card, Island and the other container
 * tiers) is opt-in, because most components do not need it and it is large.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PORTED_CSS } from "@/components/ui/ported-test-css";

const SRC = join(__dirname, "..", "..");

export function productCss(...files: string[]): string {
  return [PORTED_CSS, ...files.map((file) => readFileSync(join(SRC, file), "utf8"))].join("\n");
}

/** The container tiers (`.nf-panel`, `.nf-card`, `.nf-island`, `.nf-sheet`). */
export const GLASS_CSS = "app/css/glass.css";
