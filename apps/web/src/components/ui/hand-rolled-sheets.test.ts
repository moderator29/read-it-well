import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "@/lib/copy/source-scan";

/**
 * UI-18: overlays that draw their own scrim instead of using `Sheet`.
 *
 * Each of these writes the backdrop token (directly, or through a scrim
 * class of its own such as `.nf-drawer-scrim`) and its own surface, so focus trap,
 * scroll lock, safe area and grip can drift sheet by sheet. Porting them is
 * planned (docs/THE_AUDIT_FIXES.md, UI-18: fix `Sheet` first, then port one
 * overlay per change with its own focus and scroll test). Until then this
 * list may only shrink: a new hand-rolled overlay fails here, and a ported
 * one must be taken off the list.
 */
const KNOWN = [
  "app/(app)/settings/DeleteAccountPanel.tsx",
  "components/agent/AgentMobileNav.tsx",
  "components/app/AppShell.tsx",
  "components/app/ReportSheet.tsx",
  "components/app/assistant/AssistantChat.tsx",
  "components/app/filters/FilterDrawer.tsx",
  "components/app/place/ChoicePicker.tsx",
  "components/app/stays/StayFilterSheet.tsx",
  "components/site/MobileMenu.tsx",
];

const SRC = join(__dirname, "..", "..");

/**
 * Every CSS class whose rule paints the backdrop token, read from the
 * stylesheets, less Sheet's own. A TSX file using one draws a scrim.
 */
const CSS = join(SRC, "app", "css");
const SCRIM_CLASSES = readdirSync(CSS)
  .filter((name) => name.endsWith(".css"))
  .flatMap((name) => [...withoutComments(readFileSync(join(CSS, name), "utf8")).matchAll(/\.(nf-[\w-]+)\s*\{[^}]*--nf-overlay-backdrop/g)])
  .map((m) => m[1] ?? "")
  .filter((name) => name !== "nf-sheet-backdrop");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "(dev)") walk(path, out);
    } else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(path);
  }
  return out;
}

describe("hand-rolled sheets (UI-18)", () => {
  it("no overlay outside the known list draws its own backdrop, and a ported one leaves the list", () => {
    const drawing = walk(SRC)
      .filter((path) => {
        const code = withoutComments(readFileSync(path, "utf8"));
        return code.includes("--nf-overlay-backdrop") || SCRIM_CLASSES.some((name) => code.includes(name));
      })
      .map((path) => relative(SRC, path).split("\\").join("/"))
      .filter((file) => file !== "components/ui/Sheet.tsx")
      .sort();
    expect(drawing).toEqual(KNOWN);
  });
});
