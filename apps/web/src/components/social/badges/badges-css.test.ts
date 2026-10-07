import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `.nf-badge` IS THE STATUS BADGE'S CLASS (chips.css), AND NOBODY ELSE'S.
 *
 * The profile's achievement tile was once also `.nf-badge`, in a sheet that a
 * profile loads: it redefined the status badge as a full-width, 5.5rem-tall
 * column, so a Verified pill beside it (or on a listing card on the same
 * route) stretched across its photograph. The locale-fit run found it. The tile
 * is `.nf-merit-tile` now; these hold that no other sheet takes the name back.
 */
const SRC = join(__dirname, "..", "..", "..");

function sheets(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sheets(path, out);
    else if (entry.name.endsWith(".css")) out.push(path);
  }
  return out;
}

/* A rule that declares the bare class, in any selector list or compound. */
const BARE = /\.nf-badge(?![\w-])/;

describe("the status badge's class", () => {
  it("is not used by the achievement tiles' sheet, in any form", () => {
    const css = readFileSync(join(__dirname, "badges.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/\.nf-badge/);
    expect(css).toMatch(/\.nf-merit-tile\s*\{/);
  });

  it("is declared bare by the status badge's own sheet and no component's route sheet", () => {
    const declaring = sheets(SRC)
      .filter((file) => BARE.test(readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")))
      .map((file) => file.slice(SRC.length + 1));
    /* The shared partials (carried by globals.css) may style the status badge; a route sheet owned by a
       component may not redefine it. */
    const routeSheets = declaring.filter((file) => file.startsWith("components/"));
    expect(routeSheets).toEqual([]);
  });

  it("is not on the tile's markup", () => {
    const row = readFileSync(join(__dirname, "BadgeRow.tsx"), "utf8");
    expect(row).not.toMatch(/nf-badge(?![\w-]*--)/);
    expect(row).toContain("nf-merit-tile");
  });
});
